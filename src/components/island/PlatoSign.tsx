import { useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { Color, MeshPhysicalMaterial, TextureLoader, Vector2 } from "three";
import { configureRepeatingTexture, TILE_TEXTURE_PATHS } from "../materials";
import {
  FLOOR_HEIGHT,
  PEDESTAL_CENTER_X,
  PEDESTAL_CENTER_Z,
  PEDESTAL_DEPTH,
  PEDESTAL_HEIGHT,
  PEDESTAL_WIDTH,
} from "./constants";

export default function PlatoSign() {
  const [colorMap, normalMap, roughnessMap] = useLoader(
    TextureLoader,
    TILE_TEXTURE_PATHS,
  );

  const pedestalMaterial = useMemo(() => {
    const repeatX = PEDESTAL_WIDTH / 6;
    const repeatY = PEDESTAL_HEIGHT / 6;
    return new MeshPhysicalMaterial({
      map: configureRepeatingTexture(colorMap.clone(), repeatX, repeatY, true),
      normalMap: configureRepeatingTexture(normalMap.clone(), repeatX, repeatY),
      roughnessMap: configureRepeatingTexture(
        roughnessMap.clone(),
        repeatX,
        repeatY,
      ),
      normalScale: new Vector2(0.08, 0.08),
      color: "#ead4dc",
      roughness: 0.15,
      metalness: 0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.2,
    });
  }, [colorMap, normalMap, roughnessMap]);

  useEffect(
    () => () => {
      pedestalMaterial.map?.dispose();
      pedestalMaterial.normalMap?.dispose();
      pedestalMaterial.roughnessMap?.dispose();
      pedestalMaterial.dispose();
    },
    [pedestalMaterial],
  );

  const pedestalY = FLOOR_HEIGHT + PEDESTAL_HEIGHT / 2;
  const textZ = PEDESTAL_DEPTH / 2 + 0.02;
  const neonCore = useMemo(() => new Color(3.2, 0.65, 1.9), []);

  return (
    <group
      name="plato-sign"
      position={[PEDESTAL_CENTER_X, 0, PEDESTAL_CENTER_Z]}>
      <mesh
        name="pedestal"
        position={[0, pedestalY, 0]}
        material={pedestalMaterial}
        castShadow
        receiveShadow>
        <boxGeometry args={[PEDESTAL_WIDTH, PEDESTAL_HEIGHT, PEDESTAL_DEPTH]} />
      </mesh>
      <Text
        name="plato-text"
        font="/fonts/Italianno-Regular.ttf"
        position={[0, FLOOR_HEIGHT + 7.6, textZ]}
        fontSize={1.45}
        lineHeight={0.82}
        letterSpacing={-0.03}
        anchorX="center"
        anchorY="middle"
        maxWidth={PEDESTAL_WIDTH - 0.2}
        textAlign="center"
        outlineColor="#ff7cc8"
        outlineWidth={0}
        outlineBlur={0.45}
        outlineOpacity={0.9}>
        Plato's{"\n"}Cove
        <meshBasicMaterial color={neonCore} toneMapped={false} />
      </Text>
      <pointLight
        name="neon-sign-glow"
        position={[0, FLOOR_HEIGHT + 7.6, textZ + 1.1]}
        color="#ff5cb0"
        intensity={2}
        distance={10}
        decay={2}
      />
    </group>
  );
}
