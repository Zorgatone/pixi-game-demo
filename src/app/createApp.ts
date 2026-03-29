import { Application, Assets } from "pixi.js";

import { manifest } from "../assets/manifest";

import { APP_BG } from "./config";

const CURSOR_HOTSPOT_X = 4;
const CURSOR_HOTSPOT_Y = 2;

const DEFAULT_CURSOR = `url("assets/cursor.png") ${CURSOR_HOTSPOT_X} ${CURSOR_HOTSPOT_Y}, default`;
const POINTER_CURSOR = `url("assets/pointer.png") ${CURSOR_HOTSPOT_X} ${CURSOR_HOTSPOT_Y}, pointer`;
const NOT_ALLOWED_CURSOR = `url("assets/not-allowed.png") ${CURSOR_HOTSPOT_X} ${CURSOR_HOTSPOT_Y}, not-allowed`;

function applyCustomCursorStyles(
  app: Application,
  pixiContainer: HTMLElement,
): void {
  app.renderer.events.cursorStyles.default = DEFAULT_CURSOR;
  app.renderer.events.cursorStyles.pointer = POINTER_CURSOR;
  app.renderer.events.cursorStyles["not-allowed"] = NOT_ALLOWED_CURSOR;

  document.body.style.cursor = DEFAULT_CURSOR;
  pixiContainer.style.cursor = DEFAULT_CURSOR;
  app.canvas.style.cursor = DEFAULT_CURSOR;
}

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
  applyCustomCursorStyles(app, pixiContainer);
  pixiContainer.appendChild(app.canvas);

  return app;
}
