import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../cave/textures";
import {
  HALF_L,
  RACK_BAY,
  RACK_BAYS,
  RACK_DEPTH,
  RACK_HEIGHT,
  RACK_LEVELS,
  RACK_X,
  RACK_Z0,
  SUN_DIAMETER,
  SUN_Z,
  lot,
} from "./constants";
import { MODEL, useFittedModel, type FittedModel } from "./models";
import {
  makeCardboardTexture,
  makeSunTexture,
  makeTagTexture,
} from "./textures";

// The stock itself: the racks along the walls, and in the floor lots the
// spares of everything on the island, counted, tagged and shrink-wrapped.
// The numbers agree with the inventory board by the desk.

type Vec3 = [number, number, number];

function FittedPrimitive({
  model,
  position,
  rotation = [0, 0, 0],
}: {
  model: FittedModel;
  position: Vec3;
  rotation?: Vec3;
}) {
  const object = useMemo(() => model.clone(), [model]);
  return (
    <group position={position} rotation={rotation}>
      <primitive
        object={object}
        position={model.offset}
        scale={model.scale}
      />
    </group>
  );
}

// A manila stock tag.
export function Tag({
  lines,
  position,
  rotation = [0, 0, 0],
  size = 0.55,
}: {
  lines: string[];
  position: Vec3;
  rotation?: Vec3;
  size?: number;
}) {
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        map: makeTagTexture(lines),
        roughness: 0.85,
        side: DoubleSide,
      }),
    // Keyed on the text: the lines are literals at every call site.
    [lines.join("\n")],
  );
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <planeGeometry args={[size, size * 0.625]} />
    </mesh>
  );
}

// Shared materials and geometry for the lots.
export function useStockMaterials() {
  const materials = useMemo(() => {
    const wood = new MeshStandardMaterial({ color: "#9c7a4f", roughness: 0.9 });
    const wrap = new MeshStandardMaterial({
      color: "#e8eef6",
      roughness: 0.12,
      metalness: 0,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: DoubleSide,
    });
    const strap = new MeshStandardMaterial({ color: "#d7cba8", roughness: 0.6 });
    return { wood, wrap, strap };
  }, []);
  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials],
  );
  return materials;
}

