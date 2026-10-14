import { useMemo } from "react";
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

// Post-processing per world. Every world so far takes the vaporwave grade:
// bloom, chromatic aberration, vignette and film noise, tweakable from the
// Leva panel in dev. A world can adjust it here (the mall's neon blooms a
// little wider and its corners are darker), or render its own composer
// instead; keep a world's heavy post libraries in its own lazy chunk.
const GRADE: Partial<Record<WorldId, { bloom: number; radius: number; vignette: number }>> = {
  mall: { bloom: 0.75, radius: 0.55, vignette: 0.5 },
};

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

  const grade = GRADE[world];

  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={grade?.bloom ?? effects.bloomIntensity}
        luminanceThreshold={effects.bloomThreshold}
        luminanceSmoothing={effects.bloomSmoothing}
        radius={grade?.radius ?? effects.bloomRadius}
      />
      <ChromaticAberration
        offset={chromaticAberrationOffset}
        radialModulation
        modulationOffset={effects.modulationOffset}
      />
      <Vignette
        eskil={false}
        offset={effects.vignetteOffset}
        darkness={grade?.vignette ?? effects.vignetteDarkness}
      />
      <Noise
        blendFunction={BlendFunction.OVERLAY}
        opacity={effects.noiseOpacity}
      />
    </EffectComposer>
  );
}
