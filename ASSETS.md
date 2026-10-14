# Downloaded assets

Third-party files added to the repository from asset libraries such as
[Poly Haven](https://polyhaven.com) (CC0), with their source and license.

Models and textures made in code (canvas textures, primitives, shaders) are
not listed. The older models credited in the README (Sketchfab, CC BY) are not
listed here either.

| File | Asset | Source | Author | License | Processing |
| ---- | ----- | ------ | ------ | ------- | ---------- |

There are none at the moment. The two Poly Haven files that round 2's first
world used (a scanned marble bust and a studio HDRI) were removed with that
world; the mall that replaced it is built from canvas textures, primitives,
shaders and the game's existing models.

When you add one, record it here, compress meshes
(`npx @gltf-transform/cli optimize in.gltf out.glb --compress meshopt
--texture-compress webp --texture-size 1024`), use 1K textures, and load it
lazily with the world that uses it.
