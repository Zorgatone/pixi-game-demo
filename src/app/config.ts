export const APP_BG = 0x101018;
export const CENTER_RATIO = 0.5;
export const MOBILE_SCALE = 0.8;
export const MOBILE_BREAKPOINT = 700;

export const enum SceneId {
  MainMenu = "main-menu",
  AceOfShadows = "ace-of-shadows",
  MagicWords = "magic-words",
  PhoenixFlame = "phoenix-flame",
}

export const enum BundleName {
  Shared = "shared",
  AceOfShadows = SceneId.AceOfShadows,
  MagicWords = SceneId.MagicWords,
  PhoenixFlame = SceneId.PhoenixFlame,
}
