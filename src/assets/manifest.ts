import { BundleName } from "../app/config";

export const manifest = {
  bundles: [
    {
      name: BundleName.Shared,
      assets: [
        {
          alias: "bunny",
          src: "assets/bunny.png",
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
