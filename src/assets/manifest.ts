import { type AssetsManifest } from "pixi.js";

import { BundleName } from "../app/config";

export const manifest: AssetsManifest = {
  bundles: [
    {
      name: BundleName.Shared,
      assets: [],
    },
    {
      name: BundleName.AceOfShadows,
      assets: [
        {
          alias: "card",
          src: "assets/card.png",
        },
      ],
    },
    {
      name: BundleName.MagicWords,
      assets: [],
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
      ],
    },
  ],
};
