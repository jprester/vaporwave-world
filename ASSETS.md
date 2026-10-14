# Downloaded assets

Third-party files added to the repository from asset libraries, with their
source and license. Everything here is from [Poly Haven](https://polyhaven.com),
where every asset is CC0 (public domain): no attribution is required, but it's
given anyway.

Models and textures made in code (canvas textures, primitives, shaders) are
not listed. The older models credited in the README (Sketchfab, CC BY) are not
listed here either.

| File | Asset | Source | Author | License | Processing |
| ---- | ----- | ------ | ------ | ------- | ---------- |
| `public/models/forms/marble_bust_01.glb` | Marble Bust 01 | https://polyhaven.com/a/marble_bust_01 | Rico Cilliers | CC0 | 1K glTF converted to GLB with `@gltf-transform/cli optimize`: meshopt-compressed geometry, textures re-encoded as WebP at 1024 px (898 KB → 358 KB) |
| `public/textures/forms/cyclorama_hard_light_1k.hdr` | Cyclorama Hard Light (HDRI) | https://polyhaven.com/a/cyclorama_hard_light | Sergej Majboroda | CC0 | none (1K equirectangular .hdr, 1.4 MB) |

Both are loaded lazily, only when the world that uses them is first needed.

To re-create the GLB from the original download:

```bash
npx @gltf-transform/cli optimize marble_bust_01_1k.gltf marble_bust_01.glb \
  --compress meshopt --texture-compress webp --texture-size 1024
```
