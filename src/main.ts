import { Assets, Container } from "pixi.js";

import {
  MOBILE_BREAKPOINT,
  MOBILE_UI_SCALE,
  SceneId,
  BundleName,
} from "./app/config";
import { createApp } from "./app/createApp";
import { type Scene } from "./core/Scene";
import { SceneManager } from "./core/SceneManager";
import { AceOfShadowsScene } from "./scenes/AceOfShadowsScene";
import { MagicWordsScene } from "./scenes/MagicWordsScene";
import { MainMenuScene, type MenuSceneId } from "./scenes/MainMenuScene";
import { PhoenixFlameScene } from "./scenes/PhoenixFlameScene";
import { FPSCounter } from "./ui/FPSCounter";
import { LoadingOverlay } from "./ui/LoadingOverlay";
import { UIButton } from "./ui/UIButton";

import "./styles/index.css";

const FULLSCREEN_BUTTON_MARGIN_X = 20;
const FULLSCREEN_BUTTON_MARGIN_Y = 40;

const FULLSCREEN_BUTTON_WIDTH = 220;
const FULLSCREEN_BUTTON_HEIGHT = 56;
const FULLSCREEN_BUTTON_FONT_SIZE = 22;

const FPS_FONT_SIZE = 20;

function getSafeAreaInsetPx(variableName: string): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFullscreenSupported(): boolean {
  const element = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };

  return !!(
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    doc.exitFullscreen ||
    doc.webkitExitFullscreen
  );
}

