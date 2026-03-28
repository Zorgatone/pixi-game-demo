import { Assets } from "pixi.js";

import { AssetAlias } from "../assets/aliases";
import { BundleName, SceneId } from "./config";

type SoundModule = typeof import("@pixi/sound");
type SoundInstance = import("@pixi/sound").IMediaInstance;

type MusicSceneId =
  | SceneId.MainMenu
  | SceneId.AceOfShadows
  | SceneId.MagicWords
  | SceneId.PhoenixFlame;
type MusicTrackAlias =
  | AssetAlias.MainMenuMusic
  | AssetAlias.AceOfShadowsMusic
  | AssetAlias.MagicWordsMusic
  | AssetAlias.PhoenixFlameMusic;
type OneShotSoundEffectAlias = AssetAlias.Click | AssetAlias.CardFlip;
type LoopedSoundEffectAlias = AssetAlias.Typing | AssetAlias.FireCrackling;

interface MusicTrackConfig {
  alias: MusicTrackAlias;
  bundle: BundleName;
  volume: number;
}

const UI_CLICK_SOUND_ALIAS = AssetAlias.Click;
const UI_CLICK_VOLUME = 0.32;
const MUSIC_CROSSFADE_MS = 350;

const ONE_SHOT_SOUND_EFFECTS: Record<
  OneShotSoundEffectAlias,
  { bundle: BundleName; volume: number }
> = {
  [AssetAlias.Click]: {
    bundle: BundleName.MainMenu,
    volume: UI_CLICK_VOLUME,
  },
  [AssetAlias.CardFlip]: {
    bundle: BundleName.AceOfShadows,
    volume: 0.45,
  },
};

const LOOPED_SOUND_EFFECTS: Record<
  LoopedSoundEffectAlias,
  { bundle: BundleName; volume: number }
> = {
  [AssetAlias.Typing]: {
    bundle: BundleName.MagicWords,
    volume: 0.23,
  },
  [AssetAlias.FireCrackling]: {
    bundle: BundleName.PhoenixFlame,
    volume: 0.45,
  },
};

const MUSIC_TRACKS: Record<MusicSceneId, MusicTrackConfig> = {
  [SceneId.MainMenu]: {
    alias: AssetAlias.MainMenuMusic,
    bundle: BundleName.MainMenu,
    volume: 0.45,
  },
  [SceneId.AceOfShadows]: {
    alias: AssetAlias.AceOfShadowsMusic,
    bundle: BundleName.AceOfShadows,
    volume: 0.45,
  },
  [SceneId.MagicWords]: {
    alias: AssetAlias.MagicWordsMusic,
    bundle: BundleName.MagicWords,
    volume: 0.45,
  },
  [SceneId.PhoenixFlame]: {
    alias: AssetAlias.PhoenixFlameMusic,
    bundle: BundleName.PhoenixFlame,
    volume: 0.45,
  },
};

/**
 * Centralized audio service for the demo.
 *
 * It lazy-loads sound assets, crossfades music between scenes, preserves the
 * user's mute preference, and rebuilds looped effects after mute/unmute.
 */
export class AudioManager {
  private static _globalInstance: AudioManager | null = null;

  private _soundModulePromise: Promise<SoundModule> | null = null;
  private readonly _loadedBundles = new Set<BundleName>();
  // Track desired looped SFX separately from active instances so we can restore
  // them after a mute/unmute cycle.
  private readonly _requestedLoopedEffects = new Set<LoopedSoundEffectAlias>();
  private readonly _activeLoopedEffectInstances = new Map<
    LoopedSoundEffectAlias,
    SoundInstance
  >();

  // Remember the latest requested music target so unmute can resume the correct track.
  private _requestedTrackId: MusicSceneId | null = null;
  private _currentTrackId: MusicSceneId | null = null;
  private _currentInstance: SoundInstance | null = null;

