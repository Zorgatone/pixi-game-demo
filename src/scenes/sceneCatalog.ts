import { type Scene } from "../core/Scene";
import { AceOfShadowsScene } from "./AceOfShadowsScene";
import { MagicWordsScene } from "./MagicWordsScene";
import { PhoenixFlameScene } from "./PhoenixFlameScene";
import { BundleName, SceneId, type PlayableSceneId } from "../app/config";

interface SceneCallbacks {
  onBackToMenu: () => void;
}

export interface PlayableSceneDefinition {
  id: PlayableSceneId;
  label: string;
  bundle: BundleName;
  create: (callbacks: SceneCallbacks) => Scene;
}

export const PLAYABLE_SCENE_DEFINITIONS: readonly PlayableSceneDefinition[] = [
  {
    id: SceneId.AceOfShadows,
    label: "Ace of Shadows",
    bundle: BundleName.AceOfShadows,
    create: (callbacks) => new AceOfShadowsScene(callbacks),
  },
  {
    id: SceneId.MagicWords,
    label: "Magic Words",
    bundle: BundleName.MagicWords,
    create: (callbacks) => new MagicWordsScene(callbacks),
  },
  {
    id: SceneId.PhoenixFlame,
    label: "Phoenix Flame",
    bundle: BundleName.PhoenixFlame,
    create: (callbacks) => new PhoenixFlameScene(callbacks),
  },
];

export const PLAYABLE_SCENE_BY_ID = Object.fromEntries(
  PLAYABLE_SCENE_DEFINITIONS.map((scene) => [scene.id, scene]),
) as Record<PlayableSceneId, PlayableSceneDefinition>;

export const MAIN_MENU_ITEMS = PLAYABLE_SCENE_DEFINITIONS.map(
  ({ id, label }) => ({
    id,
    label,
  }),
);
