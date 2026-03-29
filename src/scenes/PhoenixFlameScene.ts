import { Assets, Container, Sprite, Text, TextStyle, Texture } from "pixi.js";

import {
  startGlobalLoopedSoundEffect,
  stopGlobalLoopedSoundEffect,
} from "../app/AudioManager";
import {
  SceneId,
  MOBILE_UI_SCALE,
  MOBILE_GAME_SCALE,
  MOBILE_BREAKPOINT,
} from "../app/config";
import { AssetAlias } from "../assets/aliases";
import { Scene, type SceneContext } from "../core/Scene";
import { UIButton } from "../ui/UIButton";
import { UI_FONT_FAMILY } from "../ui/fonts";
import { getSafeAreaInsetPx } from "../utils/safeArea";

import { FLAME_PARTS, type FlamePartConfig } from "./phoenixFlame/flameParts";

interface PhoenixSceneCallbacks {
  onBackToMenu: () => void;
}

const LABEL_FONT_SIZE = 36;

const BACK_BUTTON_MARGIN_X = 20;
const BACK_BUTTON_MARGIN_Y = 40;

const BACK_BUTTON_WIDTH = 220;
const BACK_BUTTON_HEIGHT = 56;
const BACK_BUTTON_FONT_SIZE = 22;

interface FlamePart {
  sprite: Sprite;
  config: FlamePartConfig;
}

/**
 * Data-driven layered flame effect built from a handful of animated sprites.
 */
export class PhoenixFlameScene extends Scene {
  public readonly id = SceneId.PhoenixFlame;

  private readonly _title: Text;
  private readonly _backButton: UIButton;
  private readonly _effectRoot = new Container();
  private readonly _flameParts: FlamePart[] = [];

  private _elapsedSeconds = 0;
  private _effectScale = 1;

  public constructor(private readonly _callbacks: PhoenixSceneCallbacks) {
    super();

    this._title = new Text({
      text: "Phoenix Flame",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: LABEL_FONT_SIZE,
        fontFamily: UI_FONT_FAMILY,
        fontWeight: "bold",
      }),
    });

    this._title.anchor.set(0.5);

    this._backButton = new UIButton({
      label: "Back to Menu",
      width: BACK_BUTTON_WIDTH,
      height: BACK_BUTTON_HEIGHT,
      fontSize: BACK_BUTTON_FONT_SIZE,
      onClick: this._callbacks.onBackToMenu,
    });

    this._createFlameSprites();

    this.root.addChild(this._effectRoot, this._title, this._backButton);
  }

  public override onResize(width: number, height: number): void {
    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;

    const uiScale = isMobile ? MOBILE_UI_SCALE : 1;
    this._effectScale = isMobile ? MOBILE_GAME_SCALE : 1;

    const safeAreaTop = getSafeAreaInsetPx("--sat");
    const safeAreaLeft = getSafeAreaInsetPx("--sal");

    this._title.style.fontSize = LABEL_FONT_SIZE * uiScale;
    this._title.position.set(0, -height * 0.36);

    const buttonWidth = BACK_BUTTON_WIDTH * uiScale;
    const buttonHeight = BACK_BUTTON_HEIGHT * uiScale;
    const buttonFontSize = BACK_BUTTON_FONT_SIZE * uiScale;

    this._backButton.resize(buttonWidth, buttonHeight, buttonFontSize);

    this._backButton.position.set(
      -width * 0.5 + BACK_BUTTON_MARGIN_X + safeAreaLeft,
      -height * 0.5 + BACK_BUTTON_MARGIN_Y + safeAreaTop,
    );

    // shifted 20px downward
    this._effectRoot.position.set(0, 20);

    this._applyEffectLayout();
  }

  public override onEnter(): void {
    startGlobalLoopedSoundEffect(AssetAlias.FireCrackling);
  }

  public override onExit(): void {
    stopGlobalLoopedSoundEffect(AssetAlias.FireCrackling);
  }

  public override update(context: SceneContext): void {
    this._elapsedSeconds += context.deltaTimeMs / 1000;

    // A subtle shared pulse ties the independently animated layers together.
    const globalPulse = 1 + Math.sin(this._elapsedSeconds * 2.1) * 0.025;

    for (const part of this._flameParts) {
      const { sprite, config } = part;

      const t = this._elapsedSeconds * config.speed + config.phase;

      const swayX = Math.sin(t) * config.swayAmplitudeX;
      const bobY = Math.sin(t * 1.15) * config.bobAmplitudeY;
      const localScale = 1 + Math.sin(t * 1.3) * config.scaleAmplitude;
      const localAlpha =
        config.baseAlpha + Math.sin(t * 1.8) * config.alphaAmplitude;
      const rotation = Math.sin(t * 0.95) * config.rotationAmplitude;

      sprite.position.set(
        (config.baseX + swayX) * this._effectScale,
        (config.baseY + bobY) * this._effectScale,
      );

      const finalScale =
        config.baseScale * localScale * globalPulse * this._effectScale;

      sprite.scale.set(finalScale);
      sprite.alpha = Math.max(0, Math.min(1, localAlpha));
      sprite.rotation = rotation;
    }
  }

  private _createFlameSprites(): void {
    for (const config of FLAME_PARTS) {
      // Flame behavior is authored entirely through config so art and timing can
      // be tuned without rewriting the update loop.
      const texture =
        (Assets.get(config.alias) as Texture | undefined) ?? Texture.WHITE;

      const sprite = new Sprite(texture);

      sprite.anchor.set(0.5);
      sprite.blendMode = config.blendMode ?? "normal";

      this._effectRoot.addChild(sprite);

      this._flameParts.push({ sprite, config });
    }

    this._applyEffectLayout();
  }

  private _applyEffectLayout(): void {
    for (const part of this._flameParts) {
      const { sprite, config } = part;

      sprite.position.set(
        config.baseX * this._effectScale,
        config.baseY * this._effectScale,
      );

      sprite.scale.set(config.baseScale * this._effectScale);
      sprite.alpha = config.baseAlpha;
      sprite.rotation = 0;
    }
  }
}
