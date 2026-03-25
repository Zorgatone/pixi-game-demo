import { Container } from "pixi.js";

export interface SceneContext {
  width: number;
  height: number;
  deltaTimeMs: number;
}

export abstract class Scene {
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
