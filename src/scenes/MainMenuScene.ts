import { Container, Text, TextStyle } from "pixi.js";

import {
  MOBILE_BREAKPOINT,
  MOBILE_UI_SCALE,
  SceneId,
  type PlayableSceneId,
} from "../app/config";
import { Scene } from "../core/Scene";
import { UIButton } from "../ui/UIButton";
import { MAIN_MENU_ITEMS } from "./sceneCatalog";

const MENU_TEXT_FILL = 0xffffff;

const TITLE_FONT_SIZE = 42;

const BUTTON_WIDTH = 320;
const BUTTON_HEIGHT = 64;
const BUTTON_SPACING = 90;
const BUTTON_FONT_SIZE = 22;

type MenuCallbacks = {
  onSelect: (sceneId: PlayableSceneId) => void;
};

export class MainMenuScene extends Scene {
  public readonly id = SceneId.MainMenu;

  private readonly _title: Text;
  private readonly _buttons = new Container();
  private readonly _buttonInstances: UIButton[];

  public constructor(private readonly _callbacks: MenuCallbacks) {
    super();

    this._title = new Text({
      text: "PIXI 8 Game Demo",
      style: new TextStyle({
        fill: MENU_TEXT_FILL,
        fontSize: TITLE_FONT_SIZE,
        fontWeight: "bold",
      }),
    });

    this._title.anchor.set(0.5, 0);

    this._buttonInstances = MAIN_MENU_ITEMS.map(
      ({ id, label }) =>
        new UIButton({
          label,
          width: BUTTON_WIDTH,
          height: BUTTON_HEIGHT,
          fontSize: BUTTON_FONT_SIZE,
          onClick: () => this._callbacks.onSelect(id),
        }),
    );

    this._buttons.addChild(...this._buttonInstances);

    this.root.addChild(this._title, this._buttons);
  }

  public override onResize(width: number, height: number): void {
    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;

    const scale = isMobile ? MOBILE_UI_SCALE : 1;

    const titleFontSize = TITLE_FONT_SIZE * scale;

    const buttonWidth = BUTTON_WIDTH * scale;
    const buttonHeight = BUTTON_HEIGHT * scale;
    const buttonSpacing = BUTTON_SPACING * scale;
    const buttonFontSize = BUTTON_FONT_SIZE * scale;

    this._title.style.fontSize = titleFontSize;

    this._title.position.set(0, -height * 0.25);
    this._buttons.position.set(0, -height * 0.09);

    this._layoutButtons(
      buttonWidth,
      buttonHeight,
      buttonSpacing,
      buttonFontSize,
    );
  }

  private _layoutButtons(
    buttonWidth: number,
    buttonHeight: number,
    buttonSpacing: number,
    buttonFontSize: number,
  ): void {
    this._buttonInstances.forEach((button, index) => {
      button.resize(buttonWidth, buttonHeight, buttonFontSize);
      button.position.set(-buttonWidth * 0.5, index * buttonSpacing);
    });
  }
}
