import { lazy, Suspense, useMemo } from "react";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { useControls } from "leva";
import type { WorldId } from "./worldStore";

// The forms' own composer lives in their lazily loaded chunk (with the
// ambient occlusion library), so the first load doesn't carry it.
const FormsEffects = lazy(() =>
  import("./forms/FormsWorld").then((m) => ({ default: m.FormsEffects })),
);

// Post-processing per world. The island, the cave and the stockroom share
// the vaporwave grade: bloom, chromatic aberration, vignette and film noise,
// tweakable from the Leva panel in dev. The forms get none of it (see
// FormsEffects).
export default function Effects({ world }: { world: WorldId }) {
  const effects = useControls("Effects", {
    bloomIntensity: { value: 0.5, min: 0, max: 5, step: 0.01 },
    bloomThreshold: { value: 1.2, min: 0, max: 3, step: 0.01 },
    bloomSmoothing: { value: 0.5, min: 0, max: 1, step: 0.01 },
    bloomRadius: { value: 0.4, min: 0, max: 1, step: 0.01 },
    chromaticOffset: { value: 0.002, min: 0, max: 0.009, step: 0.001 },
    modulationOffset: { value: 0.45, min: 0, max: 1, step: 0.01 },
    vignetteOffset: { value: 0.4, min: 0, max: 1, step: 0.01 },
    vignetteDarkness: { value: 0.35, min: 0, max: 1, step: 0.01 },
    noiseOpacity: { value: 0.09, min: 0, max: 1, step: 0.01 },
  });

  const chromaticAberrationOffset = useMemo(
    () => new Vector2(effects.chromaticOffset, effects.chromaticOffset),
    [effects.chromaticOffset],
  );

  if (world === "forms") {
    return (
      <Suspense fallback={null}>
        <FormsEffects />
      </Suspense>
    );
  }

  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={effects.bloomIntensity}
        luminanceThreshold={effects.bloomThreshold}
        luminanceSmoothing={effects.bloomSmoothing}
        radius={effects.bloomRadius}
      />
      <ChromaticAberration
        offset={chromaticAberrationOffset}
        radialModulation
        modulationOffset={effects.modulationOffset}
      />
      <Vignette
        eskil={false}
        offset={effects.vignetteOffset}
        darkness={effects.vignetteDarkness}
      />
      <Noise
        blendFunction={BlendFunction.OVERLAY}
        opacity={effects.noiseOpacity}
      />
    </EffectComposer>
  );
}
