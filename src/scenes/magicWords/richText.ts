import {
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  type Texture,
} from "pixi.js";

import { type RichToken } from "./types";

const TEXT_FILL = 0xffffff;
const FALLBACK_EMOJI_BG = 0xf3b63a;
const FALLBACK_EMOJI_TEXT = 0x2b1b00;
const INLINE_ITEM_GAP = 4;
const LINE_GAP = 8;

function parseEmojiToken(raw: string): string | null {
  const match = raw.match(/^\{([a-zA-Z0-9_]+)\}$/);
  return match?.[1] ?? null;
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

/**
 * Splits a dialogue string into text and `{emoji_name}` tokens while preserving
 * whitespace as explicit tokens for incremental typewriter reveals.
 */
export function tokenizeRichText(text: string): RichToken[] {
  return text.split(/(\{[a-zA-Z0-9_]+\})/).flatMap((part): RichToken[] => {
    if (!part) {
      return [];
    }

    const emojiName = parseEmojiToken(part);
    if (emojiName) {
      return [{ type: "emoji", name: emojiName }];
    }

    return part
      .split(/(\s+)/)
      .filter((token) => token.length > 0)
      .map((token) => ({ type: "text", value: token }));
  });
}

export function countVisibleCharacters(tokens: RichToken[]): number {
  let total = 0;

  for (const token of tokens) {
    total += token.type === "emoji" ? 1 : token.value.length;
  }

  return total;
}

interface VisibleRichTextOptions {
  tokens: RichToken[];
  visibleCharacters: number;
  maxWidth: number;
  fontSize: number;
  emojiSize: number;
  emojiTextures: ReadonlyMap<string, Texture>;
}

/**
 * Builds a Pixi container containing only the currently visible portion of the
 * dialogue line. Text and emoji are laid out manually because Pixi text cannot
 * inline arbitrary textures.
 */
export function createVisibleRichText({
  tokens,
  visibleCharacters,
  maxWidth,
  fontSize,
  emojiSize,
  emojiTextures,
}: VisibleRichTextOptions): Container {
  const root = new Container();
  const messageTextStyle = new TextStyle({
    fill: TEXT_FILL,
    fontSize,
    wordWrap: false,
  });

  let remainingCharacters = visibleCharacters;
  let cursorX = 0;
  let cursorY = 0;
  const lineHeight = fontSize * 1.3;
  let currentLineMaxHeight = lineHeight;

  for (const token of tokens) {
    if (remainingCharacters <= 0) {
      break;
    }

    if (token.type === "emoji") {
      const texture = emojiTextures.get(token.name);
      const node = texture
        ? new Sprite(texture)
        : makeFallbackEmoji(token.name, emojiSize);

      if (node instanceof Sprite) {
        node.width = emojiSize;
        node.height = emojiSize;
      }

      const willOverflow = cursorX > 0 && cursorX + emojiSize > maxWidth;
      let nodeYOffset = (lineHeight - emojiSize) * 0.5;

      if (willOverflow) {
        cursorX = 0;
        cursorY += currentLineMaxHeight + LINE_GAP;
        currentLineMaxHeight = lineHeight;
        nodeYOffset = (lineHeight - emojiSize) * 0.5;
      }

      node.position.set(cursorX, cursorY + nodeYOffset);
      root.addChild(node);

      cursorX += emojiSize + INLINE_ITEM_GAP;
      currentLineMaxHeight = Math.max(currentLineMaxHeight, emojiSize);
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
      style: messageTextStyle,
    });

    const wrapWidth = fullMeasureNode.width;
    fullMeasureNode.destroy();

    if (cursorX > 0 && !isWhitespace && cursorX + wrapWidth > maxWidth) {
      // Avoid wrapping pure whitespace to the next line by itself.
      cursorX = 0;
      cursorY += currentLineMaxHeight + LINE_GAP;
      currentLineMaxHeight = lineHeight;
    }

    const visibleNode = new Text({
      text: visibleText,
      style: messageTextStyle,
    });

    visibleNode.position.set(cursorX, cursorY);
    root.addChild(visibleNode);

    cursorX += visibleNode.width + INLINE_ITEM_GAP;
    currentLineMaxHeight = Math.max(currentLineMaxHeight, visibleNode.height);
    remainingCharacters -= sliceLength;
  }

  return root;
}
