import { Container, Graphics, Text, TextStyle } from "pixi.js";

import { UI_FONT_FAMILY } from "./fonts";

const PANEL_OFFSET_Y = -20;

const DEFAULT_BAR_WIDTH = 320;
const DEFAULT_BAR_HEIGHT = 20;
const DEFAULT_BAR_RADIUS = 10;

const DEFAULT_LABEL_FONT_SIZE = 24;
const BAR_Y = 24;

export interface LoadingOverlayOptions {
  barWidth?: number;
  barHeight?: number;
  labelFontSize?: number;
}

/**
 * Simple blocking overlay used while scene bundles are loading.
 */
export class LoadingOverlay extends Container {
  private readonly _dim: Graphics;
  private readonly _panel: Container;
  private readonly _label: Text;
  private readonly _barBg: Graphics;
  private readonly _barFill: Graphics;

  private readonly _barWidth: number;
  private readonly _barHeight: number;
  private readonly _barRadius: number;

  private _progress = 0;
  private _currentScale = 1;

  public constructor(options: LoadingOverlayOptions = {}) {
    super();

    this.visible = false;

    this._barWidth = options.barWidth ?? DEFAULT_BAR_WIDTH;
    this._barHeight = options.barHeight ?? DEFAULT_BAR_HEIGHT;
    this._barRadius = DEFAULT_BAR_RADIUS;

    this._dim = new Graphics();
    this._panel = new Container();

    this._label = new Text({
      text: "Loading... 0%",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: options.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE,
        fontFamily: UI_FONT_FAMILY,
        fontWeight: "bold",
      }),
    });
    this._label.anchor.set(0.5);

    this._barBg = new Graphics();
    this._barFill = new Graphics();

    this._panel.addChild(this._label, this._barBg, this._barFill);
    this.addChild(this._dim, this._panel);

    this.setProgress(0);
  }

  public show(): void {
    this.visible = true;
    this.setProgress(0);
  }

  public hide(): void {
    this.visible = false;
  }

  public setProgress(progress: number): void {
    this._progress = Math.max(0, Math.min(1, progress));

    const percent = Math.round(this._progress * 100);
    this._label.text = `Loading... ${percent}%`;

    this._redrawBarFill();
  }

  public resize(width: number, height: number, scale = 1): void {
    this._currentScale = scale;

    this._label.style.fontSize = DEFAULT_LABEL_FONT_SIZE * this._currentScale;
    this._label.position.set(0, 0);

    this._dim.clear().rect(0, 0, width, height).fill({
      color: 0x000000,
      alpha: 0.55,
    });

    this._barBg
      .clear()
      .roundRect(
        -this._barWidth * 0.5,
        this._getBarY(),
        this._barWidth,
        this._barHeight,
        this._barRadius,
      )
      .fill(0x2c2c44);

    this._redrawBarFill();

    this._panel.position.set(
      width * 0.5,
      height * 0.5 + PANEL_OFFSET_Y * this._currentScale,
    );
  }

  private _getBarY(): number {
    return BAR_Y * this._currentScale;
  }

  private _redrawBarFill(): void {
    this._barFill
      .clear()
      .roundRect(
        -this._barWidth * 0.5,
        this._getBarY(),
        this._barWidth * this._progress,
        this._barHeight,
        this._barRadius,
      )
      .fill(0xffffff);
  }
}
