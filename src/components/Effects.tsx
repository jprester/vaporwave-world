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

// The vaporwave grade shared by every world: bloom, chromatic aberration,
// vignette and film noise. Tweakable from the Leva panel in dev.
export default function Effects() {
  const effects = useControls("Effects", {
    bloomIntensity: { value: 0.1, min: 0, max: 5, step: 0.01 },
    bloomThreshold: { value: 1.45, min: 0, max: 3, step: 0.01 },
    bloomSmoothing: { value: 0.5, min: 0, max: 1, step: 0.01 },
    bloomRadius: { value: 0.22, min: 0, max: 1, step: 0.01 },
    chromaticOffset: { value: 0.002, min: 0, max: 0.009, step: 0.001 },
    modulationOffset: { value: 0.45, min: 0, max: 1, step: 0.01 },
    vignetteOffset: { value: 0.4, min: 0, max: 1, step: 0.01 },
    vignetteDarkness: { value: 0.35, min: 0, max: 1, step: 0.01 },
    noiseOpacity: { value: 0.15, min: 0, max: 1, step: 0.01 },
  });

  const chromaticAberrationOffset = useMemo(
    () => new Vector2(effects.chromaticOffset, effects.chromaticOffset),
    [effects.chromaticOffset],
  );

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
