import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import {
  MeshPhysicalMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import {
  configureRepeatingTexture,
  disposeTiledMaterial,
  TILE_TEXTURE_PATHS,
} from "../materials";
import {
  FLOOR_DEPTH,
  FLOOR_HEIGHT,
  FLOOR_TEXTURE_WORLD_SIZE,
  FLOOR_WIDTH,
  FRAME_THICKNESS,
  POOL_CENTER_X,
  POOL_CENTER_Z,
  POOL_DEPTH,
  POOL_RECESS,
  POOL_WATER_DROP,
  POOL_WIDTH,
} from "./constants";

export default function FloatingFloor({ sunDirection }: { sunDirection: Vector3 }) {
  const [colorMap, normalMap, roughnessMap] = useLoader(
    TextureLoader,
    TILE_TEXTURE_PATHS,
  );
  const waterNormals = useLoader(TextureLoader, "/textures/waternormals.jpg");

  const poolWaterRef = useRef<Water>(null);
  const poolWater = useMemo(() => {
    const tNormals = waterNormals.clone();
    tNormals.wrapS = RepeatWrapping;
    tNormals.wrapT = RepeatWrapping;
    tNormals.needsUpdate = true;

    const waterObject = new Water(
      new PlaneGeometry(POOL_WIDTH - 0.05, POOL_DEPTH - 0.05),
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: tNormals,
        sunDirection: new Vector3(),
        sunColor: 0xff5cb0,
        waterColor: 0x1d4a52,
        distortionScale: 0.15,
        fog: true,
      },
    );

    waterObject.rotation.x = -Math.PI / 2;
    waterObject.material.transparent = true;
    waterObject.material.depthWrite = false;
    // The built-in Water shader is reflection-only and fully opaque. Drive its
    // alpha from the Fresnel term (`reflectance`) it already computes: looking
    // straight down the water is clear so the pool tiles show through, while at
    // grazing angles it stays opaque and mirror-like (keeps the sky reflection).
    waterObject.material.fragmentShader =
      waterObject.material.fragmentShader.replace(
        "gl_FragColor = vec4( outgoingLight, alpha );",
        "gl_FragColor = vec4( outgoingLight, mix( 0.16, 0.92, smoothstep( 0.3, 1.0, reflectance ) ) );",
      );

    return waterObject;
  }, [waterNormals]);

  useEffect(() => {
    if (poolWater) {
      poolWater.material.uniforms.sunDirection.value.copy(sunDirection);
    }
  }, [poolWater, sunDirection]);

  useFrame((_, delta) => {
    if (poolWaterRef.current) {
      poolWaterRef.current.material.uniforms.time.value += delta * 0.15;
    }
  });

  const makeTiledMaterial = (
    width: number,
    height: number,
    worldSize = FLOOR_TEXTURE_WORLD_SIZE,
    offsetX = 0,
    offsetY = 0,
    repeatXSign = 1,
  ) => {
    const repeatX = (width / worldSize) * repeatXSign;
    const repeatY = height / worldSize;
    return new MeshPhysicalMaterial({
      map: configureRepeatingTexture(
        colorMap.clone(),
        repeatX,
        repeatY,
        true,
        offsetX,
        offsetY,
      ),
      normalMap: configureRepeatingTexture(
        normalMap.clone(),
        repeatX,
        repeatY,
        false,
        offsetX,
        offsetY,
      ),
      roughnessMap: configureRepeatingTexture(
        roughnessMap.clone(),
        repeatX,
        repeatY,
        false,
        offsetX,
        offsetY,
      ),
      normalScale: new Vector2(0.18, 0.18),
      color: "#e8d0d8",
      roughness: 0.15,
      metalness: 0,
      // Clearcoat is the wet/glazed varnish layer on top of the ceramic base.
      clearcoat: 0.85,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.2,
    });
  };

  const floorOffset = (
    centerX: number,
    centerZ: number,
    w: number,
    d: number,
  ) =>
    [
      (centerX - w / 2) / FLOOR_TEXTURE_WORLD_SIZE,
      -(centerZ + d / 2) / FLOOR_TEXTURE_WORLD_SIZE,
    ] as const;

  const poolMinX = POOL_CENTER_X - POOL_WIDTH / 2;
  const poolMaxX = POOL_CENTER_X + POOL_WIDTH / 2;
  const poolMinZ = POOL_CENTER_Z - POOL_DEPTH / 2;
  const poolMaxZ = POOL_CENTER_Z + POOL_DEPTH / 2;
  const floorMinX = -FLOOR_WIDTH / 2;
  const floorMaxX = FLOOR_WIDTH / 2;
  const floorMinZ = -FLOOR_DEPTH / 2;
  const floorMaxZ = FLOOR_DEPTH / 2;

  const northDepth = poolMinZ - floorMinZ;
  const southDepth = floorMaxZ - poolMaxZ;
  const sideDepth = poolMaxZ - poolMinZ;
  const westWidth = poolMinX - floorMinX;
  const eastWidth = floorMaxX - poolMaxX;

  const frameTopY = FLOOR_HEIGHT - FRAME_THICKNESS / 2;
  const poolFloorTopY = FLOOR_HEIGHT - POOL_RECESS;
  const poolFloorCenterY = poolFloorTopY - FRAME_THICKNESS / 2;
  const poolWaterY = FLOOR_HEIGHT - POOL_WATER_DROP;

  const slabs = useMemo(
    () => [
      {
        key: "north",
        size: [FLOOR_WIDTH, FRAME_THICKNESS, northDepth] as const,
        position: [0, frameTopY, (floorMinZ + poolMinZ) / 2] as const,
      },
      {
        key: "south",
        size: [FLOOR_WIDTH, FRAME_THICKNESS, southDepth] as const,
        position: [0, frameTopY, (poolMaxZ + floorMaxZ) / 2] as const,
      },
      {
        key: "west",
        size: [westWidth, FRAME_THICKNESS, sideDepth] as const,
        position: [
          (floorMinX + poolMinX) / 2,
          frameTopY,
          POOL_CENTER_Z,
        ] as const,
      },
      {
        key: "east",
        size: [eastWidth, FRAME_THICKNESS, sideDepth] as const,
        position: [
          (poolMaxX + floorMaxX) / 2,
          frameTopY,
          POOL_CENTER_Z,
        ] as const,
      },
    ],
    [
      eastWidth,
      floorMaxX,
      floorMinX,
      floorMaxZ,
      floorMinZ,
      frameTopY,
      northDepth,
      poolMaxX,
      poolMaxZ,
      poolMinX,
      poolMinZ,
      sideDepth,
      southDepth,
      westWidth,
    ],
  );

  const slabMaterials = useMemo(
    () =>
      slabs.map((s) => {
        const [w, , d] = s.size;
        const [cx, , cz] = s.position;
        const [offsetX, offsetY] = floorOffset(cx, cz, w, d);
        return makeTiledMaterial(
          w,
          d,
          FLOOR_TEXTURE_WORLD_SIZE,
          offsetX,
          offsetY,
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slabs, colorMap, normalMap, roughnessMap],
  );

  const poolFloorMaterial = useMemo(() => {
    const [offsetX, offsetY] = floorOffset(
      POOL_CENTER_X,
      POOL_CENTER_Z,
      POOL_WIDTH,
      POOL_DEPTH,
    );
    return makeTiledMaterial(
      POOL_WIDTH,
      POOL_DEPTH,
      FLOOR_TEXTURE_WORLD_SIZE,
      offsetX,
      offsetY,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMap, normalMap, roughnessMap]);

  const WALL_TILE_WORLD_SIZE = FLOOR_TEXTURE_WORLD_SIZE;
  const poolWallMaterials = useMemo(() => {
    // Walls share the floor's tile size and align horizontally with world X/Z
    // so wall and floor tile grid lines meet at the pool's lip. The top of each
    // wall is set to a tile boundary so the partial tile sits at the bottom.
    const wallVOffset = -POOL_RECESS / WALL_TILE_WORLD_SIZE;
    const nsFront = makeTiledMaterial(
      POOL_WIDTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_X - POOL_WIDTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
    );
    const nsBack = makeTiledMaterial(
      POOL_WIDTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_X + POOL_WIDTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
      -1,
    );
    const ewEast = makeTiledMaterial(
      POOL_DEPTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_Z - POOL_DEPTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
    );
    const ewWest = makeTiledMaterial(
      POOL_DEPTH,
      POOL_RECESS,
      WALL_TILE_WORLD_SIZE,
      (POOL_CENTER_Z + POOL_DEPTH / 2) / WALL_TILE_WORLD_SIZE,
      wallVOffset,
      -1,
    );
    return { nsFront, nsBack, ewEast, ewWest };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMap, normalMap, roughnessMap, WALL_TILE_WORLD_SIZE]);

  useEffect(
    () => () => {
      slabMaterials.forEach(disposeTiledMaterial);
      disposeTiledMaterial(poolFloorMaterial);
      poolWater.geometry.dispose();
      poolWater.material.dispose();
      // The pool water clones the shared water-normals texture for its own
      // wrapping; release that clone (the ocean's copy stays alive).
      (poolWater.material.uniforms.normalSampler.value as Texture).dispose();
      disposeTiledMaterial(poolWallMaterials.nsFront);
      disposeTiledMaterial(poolWallMaterials.nsBack);
      disposeTiledMaterial(poolWallMaterials.ewEast);
      disposeTiledMaterial(poolWallMaterials.ewWest);
    },
    [slabMaterials, poolFloorMaterial, poolWater, poolWallMaterials],
  );

  const wallCenterY = poolFloorTopY + POOL_RECESS / 2;
  const wallEpsilon = 0.012;

  return (
    <group name="floating-floor">
      {slabs.map((slab, i) => (
        <mesh
          key={slab.key}
          name={`floor-slab-${slab.key}`}
          position={slab.position as unknown as [number, number, number]}
          material={slabMaterials[i]}
          receiveShadow>
          <boxGeometry
            args={slab.size as unknown as [number, number, number]}
          />
        </mesh>
      ))}
      <mesh
        name="pool-floor"
        position={[POOL_CENTER_X, poolFloorCenterY, POOL_CENTER_Z]}
        material={poolFloorMaterial}
        receiveShadow>
        <boxGeometry args={[POOL_WIDTH, FRAME_THICKNESS, POOL_DEPTH]} />
      </mesh>
      <mesh
        name="pool-wall-north"
        position={[POOL_CENTER_X, wallCenterY, poolMinZ + wallEpsilon]}
        material={poolWallMaterials.nsFront}>
        <planeGeometry args={[POOL_WIDTH, POOL_RECESS]} />
      </mesh>
      <mesh
        name="pool-wall-south"
        position={[POOL_CENTER_X, wallCenterY, poolMaxZ - wallEpsilon]}
        rotation={[0, Math.PI, 0]}
        material={poolWallMaterials.nsBack}>
        <planeGeometry args={[POOL_WIDTH, POOL_RECESS]} />
      </mesh>
      <mesh
        name="pool-wall-east"
        position={[poolMaxX - wallEpsilon, wallCenterY, POOL_CENTER_Z]}
        rotation={[0, -Math.PI / 2, 0]}
        material={poolWallMaterials.ewEast}>
        <planeGeometry args={[POOL_DEPTH, POOL_RECESS]} />
      </mesh>
      <mesh
        name="pool-wall-west"
        position={[poolMinX + wallEpsilon, wallCenterY, POOL_CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
        material={poolWallMaterials.ewWest}>
        <planeGeometry args={[POOL_DEPTH, POOL_RECESS]} />
      </mesh>
      <primitive
        ref={poolWaterRef}
        object={poolWater}
        position={[POOL_CENTER_X, poolWaterY, POOL_CENTER_Z]}
      />
    </group>
  );
}
