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
      assets: [],
    },
  ],
};
