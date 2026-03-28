import { Assets, Container, Graphics, Text, TextStyle } from "pixi.js";

import { AudioManager } from "./app/AudioManager";
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
import { getSafeAreaInsetPx } from "./utils/safeArea";

const MUSIC_COOKIE_NAME = "pixi-game-demo-music-enabled";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const FULLSCREEN_BUTTON_MARGIN_X = 20;
const FULLSCREEN_BUTTON_MARGIN_Y = 40;
const MUTE_BUTTON_MARGIN_Y = 28;
const FULLSCREEN_BUTTON_WIDTH = 220;
const FULLSCREEN_BUTTON_HEIGHT = 56;
const FULLSCREEN_BUTTON_FONT_SIZE = 22;

const FPS_FONT_SIZE = 20;
const FPS_MARGIN_X = 12;
const FPS_MARGIN_Y = 10;

const INTRO_PANEL_WIDTH = 520;
const INTRO_PANEL_HEIGHT = 300;
const INTRO_BUTTON_WIDTH = 240;
const INTRO_BUTTON_HEIGHT = 60;
const INTRO_BUTTON_FONT_SIZE = 24;
const INTRO_TITLE_FONT_SIZE = 42;
const INTRO_SUBTITLE_FONT_SIZE = 22;

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

function readMusicEnabledCookie(): boolean {
  const cookiePrefix = `${MUSIC_COOKIE_NAME}=`;

  for (const cookie of document.cookie.split(";")) {
    const trimmedCookie = cookie.trim();

    if (!trimmedCookie.startsWith(cookiePrefix)) {
      continue;
    }

    return trimmedCookie.slice(cookiePrefix.length) !== "false";
  }

  return true;
}

