# PixiJS Game Demo

A compact game showcase built with PixiJS 8, TypeScript, Vite, and GSAP.

This project was structured to read like a small production runtime rather than a one-off prototype. It has a shell layer, a scene manager, lazy-loaded asset bundles, centralized audio handling, reusable UI components, and three focused gameplay/presentation scenes that demonstrate different technical concerns.

## What This Demonstrates

- Scene-oriented architecture with clear lifecycle boundaries.
- Lazy asset loading per scene using the Pixi asset manifest.
- Responsive layout that accounts for mobile safe areas and fullscreen changes.
- Centralized audio orchestration with music crossfades, looped SFX, mute persistence, and tab visibility handling.
- Data-driven content and effect authoring.
- Resilient remote-content loading with graceful fallbacks.

## Featured Scenes

### 1. Ace of Shadows

A card-distribution scene that animates 144 cards from a source stack into four destination stacks.

- Uses GSAP timelines to create an arced "throw" motion.
- Reserves stack landing slots ahead of time so cards already in flight can retarget correctly after a resize.
- Separates stacked cards from flying cards into distinct render layers for predictable draw order.

### 2. Magic Words

A dialogue scene that loads content from a remote endpoint and reveals it with a typewriter effect.

- Fetches dialogue, avatars, and emoji definitions from a remote API.
- Generates deterministic fallback avatars and emoji when the payload is incomplete.
- Manually lays out mixed text and inline emoji so reveal timing stays deterministic across devices.
- Supports tap/click to fast-forward the active line and advance through the conversation.

### 3. Phoenix Flame

A layered VFX scene built from animated sprites and data-driven motion parameters.

- Uses multiple flame, ember, spark, and halo layers with additive blending.
- Keeps effect tuning in configuration data rather than hardcoding behavior into the update loop.
- Applies a subtle shared pulse so independently animated layers still feel cohesive.

## Architecture Overview

The runtime is intentionally split into small, focused modules:

```text
src/
  app/        App shell, configuration, audio, bootstrap
  assets/     Pixi asset manifest and bundle definitions
  core/       Scene base class and scene manager
  scenes/     Main menu + the three playable scenes
  ui/         Shared overlays, buttons, and FPS counter
  utils/      Safe-area and fullscreen helpers
```

Key flow:

1. `src/main.ts` boots the application.
2. `src/app/createApp.ts` initializes Pixi and the asset manifest.
3. `src/app/GameShell.ts` owns persistent UI, global controls, bundle loading, and scene transitions.
4. `src/core/SceneManager.ts` swaps scenes and drives resize/update lifecycle hooks.
5. Each scene owns its own rendering, interaction, and update logic behind a single root container.

## Notable Technical Decisions

- World and UI are rendered in separate layers so scene swaps never disturb overlays or shell controls.
- Scene assets are split into bundles so the menu loads quickly and showcase content is loaded on demand.
- `AudioManager` lazy-imports `@pixi/sound`, crossfades music between scenes, and restores the requested audio state after mute/unmute.
- Safe-area CSS environment variables are read back into TypeScript so UI respects notches and mobile browser chrome.
- The dialogue renderer avoids relying on rich HTML overlays; everything stays in Pixi for consistent rendering and interaction.

## Controls

- `Enter Demo`: starts the experience and initializes scene navigation.
- `Back to Menu`: returns from any showcase scene.
- `Mute Sounds` / `Enable Sounds`: toggles all music and sound effects.
- `Enter Fullscreen` / `Exit Fullscreen`: toggles fullscreen when supported by the browser.
- `Tap to continue` in `Magic Words`: completes the current line or advances to the next one.

## Getting Started

### Requirements

- Node.js and npm
- Volta pin: Node `25.8.2`
- Volta pin: npm `11.12.0`

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Vite is configured to open automatically on port `8080`.

### Build

```bash
npm run build
```

## External Dependencies

- `pixi.js` for rendering and asset management
- `@pixi/sound` for music and sound effects
- `gsap` for animation timelines
- A remote dialogue API for the `Magic Words` scene
- DiceBear image generation endpoints as deterministic fallbacks for missing avatars and emoji

`Magic Words` requires network access at runtime. The rest of the project bootstraps and builds locally without contacting those services.

## Verification

The project should be verified with:

```bash
npm run build
```

That runs linting, TypeScript compilation, and the production Vite build.
