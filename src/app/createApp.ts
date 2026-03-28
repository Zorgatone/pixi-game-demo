import { Application, Assets } from "pixi.js";

import { manifest } from "../assets/manifest";

import { APP_BG } from "./config";

/**
 * Creates the Pixi application and binds it to the DOM container that fills the
 * viewport. The asset manifest is initialized up front, while scene bundles are
 * still loaded lazily by the shell when a scene is selected.
 */
export async function createApp(): Promise<Application> {
  const app = new Application();
  const pixiContainer = document.getElementById("pixi-container")!;

  await app.init({
    resizeTo: pixiContainer,
    backgroundColor: APP_BG,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
  });

  await Assets.init({ manifest });
  pixiContainer.appendChild(app.canvas);

  return app;
}
