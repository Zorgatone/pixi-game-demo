import { Container, Graphics, Text, TextStyle } from "pixi.js";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 56;
const DEFAULT_RADIUS = 14;
const DEFAULT_FONT_SIZE = 22;

export interface UIButtonOptions {
  label: string;
  width?: number;
  height?: number;
  fontSize?: number;
  onClick: () => void;
}

export class UIButton extends Container {
  private readonly _bg: Graphics;
  private readonly _text: Text;

  private _width: number;
  private _height: number;
  private _fontSize: number;

  public constructor(options: UIButtonOptions) {
    super();

    this._width = options.width ?? DEFAULT_WIDTH;
    this._height = options.height ?? DEFAULT_HEIGHT;
    this._fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;

    this._bg = new Graphics();

    this._text = new Text({
      text: options.label,
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: this._fontSize,
      }),
    });

    this._text.anchor.set(0.5);

    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointertap", options.onClick);

    this.on("pointerover", () => {
      this._bg.tint = 0x4a4a7a;
    });

    this.on("pointerout", () => {
      this._bg.tint = 0xffffff;
    });

    this.addChild(this._bg, this._text);

    this.resize(this._width, this._height);
  }

  public setLabel(label: string): void {
    this._text.text = label;
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
      .fill(0x2c2c44);

    this._text.style.fontSize = this._fontSize;
    this._text.position.set(this._width * 0.5, this._height * 0.5);
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
}
