import { Assets, type Texture } from "pixi.js";

import {
  type AvatarDefinition,
  type DialogueResponse,
  type EmojiDefinition,
  type LoadedAvatar,
  type LoadedDialogueResources,
} from "./types";
import { tokenizeRichText } from "./richText";

const DICEBEAR_FUN_EMOJI_BASE = "https://api.dicebear.com/9.x/fun-emoji/png";
const DICEBEAR_PERSONAS_BASE = "https://api.dicebear.com/9.x/personas/png";

function normalizeRemoteImageUrl(url: string): string {
  return url.replace(
    "https://api.dicebear.com:82/",
    "https://api.dicebear.com/",
  );
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
  // Missing speakers are generated deterministically so the same name always
  // maps to the same fallback appearance.
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

function createAbortError(): Error {
  return new DOMException("Dialogue load aborted", "AbortError");
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

async function loadRemoteTexture(url: string): Promise<Texture> {
  return await Assets.load<Texture>({
    src: normalizeRemoteImageUrl(url),
    parser: "loadTextures",
  });
}

/**
 * Loads the remote dialogue payload plus any textures required to present it.
 *
 * The endpoint can omit avatars or emojis; missing entries are synthesized so
 * the scene stays robust against partial content.
 */
export async function loadDialogueResources(
  endpoint: string,
  signal?: AbortSignal,
): Promise<LoadedDialogueResources> {
  const response = await fetch(endpoint, { signal });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as DialogueResponse;
  ensureNotAborted(signal);

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

  const emojiTextures = new Map<string, Texture>();
  const avatarTextures = new Map<string, LoadedAvatar>();

  // Load all referenced images in parallel once the final dependency set is known.
  await Promise.all([
    ...Array.from(emojiDefinitions.values()).map(async (emoji) => {
      const texture = await loadRemoteTexture(emoji.url);
      ensureNotAborted(signal);
      emojiTextures.set(emoji.name, texture);
    }),
    ...Array.from(avatarDefinitions.values()).map(async (avatar) => {
      const texture = await loadRemoteTexture(avatar.url);
      ensureNotAborted(signal);
      avatarTextures.set(avatar.name, {
        texture,
        position: avatar.position,
      });
    }),
  ]);

  return {
    data: {
      dialogue: data.dialogue,
      emojies: Array.from(emojiDefinitions.values()),
      avatars: Array.from(avatarDefinitions.values()),
    },
    emojiTextures,
    avatarTextures,
  };
}
