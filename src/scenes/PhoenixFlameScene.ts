import { Text, TextStyle } from "pixi.js";

import { SceneId, MOBILE_UI_SCALE, MOBILE_BREAKPOINT } from "../app/config";

import { Scene } from "../core/Scene";
import { UIButton } from "../ui/UIButton";

interface AceSceneCallbacks {
  onBackToMenu: () => void;
}

const LABEL_FONT_SIZE = 36;

const BACK_BUTTON_MARGIN_X = 20;
const BACK_BUTTON_MARGIN_Y = 40;

const BACK_BUTTON_WIDTH = 220;
const BACK_BUTTON_HEIGHT = 56;
const BACK_BUTTON_FONT_SIZE = 22;

export class PhoenixFlameScene extends Scene {
  public readonly id = SceneId.AceOfShadows;

  private readonly _label: Text;
  private readonly _backButton: UIButton;

  public constructor(private readonly _callbacks: AceSceneCallbacks) {
    super();

    this._label = new Text({
      text: "Phoenix Flame - WIP",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: LABEL_FONT_SIZE,
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

    this.root.addChild(this._label, this._backButton);
  }

  public override onResize(width: number, height: number): void {
    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;

    const scale = isMobile ? MOBILE_UI_SCALE : 1;

    this._label.style.fontSize = LABEL_FONT_SIZE * scale;

    this._label.position.set(0, 0);

    const buttonWidth = BACK_BUTTON_WIDTH * scale;
    const buttonHeight = BACK_BUTTON_HEIGHT * scale;
    const buttonFontSize = BACK_BUTTON_FONT_SIZE * scale;

    const marginX = BACK_BUTTON_MARGIN_X;
    const marginY = BACK_BUTTON_MARGIN_Y;

    this._backButton.resize(buttonWidth, buttonHeight, buttonFontSize);

    this._backButton.position.set(
      -width * 0.5 + marginX,
      -height * 0.5 + marginY,
    );
  }
}
