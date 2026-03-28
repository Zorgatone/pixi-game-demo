import { type Texture } from "pixi.js";

/**
 * Remote dialogue payload contract used by the Magic Words scene.
 */
export interface DialogueLine {
  name: string;
  text: string;
}

export interface EmojiDefinition {
  name: string;
  url: string;
}

export type SpeakerSide = "left" | "right";

export interface AvatarDefinition {
  name: string;
  url: string;
  position: SpeakerSide;
}

export interface DialogueResponse {
  dialogue: DialogueLine[];
  emojies: EmojiDefinition[];
  avatars: AvatarDefinition[];
}

export interface LoadedAvatar {
  texture: Texture;
  position: SpeakerSide;
}

export interface RichTokenText {
  type: "text";
  value: string;
}

export interface RichTokenEmoji {
  type: "emoji";
  name: string;
}

export type RichToken = RichTokenText | RichTokenEmoji;
export type SceneStatus = "idle" | "loading" | "ready" | "error";

export interface LoadedDialogueResources {
  data: DialogueResponse;
  emojiTextures: Map<string, Texture>;
  avatarTextures: Map<string, LoadedAvatar>;
}
