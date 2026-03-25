import { Container } from "pixi.js";

import { Scene, type SceneContext } from "./Scene";

export class SceneManager {
  private readonly _host: Container;
  private _currentScene: Scene | null = null;

  public constructor(host: Container) {
    this._host = host;
  }

  public get current(): Scene | null {
    return this._currentScene;
  }

  public changeScene(next: Scene, width: number, height: number): void {
    if (this._currentScene) {
      this._currentScene.onExit();
      this._host.removeChild(this._currentScene.root);
      this._currentScene.destroy();
    }

    this._currentScene = next;
    this._host.addChild(next.root);
    next.onEnter();
    next.onResize(width, height);
  }

  public update(context: SceneContext): void {
    this._currentScene?.update(context);
  }

  public resize(width: number, height: number): void {
    this._currentScene?.onResize(width, height);
  }
}
