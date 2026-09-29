import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import {
  BackSide,
  MathUtils,
  Mesh,
  PlaneGeometry,
  RawShaderMaterial,
  RepeatWrapping,
  SphereGeometry,
  TextureLoader,
  Vector3,
} from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { useControls } from "leva";
import skyVertexShader from "../../shaders/sky.vert.glsl";
import skyFragmentShader from "../../shaders/sky.frag.glsl";
import DoorTrigger from "../DoorTrigger";
import MusicPlayer from "../MusicPlayer";
import FloatingFloor from "./FloatingFloor";
import PlatoSign from "./PlatoSign";
import {
  DoricColumns,
  FloorDoor,
  VaporwaveBust,
  WomanStatue,
} from "./Props";
import {
  DOOR_X,
  DOOR_Z,
  OCEAN_SIZE,
  SUN_AZIMUTH,
  SUN_ELEVATION,
} from "./constants";

// The island: procedural sky, endless ocean, the tiled platform with its pool,
// set dressing and the boombox, lit by a low pink sun.
export default function IslandWorld({ active }: { active: boolean }) {
  const waterRef = useRef<Water>(null);

  const lights = useControls("Lights", {
    ambientColor: "#e8cad8",
    ambientIntensity: { value: 1.2, min: 0, max: 5, step: 0.1 },
    hemiSkyColor: "#b7b6d6",
    hemiGroundColor: "#e8bccf",
    hemiIntensity: { value: 1.8, min: 0, max: 5, step: 0.1 },
    dirColor: "#ff6ea5",
    dirIntensity: { value: 7.2, min: 0, max: 10, step: 0.1 },
  });

  const sunDirection = useMemo(() => {
    const phi = MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = MathUtils.degToRad(SUN_AZIMUTH);
    return new Vector3().setFromSphericalCoords(1, phi, theta).normalize();
  }, []);
  const waterNormals = useLoader(TextureLoader, "/textures/waternormals.jpg");

  const skyMaterial = useMemo(
    () =>
      new RawShaderMaterial({
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        side: BackSide,
        uniforms: {
          uSunDir: { value: sunDirection.clone() },
          uTime: { value: 0 },
        },
      }),
    [sunDirection],
  );

  const skyMesh = useMemo(
    () => new Mesh(new SphereGeometry(OCEAN_SIZE, 32, 32), skyMaterial),
    [skyMaterial],
  );

  const water = useMemo(() => {
    waterNormals.wrapS = RepeatWrapping;
    waterNormals.wrapT = RepeatWrapping;
    waterNormals.needsUpdate = true;

    const waterObject = new Water(new PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new Vector3(),
      sunColor: 0xff33aa,
      waterColor: 0x4fb8c4,
      distortionScale: 2.0,
      fog: true,
    });

    waterObject.rotation.x = -Math.PI / 2;

    return waterObject;
  }, [waterNormals]);

  useEffect(() => {
    water.material.uniforms.sunDirection.value.copy(sunDirection);
    skyMaterial.uniforms.uSunDir.value.copy(sunDirection);
  }, [skyMaterial, sunDirection, water]);

  useFrame((state, delta) => {
    const waterObject = waterRef.current;
    if (waterObject) {
      waterObject.material.uniforms.time.value += delta;
    }
    skyMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <group name="island-world">
      <primitive object={skyMesh} />
      <primitive ref={waterRef} object={water} />
      <ambientLight
        name="ambient-light"
        color={lights.ambientColor}
        intensity={lights.ambientIntensity}
      />
      <hemisphereLight
        name="hemisphere-light"
        color={lights.hemiSkyColor}
        groundColor={lights.hemiGroundColor}
        intensity={lights.hemiIntensity}
      />
      <directionalLight
        name="directional-light"
        color={lights.dirColor}
        intensity={lights.dirIntensity}
        position={[
          sunDirection.x * 500,
          sunDirection.y * 500,
          sunDirection.z * 500,
        ]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={600}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0005}
      />
      <FloatingFloor sunDirection={sunDirection} />
      <PlatoSign />
      <DoricColumns />
      <VaporwaveBust />
      <WomanStatue />
      <FloorDoor />
      <DoorTrigger x={DOOR_X} z={DOOR_Z} normal={[0, 1]} active={active} />
      <MusicPlayer active={active} />
    </group>
  );
}
