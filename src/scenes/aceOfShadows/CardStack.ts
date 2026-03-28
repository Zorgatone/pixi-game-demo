import { Container, Point, Sprite } from "pixi.js";

export interface CardStackMetrics {
  cardWidth: number;
  cardHeight: number;
  cardOffsetY: number;
}

export class CardStack extends Container {
  private readonly _cards: Sprite[] = [];
  private _incomingCards = 0;

  private _cardWidth: number;
  private _cardHeight: number;
  private _cardOffsetY: number;

  public constructor(metrics: CardStackMetrics) {
    super();

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

    this.removeChild(card);
    this._layoutCards();

    return card;
  }

  public reserveIncomingSlot(): number {
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
  }

  private _layoutCards(): void {
    this._cards.forEach((card, index) => {
      this._applyCardMetrics(card);
      card.position.set(0, index * this._cardOffsetY);
      card.rotation = 0;
      card.zIndex = index;
    });
  }
}
