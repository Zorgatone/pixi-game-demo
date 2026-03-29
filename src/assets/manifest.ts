import { type AssetsManifest } from "pixi.js";

import { BundleName } from "../app/config";

import { AssetAlias } from "./aliases";

/**
 * Pixi asset manifest split by scene so audio and textures can be loaded on
 * demand instead of eagerly at boot.
 */
export const manifest: AssetsManifest = {
  bundles: [
    {
      name: BundleName.Shared,
      assets: [
        {
          alias: AssetAlias.Cursor,
          src: "assets/cursor.png",
        },
        {
          alias: AssetAlias.NotAllowed,
          src: "assets/not-allowed.png",
        },
        {
          alias: AssetAlias.Pointer,
          src: "assets/pointer.png",
        },
      ],
    },
    {
      name: BundleName.MainMenu,
      assets: [
        {
          alias: AssetAlias.MainMenuMusic,
          src: "assets/main-menu.mp3",
        },
        {
          alias: AssetAlias.Click,
          src: "assets/click.mp3",
        },
      ],
    },
    {
      name: BundleName.AceOfShadows,
      assets: [
        {
          alias: AssetAlias.Card,
          src: "assets/card.png",
        },
        {
          alias: AssetAlias.AceOfShadowsMusic,
          src: "assets/ace-of-shadows.mp3",
        },
        {
          alias: AssetAlias.CardFlip,
          src: "assets/card-flip.mp3",
        },
      ],
    },
    {
      name: BundleName.MagicWords,
      assets: [
        {
          alias: AssetAlias.MagicWordsMusic,
          src: "assets/magic-words.mp3",
        },
        {
          alias: AssetAlias.Typing,
          src: "assets/typing.mp3",
        },
      ],
    },
    {
      name: BundleName.PhoenixFlame,
      assets: [
        { alias: AssetAlias.Ember, src: "assets/ember.png" },
        { alias: AssetAlias.FlameLarge, src: "assets/flame_large.png" },
        { alias: AssetAlias.FlameMedium, src: "assets/flame_medium.png" },
        { alias: AssetAlias.FlameSmall, src: "assets/flame_small.png" },
        { alias: AssetAlias.Halo, src: "assets/halo.png" },
        { alias: AssetAlias.Spark, src: "assets/spark.png" },
        {
          alias: AssetAlias.PhoenixFlameMusic,
          src: "assets/phoenix-flame.mp3",
        },
        {
          alias: AssetAlias.FireCrackling,
          src: "assets/fire-crackling.mp3",
        },
      ],
    },
  ],
};
