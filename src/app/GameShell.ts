import { Application, Assets, Container } from "pixi.js";

import { type Scene } from "../core/Scene";
import { SceneManager } from "../core/SceneManager";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { PLAYABLE_SCENE_BY_ID } from "../scenes/sceneCatalog";
import { FPSCounter } from "../ui/FPSCounter";
import { IntroOverlay } from "../ui/IntroOverlay";
import { LoadingOverlay } from "../ui/LoadingOverlay";
import { UIButton } from "../ui/UIButton";
import { getSafeAreaInsetPx } from "../utils/safeArea";
import {
  isFullscreenActive,
  isFullscreenSupported,
  toggleFullscreen,
} from "../utils/fullscreen";

import { AudioManager } from "./AudioManager";
import {
  BundleName,
  MOBILE_BREAKPOINT,
  MOBILE_UI_SCALE,
  SceneId,
  type PlayableSceneId,
} from "./config";
import { createApp } from "./createApp";
import {
  readMusicEnabledPreference,
  writeMusicEnabledPreference,
} from "./audioPreferences";

const FULLSCREEN_BUTTON_MARGIN_X = 20;
const FULLSCREEN_BUTTON_MARGIN_Y = 40;
const MUTE_BUTTON_MARGIN_Y = 28;
const CONTROL_BUTTON_WIDTH = 220;
const CONTROL_BUTTON_HEIGHT = 56;
const CONTROL_BUTTON_FONT_SIZE = 22;

const FPS_MARGIN_X = 12;
const FPS_MARGIN_Y = 10;
const MUTE_ENABLED_LABEL = "Mute Sounds";
const MUTE_DISABLED_LABEL = "Enable Sounds";
const RELAYOUT_SETTLE_TIMEOUTS_MS = [100, 250, 500, 1000] as const;

/**
 * Bootstraps the Pixi app and hands execution over to the shell.
 */
export async function bootstrapGame(): Promise<void> {
  const app = await createApp();
  const shell = new GameShell(app);

  shell.start();
}

/**
 * App-level orchestrator that sits above individual scenes.
 *
 * It owns the persistent UI overlays, manages scene transitions, coordinates
 * bundle loading, and keeps layout/audio controls responsive across devices.
 */
class GameShell {
  // Gameplay content and shell UI live on separate layers so scene changes never
  // disturb overlays or global controls.
  private readonly _worldLayer = new Container();
  private readonly _uiLayer = new Container();
  private readonly _sceneManager = new SceneManager(this._worldLayer);

  private readonly _audioManager = new AudioManager(
    !readMusicEnabledPreference(),
  );

  private readonly _fpsCounter = new FPSCounter();
  private readonly _loadingOverlay = new LoadingOverlay();

  private readonly _introOverlay = new IntroOverlay({
    onEnter: () => {
      void this._enterDemo();
    },
  });

  private readonly _fullscreenButton = new UIButton({
    label: "Enter Fullscreen",
    width: CONTROL_BUTTON_WIDTH,
    height: CONTROL_BUTTON_HEIGHT,
    fontSize: CONTROL_BUTTON_FONT_SIZE,
    onClick: () => {
      void this._handleFullscreenToggle();
    },
  });

  private readonly _muteButton = new UIButton({
    label: this._audioManager.isMuted
      ? MUTE_DISABLED_LABEL
      : MUTE_ENABLED_LABEL,
    width: CONTROL_BUTTON_WIDTH,
    height: CONTROL_BUTTON_HEIGHT,
    fontSize: CONTROL_BUTTON_FONT_SIZE,
    onClick: () => {
      void this._toggleMute();
    },
  });

  private readonly _fullscreenSupported = isFullscreenSupported();

  private _hasEnteredGame = false;
  private _isLoading = false;
  private _isEnteringDemo = false;
  private _needsRelayout = true;
  private _previousTime = performance.now();
  private _previousWidth: number;
  private _previousHeight: number;
  private _relayoutFrameId: number | null = null;
  private readonly _relayoutTimeoutIds = new Set<number>();

  public constructor(private readonly _app: Application) {
    this._previousWidth = this._app.screen.width;
    this._previousHeight = this._app.screen.height;

    this._app.stage.addChild(this._worldLayer, this._uiLayer);

    this._fullscreenButton.visible = false;
    this._muteButton.visible = false;
    this._introOverlay.show();

    this._uiLayer.addChild(
      this._fpsCounter.view,
      this._loadingOverlay,
      this._fullscreenButton,
      this._muteButton,
      this._introOverlay,
    );
  }