function writeMusicEnabledCookie(isEnabled: boolean): void {
  document.cookie = [
    `${MUSIC_COOKIE_NAME}=${String(isEnabled)}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ].join("; ");
}

async function bootstrap(): Promise<void> {
  const app = await createApp();

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const worldLayer = new Container();
  const uiLayer = new Container();

  app.stage.addChild(worldLayer, uiLayer);

  const sceneManager = new SceneManager(worldLayer);
  const audioManager = new AudioManager(!readMusicEnabledCookie());

  const fps = new FPSCounter();
  uiLayer.addChild(fps.view);

  const loadingOverlay = new LoadingOverlay();
  uiLayer.addChild(loadingOverlay);

  let isLoading = false;
  let hasEnteredGame = false;
  let isEnteringDemo = false;

  const fullscreenSupported = isFullscreenSupported();

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

  const openMenu = async (): Promise<void> => {
    if (isLoading || !hasEnteredGame) {
      return;
    }

    await audioManager.playMusicForScene(SceneId.MainMenu);

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

            await audioManager.playMusicForScene(sceneId);
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
          onBackToMenu: () => {
            void openMenu();
          },
        }),
      bundle: BundleName.AceOfShadows,
    },

    [SceneId.MagicWords]: {
      create: () =>
        new MagicWordsScene({
          onBackToMenu: () => {
            void openMenu();
          },
        }),
      bundle: BundleName.MagicWords,
    },

    [SceneId.PhoenixFlame]: {
      create: () =>
        new PhoenixFlameScene({
          onBackToMenu: () => {
            void openMenu();
          },
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
    if (!hasEnteredGame) {
      fullscreenButton.visible = false;
      return;
    }

    fullscreenButton.visible = true;

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

  const updateMuteButtonState = (): void => {
    muteButton.visible = hasEnteredGame;
    muteButton.setEnabled(true);
    muteButton.setLabel(audioManager.isMuted ? "Enable Sounds" : "Mute Sounds");
  };

  const toggleFullscreen = async (): Promise<void> => {
    if (!fullscreenSupported || !hasEnteredGame) {
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
      if (isLoading || !fullscreenSupported || !hasEnteredGame) {
        return;
      }

      void toggleFullscreen();
    },
  });

  fullscreenButton.visible = false;
  uiLayer.addChild(fullscreenButton);

  const muteButton = new UIButton({
    label: audioManager.isMuted ? "Enable Music" : "Mute Music",
    width: FULLSCREEN_BUTTON_WIDTH,
    height: FULLSCREEN_BUTTON_HEIGHT,
    fontSize: FULLSCREEN_BUTTON_FONT_SIZE,
    onClick: () => {
      if (!hasEnteredGame) {
        return;
      }

      void (async () => {
        const nextIsMuted = !audioManager.isMuted;
        await audioManager.setMuted(nextIsMuted);
        writeMusicEnabledCookie(!nextIsMuted);
        updateMuteButtonState();
      })();
    },
  });

  muteButton.visible = false;
  uiLayer.addChild(muteButton);

  const introOverlay = new Container();
  const introDim = new Graphics();
  const introPanel = new Graphics();

  const introTitle = new Text({
    text: "PIXI 8 Game Demo",
    style: new TextStyle({
      fill: 0xffffff,
      fontSize: INTRO_TITLE_FONT_SIZE,
      fontWeight: "bold",
      align: "center",
    }),
  });
  introTitle.anchor.set(0.5);

  const introSubtitle = new Text({
    text: "Tap below to enter the demo",
    style: new TextStyle({
      fill: 0xd6daf5,
      fontSize: INTRO_SUBTITLE_FONT_SIZE,
      align: "center",
    }),
  });
  introSubtitle.anchor.set(0.5);

  const introButton = new UIButton({
    label: "Enter Demo",
    width: INTRO_BUTTON_WIDTH,
    height: INTRO_BUTTON_HEIGHT,
    fontSize: INTRO_BUTTON_FONT_SIZE,
    playClickSound: false,
    onClick: () => {
      if (isLoading || hasEnteredGame || isEnteringDemo) {
        return;
      }

      void (async () => {
        isEnteringDemo = true;
        introSubtitle.text = "Preparing audio and menu…";
        introButton.setEnabled(false);
        introButton.setLabel("Loading…");
        requestRelayout();

        try {
          hasEnteredGame = true;
          await openMenu();
          introOverlay.visible = false;
          updateFullscreenButtonState();
          updateMuteButtonState();
        } catch (error) {
          hasEnteredGame = false;
          console.error("Failed to enter the demo:", error);
          introSubtitle.text = "Failed to enter the demo";
          introButton.setEnabled(true);
          introButton.setLabel("Retry");
        } finally {
          isEnteringDemo = false;
          requestRelayout();
        }
      })();
    },
  });

  introOverlay.addChild(
    introDim,
    introPanel,
    introTitle,
    introSubtitle,
    introButton,
  );
  introOverlay.visible = false;
  uiLayer.addChild(introOverlay);

  function layout(width: number, height: number): void {
    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;
    const scale = isMobile ? MOBILE_UI_SCALE : 1;

    const safeAreaTop = getSafeAreaInsetPx("--sat");
    const safeAreaRight = getSafeAreaInsetPx("--sar");
    const safeAreaBottom = getSafeAreaInsetPx("--sab");
    const safeAreaLeft = getSafeAreaInsetPx("--sal");

    const buttonWidth = FULLSCREEN_BUTTON_WIDTH * scale;
    const buttonHeight = FULLSCREEN_BUTTON_HEIGHT * scale;
    const buttonFontSize = FULLSCREEN_BUTTON_FONT_SIZE * scale;

    const fpsFontSize = FPS_FONT_SIZE * scale;
    const fpsMarginX = FPS_MARGIN_X * scale + safeAreaLeft;
    const fpsMarginY = FPS_MARGIN_Y * scale + safeAreaTop;

    const buttonMarginX = FULLSCREEN_BUTTON_MARGIN_X + safeAreaRight;
    const buttonMarginY = FULLSCREEN_BUTTON_MARGIN_Y + safeAreaTop;
    const bottomButtonMarginY = MUTE_BUTTON_MARGIN_Y + safeAreaBottom;

    worldLayer.position.set(width * 0.5, height * 0.5);

    fullscreenButton.resize(buttonWidth, buttonHeight, buttonFontSize);
    fullscreenButton.position.set(
      width - buttonWidth - buttonMarginX,
      buttonMarginY,
    );

    muteButton.resize(buttonWidth, buttonHeight, buttonFontSize);
    muteButton.position.set(
      width - buttonWidth - buttonMarginX,
      height - buttonHeight - bottomButtonMarginY,
    );

    fps.view.style.fontSize = fpsFontSize;
    fps.view.position.set(fpsMarginX, fpsMarginY);

    loadingOverlay.resize(width, height, scale);

    introDim.clear().rect(0, 0, width, height).fill({
      color: 0x000000,
      alpha: 0.7,
    });

    const panelWidth = INTRO_PANEL_WIDTH * scale;
    const panelHeight = INTRO_PANEL_HEIGHT * scale;
    const panelX = (width - panelWidth) * 0.5;
    const panelY = (height - panelHeight) * 0.5;

    introPanel
      .clear()
      .roundRect(panelX, panelY, panelWidth, panelHeight, 24)
      .fill(0x171726)
      .stroke({ color: 0x2d2d44, width: 2 });

    introTitle.style.fontSize = INTRO_TITLE_FONT_SIZE * scale;
    introSubtitle.style.fontSize = INTRO_SUBTITLE_FONT_SIZE * scale;

    introTitle.position.set(width * 0.5, panelY + panelHeight * 0.27);
    introSubtitle.position.set(width * 0.5, panelY + panelHeight * 0.48);

    const introButtonWidth = INTRO_BUTTON_WIDTH * scale;
    const introButtonHeight = INTRO_BUTTON_HEIGHT * scale;

    introButton.resize(
      introButtonWidth,
      introButtonHeight,
      INTRO_BUTTON_FONT_SIZE * scale,
    );
    introButton.position.set(
      width * 0.5 - introButtonWidth * 0.5,
      panelY + panelHeight * 0.66,
    );
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
  updateMuteButtonState();

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

  introOverlay.visible = true;
}

void bootstrap();
