import { MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import type { Texture } from "three";

// The glazed Tiles105 set used by the platform and the pedestal.
export const TILE_TEXTURE_PATHS = [
  "/textures/wall/bahtroom-walls2/Tiles105_2K-JPG_Color.jpg",
  "/textures/wall/bahtroom-walls2/Tiles105_2K-JPG_NormalGL.jpg",
  "/textures/wall/bahtroom-walls2/Tiles105_1K-JPG_Roughness_cr.jpg",
];

export function configureRepeatingTexture(
  texture: Texture,
  repeatX: number,
  repeatY: number,
  isColorMap = false,
  offsetX = 0,
  offsetY = 0,
) {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.offset.set(offsetX, offsetY);
  texture.anisotropy = 8;
  if (isColorMap) {
    texture.colorSpace = SRGBColorSpace;
  }
  texture.needsUpdate = true;

  return texture;
}

// Disposes a tiled material together with its cloned map textures. The maps
// are per-material clones (see makeTiledMaterial), so they must be disposed
// individually or they leak GPU resources when the material goes away.
export function disposeTiledMaterial(material: MeshPhysicalMaterial) {
  material.map?.dispose();
  material.normalMap?.dispose();
  material.roughnessMap?.dispose();
  material.dispose();
}