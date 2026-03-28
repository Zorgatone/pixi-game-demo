import { Assets } from "pixi.js";

import { BundleName, SceneId } from "./config";

type SoundModule = typeof import("@pixi/sound");
type SoundInstance = import("@pixi/sound").IMediaInstance;

type MusicSceneId =
  | SceneId.MainMenu
  | SceneId.AceOfShadows
  | SceneId.MagicWords
  | SceneId.PhoenixFlame;

interface MusicTrackConfig {
  alias: MusicSceneId;
  bundle: BundleName;
  volume: number;
}

const MUSIC_CROSSFADE_MS = 350;

const MUSIC_TRACKS: Record<MusicSceneId, MusicTrackConfig> = {
  [SceneId.MainMenu]: {
    alias: SceneId.MainMenu,
    bundle: BundleName.MainMenu,
    volume: 0.45,
  },
  [SceneId.AceOfShadows]: {
    alias: SceneId.AceOfShadows,
    bundle: BundleName.AceOfShadows,
    volume: 0.45,
  },
  [SceneId.MagicWords]: {
    alias: SceneId.MagicWords,
    bundle: BundleName.MagicWords,
    volume: 0.45,
  },
  [SceneId.PhoenixFlame]: {
    alias: SceneId.PhoenixFlame,
    bundle: BundleName.PhoenixFlame,
    volume: 0.45,
  },
};

export class AudioManager {
  private _soundModulePromise: Promise<SoundModule> | null = null;
  private readonly _loadedBundles = new Set<BundleName>();

  private _requestedTrackId: MusicSceneId | null = null;
  private _currentTrackId: MusicSceneId | null = null;
  private _currentInstance: SoundInstance | null = null;
  private _transitionToken = 0;
  private _isMuted: boolean;
  private _isPausedByDocumentHidden = false;

  private readonly _handleVisibilityChange = (): void => {
    void (async () => {
      const soundModule = await this._getSoundModule();

      if (document.hidden) {
        this._isPausedByDocumentHidden = true;
        soundModule.sound.pauseAll();
        return;
      }

      if (!this._isPausedByDocumentHidden || this._isMuted) {
        this._isPausedByDocumentHidden = false;
        return;
      }

      this._isPausedByDocumentHidden = false;
      soundModule.sound.resumeAll();
    })();
  };

  public constructor(isMuted = false) {
    this._isMuted = isMuted;
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public async playMusicForScene(sceneId: MusicSceneId): Promise<void> {
    this._requestedTrackId = sceneId;

    if (this._isMuted) {
      return;
    }

    if (this._currentTrackId === sceneId && this._currentInstance) {
      return;
    }

    const transitionToken = ++this._transitionToken;
    const soundModule = await this._getSoundModule();
    const track = MUSIC_TRACKS[sceneId];

    await this._resumeAudioContext(soundModule);
    await this._ensureBundleLoaded(track.bundle);

    const nextInstance = await soundModule.sound.play(track.alias, {
      loop: true,
      singleInstance: true,
      volume: 0,
    });

    if (transitionToken !== this._transitionToken) {
      nextInstance.stop();
      return;
    }

    const previousInstance = this._currentInstance;

    this._currentTrackId = sceneId;
    this._currentInstance = nextInstance;

    nextInstance.on("stop", () => {
      if (this._currentInstance === nextInstance) {
        this._currentInstance = null;
        this._currentTrackId = null;
      }
    });

    nextInstance.on("end", () => {
      if (this._currentInstance === nextInstance) {
        this._currentInstance = null;
        this._currentTrackId = null;
      }
    });

    await Promise.all([
      this._fadeInstance(nextInstance, track.volume, MUSIC_CROSSFADE_MS),
      this._fadeOutAndStop(previousInstance, MUSIC_CROSSFADE_MS),
    ]);
  }

  public async setMuted(isMuted: boolean): Promise<void> {
    if (this._isMuted === isMuted) {
      return;
    }

    this._isMuted = isMuted;
    this._transitionToken += 1;

    if (isMuted) {
      const currentInstance = this._currentInstance;
      this._currentInstance = null;
      this._currentTrackId = null;

      await this._fadeOutAndStop(currentInstance, MUSIC_CROSSFADE_MS);
      return;
    }

    if (this._requestedTrackId) {
      await this.playMusicForScene(this._requestedTrackId);
    }
  }

  private async _getSoundModule(): Promise<SoundModule> {
    if (!this._soundModulePromise) {
      this._soundModulePromise = import("@pixi/sound").then((soundModule) => {
        soundModule.sound.disableAutoPause = true;
        return soundModule;
      });
    }

    return await this._soundModulePromise;
  }

  private async _resumeAudioContext(soundModule: SoundModule): Promise<void> {
    await soundModule.sound.context.audioContext.resume();
  }

  private async _ensureBundleLoaded(bundle: BundleName): Promise<void> {
    if (this._loadedBundles.has(bundle)) {
      return;
    }

    await Assets.loadBundle(bundle);
    this._loadedBundles.add(bundle);
  }

  private async _fadeOutAndStop(
    instance: SoundInstance | null,
    durationMs: number,
  ): Promise<void> {
    if (!instance) {
      return;
    }

    await this._fadeInstance(instance, 0, durationMs);
    instance.stop();
  }

  private async _fadeInstance(
    instance: SoundInstance,
    targetVolume: number,
    durationMs: number,
  ): Promise<void> {
    const startVolume = instance.volume;

    if (durationMs <= 0 || startVolume === targetVolume) {
      instance.volume = targetVolume;
      return;
    }

    await new Promise<void>((resolve) => {
      const startedAt = performance.now();

      const step = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / durationMs);
        instance.volume = startVolume + (targetVolume - startVolume) * progress;

        if (progress >= 1) {
          instance.volume = targetVolume;
          resolve();
          return;
        }

        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });
  }
}