async function bootstrap(): Promise<void> {
  const app = await createApp();

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const worldLayer = new Container();
  const uiLayer = new Container();

  app.stage.addChild(worldLayer, uiLayer);

  const sceneManager = new SceneManager(worldLayer);

  const fps = new FPSCounter();
  uiLayer.addChild(fps.view);

  let isLoading = false;
  const fullscreenSupported = isFullscreenSupported();

  const loadingOverlay = new LoadingOverlay();
  uiLayer.addChild(loadingOverlay);

  const showScene = (scene: Scene): void => {
    sceneManager.changeScene(scene, app.screen.width, app.screen.height);
  };

  const loadBundleWithOverlay = async (bundle: BundleName): Promise<void> => {
    loadingOverlay.show();

    try {
      await Assets.loadBundle(bundle, (progress) => {
        loadingOverlay.setProgress(progress);
      });

      loadingOverlay.setProgress(1);
    } finally {
      loadingOverlay.hide();
    }
  };

  const openMenu = (): void => {
    if (isLoading) {
      return;
    }

    showScene(
      new MainMenuScene({
        onSelect: async (sceneId) => {
          if (isLoading) {
            return;
          }

          const sceneConfig = sceneFactories[sceneId];

          isLoading = true;

          try {
            if (sceneConfig.bundle) {
              await loadBundleWithOverlay(sceneConfig.bundle);
            }

            showScene(sceneConfig.create());
          } finally {
            isLoading = false;
          }
        },
      }),
    );
  };

  const sceneFactories: Record<
    MenuSceneId,
    { create: () => Scene; bundle?: BundleName }
  > = {
    [SceneId.AceOfShadows]: {
      create: () =>
        new AceOfShadowsScene({
          onBackToMenu: openMenu,
        }),
      bundle: BundleName.AceOfShadows,
    },

    [SceneId.MagicWords]: {
      create: () =>
        new MagicWordsScene({
          onBackToMenu: openMenu,
        }),
      bundle: BundleName.MagicWords,
    },

    [SceneId.PhoenixFlame]: {
      create: () =>
        new PhoenixFlameScene({
          onBackToMenu: openMenu,
        }),
      bundle: BundleName.PhoenixFlame,
    },
  };

  const isFullscreen = (): boolean => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
    };

    return (
      document.fullscreenElement !== null ||
      doc.webkitFullscreenElement !== null
    );
  };

  const updateFullscreenButtonState = (): void => {
    if (!fullscreenSupported) {
      fullscreenButton.setLabel("Missing Fullscreen");
      fullscreenButton.setEnabled(false);
      return;
    }

    fullscreenButton.setEnabled(true);
    fullscreenButton.setLabel(
      isFullscreen() ? "Exit Fullscreen" : "Enter Fullscreen",
    );
  };

  const toggleFullscreen = async (): Promise<void> => {
    if (!fullscreenSupported) {
      return;
    }

    const element = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    try {
      if (isFullscreen()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else {
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        }
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    } finally {
      updateFullscreenButtonState();
      requestRelayout();
    }
  };

  const fullscreenButton = new UIButton({
    label: "Enter Fullscreen",
    width: FULLSCREEN_BUTTON_WIDTH,
    height: FULLSCREEN_BUTTON_HEIGHT,
    fontSize: FULLSCREEN_BUTTON_FONT_SIZE,
    onClick: () => {
      if (isLoading || !fullscreenSupported) {
        return;
      }

      void toggleFullscreen();
    },
  });

  uiLayer.addChild(fullscreenButton);

  function layout(width: number, height: number): void {
    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;

    const scale = isMobile ? MOBILE_UI_SCALE : 1;

    const buttonWidth = FULLSCREEN_BUTTON_WIDTH * scale;
    const buttonHeight = FULLSCREEN_BUTTON_HEIGHT * scale;

    const safeAreaTop = getSafeAreaInsetPx("--sat");
    const safeAreaRight = getSafeAreaInsetPx("--sar");

    const marginX = FULLSCREEN_BUTTON_MARGIN_X + safeAreaRight;
    const marginY = FULLSCREEN_BUTTON_MARGIN_Y + safeAreaTop;

    const buttonFontSize = FULLSCREEN_BUTTON_FONT_SIZE * scale;
    const fpsFontSize = FPS_FONT_SIZE * scale;

    worldLayer.position.set(width * 0.5, height * 0.5);

    fullscreenButton.resize(buttonWidth, buttonHeight, buttonFontSize);
    fullscreenButton.position.set(width - buttonWidth - marginX, marginY);

    fps.view.style.fontSize = fpsFontSize;
    fps.view.position.set(12 * scale, 10 * scale);

    loadingOverlay.resize(width, height, scale);
  }

  let needsRelayout = true;

  const requestRelayout = (): void => {
    needsRelayout = true;
  };

  const requestRelayoutTwice = (): void => {
    needsRelayout = true;

    requestAnimationFrame(() => {
      needsRelayout = true;
    });

    window.setTimeout(() => {
      needsRelayout = true;
    }, 150);
  };

  document.addEventListener("fullscreenchange", () => {
    updateFullscreenButtonState();
    requestRelayoutTwice();
  });

  window.addEventListener("resize", requestRelayout);
  window.screen.orientation?.addEventListener?.("change", requestRelayoutTwice);
  window.visualViewport?.addEventListener?.("resize", requestRelayoutTwice);

  updateFullscreenButtonState();

  let previousTime = performance.now();
  let previousWidth = app.screen.width;
  let previousHeight = app.screen.height;

  layout(previousWidth, previousHeight);
  sceneManager.resize(previousWidth, previousHeight);

  app.ticker.add(() => {
    const now = performance.now();

    const deltaTimeMs = now - previousTime;
    previousTime = now;

    const { width, height } = app.screen;
    const sizeChanged = width !== previousWidth || height !== previousHeight;

    if (sizeChanged || needsRelayout) {
      previousWidth = width;
      previousHeight = height;
      needsRelayout = false;

      layout(width, height);
      sceneManager.resize(width, height);
    }

    fps.update(deltaTimeMs);

    sceneManager.update({
      width,
      height,
      deltaTimeMs,
    });
  });

  await loadBundleWithOverlay(BundleName.Shared);

  openMenu();
}

void bootstrap();
