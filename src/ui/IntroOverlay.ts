import { Container, Graphics, Text, TextStyle } from "pixi.js";

import { DEMO_TITLE } from "../app/config";

import { UIButton } from "./UIButton";

const PANEL_WIDTH = 520;
const PANEL_HEIGHT = 300;
const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 60;
const BUTTON_FONT_SIZE = 24;
const TITLE_FONT_SIZE = 42;
const SUBTITLE_FONT_SIZE = 22;

const PANEL_RADIUS = 24;

export interface IntroOverlayOptions {
  onEnter: () => void;
}

/**
 * Full-screen entry gate shown before the user opts into starting the demo.
 */
export class IntroOverlay extends Container {
  private readonly _dim = new Graphics();
  private readonly _panel = new Graphics();
  private readonly _title: Text;
  private readonly _subtitle: Text;
  private readonly _button: UIButton;

  public constructor(options: IntroOverlayOptions) {
    super();

    this._title = new Text({
      text: DEMO_TITLE,
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: TITLE_FONT_SIZE,
        fontWeight: "bold",
        align: "center",
      }),
    });
    this._title.anchor.set(0.5);

    this._subtitle = new Text({
      text: "Tap below to enter the demo",
      style: new TextStyle({
        fill: 0xd6daf5,
        fontSize: SUBTITLE_FONT_SIZE,
        align: "center",
      }),
    });
    this._subtitle.anchor.set(0.5);

    this._button = new UIButton({
      label: "Enter Demo",
      width: BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      fontSize: BUTTON_FONT_SIZE,
      playClickSound: false,
      onClick: options.onEnter,
    });

    this.addChild(
      this._dim,
      this._panel,
      this._title,
      this._subtitle,
      this._button,
    );
  }

  public setSubtitle(text: string): void {
    this._subtitle.text = text;
  }

  public setButtonLabel(label: string): void {
    this._button.setLabel(label);
  }

  public setButtonEnabled(isEnabled: boolean): void {
    this._button.setEnabled(isEnabled);
  }

  public show(): void {
    this.visible = true;
  }

  public hide(): void {
    this.visible = false;
  }

  public layout(width: number, height: number, scale: number): void {
    this._dim.clear().rect(0, 0, width, height).fill({
      color: 0x000000,
      alpha: 0.7,
    });

    const panelWidth = PANEL_WIDTH * scale;
    const panelHeight = PANEL_HEIGHT * scale;
    const panelX = (width - panelWidth) * 0.5;
    const panelY = (height - panelHeight) * 0.5;

    this._panel
      .clear()
      .roundRect(panelX, panelY, panelWidth, panelHeight, PANEL_RADIUS)
      .fill(0x171726)
      .stroke({ color: 0x2d2d44, width: 2 });

    this._title.style.fontSize = TITLE_FONT_SIZE * scale;
    this._subtitle.style.fontSize = SUBTITLE_FONT_SIZE * scale;

    this._title.position.set(width * 0.5, panelY + panelHeight * 0.27);
    this._subtitle.position.set(width * 0.5, panelY + panelHeight * 0.48);

    const buttonWidth = BUTTON_WIDTH * scale;
    const buttonHeight = BUTTON_HEIGHT * scale;

    this._button.resize(buttonWidth, buttonHeight, BUTTON_FONT_SIZE * scale);
    this._button.position.set(
      width * 0.5 - buttonWidth * 0.5,
      panelY + panelHeight * 0.66,
    );
  }
}
