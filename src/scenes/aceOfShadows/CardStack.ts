import {
  BlurFilter,
  Container,
  type FederatedPointerEvent,
  Graphics,
  Point,
  RoundedRectangle,
  Sprite,
} from "pixi.js";

import { CardHighlightController } from "./CardHighlightController";

const HOVER_GLOW_COLOR = 0xf7d774;
const HOVER_GLOW_ALPHA = 0.95;
const HOVER_GLOW_PADDING = 2;
const HOVER_GLOW_RADIUS = 14;
const HOVER_GLOW_LINE_WIDTH = 3;
const HOVER_TINT = 0xfff8d6;
const CARD_HIT_AREA_WIDTH = 320;
const CARD_HIT_AREA_HEIGHT = 459;
const CARD_HIT_AREA_RADIUS = 28;

export interface CardStackMetrics {
  cardWidth: number;
  cardHeight: number;
  cardOffsetY: number;
}

/**
 * Utility container that owns a stack of cards plus any "reserved" future slots
 * for cards that are currently flying toward it.
 */
export class CardStack extends Container {
  private readonly _cards: Sprite[] = [];
  private readonly _hoverGlows = new WeakMap<Sprite, Graphics>();
  private readonly _interactiveCards = new WeakSet<Sprite>();
  private _incomingCards = 0;

  private _cardWidth: number;
  private _cardHeight: number;
  private _cardOffsetY: number;

  public constructor(
    metrics: CardStackMetrics,
    private readonly _highlightController: CardHighlightController,
  ) {
    super();

    this.sortableChildren = true;
    this._cardWidth = metrics.cardWidth;
    this._cardHeight = metrics.cardHeight;
    this._cardOffsetY = metrics.cardOffsetY;
  }

  public setCardMetrics(metrics: CardStackMetrics): void {
    this._cardWidth = metrics.cardWidth;
    this._cardHeight = metrics.cardHeight;
    this._cardOffsetY = metrics.cardOffsetY;

    this._layoutCards();
  }

  public get count(): number {
    return this._cards.length;
  }

  public get isEmpty(): boolean {
    return this._cards.length === 0;
  }

  public addCard(card: Sprite): void {
    this._cards.push(card);

    const glow = this._ensureGlow(card);

    if (glow.parent !== this) {
      this.addChild(glow);
    }

    if (card.parent !== this) {
      this.addChild(card);
    }

    this._applyCardMetrics(card);
    this._layoutCards();
  }

  public takeTopCard(): Sprite | undefined {
    const card = this._cards.pop();
    if (!card) {
      return undefined;
    }

    this._setCardHovered(card, false);
    card.eventMode = "none";
    card.cursor = "default";
    this._highlightController.clearCard(card);

    const glow = this._hoverGlows.get(card);
    if (glow) {
      this.removeChild(glow);
    }

    this.removeChild(card);
    this._layoutCards();

    return card;
  }

  public reserveIncomingSlot(): number {
    // Reserve the landing slot before the animation starts so active cards can
    // retarget correctly if the layout changes mid-flight.
    const slotIndex = this._cards.length + this._incomingCards;
    this._incomingCards += 1;
    return slotIndex;
  }

  public receiveReservedCard(card: Sprite): void {
    this._incomingCards = Math.max(0, this._incomingCards - 1);
    this.addCard(card);
  }

  public getTopCardPositionInAncestor(ancestor: Container): Point {
    return this._getSlotPositionInAncestor(this._cards.length - 1, ancestor);
  }

  public getReservedSlotPositionInAncestor(
    slotIndex: number,
    ancestor: Container,
  ): Point {
    return this._getSlotPositionInAncestor(slotIndex, ancestor);
  }

  private _getSlotPositionInAncestor(
    slotIndex: number,
    ancestor: Container,
  ): Point {
    const localPoint = new Point(0, slotIndex * this._cardOffsetY);
    const globalPoint = this.toGlobal(localPoint);
    return ancestor.toLocal(globalPoint);
  }

  private _applyCardMetrics(card: Sprite): void {
    card.width = this._cardWidth;
    card.height = this._cardHeight;
    card.anchor.set(0.5);
    card.hitArea = new RoundedRectangle(
      -CARD_HIT_AREA_WIDTH * 0.5,
      -CARD_HIT_AREA_HEIGHT * 0.5,
      CARD_HIT_AREA_WIDTH,
      CARD_HIT_AREA_HEIGHT,
      CARD_HIT_AREA_RADIUS,
    );
  }

  private _layoutCards(): void {
    const topCard = this._cards[this._cards.length - 1] ?? null;

    this._cards.forEach((card, index) => {
      const glow = this._ensureGlow(card);
      const isTopCard = card === topCard;

      this._applyCardMetrics(card);
      this._redrawGlow(glow);
      glow.position.set(0, index * this._cardOffsetY);
      glow.zIndex = index - 0.5;

      card.position.set(0, index * this._cardOffsetY);
      card.rotation = 0;
      card.zIndex = index;

      if (isTopCard) {
        card.eventMode = "static";
        card.cursor = "pointer";
        return;
      }

      card.eventMode = "none";
      card.cursor = "default";
      this._highlightController.clearCard(card);
    });
  }

  private _ensureGlow(card: Sprite): Graphics {
    let glow = this._hoverGlows.get(card);

    if (!glow) {
      glow = new Graphics();
      glow.visible = false;
      glow.eventMode = "none";
      glow.filters = [
        new BlurFilter({
          strength: 3,
          quality: 2,
          kernelSize: 5,
        }),
      ];

      this._hoverGlows.set(card, glow);
    }

    if (!this._interactiveCards.has(card)) {
      this._highlightController.register(card, (isHighlighted) => {
        this._setCardHovered(card, isHighlighted);
      });

      card.on("pointerover", (event: FederatedPointerEvent) => {
        if (event.pointerType !== "mouse") {
          return;
        }

        this._highlightController.activateHover(card);
      });
      card.on("pointerout", (event: FederatedPointerEvent) => {
        if (event.pointerType !== "mouse") {
          return;
        }

        this._highlightController.clearHover(card);
      });
      card.on("pointerleave", (event: FederatedPointerEvent) => {
        if (event.pointerType !== "mouse") {
          return;
        }

        this._highlightController.clearHover(card);
      });
      card.on("pointertap", (event: FederatedPointerEvent) => {
        if (event.pointerType === "mouse") {
          return;
        }

        this._highlightController.activateTap(card);
      });

      this._interactiveCards.add(card);
    }

    return glow;
  }

  private _redrawGlow(glow: Graphics): void {
    glow
      .clear()
      .roundRect(
        -this._cardWidth * 0.5 - HOVER_GLOW_PADDING,
        -this._cardHeight * 0.5 - HOVER_GLOW_PADDING,
        this._cardWidth + HOVER_GLOW_PADDING * 2,
        this._cardHeight + HOVER_GLOW_PADDING * 2,
        HOVER_GLOW_RADIUS,
      )
      .stroke({
        color: HOVER_GLOW_COLOR,
        alpha: HOVER_GLOW_ALPHA,
        width: HOVER_GLOW_LINE_WIDTH,
      });
  }

  private _setCardHovered(card: Sprite, isHovered: boolean): void {
    const glow = this._hoverGlows.get(card);

    if (glow) {
      glow.visible = isHovered;
    }

    card.tint = isHovered ? HOVER_TINT : 0xffffff;
  }
}
