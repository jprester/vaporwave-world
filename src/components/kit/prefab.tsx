import type { ReactNode } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { Material } from "three";
import { LAYERS, type DepthLayer } from "./depth";

type MeshProps = ThreeElements["mesh"];

export type DepthMeshProps = Omit<MeshProps, "position"> & {
  layer: DepthLayer;
  /** Extra millimetres in front of the layer, for a second detail on it. */
  nudge?: number;
  position?: [number, number, number];
};

/**
 * A mesh whose z is owned by the depth contract instead of by the caller.
 * `position` is x/y/z in the facade's local space; the layer is added on top.
 */
export function DepthMesh({ layer, nudge = 0, position = [0, 0, 0], ...rest }: DepthMeshProps) {
  const [x, y, z] = position;
  return <mesh {...rest} position={[x, y, z + LAYERS[layer] + nudge]} />;
}

/** A wall plane to hang assemblies on. `yaw` 0 faces +z. */
export function Facade({
  position,
  yaw = 0,
  children,
}: {
  position: [number, number, number];
  yaw?: number;
  children: ReactNode;
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {children}
    </group>
  );
}

export type WindowMaterials = {
  glass: Material;
  frame: Material;
  curtain?: Material;
  sill?: Material;
};

/**
 * A window in a single plane: curtain, glass, frame, mullion and sill.
 * All offsets come from `depth.ts`; the caller only says where the hole is.
 *
 * Origin is the centre of the glass at the wall's front face.
 */
export function WindowPrefab({
  width,
  height,
  materials,
  frameWidth = 0.08,
  frameDepth = 0.05,
  mullion = true,
  sill = true,
}: {
  width: number;
  height: number;
  materials: WindowMaterials;
  frameWidth?: number;
  frameDepth?: number;
  mullion?: boolean;
  sill?: boolean;
}) {
  const halfW = width / 2;
  const halfH = height / 2;
  const edge = halfW + frameWidth / 2;

  return (
    <group name="window-prefab">
      {materials.curtain && (
        <DepthMesh layer="CURTAIN" material={materials.curtain}>
          <planeGeometry args={[Math.max(0.01, width - 0.06), Math.max(0.01, height - 0.06)]} />
        </DepthMesh>
      )}

      <DepthMesh layer="GLASS" material={materials.glass}>
        <planeGeometry args={[width, height]} />
      </DepthMesh>

      {/* Top and bottom rail. */}
      {[-1, 1].map((s) => (
        <DepthMesh
          key={`h${s}`}
          layer="FRAME"
          position={[0, s * (halfH + frameWidth / 2), 0]}
          material={materials.frame}>
          <boxGeometry args={[width + frameWidth * 2, frameWidth, frameDepth]} />
        </DepthMesh>
      ))}
      {/* Jambs. */}
      {[-1, 1].map((s) => (
        <DepthMesh
          key={`v${s}`}
          layer="FRAME"
          position={[s * edge, 0, 0]}
          material={materials.frame}>
          <boxGeometry args={[frameWidth, height, frameDepth]} />
        </DepthMesh>
      ))}
      {mullion && (
        <DepthMesh layer="FRAME" nudge={0.004} material={materials.frame}>
          <boxGeometry args={[0.035, height, Math.max(0.02, frameDepth - 0.01)]} />
        </DepthMesh>
      )}
      {sill && (
        <DepthMesh
          layer="TRIM"
          position={[0, -(halfH + frameWidth + 0.05), 0]}
          material={materials.sill ?? materials.frame}>
          <boxGeometry args={[width + 0.2, 0.1, 0.18]} />
        </DepthMesh>
      )}
    </group>
  );
}
