import { ShaderMaterial, Texture } from "three";
import crtVertexShader from "../../shaders/crt.vert.glsl";
import crtFragmentShader from "../../shaders/crt.frag.glsl";

export const CRT_FEED = 0;
export const CRT_STATIC = 1;
export const CRT_NO_SIGNAL = 2;

// Uniforms every screen shares: the feed and its broadcast graphics, and one
// clock. Each screen's
// material points at these same objects, so updating them updates all sets.
export interface SharedCrtUniforms {
  uFeed: { value: Texture | null };
  uOverlay: { value: Texture | null };
  uHasFeed: { value: number };
  uTime: { value: number };
}

export function createSharedCrtUniforms(): SharedCrtUniforms {
  return {
    uFeed: { value: null },
    uOverlay: { value: null },
    uHasFeed: { value: 0 },
    uTime: { value: 0 },
  };
}

export function createCrtMaterial(
  shared: SharedCrtUniforms,
  seed: number,
  mode: number,
  brightness = 1.0,
) {
  return new ShaderMaterial({
    vertexShader: crtVertexShader,
    fragmentShader: crtFragmentShader,
    uniforms: {
      ...shared,
      uSeed: { value: seed },
      uMode: { value: mode },
      uBrightness: { value: brightness },
    },
    toneMapped: false,
    fog: false,
  });
}