  // Invalidates older async transitions when the user changes scenes quickly.
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
    AudioManager._globalInstance = this;
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
  }

  public static getGlobalInstance(): AudioManager | null {
    return AudioManager._globalInstance;
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  /**
   * Starts the requested music track, crossfading away from the previous track
   * when needed.
   */
  public async playMusicForScene(sceneId: MusicSceneId): Promise<void> {
    this._requestedTrackId = sceneId;

    if (this._isMuted) {
      return;
    }

    if (this._currentTrackId === sceneId && this._currentInstance) {
      return;
    }

    // Asset loads and user actions can overlap; only the latest request should win.
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

      this._activeLoopedEffectInstances.forEach((instance) => {
        instance.stop();
      });
      this._activeLoopedEffectInstances.clear();

      await this._fadeOutAndStop(currentInstance, MUSIC_CROSSFADE_MS);
      return;
    }

    // Rebuild audio from the last requested state instead of assuming nothing changed
    // while the demo was muted.
    if (this._requestedTrackId) {
      await this.playMusicForScene(this._requestedTrackId);
    }

    await Promise.all(
      Array.from(this._requestedLoopedEffects).map(async (alias) => {
        await this.startLoopedSoundEffect(alias);
      }),
    );
  }

  public async playUiClick(): Promise<void> {
    await this.playSoundEffect(UI_CLICK_SOUND_ALIAS);
  }

  public async playSoundEffect(alias: OneShotSoundEffectAlias): Promise<void> {
    if (this._isMuted) {
      return;
    }

    const soundModule = await this._getSoundModule();
    const config = ONE_SHOT_SOUND_EFFECTS[alias];

    await this._resumeAudioContext(soundModule);
    await this._ensureBundleLoaded(config.bundle);

    await soundModule.sound.play(alias, {
      volume: config.volume,
    });
  }

  public async startLoopedSoundEffect(
    alias: LoopedSoundEffectAlias,
  ): Promise<void> {
    this._requestedLoopedEffects.add(alias);

    if (this._isMuted || this._activeLoopedEffectInstances.has(alias)) {
      return;
    }

    const soundModule = await this._getSoundModule();
    const config = LOOPED_SOUND_EFFECTS[alias];

    await this._resumeAudioContext(soundModule);
    await this._ensureBundleLoaded(config.bundle);

    const instance = await soundModule.sound.play(alias, {
      loop: true,
      singleInstance: true,
      volume: config.volume,
    });

    if (this._isMuted) {
      instance.stop();
      return;
    }

    this._activeLoopedEffectInstances.set(alias, instance);

    instance.on("stop", () => {
      if (this._activeLoopedEffectInstances.get(alias) === instance) {
        this._activeLoopedEffectInstances.delete(alias);
      }
    });

    instance.on("end", () => {
      if (this._activeLoopedEffectInstances.get(alias) === instance) {
        this._activeLoopedEffectInstances.delete(alias);
      }
    });
  }

  public stopLoopedSoundEffect(alias: LoopedSoundEffectAlias): void {
    this._requestedLoopedEffects.delete(alias);

    const instance = this._activeLoopedEffectInstances.get(alias);

    if (!instance) {
      return;
    }

    this._activeLoopedEffectInstances.delete(alias);
    instance.stop();
  }

  private async _getSoundModule(): Promise<SoundModule> {
    if (!this._soundModulePromise) {
      this._soundModulePromise = import("@pixi/sound").then((soundModule) => {
        // The game already handles tab visibility manually, so browser auto-pause
        // would fight with our own resume logic.
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
        // requestAnimationFrame keeps the fade in sync with the render loop.
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

export function playGlobalUiClickSound(): void {
  const audioManager = AudioManager.getGlobalInstance();

  if (!audioManager) {
    return;
  }

  void audioManager.playUiClick();
}

export function playGlobalSoundEffect(alias: OneShotSoundEffectAlias): void {
  const audioManager = AudioManager.getGlobalInstance();

  if (!audioManager) {
    return;
  }

  void audioManager.playSoundEffect(alias);
}

export function startGlobalLoopedSoundEffect(
  alias: LoopedSoundEffectAlias,
): void {
  const audioManager = AudioManager.getGlobalInstance();

  if (!audioManager) {
    return;
  }

  void audioManager.startLoopedSoundEffect(alias);
}

export function stopGlobalLoopedSoundEffect(
  alias: LoopedSoundEffectAlias,
): void {
  AudioManager.getGlobalInstance()?.stopLoopedSoundEffect(alias);
}
