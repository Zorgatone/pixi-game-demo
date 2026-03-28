import {
  Assets,
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

import { Scene, type SceneContext } from "../core/Scene";
import { UIButton } from "../ui/UIButton";
import { getSafeAreaInsetPx } from "../utils/safeArea";

interface MagicWordsSceneCallbacks {
  onBackToMenu: () => void;
}

interface DialogueLine {
  name: string;
  text: string;
}

interface EmojiDefinition {
  name: string;
  url: string;
}

interface AvatarDefinition {
  name: string;
  url: string;
  position: "left" | "right";
}

interface DialogueResponse {
  dialogue: DialogueLine[];
  emojies: EmojiDefinition[];
  avatars: AvatarDefinition[];
}

interface LoadedAvatar {
  texture: Texture;
  position: "left" | "right";
}

interface RichTokenText {
  type: "text";
  value: string;
}

interface RichTokenEmoji {
  type: "emoji";
  name: string;
}

type RichToken = RichTokenText | RichTokenEmoji;
type SceneStatus = "idle" | "loading" | "ready" | "error";
type SpeakerSide = "left" | "right";

const LABEL_FONT_SIZE = 36;

const BACK_BUTTON_MARGIN_X = 20;
const BACK_BUTTON_MARGIN_Y = 40;

const BACK_BUTTON_WIDTH = 220;
const BACK_BUTTON_HEIGHT = 56;
const BACK_BUTTON_FONT_SIZE = 22;

const STATUS_FONT_SIZE = 24;
const NAME_FONT_SIZE = 24;
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
const INLINE_ITEM_GAP = 4;
const LINE_GAP = 8;

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

const DICEBEAR_FUN_EMOJI_BASE = "https://api.dicebear.com/9.x/fun-emoji/png";
const DICEBEAR_PERSONAS_BASE = "https://api.dicebear.com/9.x/personas/png";

const FALLBACK_EMOJI_BG = 0xf3b63a;
const FALLBACK_EMOJI_TEXT = 0x2b1b00;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseEmojiToken(raw: string): string | null {
  const match = raw.match(/^\{([a-zA-Z0-9_]+)\}$/);
  return match?.[1] ?? null;
}

function tokenizeRichText(text: string): RichToken[] {
  return text.split(/(\{[a-zA-Z0-9_]+\})/).flatMap((part): RichToken[] => {
    if (!part) {
      return [];
    }

    const emojiName = parseEmojiToken(part);
    if (emojiName) {
      return [{ type: "emoji" as const, name: emojiName }];
    }

    return part
      .split(/(\s+)/)
      .filter((token) => token.length > 0)
      .map((token) => ({ type: "text" as const, value: token }));
  });
}

function normalizeRemoteImageUrl(url: string): string {
  return url.replace(
    "https://api.dicebear.com:82/",
    "https://api.dicebear.com/",
  );
}

async function loadRemoteTexture(url: string): Promise<Texture> {
  return await Assets.load<Texture>({
    src: normalizeRemoteImageUrl(url),
    parser: "loadTextures",
  });
}

function makeStatusTextStyle(fontSize: number): TextStyle {
  return new TextStyle({
    fill: TEXT_FILL,
    fontSize,
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
    fontWeight: "bold",
  });
}

function makeMessageTextStyle(fontSize: number): TextStyle {
  return new TextStyle({
    fill: TEXT_FILL,
    fontSize,
    wordWrap: false,
  });
}

function makePromptTextStyle(fontSize: number): TextStyle {
  return new TextStyle({
    fill: PROMPT_FILL,
    fontSize,
    fontWeight: "bold",
  });
}

function makeFallbackEmoji(label: string, size: number): Container {
  const root = new Container();

  const bg = new Graphics()
    .roundRect(0, 0, size, size, Math.max(6, size * 0.28))
    .fill(FALLBACK_EMOJI_BG);

  const text = new Text({
    text: label.slice(0, 2).toUpperCase(),
    style: new TextStyle({
      fill: FALLBACK_EMOJI_TEXT,
      fontSize: size * 0.42,
      fontWeight: "bold",
    }),
  });

  text.anchor.set(0.5);
  text.position.set(size * 0.5, size * 0.5);

  root.addChild(bg, text);
  return root;
}

function countVisibleCharacters(tokens: RichToken[]): number {
  let total = 0;

  for (const token of tokens) {
    total += token.type === "emoji" ? 1 : token.value.length;
  }

  return total;
}

function hashString(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickFrom<T>(items: readonly T[], hash: number, offset: number): T {
  return items[(hash + offset) % items.length];
}

function buildMissingEmojiUrl(name: string): string {
  const url = new URL(DICEBEAR_FUN_EMOJI_BASE);
  url.searchParams.set("seed", name);
  return url.toString();
}

function buildMissingAvatarUrl(name: string): string {
  const hash = hashString(name);

  const bodies = ["squared", "checkered"] as const;
  const clothingColors = [
    "6dbb58",
    "f55d81",
    "f3b63a",
    "5bc0eb",
    "b18cff",
    "ff9f1c",
  ] as const;
  const eyes = ["open", "happy", "glasses"] as const;
  const hairs = ["buzzcut", "extraLong", "shortCombover"] as const;
  const hairColors = [
    "6c4545",
    "f29c65",
    "362c47",
    "2b2b2b",
    "7a4f2b",
  ] as const;
  const mouths = ["smirk", "smile", "surprise"] as const;
  const noses = ["smallRound", "mediumRound"] as const;
  const skinColors = ["e5a07e", "d78774", "c67863", "f0b68d"] as const;

  const url = new URL(DICEBEAR_PERSONAS_BASE);
  url.searchParams.set("seed", name);
  url.searchParams.set("body", pickFrom(bodies, hash, 1));
  url.searchParams.set("clothingColor", pickFrom(clothingColors, hash, 2));
  url.searchParams.set("eyes", pickFrom(eyes, hash, 3));
  url.searchParams.set("hair", pickFrom(hairs, hash, 4));
  url.searchParams.set("hairColor", pickFrom(hairColors, hash, 5));
  url.searchParams.set("mouth", pickFrom(mouths, hash, 6));
  url.searchParams.set("nose", pickFrom(noses, hash, 7));
  url.searchParams.set("skinColor", pickFrom(skinColors, hash, 8));

  return url.toString();
}

function buildMissingAvatarPosition(name: string): "left" | "right" {
  return hashString(name) % 2 === 0 ? "left" : "right";
}

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
  private readonly _clickHitArea = new Graphics();

  private readonly _avatarLayer = new Container();
  private readonly _leftAvatarSprite = new Sprite(Texture.WHITE);
  private readonly _rightAvatarSprite = new Sprite(Texture.WHITE);

  private _status: SceneStatus = "idle";
  private _errorMessage = "";
  private _loadStarted = false;

  private _data: DialogueResponse | null = null;
  private readonly _emojiTextures = new Map<string, Texture>();
  private readonly _avatarTextures = new Map<string, LoadedAvatar>();

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

  public constructor(private readonly _callbacks: MagicWordsSceneCallbacks) {
    super();

    this._title = new Text({
      text: "Magic Words",
      style: new TextStyle({
        fill: TEXT_FILL,
        fontSize: LABEL_FONT_SIZE,
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
    } else {
      this._drawDialoguePanel(this._speakerSide);
      this._layoutSpeakerName();
      this._updateStatusText();
    }
  }

  public override update(context: SceneContext): void {
    if (!this._loadStarted) {
      this._loadStarted = true;
      void this._loadDialogue();
    }

    if (this._status !== "ready" || !this._data) {
      return;
    }

    if (!this._currentDialogueDone) {
      this._typewriterAccumulator += context.deltaTimeMs / 1000;

      const charsToReveal = Math.floor(
        this._typewriterAccumulator * TYPEWRITER_CHARS_PER_SECOND,
      );

      if (charsToReveal > 0) {
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
        }

        this._rebuildMessageContent();
      }
    }

    const hasNextDialogue =
      this._data !== null &&
      this._dialogueIndex < this._data.dialogue.length - 1;

    if (this._currentDialogueDone && hasNextDialogue) {
      this._promptText.visible = true;
      this._promptText.alpha =
        0.55 +
        (Math.sin(performance.now() * 0.001 * PROMPT_BLINK_SPEED) + 1) * 0.225;
    } else {
      this._promptText.visible = false;
    }
  }

  private async _loadDialogue(): Promise<void> {
    this._status = "loading";
    this._applyReadyVisibility(false);
    this._updateStatusText();

    try {
      const response = await fetch(DIALOGUE_ENDPOINT);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as DialogueResponse;

      const emojiDefinitions = new Map<string, EmojiDefinition>();
      for (const emoji of data.emojies) {
        emojiDefinitions.set(emoji.name, {
          name: emoji.name,
          url: normalizeRemoteImageUrl(emoji.url),
        });
      }

      const avatarDefinitions = new Map<string, AvatarDefinition>();
      for (const avatar of data.avatars) {
        avatarDefinitions.set(avatar.name, {
          name: avatar.name,
          url: normalizeRemoteImageUrl(avatar.url),
          position: avatar.position,
        });
      }

      const dialogueEmojiNames = new Set<string>();
      const dialogueSpeakerNames = new Set<string>();

      for (const line of data.dialogue) {
        dialogueSpeakerNames.add(line.name);

        for (const token of tokenizeRichText(line.text)) {
          if (token.type === "emoji") {
            dialogueEmojiNames.add(token.name);
          }
        }
      }

      for (const emojiName of dialogueEmojiNames) {
        if (!emojiDefinitions.has(emojiName)) {
          emojiDefinitions.set(emojiName, {
            name: emojiName,
            url: buildMissingEmojiUrl(emojiName),
          });
        }
      }

      for (const speakerName of dialogueSpeakerNames) {
        if (!avatarDefinitions.has(speakerName)) {
          avatarDefinitions.set(speakerName, {
            name: speakerName,
            url: buildMissingAvatarUrl(speakerName),
            position: buildMissingAvatarPosition(speakerName),
          });
        }
      }

      await Promise.all([
        ...Array.from(emojiDefinitions.values()).map(async (emoji) => {
          const texture = await loadRemoteTexture(emoji.url);
          this._emojiTextures.set(emoji.name, texture);
        }),
        ...Array.from(avatarDefinitions.values()).map(async (avatar) => {
          const texture = await loadRemoteTexture(avatar.url);
          this._avatarTextures.set(avatar.name, {
            texture,
            position: avatar.position,
          });
        }),
      ]);

      this._data = {
        dialogue: data.dialogue,
        emojies: Array.from(emojiDefinitions.values()),
        avatars: Array.from(avatarDefinitions.values()),
      };

      this._status = "ready";
      this._errorMessage = "";
      this._dialogueIndex = 0;

      this._applyReadyVisibility(true);
      this._setupDialogueAtCurrentIndex();
      this._updateStatusText();
    } catch (error) {
      this._status = "error";
      this._errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this._applyReadyVisibility(false);
      this._updateStatusText();
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
      this._messageRoot.removeChildren();
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

    if (avatar) {
      if (avatar.position === "right") {
        this._speakerSide = "right";
        this._rightAvatarSprite.texture = avatar.texture;
        this._rightAvatarSprite.visible = true;
      } else {
        this._speakerSide = "left";
        this._leftAvatarSprite.texture = avatar.texture;
        this._leftAvatarSprite.visible = true;
      }
    }

    this._drawDialoguePanel(this._speakerSide);
    this._layoutSpeakerName();
  }

  private _rebuildMessageContent(): void {
    this._messageRoot.removeChildren();

    const messageFontSize = MESSAGE_FONT_SIZE * this._uiScale;
    const emojiSize = EMOJI_SIZE * this._uiScale;
    const maxTextWidth = this._panelWidth - DIALOGUE_PANEL_SIDE_PADDING * 2;

    const content = this._createVisibleRichText(
      this._currentTokens,
      this._visibleCharacterCount,
      maxTextWidth,
      messageFontSize,
      emojiSize,
    );

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
    const tailCenterX =
      speakerSide === "right"
        ? this._panelX +
          this._panelWidth -
          DIALOGUE_TAIL_SIDE_INSET * this._uiScale
        : this._panelX + DIALOGUE_TAIL_SIDE_INSET * this._uiScale;

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

  private _createVisibleRichText(
    tokens: RichToken[],
    visibleCharacters: number,
    maxWidth: number,
    fontSize: number,
    emojiSize: number,
  ): Container {
    const root = new Container();

    let remainingCharacters = visibleCharacters;
    let cursorX = 0;
    let cursorY = 0;
    const lineHeight = fontSize * 1.3;
    let currentLineMaxHeight = lineHeight;

    for (const token of tokens) {
      if (remainingCharacters <= 0) {
        break;
      }

      let node: Container | Sprite | Text | null = null;
      let visibleNodeWidth = 0;
      let wrapWidth = 0;
      let nodeHeight = 0;
      let nodeYOffset = 0;

      if (token.type === "emoji") {
        const texture = this._emojiTextures.get(token.name);

        if (texture) {
          const emojiSprite = new Sprite(texture);
          emojiSprite.width = emojiSize;
          emojiSprite.height = emojiSize;
          node = emojiSprite;
        } else {
          node = makeFallbackEmoji(token.name, emojiSize);
        }

        visibleNodeWidth = emojiSize;
        wrapWidth = emojiSize;
        nodeHeight = emojiSize;
        nodeYOffset = (lineHeight - emojiSize) * 0.5;

        const willOverflow = cursorX > 0 && cursorX + wrapWidth > maxWidth;

        if (willOverflow) {
          cursorX = 0;
          cursorY += currentLineMaxHeight + LINE_GAP;
          currentLineMaxHeight = lineHeight;
          nodeYOffset = (lineHeight - emojiSize) * 0.5;
        }

        node.position.set(cursorX, cursorY + nodeYOffset);
        root.addChild(node);

        cursorX += visibleNodeWidth + INLINE_ITEM_GAP;
        currentLineMaxHeight = Math.max(currentLineMaxHeight, nodeHeight);

        remainingCharacters -= 1;
        continue;
      }

      const fullToken = token.value;
      const sliceLength = Math.min(fullToken.length, remainingCharacters);
      const visibleText = fullToken.slice(0, sliceLength);

      if (visibleText.length <= 0) {
        continue;
      }

      const isWhitespace = fullToken.trim().length === 0;

      const fullMeasureNode = new Text({
        text: fullToken,
        style: makeMessageTextStyle(fontSize),
      });

      wrapWidth = fullMeasureNode.width;

      const willOverflow =
        cursorX > 0 && !isWhitespace && cursorX + wrapWidth > maxWidth;

      if (willOverflow) {
        cursorX = 0;
        cursorY += currentLineMaxHeight + LINE_GAP;
        currentLineMaxHeight = lineHeight;
      }

      const visibleNode = new Text({
        text: visibleText,
        style: makeMessageTextStyle(fontSize),
      });

      node = visibleNode;
      visibleNodeWidth = visibleNode.width;
      nodeHeight = visibleNode.height;

      node.position.set(cursorX, cursorY);
      root.addChild(node);

      cursorX += visibleNodeWidth + INLINE_ITEM_GAP;
      currentLineMaxHeight = Math.max(currentLineMaxHeight, nodeHeight);

      remainingCharacters -= sliceLength;
    }

    return root;
  }

  private _onAdvanceDialogue(_event: FederatedPointerEvent): void {
    if (this._status !== "ready" || !this._data) {
      return;
    }

    const totalCharacters = countVisibleCharacters(this._currentTokens);

    if (!this._currentDialogueDone) {
      this._visibleCharacterCount = totalCharacters;
      this._currentDialogueDone = true;
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
}
