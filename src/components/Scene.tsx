import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useThree } from "@react-three/fiber";
import {
  Fog,
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import Effects from "./Effects";
import CaveWorld from "./cave/CaveWorld";
import IslandFeed, { type FeedTextures } from "./IslandFeed";
import IslandWorld from "./island/IslandWorld";
import { LEVELS } from "./levels";
import {
  setAcoustics,
  setDistanceVolume,
  setNearBoombox,
  type Acoustics,
} from "./musicStore";
import StockroomWorld from "./stockroom/StockroomWorld";
import { usePlayerController } from "./player/usePlayerController";
import {
  getSnapshot,
  isWorldReady,
  subscribe,
  travel,
  type WorldId,
} from "./worldStore";

// The mall loads lazily, the first time a door to it is in reach (see
// mallWanted below).
const MallWorld = lazy(() => import("./mall/MallWorld"));
// The motel is lazily loaded the same way.
const MotelWorld = lazy(() => import("./motel/MotelWorld"));

// All worlds stay mounted; only the current one is visible (and so drawn and
// lit). Fog, the camera's near plane and the acoustics are per world: the
// island needs a far horizon haze, the indoor worlds a close, dim one and a
// near plane that doesn't clip the furniture.

// Fog color chosen so that, once mixed in the Water/sky shaders' display
// space (the renderer passes the linear value), fully-fogged pixels render
// as the sky shader's pink horizon band. This makes the distant
// ocean melt into the horizon instead of ending in a hard teal edge.
const FOG: Record<WorldId, Fog> = {
  island: new Fog(0xefb9d4, 80, 900),
  cave: new Fog(0x160e1c, 9, 46),
  stockroom: new Fog(0x0d0c14, 18, 66),
  // Night air, blue-black, deepening down the length of the atrium.
  mall: new Fog(0x0a0c1a, 28, 120),
  // A warm haze over the courtyard, thick enough to soften the mountains.
  motel: new Fog(0xc9748a, 35, 230),
};
const CAMERA_NEAR: Record<WorldId, number> = {
  island: 1,
  cave: 0.05,
  stockroom: 0.05,
  mall: 0.05,
  motel: 0.05,
};
// Island: straight from the boombox. Cave: out of the TVs. Stockroom: over
// the warehouse PA, into a big reverberant hall. Mall: muzak from the
// ceiling speakers, into a bigger, brighter one.
const ACOUSTICS: Record<WorldId, Acoustics> = {
  island: "open",
  cave: "tv",
  stockroom: "hall",
  mall: "mall",
  motel: "court",
};
// Indoors the music's placement and falloff are handled by the Web Audio
// graph (see musicStore), so the base level is simply full. (On the island,
// MusicPlayer sets the level from distance every frame.)
const INDOOR_MUSIC_LEVEL = 1;
// Worlds that show Plato TV somewhere, so the island feed must be rendering.
const WATCHES_TV = new Set<WorldId>(["cave", "stockroom", "mall"]);

export default function Scene() {
  const { camera, gl, scene } = useThree();
  const { world, destination, phase, cameFrom, nearDoor } =
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const level = LEVELS[world];
  const spawn = (cameFrom && level.arrivals[cameFrom]) || level.spawn;
  const playerSnapshot = usePlayerController(level, spawn, phase === "out");

  const islandGroup = useRef<Group>(null);
  const caveGroup = useRef<Group>(null);
  const stockroomGroup = useRef<Group>(null);
  const mallGroup = useRef<Group>(null);
  const motelGroup = useRef<Group>(null);
  // Mount the mall once it's wanted: the player is at a door to it, on the
  // way there, or started there. It stays mounted after that.
  const [mallWanted, setMallWanted] = useState(false);
  const wantMall =
    world === "mall" || destination === "mall" || nearDoor === "mall";
  if (wantMall && !mallWanted) setMallWanted(true);
  const [motelWanted, setMotelWanted] = useState(false);
  const wantMotel =
    world === "motel" || destination === "motel" || nearDoor === "motel";
  if (wantMotel && !motelWanted) setMotelWanted(true);
  const [feed, setFeed] = useState<FeedTextures | null>(null);
  const onFeedTextures = useCallback((t: FeedTextures) => setFeed(t), []);

  useEffect(() => {
    scene.fog = FOG[world];
    const cam = camera as PerspectiveCamera;
    cam.near = CAMERA_NEAR[world];
    cam.updateProjectionMatrix();
    setAcoustics(ACOUSTICS[world]);
    setNearBoombox(false);
    // The island sets the level from the boombox distance.
    if (world !== "island") {
      setDistanceVolume(INDOOR_MUSIC_LEVEL);
    }
    return () => {
      scene.fog = null;
    };
  }, [camera, scene, world]);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem:
          "x right, y up, z forward/back in Three.js world units",
        world: getSnapshot().world,
        // False until a lazily loaded world has mounted.
        ready: isWorldReady(getSnapshot().world),
        transition: getSnapshot().phase,
        nearDoor: getSnapshot().nearDoor,
        player: playerSnapshot.current,
        controls: "grounded-walk",
        pointerLocked: document.pointerLockElement === gl.domElement,
      });

    window.advanceTime = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

    window.travel = travel;
    window.qa_doors = () => JSON.stringify(LEVELS[getSnapshot().world].doors);
    // QA: the current level, for the walk/probe test. Same data the player
    // controller uses, so the test can compute expected floor heights.
    window.qa_level = () => JSON.stringify(LEVELS[getSnapshot().world]);
    // QA: a bounded list of visible meshes, their world positions, bounds and
    // materials. Use when a screenshot is ambiguous; not on the happy path.
    window.qa_scene = () => {
      const objects: Array<Record<string, unknown>> = [];
      const p = new Vector3();
      const materialInfo = (m: Material | Material[]) => {
        const list = Array.isArray(m) ? m : [m];
        return list.map((x) => ({
          type: x.type,
          name: x.name || undefined,
          color: (x as { color?: { getHexString(): string } }).color?.getHexString(),
          transparent: x.transparent,
          opacity: x.opacity,
        }));
      };
      scene.traverse((obj) => {
        if (objects.length >= 300) return;
        if (!obj.visible) return;
        for (let parent = obj.parent; parent; parent = parent.parent) {
          if (!parent.visible) return;
        }
        const mesh = obj as Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        mesh.geometry.computeBoundingBox();
        const size = mesh.geometry.boundingBox?.getSize(new Vector3());
        mesh.getWorldPosition(p);
        objects.push({
          name: mesh.name || undefined,
          position: [p.x, p.y, p.z].map((n) => Number(n.toFixed(2))),
          size: size
            ? [size.x, size.y, size.z].map((n) => Number(n.toFixed(2)))
            : undefined,
          castShadow: mesh.castShadow,
          receiveShadow: mesh.receiveShadow,
          material: materialInfo(mesh.material),
        });
      });
      return JSON.stringify({ world: getSnapshot().world, meshes: objects.length, objects });
    };
    // QA: raycast from a point in a direction. Returns the first few hits with
    // distance, point, object name and material, for checking what is really
    // in front of the player.
    window.qa_raycast = (x, y, z, dx, dy, dz, far = 50) => {
      const ray = new Raycaster(
        new Vector3(x, y, z),
        new Vector3(dx, dy, dz).normalize(),
        0.001,
        far,
      );
      const hits = ray.intersectObjects(scene.children, true).filter((hit) => {
        let obj: Object3D | null = hit.object;
        while (obj) {
          if (!obj.visible) return false;
          obj = obj.parent;
        }
        return true;
      });
      return JSON.stringify(
        hits.slice(0, 8).map((hit) => ({
          distance: Number(hit.distance.toFixed(3)),
          point: hit.point.toArray().map((n) => Number(n.toFixed(2))),
          name: hit.object.name || undefined,
        })),
      );
    };
    // Draw calls and triangles over one whole frame (every composer pass),
    // plus the GPU memory counts.
    window.qa_renderInfo = async () => {
      const frame = () =>
        new Promise<void>((r) => window.requestAnimationFrame(() => r()));
      await frame();
      gl.info.autoReset = false;
      gl.info.reset();
      await frame();
      const info = {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        lines: gl.info.render.lines,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
      };
      gl.info.autoReset = true;
      return JSON.stringify(info);
    };
  }, [gl, playerSnapshot]);

  return (
    <>
      <group ref={islandGroup} visible={world === "island"}>
        <IslandWorld active={world === "island" && phase !== "out"} />
      </group>
      <group ref={caveGroup} visible={world === "cave"}>
        <CaveWorld active={world === "cave" && phase !== "out"} feed={feed} />
      </group>
      <group ref={stockroomGroup} visible={world === "stockroom"}>
        <StockroomWorld
          active={world === "stockroom" && phase !== "out"}
          feed={feed}
        />
      </group>
      <group ref={mallGroup} visible={world === "mall"}>
        {mallWanted && (
          <Suspense fallback={null}>
            <MallWorld active={world === "mall" && phase !== "out"} feed={feed} />
          </Suspense>
        )}
      </group>
      <group ref={motelGroup} visible={world === "motel"}>
        {motelWanted && (
          <Suspense fallback={null}>
            <MotelWorld active={world === "motel" && phase !== "out"} />
          </Suspense>
        )}
      </group>
      <IslandFeed
        enabled={WATCHES_TV.has(world) || WATCHES_TV.has(destination)}
        island={islandGroup}
        others={[caveGroup, stockroomGroup, mallGroup, motelGroup]}
        islandFog={FOG.island}
        onTextures={onFeedTextures}
      />
      <Effects world={world} />
    </>
  );
}
