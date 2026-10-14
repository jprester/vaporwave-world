import { useEffect, useMemo } from "react";
import type { RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type Object3D,
  type Texture,
} from "three";

// Real reflections in the concourse floor. Every frame the mall is on
// screen, the scene is rendered from the camera mirrored in the floor plane
// into a texture (with an oblique near plane, so nothing below the floor
// leaks in), and the floor material adds that picture back in: weakly and
// blurred where the terrazzo is dry, strongly and sharp where it's wet, and
// more at grazing angles. The blur is the texture's mip chain.
//
// Drei's MeshReflectorMaterial renders every frame whether or not its floor
// is visible, and multiplies the reflection into the albedo (so a dark floor
// can't carry a bright neon reflection); this one only renders while
// `active` and adds light.

const SIZE: [number, number] = [1024, 512];

export function useFloorReflection(
  floor: RefObject<Object3D | null>,
  floorY: number,
  active: boolean,
) {
  const { gl, scene, camera } = useThree();
  const target = useMemo(
    () =>
      new WebGLRenderTarget(SIZE[0], SIZE[1], {
        type: HalfFloatType,
        generateMipmaps: true,
        minFilter: LinearMipmapLinearFilter,
        magFilter: LinearFilter,
      }),
    [],
  );
  useEffect(() => () => target.dispose(), [target]);

  const s = useMemo(
    () => ({
      virtualCamera: new PerspectiveCamera(),
      matrix: new Matrix4(),
      normal: new Vector3(0, 1, 0),
      origin: new Vector3(),
      cameraPosition: new Vector3(),
      rotation: new Matrix4(),
      lookAt: new Vector3(),
      view: new Vector3(),
      target: new Vector3(),
      plane: new Plane(),
      clip: new Vector4(),
      q: new Vector4(),
    }),
    [],
  );

  useFrame(() => {
    const mesh = floor.current;
    if (!active || !mesh) return;
    const { virtualCamera: vc, normal } = s;
    s.origin.set(0, floorY, 0);
    s.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    s.view.subVectors(s.origin, s.cameraPosition);
    if (s.view.dot(normal) > 0) return; // below the floor
    // (After three's Reflector.)
    s.view.reflect(normal).negate().add(s.origin);
    s.rotation.extractRotation(camera.matrixWorld);
    s.lookAt.set(0, 0, -1).applyMatrix4(s.rotation).add(s.cameraPosition);
    s.target.subVectors(s.origin, s.lookAt).reflect(normal).negate().add(s.origin);
    vc.position.copy(s.view);
    vc.up.set(0, 1, 0).applyMatrix4(s.rotation).reflect(normal);
    vc.lookAt(s.target);
    vc.far = (camera as PerspectiveCamera).far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);

    s.matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    s.matrix.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);

    // Oblique near plane at the floor
    // (http://www.terathon.com/lengyel/Lengyel-Oblique.pdf).
    s.plane.setFromNormalAndCoplanarPoint(normal, s.origin);
    s.plane.applyMatrix4(vc.matrixWorldInverse);
    s.clip.set(s.plane.normal.x, s.plane.normal.y, s.plane.normal.z, s.plane.constant);
    const p = vc.projectionMatrix.elements;
    s.q.set(
      (Math.sign(s.clip.x) + p[8]) / p[0],
      (Math.sign(s.clip.y) + p[9]) / p[5],
      -1,
      (1 + p[10]) / p[14],
    );
    s.clip.multiplyScalar(2 / s.clip.dot(s.q));
    p[2] = s.clip.x;
    p[6] = s.clip.y;
    p[10] = s.clip.z + 1;
    p[14] = s.clip.w;

    const shadowAutoUpdate = gl.shadowMap.autoUpdate;
    gl.shadowMap.autoUpdate = false;
    mesh.visible = false;
    gl.setRenderTarget(target);
    // The composer leaves autoClear off.
    gl.clear();
    gl.render(scene, vc);
    gl.setRenderTarget(null);
    mesh.visible = true;
    gl.shadowMap.autoUpdate = shadowAutoUpdate;
  }, -1);

  return useMemo(() => ({ texture: target.texture, matrix: s.matrix }), [target, s]);
}

// A standard material whose roughness map doubles as the wetness map, with
// the reflection added on top.
export function makeWetFloorMaterial(
  map: Texture,
  roughnessMap: Texture,
  reflection: { texture: Texture; matrix: Matrix4 },
) {
  const material = new MeshStandardMaterial({
    map,
    roughnessMap,
    roughness: 1,
    metalness: 0,
    color: "#ffffff",
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReflect = { value: reflection.texture };
    shader.uniforms.uReflectMatrix = { value: reflection.matrix };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform mat4 uReflectMatrix;\nvarying vec4 vReflectUv;",
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvReflectUv = uReflectMatrix * modelMatrix * vec4(transformed, 1.0);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uReflect;\nvarying vec4 vReflectUv;",
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
        {
          // 0 = dry polished terrazzo, 1 = standing water.
          float wet = clamp(1.0 - texture2D(roughnessMap, vRoughnessMapUv).g * 1.6, 0.0, 1.0);
          vec2 ruv = vReflectUv.xy / vReflectUv.w;
          vec3 reflected = textureLod(uReflect, ruv, mix(4.2, 0.4, wet)).rgb;
          float ndv = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
          float fresnel = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
          float k = mix(0.3, 1.0, wet) * mix(0.5, 1.0, fresnel);
          // Water darkens what's under it and mirrors what's above it.
          outgoingLight = outgoingLight * (1.0 - 0.55 * wet) + reflected * k;
        }
        #include <opaque_fragment>`,
      );
  };
  // Distinct from other standard materials' cached programs.
  material.customProgramCacheKey = () => "mall-wet-floor";
  return material;
}
