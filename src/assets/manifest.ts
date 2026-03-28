import { type AssetsManifest } from "pixi.js";

import { BundleName } from "../app/config";

export const manifest: AssetsManifest = {
  bundles: [
    {
      name: BundleName.Shared,
      assets: [],
    },
    {
      name: BundleName.MainMenu,
      assets: [
        {
          alias: "main-menu",
          src: "assets/main-menu.mp3",
        },
        {
          alias: "click",
          src: "assets/click.mp3",
        },
      ],
    },
    {
      name: BundleName.AceOfShadows,
      assets: [
        {
          alias: "card",
          src: "assets/card.png",
        },
        {
          alias: "ace-of-shadows",
          src: "assets/ace-of-shadows.mp3",
        },
        {
          alias: "card-flip",
          src: "assets/card-flip.mp3",
        },
      ],
    },
    {
      name: BundleName.MagicWords,
      assets: [
        {
          alias: "magic-words",
          src: "assets/magic-words.mp3",
        },
        {
          alias: "typing",
          src: "assets/typing.mp3",
        },
      ],
    },
    {
      name: BundleName.PhoenixFlame,
      assets: [
        { alias: "ember", src: "assets/ember.png" },
        { alias: "flame_large", src: "assets/flame_large.png" },
        { alias: "flame_medium", src: "assets/flame_medium.png" },
        { alias: "flame_small", src: "assets/flame_small.png" },
        { alias: "halo", src: "assets/halo.png" },
        { alias: "spark", src: "assets/spark.png" },
        {
          alias: "phoenix-flame",
          src: "assets/phoenix-flame.mp3",
        },
        {
          alias: "fire-crackling",
          src: "assets/fire-crackling.mp3",
        },
      ],
    },
  ],
};
