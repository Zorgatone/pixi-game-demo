import {
  Assets,
  type BLEND_MODES,
  Container,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";

import {
  SceneId,
  MOBILE_UI_SCALE,
  MOBILE_GAME_SCALE,
  MOBILE_BREAKPOINT,
} from "../app/config";

import { Scene, type SceneContext } from "../core/Scene";
import { UIButton } from "../ui/UIButton";
import { getSafeAreaInsetPx } from "../utils/safeArea";

interface PhoenixSceneCallbacks {
  onBackToMenu: () => void;
}

const LABEL_FONT_SIZE = 36;

const BACK_BUTTON_MARGIN_X = 20;
const BACK_BUTTON_MARGIN_Y = 40;

const BACK_BUTTON_WIDTH = 220;
const BACK_BUTTON_HEIGHT = 56;
const BACK_BUTTON_FONT_SIZE = 22;

type FlameAssetAlias =
  | "halo"
  | "flame_large"
  | "flame_medium"
  | "flame_small"
  | "ember"
  | "spark";

interface FlamePartConfig {
  key: string;
  alias: FlameAssetAlias;
  blendMode?: BLEND_MODES;
  baseX: number;
  baseY: number;
  baseScale: number;
  baseAlpha: number;
  bobAmplitudeY: number;
  swayAmplitudeX: number;
  scaleAmplitude: number;
  alphaAmplitude: number;
  rotationAmplitude: number;
  speed: number;
  phase: number;
}

interface FlamePart {
  sprite: Sprite;
  config: FlamePartConfig;
}

const FLAME_PARTS: FlamePartConfig[] = [
  {
    key: "halo",
    alias: "halo",
    blendMode: "add",
    baseX: 0,
    baseY: 12,
    baseScale: 1.18,
    baseAlpha: 0.6,
    bobAmplitudeY: 6,
    swayAmplitudeX: 0,
    scaleAmplitude: 0.035,
    alphaAmplitude: 0.12,
    rotationAmplitude: 0.01,
    speed: 1.2,
    phase: 0.1,
  },
  {
    key: "backLarge",
    alias: "flame_large",
    blendMode: "add",
    baseX: 0,
    baseY: 28,
    baseScale: 0.92,
    baseAlpha: 0.82,
    bobAmplitudeY: 8,
    swayAmplitudeX: 4,
    scaleAmplitude: 0.04,
    alphaAmplitude: 0.08,
    rotationAmplitude: 0.02,
    speed: 1.45,
    phase: 0.35,
  },
  {
    key: "leftBack",
    alias: "flame_medium",
    blendMode: "add",
    baseX: -78,
    baseY: 64,
    baseScale: 0.72,
    baseAlpha: 0.78,
    bobAmplitudeY: 10,
    swayAmplitudeX: 8,
    scaleAmplitude: 0.05,
    alphaAmplitude: 0.1,
    rotationAmplitude: 0.06,
    speed: 1.9,
    phase: 1.15,
  },
  {
    key: "rightBack",
    alias: "flame_medium",
    blendMode: "add",
    baseX: 78,
    baseY: 64,
    baseScale: 0.72,
    baseAlpha: 0.78,
    bobAmplitudeY: 10,
    swayAmplitudeX: 8,
    scaleAmplitude: 0.05,
    alphaAmplitude: 0.1,
    rotationAmplitude: 0.06,
    speed: 1.9,
    phase: 2.2,
  },
  {
    key: "coreLarge",
    alias: "flame_large",
    blendMode: "add",
    baseX: 0,
    baseY: 74,
    baseScale: 0.66,
    baseAlpha: 0.96,
    bobAmplitudeY: 12,
    swayAmplitudeX: 6,
    scaleAmplitude: 0.06,
    alphaAmplitude: 0.08,
    rotationAmplitude: 0.025,
    speed: 2.25,
    phase: 0.75,
  },
  {
    key: "leftFront",
    alias: "flame_small",
    blendMode: "add",
    baseX: -64,
    baseY: 132,
    baseScale: 0.68,
    baseAlpha: 0.88,
    bobAmplitudeY: 9,
    swayAmplitudeX: 9,
    scaleAmplitude: 0.06,
    alphaAmplitude: 0.12,
    rotationAmplitude: 0.08,
    speed: 2.7,
    phase: 1.8,
  },
  {
    key: "rightFront",
    alias: "flame_small",
    blendMode: "add",
    baseX: 64,
    baseY: 132,
    baseScale: 0.68,
    baseAlpha: 0.88,
    bobAmplitudeY: 9,
    swayAmplitudeX: 9,
    scaleAmplitude: 0.06,
    alphaAmplitude: 0.12,
    rotationAmplitude: 0.08,
    speed: 2.7,
    phase: 2.95,
  },
  {
    key: "leftEmber",
    alias: "ember",
    blendMode: "add",
    baseX: -118,
    baseY: 92,
    baseScale: 0.46,
    baseAlpha: 0.84,
    bobAmplitudeY: 18,
    swayAmplitudeX: 7,
    scaleAmplitude: 0.08,
    alphaAmplitude: 0.22,
    rotationAmplitude: 0.18,
    speed: 3.1,
    phase: 0.9,
  },
  {
    key: "rightEmber",
    alias: "ember",
    blendMode: "add",
    baseX: 118,
    baseY: 88,
    baseScale: 0.46,
    baseAlpha: 0.84,
    bobAmplitudeY: 18,
    swayAmplitudeX: 7,
    scaleAmplitude: 0.08,
    alphaAmplitude: 0.22,
    rotationAmplitude: 0.18,
    speed: 3.35,
    phase: 2.45,
  },
  {
    key: "spark",
    alias: "spark",
    blendMode: "add",
    baseX: 0,
    baseY: 160,
    baseScale: 0.44,
    baseAlpha: 0.95,
    bobAmplitudeY: 5,
    swayAmplitudeX: 0,
    scaleAmplitude: 0.14,
    alphaAmplitude: 0.2,
    rotationAmplitude: 0.2,
    speed: 4.2,
    phase: 0.4,
  },
];

export class PhoenixFlameScene extends Scene {
  public readonly id = SceneId.PhoenixFlame;

  private readonly _label: Text;
  private readonly _backButton: UIButton;
  private readonly _effectRoot = new Container();
  private readonly _flameParts: FlamePart[] = [];

  private _elapsedSeconds = 0;
  private _effectScale = 1;

  public constructor(private readonly _callbacks: PhoenixSceneCallbacks) {
    super();

    this._label = new Text({
      text: "Phoenix Flame",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: LABEL_FONT_SIZE,
        fontWeight: "bold",
      }),
    });

    this._label.anchor.set(0.5);

    this._backButton = new UIButton({
      label: "Back to Menu",
      width: BACK_BUTTON_WIDTH,
      height: BACK_BUTTON_HEIGHT,
      fontSize: BACK_BUTTON_FONT_SIZE,
      onClick: this._callbacks.onBackToMenu,
    });

    this._createFlameSprites();

    this.root.addChild(this._effectRoot, this._label, this._backButton);
  }

  public override onResize(width: number, height: number): void {
    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;

    const uiScale = isMobile ? MOBILE_UI_SCALE : 1;
    this._effectScale = isMobile ? MOBILE_GAME_SCALE : 1;

    const safeAreaTop = getSafeAreaInsetPx("--sat");
    const safeAreaLeft = getSafeAreaInsetPx("--sal");

    this._label.style.fontSize = LABEL_FONT_SIZE * uiScale;
    this._label.position.set(0, -height * 0.36);

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

  public override update(context: SceneContext): void {
    this._elapsedSeconds += context.deltaTimeMs / 1000;

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
