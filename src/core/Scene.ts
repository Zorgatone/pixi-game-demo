import { Container } from "pixi.js";

/**
 * Per-frame data passed into the active scene.
 */
export interface SceneContext {
  width: number;
  height: number;
  deltaTimeMs: number;
}

/**
 * Base contract for gameplay scenes.
 *
 * Each scene owns a single root container and participates in a lightweight
 * lifecycle driven by {@link SceneManager}: enter, resize, update, exit, destroy.
 */
export abstract class Scene {
  // A single root makes scene swaps cheap and keeps scene internals encapsulated.
  public readonly root = new Container();
  public abstract readonly id: string;

  public onEnter(): void {}
  public onExit(): void {}
  public onResize(_width: number, _height: number): void {}
  public update(_context: SceneContext): void {}
  public destroy(): void {
    this.root.destroy({ children: true });
  }
}