// One wooden pallet as a single geometry: three runners and five deck slats.
export function usePalletGeometry() {
  const geometry = useMemo(() => {
    const parts = [];
    for (const x of [-0.52, 0, 0.52]) {
      const g = new BoxGeometry(0.12, 0.1, 1.0);
      g.translate(x, 0.05, 0);
      parts.push(g);
    }
    for (let i = 0; i < 5; i++) {
      const g = new BoxGeometry(1.2, 0.03, 0.15);
      g.translate(0, 0.115, -0.42 + i * 0.21);
      parts.push(g);
    }
    const merged = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

const PALLET_TOP = 0.13;

// ---------------------------------------------------------------------------
// Wall racks: blue uprights, orange beams, wire decks, cardboard boxes.

export function Racks() {
  const uprights = useRef<InstancedMesh>(null);
  const beams = useRef<InstancedMesh>(null);
  const decks = useRef<InstancedMesh>(null);
  const boxes = useRef<InstancedMesh>(null);

  const layout = useMemo(() => {
    const rand = mulberry32(42);
    const up: Matrix4[] = [];
    const beam: Matrix4[] = [];
    const deck: Matrix4[] = [];
    const box: { m: Matrix4; c: Color }[] = [];
    const o = new Object3D();
    const put = (list: Matrix4[], x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
      o.position.set(x, y, z);
      o.rotation.set(0, 0, 0);
      o.scale.set(sx, sy, sz);
      o.updateMatrix();
      list.push(o.matrix.clone());
    };
    for (const side of [-1, 1]) {
      const cx = side * RACK_X;
      for (let b = 0; b <= RACK_BAYS; b++) {
        const z = RACK_Z0 - b * RACK_BAY;
        for (const f of [-1, 1]) {
          put(up, cx + f * (RACK_DEPTH / 2 - 0.05), RACK_HEIGHT / 2, z);
        }
      }
      for (let b = 0; b < RACK_BAYS; b++) {
        const zc = RACK_Z0 - (b + 0.5) * RACK_BAY;
        RACK_LEVELS.forEach((y, level) => {
          if (level > 0) {
            for (const f of [-1, 1]) {
              put(beam, cx + f * (RACK_DEPTH / 2 - 0.05), y - 0.07, zc);
            }
          }
          put(deck, cx, y, zc);
          if (reservedBay(side, b, level)) return;
          // Fill the shelf with a few boxes, leaving gaps.
          let z = zc - RACK_BAY / 2 + 0.1;
          while (z < zc + RACK_BAY / 2 - 0.4) {
            const w = 0.45 + rand() * 0.6;
            const h = 0.35 + rand() * (level === 3 ? 0.4 : 0.9);
            const d = 0.6 + rand() * 0.45;
            if (z + w > zc + RACK_BAY / 2 - 0.1) break;
            if (rand() < 0.82) {
              let stackY = y + 0.02;
              const stack = rand() < 0.35 && level < 3 ? 2 : 1;
              for (let k = 0; k < stack; k++) {
                const hh = k ? h * 0.7 : h;
                o.position.set(cx + side * (RACK_DEPTH / 2 - d / 2 - 0.05) * 0.4, stackY + hh / 2, z + w / 2);
                o.rotation.set(0, (rand() - 0.5) * 0.12, 0);
                o.scale.set(d, hh, w);
                o.updateMatrix();
                const shade = 0.8 + rand() * 0.35;
                box.push({ m: o.matrix.clone(), c: new Color(shade, shade * 0.97, shade * 0.93) });
                stackY += hh;
              }
            }
            z += w + 0.05 + rand() * 0.25;
          }
        });
      }
    }
    return { up, beam, deck, box };
  }, []);

  const materials = useMemo(() => {
    const map = makeCardboardTexture();
    return {
      upright: new MeshStandardMaterial({ color: "#2f56a8", roughness: 0.5, metalness: 0.3 }),
      beam: new MeshStandardMaterial({ color: "#e0661c", roughness: 0.5, metalness: 0.2 }),
      deck: new MeshStandardMaterial({ color: "#3b3a40", roughness: 0.7, metalness: 0.4 }),
      box: new MeshStandardMaterial({ map, roughness: 0.9 }),
    };
  }, []);
  useEffect(
    () => () =>
      Object.values(materials).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      }),
    [materials],
  );

  useLayoutEffect(() => {
    layout.up.forEach((m, i) => uprights.current?.setMatrixAt(i, m));
    layout.beam.forEach((m, i) => beams.current?.setMatrixAt(i, m));
    layout.deck.forEach((m, i) => decks.current?.setMatrixAt(i, m));
    layout.box.forEach(({ m, c }, i) => {
      boxes.current?.setMatrixAt(i, m);
      boxes.current?.setColorAt(i, c);
    });
    for (const r of [uprights, beams, decks, boxes]) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
      r.current.computeBoundingSphere();
    }
  }, [layout]);

  return (
    <group name="stock-racks">
      <instancedMesh ref={uprights} args={[undefined, materials.upright, layout.up.length]}>
        <boxGeometry args={[0.09, RACK_HEIGHT, 0.09]} />
      </instancedMesh>
      <instancedMesh ref={beams} args={[undefined, materials.beam, layout.beam.length]}>
        <boxGeometry args={[0.06, 0.13, RACK_BAY - 0.06]} />
      </instancedMesh>
      <instancedMesh ref={decks} args={[undefined, materials.deck, layout.deck.length]}>
        <boxGeometry args={[RACK_DEPTH - 0.1, 0.025, RACK_BAY - 0.08]} />
      </instancedMesh>
      <instancedMesh ref={boxes} args={[undefined, materials.box, layout.box.length]}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <RackSpecials />
    </group>
  );
}

// Shelves kept clear of generic boxes for the special stock below.
function reservedBay(side: number, bay: number, level: number) {
  return (
    (side === -1 && bay === 3 && level === 1) || // spare neon sign
    (side === 1 && bay === 1 && level === 0) // boxed boomboxes
  );
}

