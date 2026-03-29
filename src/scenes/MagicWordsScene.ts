import {
  Container,
  FederatedPointerEvent,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";

import {
  SceneId,
  MOBILE_UI_SCALE,
  MOBILE_BREAKPOINT,
  DIALOGUE_ENDPOINT,
} from "../app/config";
import { AssetAlias } from "../assets/aliases";
import {
  playGlobalUiClickSound,
  startGlobalLoopedSoundEffect,
  stopGlobalLoopedSoundEffect,
} from "../app/AudioManager";
import { Scene, type SceneContext } from "../core/Scene";
import { UIButton } from "../ui/UIButton";
import { DIALOGUE_FONT_FAMILY, UI_FONT_FAMILY } from "../ui/fonts";
import { getSafeAreaInsetPx } from "../utils/safeArea";

import { loadDialogueResources } from "./magicWords/dialogueLoader";
import {
  countVisibleCharacters,
  createVisibleRichText,
  tokenizeRichText,
} from "./magicWords/richText";
import {
  type DialogueResponse,
  type LoadedAvatar,
  type RichToken,
  type SceneStatus,
  type SpeakerSide,
} from "./magicWords/types";

interface MagicWordsSceneCallbacks {
  onBackToMenu: () => void;
}

const LABEL_FONT_SIZE = 36;

const BACK_BUTTON_MARGIN_X = 20;
const BACK_BUTTON_MARGIN_Y = 40;

const BACK_BUTTON_WIDTH = 220;
const BACK_BUTTON_HEIGHT = 56;
const BACK_BUTTON_FONT_SIZE = 22;

const STATUS_FONT_SIZE = 24;
const NAME_FONT_SIZE = 34;
const MESSAGE_FONT_SIZE = 28;
const PROMPT_FONT_SIZE = 20;

const DIALOGUE_PANEL_RADIUS = 26;
const DIALOGUE_PANEL_TOP_ANCHOR_HEIGHT_RATIO = 0.34;
const DIALOGUE_PANEL_HEIGHT_RATIO = 0.28;
const DIALOGUE_PANEL_SIDE_MARGIN = 28;
const DIALOGUE_PANEL_BOTTOM_MARGIN = 26;
const DIALOGUE_PANEL_TOP_PADDING = 18;
const DIALOGUE_PANEL_SIDE_PADDING = 24;
const DIALOGUE_PANEL_BOTTOM_PADDING = 18;
const DIALOGUE_TAIL_BASE_WIDTH = 48;
const DIALOGUE_TAIL_HEIGHT = 28;
const DIALOGUE_TAIL_SIDE_INSET = 78;

const AVATAR_SIZE = 220;
const AVATAR_MOBILE_SIZE = 128;
const AVATAR_SIDE_MARGIN = 36;
const AVATAR_BOTTOM_OFFSET = 12;

const EMOJI_SIZE = 30;
const TYPEWRITER_CHARS_PER_SECOND = 38;
const PROMPT_BLINK_SPEED = 5;

const STATUS_LOADING = "Loading dialogue...";
const STATUS_ERROR_PREFIX = "Failed to load dialogue:";

const BG_COLOR = 0x101018;
const PANEL_BG = 0x171726;
const PANEL_STROKE = 0x2d2d44;
const NAME_FILL = 0xffdc7a;
const TEXT_FILL = 0xffffff;
const PROMPT_FILL = 0xcfd5ff;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function makeStatusTextStyle(fontSize: number): TextStyle {
  return new TextStyle({
    fill: TEXT_FILL,
    fontSize,
    fontFamily: UI_FONT_FAMILY,
    fontWeight: "bold",
    align: "center",
    wordWrap: true,
    wordWrapWidth: 700,
  });
}

function makeNameTextStyle(fontSize: number): TextStyle {
  return new TextStyle({
    fill: NAME_FILL,
    fontSize,
    fontFamily: DIALOGUE_FONT_FAMILY,
    fontWeight: "bold",
  });
}

function makePromptTextStyle(fontSize: number): TextStyle {
  return new TextStyle({
    fill: PROMPT_FILL,
    fontSize,
    fontFamily: UI_FONT_FAMILY,
    fontWeight: "bold",
  });
}

/**
 * Dialogue scene that fetches remote content, renders avatars plus inline emoji,
 * and reveals lines with a typewriter effect.
 */
export class MagicWordsScene extends Scene {
  public readonly id = SceneId.MagicWords;

  private readonly _title: Text;
  private readonly _backButton: UIButton;

  private readonly _background = new Graphics();
  private readonly _dialoguePanel = new Graphics();
  private readonly _speakerNameText: Text;
  private readonly _messageRoot = new Container();
  private readonly _promptText: Text;
  private readonly _statusText: Text;
  // A transparent full-screen hit area keeps interaction simple on touch devices.
  private readonly _clickHitArea = new Graphics();

  private readonly _avatarLayer = new Container();
  private readonly _leftAvatarSprite = new Sprite(Texture.WHITE);
  private readonly _rightAvatarSprite = new Sprite(Texture.WHITE);

  private _status: SceneStatus = "idle";
  private _errorMessage = "";

  private _data: DialogueResponse | null = null;
  private readonly _emojiTextures = new Map<string, Texture>();
  private readonly _avatarTextures = new Map<string, LoadedAvatar>();
  private _loadAbortController: AbortController | null = null;
  private _isDisposed = false;

  private _viewportWidth = 0;
  private _viewportHeight = 0;
  private _uiScale = 1;
  private _isMobile = false;
  private _panelX = 0;
  private _panelY = 0;
  private _panelWidth = 0;
  private _panelHeight = 0;
  private _speakerSide: SpeakerSide = "left";

  private _dialogueIndex = 0;
  private _currentTokens: RichToken[] = [];
  private _visibleCharacterCount = 0;
  private _typewriterAccumulator = 0;
  private _currentDialogueDone = false;
  private _isTypingSoundActive = false;

  public constructor(private readonly _callbacks: MagicWordsSceneCallbacks) {
    super();

    this._title = new Text({
      text: "Magic Words",
      style: new TextStyle({
        fill: TEXT_FILL,
        fontSize: LABEL_FONT_SIZE,
        fontFamily: UI_FONT_FAMILY,
        fontWeight: "bold",
      }),
    });
    this._title.anchor.set(0.5);

    this._backButton = new UIButton({
      label: "Back to Menu",
      width: BACK_BUTTON_WIDTH,
      height: BACK_BUTTON_HEIGHT,
      fontSize: BACK_BUTTON_FONT_SIZE,
      onClick: this._callbacks.onBackToMenu,
    });

    this._speakerNameText = new Text({
      text: "",
      style: makeNameTextStyle(NAME_FONT_SIZE),
    });

    this._promptText = new Text({
      text: "Tap to continue",
      style: makePromptTextStyle(PROMPT_FONT_SIZE),
    });

    this._statusText = new Text({
      text: STATUS_LOADING,
      style: makeStatusTextStyle(STATUS_FONT_SIZE),
    });
    this._statusText.anchor.set(0.5);

    this._leftAvatarSprite.anchor.set(0.5, 1);
    this._rightAvatarSprite.anchor.set(0.5, 1);
    this._leftAvatarSprite.visible = false;
    this._rightAvatarSprite.visible = false;

    this._avatarLayer.addChild(this._leftAvatarSprite, this._rightAvatarSprite);

    this._clickHitArea.eventMode = "static";
    this._clickHitArea.cursor = "pointer";
    this._clickHitArea.on("pointertap", this._onAdvanceDialogue, this);

    this.root.addChild(
      this._background,
      this._avatarLayer,
      this._dialoguePanel,
      this._speakerNameText,
      this._messageRoot,
      this._promptText,
      this._statusText,
      this._clickHitArea,
      this._title,
      this._backButton,
    );

    this._applyReadyVisibility(false);
  }

  public override onEnter(): void {
    if (this._status === "idle") {
      void this._loadDialogue();
    }
  }

  public override onResize(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;

    const shortSide = Math.min(width, height);
    this._isMobile = shortSide < MOBILE_BREAKPOINT;
    this._uiScale = this._isMobile ? MOBILE_UI_SCALE : 1;

    const safeAreaTop = getSafeAreaInsetPx("--sat");
    const safeAreaLeft = getSafeAreaInsetPx("--sal");
    const safeAreaRight = getSafeAreaInsetPx("--sar");
    const safeAreaBottom = getSafeAreaInsetPx("--sab");

    this._background
      .clear()
      .rect(-width * 0.5, -height * 0.5, width, height)
      .fill(BG_COLOR);

    this._title.style.fontSize = LABEL_FONT_SIZE * this._uiScale;
    this._title.position.set(0, -height * 0.34);

    const buttonWidth = BACK_BUTTON_WIDTH * this._uiScale;
    const buttonHeight = BACK_BUTTON_HEIGHT * this._uiScale;
    const buttonFontSize = BACK_BUTTON_FONT_SIZE * this._uiScale;

    this._backButton.resize(buttonWidth, buttonHeight, buttonFontSize);
    this._backButton.position.set(
      -width * 0.5 + BACK_BUTTON_MARGIN_X + safeAreaLeft,
      -height * 0.5 + BACK_BUTTON_MARGIN_Y + safeAreaTop,
    );

    const panelTopAnchorHeight =
      height * DIALOGUE_PANEL_TOP_ANCHOR_HEIGHT_RATIO;
    this._panelHeight = height * DIALOGUE_PANEL_HEIGHT_RATIO;
    this._panelWidth =
      width - DIALOGUE_PANEL_SIDE_MARGIN * 2 - safeAreaLeft - safeAreaRight;
    this._panelX = -width * 0.5 + DIALOGUE_PANEL_SIDE_MARGIN + safeAreaLeft;
    this._panelY =
      height * 0.5 -
      panelTopAnchorHeight -
      DIALOGUE_PANEL_BOTTOM_MARGIN -
      safeAreaBottom;

    this._speakerNameText.style.fontSize = NAME_FONT_SIZE * this._uiScale;
    this._promptText.style.fontSize = PROMPT_FONT_SIZE * this._uiScale;

    this._statusText.style.fontSize = STATUS_FONT_SIZE * this._uiScale;
    this._statusText.style.wordWrapWidth = this._panelWidth;
    this._statusText.position.set(0, 0);

    const avatarSize = this._isMobile ? AVATAR_MOBILE_SIZE : AVATAR_SIZE;
    const leftAvatarX =
      -width * 0.5 + AVATAR_SIDE_MARGIN + safeAreaLeft + avatarSize * 0.5;
    const rightAvatarX =
      width * 0.5 - AVATAR_SIDE_MARGIN - safeAreaRight - avatarSize * 0.5;
    const avatarY = this._panelY - AVATAR_BOTTOM_OFFSET;

    this._leftAvatarSprite.position.set(leftAvatarX, avatarY);
    this._rightAvatarSprite.position.set(rightAvatarX, avatarY);
    this._leftAvatarSprite.width = avatarSize;
    this._leftAvatarSprite.height = avatarSize;
    this._rightAvatarSprite.width = avatarSize;
    this._rightAvatarSprite.height = avatarSize;

    this._clickHitArea
      .clear()
      .rect(-width * 0.5, -height * 0.5, width, height)
      .fill({ color: 0xffffff, alpha: 0 });

    if (this._status === "ready" && this._data) {
      this._refreshCurrentDialogueVisuals();
      this._rebuildMessageContent();
      return;
    }

    this._drawDialoguePanel(this._speakerSide);
    this._layoutSpeakerName();
    this._updateStatusText();
  }

  public override update(context: SceneContext): void {
    if (this._status !== "ready" || !this._data) {
      return;
    }

    if (!this._currentDialogueDone) {
      this._typewriterAccumulator += context.deltaTimeMs / 1000;

      const charsToReveal = Math.floor(
        this._typewriterAccumulator * TYPEWRITER_CHARS_PER_SECOND,
      );

      if (charsToReveal > 0) {
        if (!this._isTypingSoundActive) {
          this._isTypingSoundActive = true;
          startGlobalLoopedSoundEffect(AssetAlias.Typing);
        }

        this._typewriterAccumulator -=
          charsToReveal / TYPEWRITER_CHARS_PER_SECOND;

        const maxCharacters = countVisibleCharacters(this._currentTokens);

        this._visibleCharacterCount = clamp(
          this._visibleCharacterCount + charsToReveal,
          0,
          maxCharacters,
        );

        if (this._visibleCharacterCount >= maxCharacters) {
          this._currentDialogueDone = true;
          this._stopTypingSound();
        }

        this._rebuildMessageContent();
      }
    }

    const hasNextDialogue =
      this._dialogueIndex < this._data.dialogue.length - 1;

    if (this._currentDialogueDone && hasNextDialogue) {
      this._promptText.visible = true;
      this._promptText.alpha =
        0.55 +
        (Math.sin(performance.now() * 0.001 * PROMPT_BLINK_SPEED) + 1) * 0.225;
      return;
    }

    this._promptText.visible = false;
  }

  public override onExit(): void {
    this._loadAbortController?.abort();
    this._stopTypingSound();
  }

  public override destroy(): void {
    this._isDisposed = true;
    this._loadAbortController?.abort();
    this._clearMessageContent();
    this._stopTypingSound();
    super.destroy();
  }

  private async _loadDialogue(): Promise<void> {
    const abortController = new AbortController();
    this._loadAbortController = abortController;
    this._status = "loading";
    this._applyReadyVisibility(false);
    this._updateStatusText();

    try {
      const resources = await loadDialogueResources(
        DIALOGUE_ENDPOINT,
        abortController.signal,
      );

      if (this._isDisposed || abortController.signal.aborted) {
        return;
      }

      this._emojiTextures.clear();
      resources.emojiTextures.forEach((texture, name) => {
        this._emojiTextures.set(name, texture);
      });

      this._avatarTextures.clear();
      resources.avatarTextures.forEach((avatar, name) => {
        this._avatarTextures.set(name, avatar);
      });

      this._data = resources.data;
      this._status = "ready";
      this._errorMessage = "";
      this._dialogueIndex = 0;

      // The scene is fully data-driven after this point; visuals are rebuilt from
      // the current dialogue index whenever layout or state changes.
      this._applyReadyVisibility(true);
      this._setupDialogueAtCurrentIndex();
      this._updateStatusText();
    } catch (error) {
      if (
        this._isDisposed ||
        abortController.signal.aborted ||
        isAbortError(error)
      ) {
        return;
      }

      this._status = "error";
      this._errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this._applyReadyVisibility(false);
      this._updateStatusText();
    } finally {
      if (this._loadAbortController === abortController) {
        this._loadAbortController = null;
      }
    }
  }

  private _applyReadyVisibility(isReady: boolean): void {
    this._dialoguePanel.visible = isReady;
    this._speakerNameText.visible = isReady;
    this._messageRoot.visible = isReady;
    this._avatarLayer.visible = isReady;
    this._promptText.visible = false;

    if (!isReady) {
      this._leftAvatarSprite.visible = false;
      this._rightAvatarSprite.visible = false;
      this._clearMessageContent();
    }
  }

  private _clearMessageContent(): void {
    for (const child of this._messageRoot.removeChildren()) {
      child.destroy({ children: true });
    }
  }

  private _updateStatusText(): void {
    switch (this._status) {
      case "loading":
        this._statusText.text = STATUS_LOADING;
        this._statusText.visible = true;
        break;
      case "error":
        this._statusText.text = `${STATUS_ERROR_PREFIX}\n${this._errorMessage}`;
        this._statusText.visible = true;
        break;
      case "ready":
        this._statusText.visible = false;
        break;
      default:
        this._statusText.visible = false;
        break;
    }
  }

  private _setupDialogueAtCurrentIndex(): void {
    if (!this._data) {
      return;
    }

    const entry = this._data.dialogue[this._dialogueIndex];
    this._speakerNameText.text = entry.name;

    this._currentTokens = tokenizeRichText(entry.text);
    this._visibleCharacterCount = 0;
    this._typewriterAccumulator = 0;
    this._currentDialogueDone = false;
    this._stopTypingSound();

    this._refreshCurrentDialogueVisuals();
    this._rebuildMessageContent();
  }

  private _refreshCurrentDialogueVisuals(): void {
    if (!this._data) {
      return;
    }

    const entry = this._data.dialogue[this._dialogueIndex];
    const avatar = this._avatarTextures.get(entry.name);

    this._leftAvatarSprite.visible = false;
    this._rightAvatarSprite.visible = false;
    this._speakerSide = "left";

    if (avatar?.position === "right") {
      this._speakerSide = "right";
      this._rightAvatarSprite.texture = avatar.texture;
      this._rightAvatarSprite.visible = true;
    } else if (avatar) {
      this._leftAvatarSprite.texture = avatar.texture;
      this._leftAvatarSprite.visible = true;
    }

    this._drawDialoguePanel(this._speakerSide);
    this._layoutSpeakerName();
  }

  private _rebuildMessageContent(): void {
    this._clearMessageContent();

    const messageFontSize = MESSAGE_FONT_SIZE * this._uiScale;
    const emojiSize = EMOJI_SIZE * this._uiScale;
    const maxTextWidth = this._panelWidth - DIALOGUE_PANEL_SIDE_PADDING * 2;

    const content = createVisibleRichText({
      tokens: this._currentTokens,
      visibleCharacters: this._visibleCharacterCount,
      maxWidth: maxTextWidth,
      fontSize: messageFontSize,
      emojiSize,
      emojiTextures: this._emojiTextures,
    });

    // Rebuild from scratch on each reveal step to keep mixed text/emoji layout
    // deterministic across font sizes and viewport changes.
    const messageY =
      this._panelY +
      DIALOGUE_PANEL_TOP_PADDING +
      this._speakerNameText.height +
      12;

    content.position.set(this._panelX + DIALOGUE_PANEL_SIDE_PADDING, messageY);

    this._messageRoot.addChild(content);

    this._promptText.position.set(
      this._panelX +
        this._panelWidth -
        this._promptText.width -
        DIALOGUE_PANEL_SIDE_PADDING,
      this._panelY +
        this._panelHeight -
        this._promptText.height -
        DIALOGUE_PANEL_BOTTOM_PADDING,
    );
  }

  private _drawDialoguePanel(speakerSide: SpeakerSide): void {
    const tailBaseWidth = DIALOGUE_TAIL_BASE_WIDTH * this._uiScale;
    const tailHeight = DIALOGUE_TAIL_HEIGHT * this._uiScale;
    const tailHalfWidth = tailBaseWidth * 0.5;
    const seamCoverHeight = 4;
    const seamCoverWidth = tailBaseWidth + 6;
    const tailCenterX =
      speakerSide === "right"
        ? this._panelX +
          this._panelWidth -
          DIALOGUE_TAIL_SIDE_INSET * this._uiScale
        : this._panelX + DIALOGUE_TAIL_SIDE_INSET * this._uiScale;

    // The speech-tail flips horizontally to point toward the currently speaking avatar.
    this._dialoguePanel
      .clear()
      .roundRect(
        this._panelX,
        this._panelY,
        this._panelWidth,
        this._panelHeight,
        DIALOGUE_PANEL_RADIUS,
      )
      .fill(PANEL_BG)
      .stroke({ color: PANEL_STROKE, width: 2 })
      .poly([
        tailCenterX - tailHalfWidth,
        this._panelY,
        tailCenterX + tailHalfWidth,
        this._panelY,
        tailCenterX,
        this._panelY - tailHeight,
      ])
      .fill(PANEL_BG)
      .rect(
        tailCenterX - seamCoverWidth * 0.5,
        this._panelY - seamCoverHeight * 0.5,
        seamCoverWidth,
        seamCoverHeight,
      )
      .fill(PANEL_BG)
      .moveTo(tailCenterX - tailHalfWidth, this._panelY)
      .lineTo(tailCenterX, this._panelY - tailHeight)
      .lineTo(tailCenterX + tailHalfWidth, this._panelY)
      .stroke({ color: PANEL_STROKE, width: 2 });
  }

  private _layoutSpeakerName(): void {
    this._speakerNameText.style.align =
      this._speakerSide === "right" ? "right" : "left";
    this._speakerNameText.anchor.set(this._speakerSide === "right" ? 1 : 0, 0);
    this._speakerNameText.position.set(
      this._speakerSide === "right"
        ? this._panelX + this._panelWidth - DIALOGUE_PANEL_SIDE_PADDING
        : this._panelX + DIALOGUE_PANEL_SIDE_PADDING,
      this._panelY + DIALOGUE_PANEL_TOP_PADDING,
    );
  }

  private _onAdvanceDialogue(_event: FederatedPointerEvent): void {
    if (this._status !== "ready" || !this._data) {
      return;
    }

    playGlobalUiClickSound();

    const totalCharacters = countVisibleCharacters(this._currentTokens);

    if (!this._currentDialogueDone) {
      // First tap completes the active line immediately; the next tap advances.
      this._visibleCharacterCount = totalCharacters;
      this._currentDialogueDone = true;
      this._stopTypingSound();
      this._rebuildMessageContent();
      return;
    }

    const hasNextDialogue =
      this._dialogueIndex < this._data.dialogue.length - 1;

    if (!hasNextDialogue) {
      return;
    }

    this._dialogueIndex += 1;
    this._setupDialogueAtCurrentIndex();
  }

  private _stopTypingSound(): void {
    if (!this._isTypingSoundActive) {
      return;
    }

    this._isTypingSoundActive = false;
    stopGlobalLoopedSoundEffect(AssetAlias.Typing);
  }
}
