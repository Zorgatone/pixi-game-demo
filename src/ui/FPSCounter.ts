import { Text, TextStyle } from "pixi.js";

const FPS_LABEL = "FPS";
const FPS_PLACEHOLDER = `${FPS_LABEL}: --`;
const FPS_FONT_SIZE = 20;
const FPS_X = 12;
const FPS_Y = 10;
const FPS_Z_INDEX = 9999;
const FPS_UPDATE_INTERVAL_MS = 250;
const MS_PER_SECOND = 1000;
const FPS_TEXT_FILL = 0xffffff;
const FPS_FONT_FAMILY = "Arial";

export class FPSCounter {
  public readonly view: Text;

  private _elapsed = 0;
  private _frames = 0;

  public constructor() {
    this.view = new Text({
      text: FPS_PLACEHOLDER,
      style: new TextStyle({
        fill: FPS_TEXT_FILL,
        fontSize: FPS_FONT_SIZE,
        fontFamily: FPS_FONT_FAMILY,
      }),
    });

    this.view.x = FPS_X;
    this.view.y = FPS_Y;
    this.view.zIndex = FPS_Z_INDEX;
  }

  public update(deltaMs: number): void {
    this._elapsed += deltaMs;
    this._frames += 1;

    if (this._elapsed >= FPS_UPDATE_INTERVAL_MS) {
      const fps = (this._frames * MS_PER_SECOND) / this._elapsed;
      this.view.text = `${FPS_LABEL}: ${fps.toFixed(1)}`;
      this._elapsed = 0;
      this._frames = 0;
    }
  }
}
