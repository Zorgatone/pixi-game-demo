import { type BLEND_MODES } from "pixi.js";

export type FlameAssetAlias =
  | "halo"
  | "flame_large"
  | "flame_medium"
  | "flame_small"
  | "ember"
  | "spark";

export interface FlamePartConfig {
  alias: FlameAssetAlias;
  blendMode?: BLEND_MODES;
  baseX: number;
  baseY: number;
  baseScale: number;
  baseAlpha: number;
  bobAmplitudeY: number;
  swayAmplitudeX: number;
  scaleAmplitude: number;
  alphaAmplitude: number;
  rotationAmplitude: number;
  speed: number;
  phase: number;
}

export const FLAME_PARTS: readonly FlamePartConfig[] = [
  {
    alias: "halo",
    blendMode: "add",
    baseX: 0,
    baseY: 12,
    baseScale: 1.18,
    baseAlpha: 0.6,
    bobAmplitudeY: 6,
    swayAmplitudeX: 0,
    scaleAmplitude: 0.035,
    alphaAmplitude: 0.12,
    rotationAmplitude: 0.01,
    speed: 1.2,
    phase: 0.1,
  },
  {
    alias: "flame_large",
    blendMode: "add",
    baseX: 0,
    baseY: 28,
    baseScale: 0.92,
    baseAlpha: 0.82,
    bobAmplitudeY: 8,
    swayAmplitudeX: 4,
    scaleAmplitude: 0.04,
    alphaAmplitude: 0.08,
    rotationAmplitude: 0.02,
    speed: 1.45,
    phase: 0.35,
  },
  {
    alias: "flame_medium",
    blendMode: "add",
    baseX: -78,
    baseY: 64,
    baseScale: 0.72,
    baseAlpha: 0.78,
    bobAmplitudeY: 10,
    swayAmplitudeX: 8,
    scaleAmplitude: 0.05,
    alphaAmplitude: 0.1,
    rotationAmplitude: 0.06,
    speed: 1.9,
    phase: 1.15,
  },
  {
    alias: "flame_medium",
    blendMode: "add",
    baseX: 78,
    baseY: 64,
    baseScale: 0.72,
    baseAlpha: 0.78,
    bobAmplitudeY: 10,
    swayAmplitudeX: 8,
    scaleAmplitude: 0.05,
    alphaAmplitude: 0.1,
    rotationAmplitude: 0.06,
    speed: 1.9,
    phase: 2.2,
  },
  {
    alias: "flame_large",
    blendMode: "add",
    baseX: 0,
    baseY: 74,
    baseScale: 0.66,
    baseAlpha: 0.96,
    bobAmplitudeY: 12,
    swayAmplitudeX: 6,
    scaleAmplitude: 0.06,
    alphaAmplitude: 0.08,
    rotationAmplitude: 0.025,
    speed: 2.25,
    phase: 0.75,
  },
  {
    alias: "flame_small",
    blendMode: "add",
    baseX: -64,
    baseY: 132,
    baseScale: 0.68,
    baseAlpha: 0.88,
    bobAmplitudeY: 9,
    swayAmplitudeX: 9,
    scaleAmplitude: 0.06,
    alphaAmplitude: 0.12,
    rotationAmplitude: 0.08,
    speed: 2.7,
    phase: 1.8,
  },
  {
    alias: "flame_small",
    blendMode: "add",
    baseX: 64,
    baseY: 132,
    baseScale: 0.68,
    baseAlpha: 0.88,
    bobAmplitudeY: 9,
    swayAmplitudeX: 9,
    scaleAmplitude: 0.06,
    alphaAmplitude: 0.12,
    rotationAmplitude: 0.08,
    speed: 2.7,
    phase: 2.95,
  },
  {
    alias: "ember",
    blendMode: "add",
    baseX: -118,
    baseY: 92,
    baseScale: 0.46,
    baseAlpha: 0.84,
    bobAmplitudeY: 18,
    swayAmplitudeX: 7,
    scaleAmplitude: 0.08,
    alphaAmplitude: 0.22,
    rotationAmplitude: 0.18,
    speed: 3.1,
    phase: 0.9,
  },
  {
    alias: "ember",
    blendMode: "add",
    baseX: 118,
    baseY: 88,
    baseScale: 0.46,
    baseAlpha: 0.84,
    bobAmplitudeY: 18,
    swayAmplitudeX: 7,
    scaleAmplitude: 0.08,
    alphaAmplitude: 0.22,
    rotationAmplitude: 0.18,
    speed: 3.35,
    phase: 2.45,
  },
  {
    alias: "spark",
    blendMode: "add",
    baseX: 0,
    baseY: 160,
    baseScale: 0.44,
    baseAlpha: 0.95,
    bobAmplitudeY: 5,
    swayAmplitudeX: 0,
    scaleAmplitude: 0.14,
    alphaAmplitude: 0.2,
    rotationAmplitude: 0.2,
    speed: 4.2,
    phase: 0.4,
  },
];
