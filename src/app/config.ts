export const APP_BG = 0x101018;
export const CENTER_RATIO = 0.5;
export const MOBILE_UI_SCALE = 0.6;
export const MOBILE_GAME_SCALE = 0.4;
export const MOBILE_BREAKPOINT = 700;
export const DIALOGUE_ENDPOINT =
  "https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords";

export const enum SceneId {
  MainMenu = "main-menu",
  AceOfShadows = "ace-of-shadows",
  MagicWords = "magic-words",
  PhoenixFlame = "phoenix-flame",
}

export const enum BundleName {
  Shared = "shared",
  MainMenu = SceneId.MainMenu,
  AceOfShadows = SceneId.AceOfShadows,
  MagicWords = SceneId.MagicWords,
  PhoenixFlame = SceneId.PhoenixFlame,
}