  public start(): void {
    this._bindEvents();
    this._updateFullscreenButtonState();
    this._updateMuteButtonState();
    this._relayout(this._previousWidth, this._previousHeight);
    this._sceneManager.resize(this._previousWidth, this._previousHeight);
    this._app.ticker.add(this._tick);
  }

  private readonly _tick = (): void => {
    const now = performance.now();
    const deltaTimeMs = now - this._previousTime;
    this._previousTime = now;

    const { width, height } = this._app.screen;
    const sizeChanged =
      width !== this._previousWidth || height !== this._previousHeight;

    if (sizeChanged || this._needsRelayout) {
      this._previousWidth = width;
      this._previousHeight = height;
      this._needsRelayout = false;

      this._relayout(width, height);
      this._sceneManager.resize(width, height);
    }

    this._fpsCounter.update(deltaTimeMs);

    this._sceneManager.update({
      width,
      height,
      deltaTimeMs,
    });
  };

  private readonly _handleFullscreenChange = (): void => {
    this._updateFullscreenButtonState();
    this._requestRelayoutSettled();
  };

  private readonly _requestRelayout = (): void => {
    // Pixi auto-resize listens to window resize, but mobile browsers can update
    // the container size after the first event. Re-queueing a measurement here
    // lets follow-up settle passes catch those delayed viewport changes.
    this._app.queueResize();
    this._needsRelayout = true;
  };

  private readonly _requestRelayoutSettled = (): void => {
    this._requestRelayout();
    this._clearScheduledRelayouts();

    // Mobile rotation and fullscreen transitions can keep updating CSS viewport
    // units and safe-area values after the first resize event, especially on
    // iOS browsers. Keep nudging Pixi/layout for a short settle window.
    this._relayoutFrameId = requestAnimationFrame(() => {
      this._relayoutFrameId = null;
      this._requestRelayout();
    });

    for (const delayMs of RELAYOUT_SETTLE_TIMEOUTS_MS) {
      const timeoutId = window.setTimeout(() => {
        this._relayoutTimeoutIds.delete(timeoutId);
        this._requestRelayout();
      }, delayMs);

      this._relayoutTimeoutIds.add(timeoutId);
    }
  };

  private _bindEvents(): void {
    document.addEventListener("fullscreenchange", this._handleFullscreenChange);
    window.addEventListener("resize", this._requestRelayoutSettled);
    window.addEventListener("orientationchange", this._requestRelayoutSettled);
    window.screen.orientation?.addEventListener?.(
      "change",
      this._requestRelayoutSettled,
    );
    window.visualViewport?.addEventListener?.(
      "resize",
      this._requestRelayoutSettled,
    );
  }

  private _clearScheduledRelayouts(): void {
    if (this._relayoutFrameId !== null) {
      cancelAnimationFrame(this._relayoutFrameId);
      this._relayoutFrameId = null;
    }

    for (const timeoutId of this._relayoutTimeoutIds) {
      window.clearTimeout(timeoutId);
    }

    this._relayoutTimeoutIds.clear();
  }

  private _showScene(scene: Scene): void {
    this._sceneManager.changeScene(
      scene,
      this._app.screen.width,
      this._app.screen.height,
    );
  }

  private async _loadBundleWithOverlay(bundle: BundleName): Promise<void> {
    this._loadingOverlay.show();

    try {
      // Bundles are scene-scoped, so the menu stays fast and each showcase loads
      // only what it needs.
      await Assets.loadBundle(bundle, (progress) => {
        this._loadingOverlay.setProgress(progress);
      });

      this._loadingOverlay.setProgress(1);
    } finally {
      this._loadingOverlay.hide();
    }
  }

  private async _openMenu(): Promise<void> {
    if (this._isLoading || !this._hasEnteredGame) {
      return;
    }

    await this._audioManager.playMusicForScene(SceneId.MainMenu);

    this._showScene(
      new MainMenuScene({
        onSelect: (sceneId) => {
          void this._openPlayableScene(sceneId);
        },
      }),
    );
  }

  private async _openPlayableScene(sceneId: PlayableSceneId): Promise<void> {
    if (this._isLoading) {
      return;
    }

    const sceneDefinition = PLAYABLE_SCENE_BY_ID[sceneId];
    this._isLoading = true;

    try {
      await this._loadBundleWithOverlay(sceneDefinition.bundle);
      await this._audioManager.playMusicForScene(sceneId);

      this._showScene(
        sceneDefinition.create({
          onBackToMenu: () => {
            void this._openMenu();
          },
        }),
      );
    } finally {
      this._isLoading = false;
    }
  }

