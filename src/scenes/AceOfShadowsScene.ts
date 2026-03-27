import {
  Assets,
  Container,
  Point,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";
import gsap from "gsap";

import {
  SceneId,
  MOBILE_UI_SCALE,
  MOBILE_GAME_SCALE,
  MOBILE_BREAKPOINT,
} from "../app/config";

import { Scene, type SceneContext } from "../core/Scene";
import { UIButton } from "../ui/UIButton";
import { getSafeAreaInsetPx } from "../utils/safeArea";

interface AceSceneCallbacks {
  onBackToMenu: () => void;
}

const TOTAL_CARDS = 144;
const STACK_COUNT = 5;

const LABEL_FONT_SIZE = 36;

const BACK_BUTTON_MARGIN_X = 20;
const BACK_BUTTON_MARGIN_Y = 40;

const BACK_BUTTON_WIDTH = 220;
const BACK_BUTTON_HEIGHT = 56;
const BACK_BUTTON_FONT_SIZE = 22;

const CARD_TEXTURE_WIDTH = 320;
const CARD_TEXTURE_HEIGHT = 459;

const CARD_WIDTH = 120;
const CARD_HEIGHT = CARD_WIDTH * (CARD_TEXTURE_HEIGHT / CARD_TEXTURE_WIDTH);
const CARD_STACK_OFFSET_Y = 2.5;

const MOVE_INTERVAL_MS = 2000;
const MOVE_DURATION_S = 2.0;

const ARC_HEIGHT = 64;
const FLYING_ROTATION = 0.16;

interface FlightState {
  x: number;
  y: number;
  lift: number;
  rotation: number;
}

interface MovingCardAnimation {
  sprite: Sprite;
  destinationStack: CardStack;
  slotIndex: number;
  state: FlightState;
  timeline: gsap.core.Timeline;
}

class CardStack extends Container {
  private readonly _cards: Sprite[] = [];
  private _incomingCards = 0;

  private _cardWidth = CARD_WIDTH;
  private _cardHeight = CARD_HEIGHT;
  private _cardOffsetY = CARD_STACK_OFFSET_Y;

  public setCardMetrics(
    cardWidth: number,
    cardHeight: number,
    cardOffsetY: number,
  ): void {
    this._cardWidth = cardWidth;
    this._cardHeight = cardHeight;
    this._cardOffsetY = cardOffsetY;

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

export class AceOfShadowsScene extends Scene {
  public readonly id = SceneId.AceOfShadows;

  private readonly _title: Text;
  private readonly _backButton: UIButton;

  private readonly _stackLayer = new Container();
  private readonly _flyingLayer = new Container();
  private readonly _stacks: CardStack[] = [];

  private readonly _activeAnimations = new Set<MovingCardAnimation>();

  private _moveTimerMs = MOVE_INTERVAL_MS;
  private _initialStackDepleted = false;

  private _viewportWidth = 0;
  private _viewportHeight = 0;

  private _cardWidth = CARD_WIDTH;
  private _cardHeight = CARD_HEIGHT;
  private _cardOffsetY = CARD_STACK_OFFSET_Y;
  private _arcHeight = ARC_HEIGHT;
  private _flyingRotation = FLYING_ROTATION;

  private _isFinished = false;
  private _nextDestinationIndex = 1;

  private _isPausedByVisibility = false;
  private _ignoreNextDeltaAfterResume = false;

  private readonly _handleVisibilityChange = (): void => {
    if (document.hidden) {
      this._isPausedByVisibility = true;

      this._activeAnimations.forEach((animation) => {
        animation.timeline.pause();
      });

      return;
    }

    this._isPausedByVisibility = false;
    this._ignoreNextDeltaAfterResume = true;

    this._activeAnimations.forEach((animation) => {
      animation.timeline.resume();
    });
  };

  public constructor(private readonly _callbacks: AceSceneCallbacks) {
    super();

    this._title = new Text({
      text: "Ace of Shadows",
      style: new TextStyle({
        fill: 0xffffff,
        fontSize: LABEL_FONT_SIZE,
        fontWeight: "bold",
      }),
    });
    this._title.anchor.set(0.5, 0);

    this._backButton = new UIButton({
      label: "Back to Menu",
      width: BACK_BUTTON_WIDTH,
      height: BACK_BUTTON_HEIGHT,
      fontSize: BACK_BUTTON_FONT_SIZE,
      onClick: this._callbacks.onBackToMenu,
    });

    this._stackLayer.sortableChildren = true;
    this._flyingLayer.sortableChildren = true;

    this.root.addChild(
      this._stackLayer,
      this._flyingLayer,
      this._title,
      this._backButton,
    );

    this._createStacks();
    this._createCards();

    document.addEventListener("visibilitychange", this._handleVisibilityChange);
  }

  public override onResize(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;

    const shortSide = Math.min(width, height);
    const isMobile = shortSide < MOBILE_BREAKPOINT;
    const uiScale = isMobile ? MOBILE_UI_SCALE : 1;
    const gameScale = isMobile ? MOBILE_GAME_SCALE : 1;

    const safeAreaTop = getSafeAreaInsetPx("--sat");
    const safeAreaLeft = getSafeAreaInsetPx("--sal");

    this._title.style.fontSize = LABEL_FONT_SIZE * uiScale;
    this._title.position.set(0, -height * 0.37);

    const buttonWidth = BACK_BUTTON_WIDTH * uiScale;
    const buttonHeight = BACK_BUTTON_HEIGHT * uiScale;
    const buttonFontSize = BACK_BUTTON_FONT_SIZE * uiScale;

    this._backButton.resize(buttonWidth, buttonHeight, buttonFontSize);
    this._backButton.position.set(
      -width * 0.5 + BACK_BUTTON_MARGIN_X + safeAreaLeft,
      -height * 0.5 + BACK_BUTTON_MARGIN_Y + safeAreaTop,
    );

    this._cardWidth = CARD_WIDTH * gameScale;
    this._cardHeight = CARD_HEIGHT * gameScale;
    this._cardOffsetY = CARD_STACK_OFFSET_Y * gameScale;
    this._arcHeight = ARC_HEIGHT * gameScale;
    this._flyingRotation = FLYING_ROTATION * gameScale;

    this._stacks.forEach((stack) => {
      stack.setCardMetrics(
        this._cardWidth,
        this._cardHeight,
        this._cardOffsetY,
      );
    });

    this._layoutStacks(width, height, uiScale);
    this._retargetActiveAnimationsAfterResize();
  }

  public override update(context: SceneContext): void {
    if (this._isPausedByVisibility) {
      return;
    }

    if (this._ignoreNextDeltaAfterResume) {
      this._ignoreNextDeltaAfterResume = false;
      return;
    }

    if (this._isFinished) {
      return;
    }

    if (this._initialStackDepleted) {
      if (this._activeAnimations.size === 0) {
        this._isFinished = true;
      }
      return;
    }

    if (this._activeAnimations.size > 0) {
      return;
    }

    this._moveTimerMs += context.deltaTimeMs;

    if (this._moveTimerMs >= MOVE_INTERVAL_MS) {
      this._moveTimerMs = 0;
      this._moveNextTopCard();
    }
  }

  public override destroy(): void {
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange,
    );

    this._activeAnimations.forEach((animation) => {
      animation.timeline.kill();
    });
    this._activeAnimations.clear();

    super.destroy();
  }

  private _createStacks(): void {
    for (let i = 0; i < STACK_COUNT; i += 1) {
      const stack = new CardStack();
      this._stacks.push(stack);
      this._stackLayer.addChild(stack);
    }
  }

  private _createCards(): void {
    const texture =
      (Assets.get("card") as Texture | undefined) ?? Texture.WHITE;

    for (let i = 0; i < TOTAL_CARDS; i += 1) {
      const card = new Sprite(texture);
      card.anchor.set(0.5);
      this._stacks[0].addCard(card);
    }
  }

  private _layoutStacks(width: number, height: number, scale: number): void {
    const isPortrait = height > width;
    const isMobile = Math.min(width, height) < MOBILE_BREAKPOINT;

    if (isMobile && isPortrait) {
      this._layoutStacksPortrait(scale);
      return;
    }

    this._layoutStacksLandscape(width, scale);
  }

  private _layoutStacksLandscape(width: number, scale: number): void {
    const spacingX = Math.min(width * 0.18, 190 * scale);
    const baseY = -30;

    this._stacks[0].position.set(-spacingX * 2, baseY);
    this._stacks[1].position.set(-spacingX, baseY);
    this._stacks[2].position.set(0, baseY);
    this._stacks[3].position.set(spacingX, baseY);
    this._stacks[4].position.set(spacingX * 2, baseY);
  }

  private _layoutStacksPortrait(scale: number): void {
    const colX = 100 * scale;
    const topY = -140 * scale;
    const middleY = 10 * scale;
    const bottomY = 160 * scale;

    this._stacks[0].position.set(0, topY);
    this._stacks[1].position.set(-colX, middleY);
    this._stacks[2].position.set(colX, middleY);
    this._stacks[3].position.set(-colX, bottomY);
    this._stacks[4].position.set(colX, bottomY);
  }

  private _moveNextTopCard(): void {
    const sourceStack = this._stacks[0];
    if (sourceStack.isEmpty) {
      this._initialStackDepleted = true;
      return;
    }

    const destinationStack = this._getNextDestinationStack();
    const from = sourceStack.getTopCardPositionInAncestor(this.root);
    const card = sourceStack.takeTopCard();

    if (!card) {
      this._initialStackDepleted = true;
      return;
    }

    const slotIndex = destinationStack.reserveIncomingSlot();
    const to = destinationStack.getReservedSlotPositionInAncestor(
      slotIndex,
      this.root,
    );

    card.rotation = 0;
    card.zIndex = 10_000;
    card.position.copyFrom(from);
    card.width = this._cardWidth;
    card.height = this._cardHeight;

    this._flyingLayer.addChild(card);

    const animation = this._createInitialAnimation(
      card,
      destinationStack,
      slotIndex,
      from,
      to,
    );
    this._activeAnimations.add(animation);

    if (this._isPausedByVisibility) {
      animation.timeline.pause();
    }

    if (sourceStack.isEmpty) {
      this._initialStackDepleted = true;
    }
  }

  private _getNextDestinationStack(): CardStack {
    const destination = this._stacks[this._nextDestinationIndex];

    this._nextDestinationIndex += 1;
    if (this._nextDestinationIndex >= this._stacks.length) {
      this._nextDestinationIndex = 1;
    }

    return destination;
  }

  private _createInitialAnimation(
    sprite: Sprite,
    destinationStack: CardStack,
    slotIndex: number,
    from: Point,
    to: Point,
  ): MovingCardAnimation {
    const state: FlightState = {
      x: from.x,
      y: from.y,
      lift: 0,
      rotation: 0,
    };

    const animation = {
      sprite,
      destinationStack,
      slotIndex,
      state,
      timeline: gsap.timeline(),
    } as MovingCardAnimation;

    animation.timeline = this._createLaunchTimeline(
      animation,
      to,
      MOVE_DURATION_S,
    );

    return animation;
  }

  private _createLaunchTimeline(
    animation: MovingCardAnimation,
    to: Point,
    durationS: number,
  ): gsap.core.Timeline {
    const { state } = animation;
    const distanceX = to.x - state.x;

    const rotationPeak =
      (distanceX >= 0 ? 1 : -1) *
      this._flyingRotation *
      (0.7 + Math.random() * 0.3);

    const timeline = gsap.timeline({
      onUpdate: () => {
        this._applyAnimationState(animation);
      },
      onComplete: () => {
        this._completeAnimation(animation);
      },
    });

    timeline.to(
      state,
      {
        x: to.x,
        y: to.y,
        ease: "power3.inOut",
        duration: durationS,
      },
      0,
    );

    timeline.to(
      state,
      {
        lift: this._arcHeight,
        ease: "power2.out",
        duration: durationS * 0.45,
      },
      0,
    );

    timeline.to(
      state,
      {
        lift: 0,
        ease: "power2.in",
        duration: durationS * 0.55,
      },
      durationS * 0.45,
    );

    timeline.to(
      state,
      {
        rotation: rotationPeak,
        ease: "power2.out",
        duration: durationS * 0.35,
      },
      0,
    );

    timeline.to(
      state,
      {
        rotation: 0,
        ease: "power3.inOut",
        duration: durationS * 0.65,
      },
      durationS * 0.35,
    );

    return timeline;
  }

  private _createRetargetTimeline(
    animation: MovingCardAnimation,
    to: Point,
    durationS: number,
  ): gsap.core.Timeline {
    const { state } = animation;

    const timeline = gsap.timeline({
      onUpdate: () => {
        this._applyAnimationState(animation);
      },
      onComplete: () => {
        this._completeAnimation(animation);
      },
    });

    timeline.to(
      state,
      {
        x: to.x,
        y: to.y,
        ease: "power3.out",
        duration: durationS,
      },
      0,
    );

    timeline.to(
      state,
      {
        lift: 0,
        ease: "power2.inOut",
        duration: durationS,
      },
      0,
    );

    timeline.to(
      state,
      {
        rotation: 0,
        ease: "power2.inOut",
        duration: durationS,
      },
      0,
    );

    return timeline;
  }

  private _applyAnimationState(animation: MovingCardAnimation): void {
    animation.sprite.position.set(
      animation.state.x,
      animation.state.y - animation.state.lift,
    );
    animation.sprite.rotation = animation.state.rotation;
  }

  private _completeAnimation(animation: MovingCardAnimation): void {
    this._activeAnimations.delete(animation);
    this._flyingLayer.removeChild(animation.sprite);
    animation.sprite.rotation = 0;
    animation.destinationStack.receiveReservedCard(animation.sprite);

    if (this._initialStackDepleted && this._activeAnimations.size === 0) {
      this._isFinished = true;
      return;
    }

    if (!this._initialStackDepleted && !this._isPausedByVisibility) {
      this._moveNextTopCard();
    }
  }

  private _retargetActiveAnimationsAfterResize(): void {
    this._activeAnimations.forEach((animation) => {
      const oldTimeline = animation.timeline;
      const progress = oldTimeline.totalProgress();
      const remainingDurationS = Math.max(
        0.15,
        MOVE_DURATION_S * (1 - progress),
      );

      animation.sprite.width = this._cardWidth;
      animation.sprite.height = this._cardHeight;

      oldTimeline.kill();

      const newTarget =
        animation.destinationStack.getReservedSlotPositionInAncestor(
          animation.slotIndex,
          this.root,
        );

      animation.timeline = this._createRetargetTimeline(
        animation,
        newTarget,
        remainingDurationS,
      );

      if (this._isPausedByVisibility) {
        animation.timeline.pause();
      }
    });
  }
}
