import { type Sprite } from "pixi.js";

type HighlightMode = "hover" | "tap";
type HighlightSetter = (isHighlighted: boolean) => void;

export class CardHighlightController {
  private readonly _setters = new WeakMap<Sprite, HighlightSetter>();

  private _activeCard: Sprite | null = null;
  private _activeMode: HighlightMode | null = null;

  public register(card: Sprite, setter: HighlightSetter): void {
    this._setters.set(card, setter);
  }

  public activateHover(card: Sprite): void {
    this._activate(card, "hover");
  }

  public activateTap(card: Sprite): void {
    this._activate(card, "tap");
  }

  public clearHover(card: Sprite): void {
    if (this._activeCard !== card || this._activeMode !== "hover") {
      return;
    }

    this.clearCard(card);
  }

  public clearCard(card: Sprite): void {
    if (this._activeCard !== card) {
      return;
    }

    this._setters.get(card)?.(false);
    this._activeCard = null;
    this._activeMode = null;
  }

  private _activate(card: Sprite, mode: HighlightMode): void {
    if (this._activeCard === card && this._activeMode === mode) {
      return;
    }

    if (this._activeCard) {
      this._setters.get(this._activeCard)?.(false);
    }

    this._activeCard = card;
    this._activeMode = mode;
    this._setters.get(card)?.(true);
  }
}