function bayZ(bay: number) {
  return RACK_Z0 - (bay + 0.5) * RACK_BAY;
}

function RackSpecials() {
  const signMaterial = useMemo(
    // Unlit neon tube: dull pink glass.
    () => new MeshStandardMaterial({ color: "#8a4a6c", roughness: 0.3, metalness: 0.1 }),
    [],
  );
  const boxMaterial = useMemo(() => {
    const map = makeCardboardTexture();
    return new MeshStandardMaterial({ map, roughness: 0.9, color: "#e8d0d8" });
  }, []);
  useEffect(
    () => () => {
      signMaterial.dispose();
      boxMaterial.map?.dispose();
      boxMaterial.dispose();
    },
    [signMaterial, boxMaterial],
  );

  // Eleven boxed boomboxes (twelve made, one out on the island).
  const boomboxes: Vec3[] = [];
  for (let i = 0; i < 11; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    boomboxes.push([
      RACK_X - 0.1,
      RACK_LEVELS[0] + 0.03 + 0.24 + row * 0.48,
      bayZ(1) - 1.0 + col * 0.66,
    ]);
  }
  const wx = -RACK_X + RACK_DEPTH / 2;

  return (
    <group name="rack-specials">
      {/* The spare "Plato's Cove" sign, unplugged, propped on a shelf. */}
      <Text
        font="/fonts/Italianno-Regular.ttf"
        position={[-RACK_X + 0.1, RACK_LEVELS[1] + 0.85, bayZ(3)]}
        rotation={[0, Math.PI / 2, 0.04]}
        fontSize={1.0}
        lineHeight={0.82}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        material={signMaterial}>
        Plato's{"\n"}Cove
      </Text>
      <Tag
        lines={["SIGN, NEON", "SPARE  QTY 1", "DO NOT PLUG IN"]}
        position={[wx + 0.01, RACK_LEVELS[1] - 0.25, bayZ(3) + 0.9]}
        rotation={[0, Math.PI / 2, 0]}
        size={0.42}
      />
      {boomboxes.map((p, i) => (
        <mesh key={i} position={p} rotation={[0, (i % 3) * 0.03 - 0.03, 0]} material={boxMaterial}>
          <boxGeometry args={[0.55, 0.46, 0.62]} />
        </mesh>
      ))}
      <Tag
        lines={["BOOMBOX", "QTY 12   OUT 1", "BATTERIES N/I"]}
        position={[RACK_X - RACK_DEPTH / 2 - 0.01, RACK_LEVELS[1] - 0.25, bayZ(1)]}
        rotation={[0, -Math.PI / 2, 0]}
        size={0.42}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Lot 1: Venus, waving. Six made, five here, one on loan to the island. The
// copies stand in a row on pallets, all waving at the aisle. One is still in
// its shrink-wrap.

export function VenusLot() {
  const model = useFittedModel(MODEL.venus, 2.3);
  const pallet = usePalletGeometry();
  const { wood, wrap } = useStockMaterials();
  const l = lot("venus");
  const x = l.x1 - 1.3;
  const zs = [8.3, 5.7, 3.1, 0.5, -2.1, -4.7];
  const EMPTY = 2;
  const WRAPPED = 4;
  return (
    <group name="lot-venus">
      {zs.map((z, i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh geometry={pallet} material={wood} />
          {i !== EMPTY && (
            <FittedPrimitive
              model={model}
              position={[0, PALLET_TOP, 0]}
              // Face the aisle (+x), each a few degrees off.
              rotation={[0, Math.PI / 2 + Math.sin(i * 7.1) * 0.06, 0]}
            />
          )}
          {i === WRAPPED && (
            <mesh position={[0, PALLET_TOP + 1.2, 0]} material={wrap}>
              <cylinderGeometry args={[0.62, 0.7, 2.45, 14, 1, true]} />
            </mesh>
          )}
        </group>
      ))}
      <Tag
        lines={["VENUS, WAVING", "QTY 6   OUT 1", "-> ISLAND (PEDESTAL)"]}
        position={[x + 0.62, 0.35, zs[EMPTY]]}
        rotation={[-0.9, Math.PI / 2, 0]}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Lot 2: the sea, calm, rolled like carpet. Six rolls, one out.

export function SeaLot() {
  const normals = useLoader(TextureLoader, "/textures/waternormals.jpg");
  const pallet = usePalletGeometry();
  const { wood, strap } = useStockMaterials();
  const materials = useMemo(() => {
    const n = normals.clone();
    n.wrapS = n.wrapT = RepeatWrapping;
    n.repeat.set(3, 1);
    n.needsUpdate = true;
    const side = new MeshStandardMaterial({
      color: "#3fb0be",
      roughness: 0.18,
      metalness: 0.1,
      normalMap: n,
      normalScale: new Vector2(0.6, 0.6),
    });
    // The roll's end: the sea seen edge-on, a tight spiral of blue.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#123a52";
    ctx.fillRect(0, 0, 256, 256);
    ctx.lineWidth = 5;
    for (let r = 120; r > 12; r -= 9) {
      ctx.strokeStyle = r % 18 < 9 ? "#4fc3cf" : "#2a7d9a";
      ctx.beginPath();
      ctx.arc(128, 128, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#c9b48a";
    ctx.beginPath();
    ctx.arc(128, 128, 14, 0, Math.PI * 2);
    ctx.fill();
    const capMap = new CanvasTexture(canvas);
    const cap = new MeshStandardMaterial({ map: capMap, roughness: 0.5 });
    return { side, cap };
  }, [normals]);
  useEffect(
    () => () => {
      materials.side.normalMap?.dispose();
      materials.side.dispose();
      materials.cap.map?.dispose();
      materials.cap.dispose();
    },
    [materials],
  );

  const l = lot("sea");
  const cx = (l.x0 + l.x1) / 2 + 0.3;
  const R = 0.62;
  const LEN = 5.2;
  const rolls: Vec3[] = [
    [cx, PALLET_TOP + R, -10.4],
    [cx, PALLET_TOP + R, -11.7],
    [cx, PALLET_TOP + R, -13.0],
    [cx, PALLET_TOP + R * 2.73, -11.05],
    [cx, PALLET_TOP + R * 2.73, -12.35],
  ];
  return (
    <group name="lot-sea">
      {[-2, 0, 2].flatMap((dx) =>
        [-10.7, -12.7].map((z) => (
          <mesh
            key={`${dx}:${z}`}
            geometry={pallet}
            material={wood}
            position={[cx + dx, 0, z]}
            rotation={[0, Math.PI / 2, 0]}
          />
        )),
      )}
      {rolls.map((p, i) => (
        <group key={i} position={p} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={[materials.side, materials.cap, materials.cap]}>
            <cylinderGeometry args={[R, R, LEN, 28]} />
          </mesh>
          {[-1.6, 1.6].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={strap}>
              <cylinderGeometry args={[R + 0.015, R + 0.015, 0.08, 28, 1, true]} />
            </mesh>
          ))}
        </group>
      ))}
      <Tag
        lines={["SEA, CALM (ROLLED)", "10,000 m2 EACH", "QTY 6   OUT 1"]}
        position={[l.x1 + 0.02, 0.9, -11.6]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Lot 3: Helios, head only. Three made, one out (in the sea). Two sit in open
// crates; the third crate is empty, its lid leaning beside it.

function useCrateGeometry(w: number, h: number, d: number) {
  const geometry = useMemo(() => {
    const t = 0.05;
    const parts = [
      new BoxGeometry(w, t, d).translate(0, t / 2, 0),
      new BoxGeometry(w, h, t).translate(0, h / 2, -d / 2 + t / 2),
      // Low front so the contents show.
      new BoxGeometry(w, h * 0.45, t).translate(0, (h * 0.45) / 2, d / 2 - t / 2),
      new BoxGeometry(t, h, d).translate(-w / 2 + t / 2, h / 2, 0),
      new BoxGeometry(t, h, d).translate(w / 2 - t / 2, h / 2, 0),
    ];
    const merged = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }, [w, h, d]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

export function HeliosLot() {
  const model = useFittedModel(MODEL.helios, 1.55);
  const crate = useCrateGeometry(1.9, 1.0, 1.7);
  const { wood } = useStockMaterials();
  const l = lot("helios");
  const x = l.x0 + 1.4;
  const zs = [8.2, 6.2, 4.4];
  return (
    <group name="lot-helios">
      {zs.map((z, i) => (
        // Crates open toward the aisle (-x).
        <group key={i} position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh geometry={crate} material={wood} />
          {i < 2 && (
            <FittedPrimitive
              model={model}
              position={[0, 0.05, 0]}
              rotation={[0, i === 0 ? 0.25 : -0.4, 0]}
            />
          )}
        </group>
      ))}
      {/* The empty crate's lid, leaning on it. */}
      <mesh
        position={[x - 1.12, 0.7, zs[2]]}
        rotation={[0, 0, 0.32]}
        material={wood}>
        <boxGeometry args={[0.05, 1.5, 1.7]} />
      </mesh>
      <Tag
        lines={["HELIOS (HEAD ONLY)", "QTY 3   OUT 1", "-> SEA, WAIST-DEEP"]}
        position={[x - 1.19, 0.75, zs[2]]}
        rotation={[0, -Math.PI / 2, -0.32]}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Lot 4: doors. Eleven made, three hung, the rest stacked here, all the same
// door. One stands on its own, waiting to be installed somewhere.

export function DoorsLot() {
  const model = useFittedModel(MODEL.door, 4);
  const { wood } = useStockMaterials();
  const l = lot("doors");
  const stack = 7;
  const z = -1.6;
  return (
    <group name="lot-doors">
      {/* The stack leans back against a crate, each door on the one behind. */}
      {Array.from({ length: stack }, (_, i) => (
        <group
          key={i}
          position={[l.x0 + 1.0 + i * 0.3, 0, z + Math.sin(i * 3.3) * 0.06]}
          rotation={[0, 0, -0.1 - i * 0.012]}>
          <FittedPrimitive model={model} position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        </group>
      ))}
      <mesh position={[l.x0 + 3.9, 0.7, z]} material={wood}>
        <boxGeometry args={[0.9, 1.4, 2.2]} />
      </mesh>
      <FittedPrimitive
        model={model}
        position={[l.x0 + 1.3, 0, -4.4]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Tag
        lines={["DOOR", "QTY 11   OUT 3", "HANG ANYWHERE"]}
        position={[l.x0 + 0.62, 1.3, z]}
        rotation={[0, -Math.PI / 2, 0.1]}
      />
      <Tag
        lines={["DOOR #11", "NOT YET HUNG", "DESTINATION: TBC"]}
        position={[l.x0 + 0.9, 1.2, -4.4]}
        rotation={[0, -Math.PI / 2, 0]}
        size={0.45}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Lot 5: doric columns, lying on wooden chocks. Fourteen made, nine standing
// on the island.

export function ColumnsLot() {
  const model = useFittedModel(MODEL.column, 6.4);
  const { wood } = useStockMaterials();
  const l = lot("columns");
  const zc = (l.z0 + l.z1) / 2;
  const r = (model.size.x * model.scale) / 2;
  // Square plinths stack neatly: three on the chocks, two in the gaps above.
  const base = l.x0 + 0.5 + r;
  const positions: [number, number][] = [
    [base, r + 0.2],
    [base + 2 * r + 0.1, r + 0.2],
    [base + 4 * r + 0.2, r + 0.2],
    [base + r + 0.05, 3 * r + 0.2],
    [base + 3 * r + 0.15, 3 * r + 0.2],
  ];
  return (
    <group name="lot-columns">
      {[-2.4, 0, 2.4].map((dz) => (
        <mesh key={dz} position={[(l.x0 + l.x1) / 2, 0.1, zc + dz]} material={wood}>
          <boxGeometry args={[l.x1 - l.x0 - 0.6, 0.2, 0.3]} />
        </mesh>
      ))}
      {positions.map(([x, y], i) => (
        <FittedPrimitive
          key={i}
          model={model}
          // Lay the column down along z: its base at the south end.
          position={[x, y, zc + 3.2]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}
      <Tag
        lines={["COLUMN, DORIC", "QTY 14   OUT 9", "'ANCIENT'"]}
        position={[l.x0 - 0.02, 0.9, zc + 2.2]}
        rotation={[0, -Math.PI / 2, 0]}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// The suns. Four made: one is out over the island; one stands at the end of
// the aisle plugged in for testing, filling the back of the warehouse with
// sunset; two spares are still wrapped.

export function Suns() {
  const { wood, wrap } = useStockMaterials();
  const materials = useMemo(() => {
    const map = makeSunTexture();
    const lit = new MeshBasicMaterial({
      map,
      color: new Color(2.1, 2.1, 2.1),
      alphaTest: 0.5,
      toneMapped: false,
      fog: false,
      side: DoubleSide,
    });
    const spare = new MeshStandardMaterial({
      map,
      color: "#b49aa6",
      alphaTest: 0.5,
      roughness: 0.6,
      side: DoubleSide,
    });
    const cable = new MeshStandardMaterial({ color: "#151418", roughness: 0.6 });
    const socket = new MeshStandardMaterial({ color: "#d8d4cc", roughness: 0.5 });
    return { lit, spare, cable, socket, map };
  }, []);
  useEffect(
    () => () => {
      materials.map.dispose();
      materials.lit.dispose();
      materials.spare.dispose();
      materials.cable.dispose();
      materials.socket.dispose();
    },
    [materials],
  );

  // Power cable from the sun's base along the floor to a wall socket.
  const cable = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0.6, 0.35, SUN_Z + 0.15),
        new Vector3(1.2, 0.03, SUN_Z + 0.9),
        new Vector3(3.5, 0.03, SUN_Z + 0.6),
        new Vector3(5.6, 0.03, -HALF_L + 0.15),
        new Vector3(6.2, 0.4, -HALF_L + 0.05),
      ]),
    [],
  );

  const D = SUN_DIAMETER;
  // Leaning back so its top rests on the wall.
  const lean = -0.12;
  const spareD = 3.4;
  return (
    <group name="suns">
      <group position={[0, 0, SUN_Z]} rotation={[lean, 0, 0]}>
        <mesh position={[0, D / 2, 0]} material={materials.lit}>
          <planeGeometry args={[D, D]} />
        </mesh>
      </group>
      <mesh material={materials.cable}>
        <tubeGeometry args={[cable, 40, 0.035, 6, false]} />
      </mesh>
      <mesh position={[6.2, 0.4, -HALF_L + 0.02]} material={materials.socket}>
        <boxGeometry args={[0.16, 0.24, 0.04]} />
      </mesh>
      <Tag
        lines={["SUN, SETTING", "QTY 4   OUT 1", "TESTING - DO NOT STARE"]}
        position={[-2.2, 0.55, SUN_Z + 0.7]}
        rotation={[-0.4, 0.15, 0]}
        size={0.5}
      />
      {[-6, 6].map((x, i) => (
        <group key={x} position={[x, 0, SUN_Z + 0.15]} rotation={[lean, i ? -0.18 : 0.18, 0]}>
          <mesh position={[0, spareD / 2 + 0.14, 0]} material={materials.spare}>
            <planeGeometry args={[spareD, spareD]} />
          </mesh>
          <mesh position={[0, spareD / 2 + 0.14, 0.04]} material={wrap}>
            <planeGeometry args={[spareD + 0.15, spareD + 0.2]} />
          </mesh>
          <mesh position={[0, 0.07, 0.1]} material={wood}>
            <boxGeometry args={[spareD * 0.8, 0.14, 0.5]} />
          </mesh>
        </group>
      ))}
      <pointLight
        position={[0, 3.2, SUN_Z + 3.5]}
        color="#ff7c96"
        intensity={36}
        distance={30}
        decay={1.4}
      />
    </group>
  );
}
