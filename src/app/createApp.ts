import { Application, Assets } from "pixi.js";
import { manifest } from "../assets/manifest";
import { APP_BG } from "./config";

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