  private async _enterDemo(): Promise<void> {
    if (this._isLoading || this._hasEnteredGame || this._isEnteringDemo) {
      return;
    }

    this._isEnteringDemo = true;
    this._introOverlay.setSubtitle("Preparing audio and menu...");
    this._introOverlay.setButtonEnabled(false);
    this._introOverlay.setButtonLabel("Loading...");
    this._requestRelayout();

    try {
      this._hasEnteredGame = true;
      await this._openMenu();
      this._introOverlay.hide();
      this._updateFullscreenButtonState();
      this._updateMuteButtonState();
    } catch (error) {
      this._hasEnteredGame = false;
      console.error("Failed to enter the demo:", error);
      this._introOverlay.setSubtitle("Failed to enter the demo");
      this._introOverlay.setButtonEnabled(true);
      this._introOverlay.setButtonLabel("Retry");
    } finally {
      this._isEnteringDemo = false;
      this._requestRelayout();
    }
  }

  private async _handleFullscreenToggle(): Promise<void> {
    if (
      !this._fullscreenSupported ||
      !this._hasEnteredGame ||
      this._isLoading
    ) {
      return;
    }

    try {
      await toggleFullscreen();
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    } finally {
      this._updateFullscreenButtonState();
      this._requestRelayout();
    }
  }

  private async _toggleMute(): Promise<void> {
    if (!this._hasEnteredGame) {
      return;
    }

    const nextIsMuted = !this._audioManager.isMuted;

    await this._audioManager.setMuted(nextIsMuted);
    writeMusicEnabledPreference(!nextIsMuted);
    this._updateMuteButtonState();
  }

  private _updateFullscreenButtonState(): void {
    if (!this._hasEnteredGame) {
      this._fullscreenButton.visible = false;
      return;
    }

    this._fullscreenButton.visible = true;

    if (!this._fullscreenSupported) {
      this._fullscreenButton.setLabel("Missing Fullscreen");
      this._fullscreenButton.setEnabled(false);
      return;
    }

    this._fullscreenButton.setEnabled(true);
    this._fullscreenButton.setLabel(
      isFullscreenActive() ? "Exit Fullscreen" : "Enter Fullscreen",
    );
  }

  private _updateMuteButtonState(): void {
    this._muteButton.visible = this._hasEnteredGame;
    this._muteButton.setEnabled(true);
    this._muteButton.setLabel(
      this._audioManager.isMuted ? MUTE_DISABLED_LABEL : MUTE_ENABLED_LABEL,
    );
  }

  private _relayout(width: number, height: number): void {
    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;
    const scale = isMobile ? MOBILE_UI_SCALE : 1;

    // Read CSS safe-area values so controls stay clear of notches and home bars.
    const safeAreaTop = getSafeAreaInsetPx("--sat");
    const safeAreaRight = getSafeAreaInsetPx("--sar");
    const safeAreaBottom = getSafeAreaInsetPx("--sab");
    const safeAreaLeft = getSafeAreaInsetPx("--sal");

    const buttonWidth = CONTROL_BUTTON_WIDTH * scale;
    const buttonHeight = CONTROL_BUTTON_HEIGHT * scale;
    const buttonFontSize = CONTROL_BUTTON_FONT_SIZE * scale;

    const fpsMarginX = FPS_MARGIN_X * scale + safeAreaLeft;
    const fpsMarginY = FPS_MARGIN_Y * scale + safeAreaTop;

    const buttonMarginX = FULLSCREEN_BUTTON_MARGIN_X + safeAreaRight;
    const buttonMarginY = FULLSCREEN_BUTTON_MARGIN_Y + safeAreaTop;
    const bottomButtonMarginY = MUTE_BUTTON_MARGIN_Y + safeAreaBottom;

    this._worldLayer.position.set(width * 0.5, height * 0.5);

    this._fullscreenButton.resize(buttonWidth, buttonHeight, buttonFontSize);
    this._fullscreenButton.position.set(
      width - buttonWidth - buttonMarginX,
      buttonMarginY,
    );

    this._muteButton.resize(buttonWidth, buttonHeight, buttonFontSize);
    this._muteButton.position.set(
      width - buttonWidth - buttonMarginX,
      height - buttonHeight - bottomButtonMarginY,
    );

    this._fpsCounter.layout(fpsMarginX, fpsMarginY, 20 * scale);
    this._loadingOverlay.resize(width, height, scale);
    this._introOverlay.layout(width, height, scale);
  }
}
