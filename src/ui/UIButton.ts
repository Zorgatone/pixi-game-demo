import { Container, Graphics, Text, TextStyle } from "pixi.js";

import { playGlobalUiClickSound } from "../app/AudioManager";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 56;
const DEFAULT_RADIUS = 14;
const DEFAULT_FONT_SIZE = 22;

const NORMAL_FILL = 0x2c2c44;
const HOVER_FILL = 0x4a4a7a;
const DISABLED_FILL = 0x5a5a5a;
const NORMAL_TEXT_FILL = 0xffffff;
const DISABLED_TEXT_FILL = 0xcfcfcf;

export interface UIButtonOptions {
  label: string;
  width?: number;
  height?: number;
  fontSize?: number;
  playClickSound?: boolean;
  onClick: () => void;
}

export class UIButton extends Container {
  private readonly _bg: Graphics;
  private readonly _text: Text;

  private _width: number;
  private _height: number;
  private _fontSize: number;
  private _isEnabled = true;
  private readonly _playClickSound: boolean;
  private readonly _onClick: () => void;

  public constructor(options: UIButtonOptions) {
    super();

    this._width = options.width ?? DEFAULT_WIDTH;
    this._height = options.height ?? DEFAULT_HEIGHT;
    this._fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
    this._playClickSound = options.playClickSound ?? true;
    this._onClick = options.onClick;

    this._bg = new Graphics();

    this._text = new Text({
      text: options.label,
      style: new TextStyle({
        fill: NORMAL_TEXT_FILL,
        fontSize: this._fontSize,
      }),
    });

    this._text.anchor.set(0.5);

    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointertap", () => {
      if (!this._isEnabled) {
        return;
      }

      if (this._playClickSound) {
        playGlobalUiClickSound();
      }

      this._onClick();
    });

    this.on("pointerover", () => {
      if (!this._isEnabled) {
        return;
      }

      this._drawBackground(HOVER_FILL);
    });

    this.on("pointerout", () => {
      this._applyVisualState();
    });

    this.addChild(this._bg, this._text);

    this.resize(this._width, this._height);
    this.setEnabled(true);
  }

  public setLabel(label: string): void {
    this._text.text = label;
  }

  public setEnabled(isEnabled: boolean): void {
    this._isEnabled = isEnabled;
    this.eventMode = isEnabled ? "static" : "none";
    this.cursor = isEnabled ? "pointer" : "not-allowed";
    this._applyVisualState();
  }

  public resize(width: number, height: number, fontSize?: number): void {
    this._width = width;
    this._height = height;

    if (fontSize !== undefined) {
      this._fontSize = fontSize;
    }

    this._bg
      .clear()
      .roundRect(0, 0, this._width, this._height, DEFAULT_RADIUS)
      .fill(NORMAL_FILL);

    this._text.style.fontSize = this._fontSize;
    this._text.position.set(this._width * 0.5, this._height * 0.5);

    this._applyVisualState();
  }

  public get widthPx(): number {
    return this._width;
  }

  public get heightPx(): number {
    return this._height;
  }

  public get fontSizePx(): number {
    return this._fontSize;
  }

  private _applyVisualState(): void {
    this._drawBackground(this._isEnabled ? NORMAL_FILL : DISABLED_FILL);
    this._text.style.fill = this._isEnabled
      ? NORMAL_TEXT_FILL
      : DISABLED_TEXT_FILL;
  }

  private _drawBackground(fill: number): void {
    this._bg
      .clear()
      .roundRect(0, 0, this._width, this._height, DEFAULT_RADIUS)
      .fill(fill);
  }
}
