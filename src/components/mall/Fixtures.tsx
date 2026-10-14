import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  InstancedMesh,
  LatheGeometry,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  BENCHES,
  BUCKET,
  DIRECTORY_Z,
  ESCALATOR_BOTTOM_Z,
  ESCALATOR_CLEAR,
  ESCALATOR_OUTER,
  ESCALATOR_RAIL,
  ESCALATOR_RUN,
  ESCALATOR_SIGN,
  ESCALATOR_TOP_Z,
  ESCALATOR_X,
  FOUNTAIN_R,
  FOUNTAIN_Z,
  GALLERY_Y,
  HALF_L,
  PLANTERS,
  PLANTER_SIZE,
  SOFFIT_Y,
  CEILING_Y,
  HALF_W,
  VOID_HALF_W,
  WET_FLOOR_BOARDS,
} from "./constants";
import {
  makeBarkTexture,
  makeDirectoryTexture,
  makeFrondTexture,
  makeSignTexture,
  makeWetFloorTexture,
} from "./textures";

// The atrium's furniture: the stopped escalators, the dry fountain, the
// plastic palms, benches, the directory, the cleaner's things, and the
// ceiling speakers the muzak comes out of.

function useDisposable<T extends Record<string, Material | BufferGeometry>>(
  make: () => T,
): T {
  const things = useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () =>
      Object.values(things).forEach((t) => {
        if (t instanceof Material) {
          (t as MeshStandardMaterial).map?.dispose();
        }
        t.dispose();
      }),
    [things],
  );
  return things;
}

function useInstances(
  ref: React.RefObject<InstancedMesh | null>,
  place: (o: Object3D, i: number) => void,
  colors?: (i: number) => Color,
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    for (let i = 0; i < mesh.count; i++) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      place(o, i);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (colors) mesh.setColorAt(i, colors(i));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, place, colors]);
}

// ── Escalators ─────────────────────────────────────────────────────────────

const STEPS = 28;
const SLOPE = Math.PI / 6;

export function Escalators() {
  const m = useDisposable(() => {
    // The truss under both escalators, clad in brushed steel: a wedge from
    // the foot of the steps up to the gallery edge.
    // (Drawn in the z-y plane: shape x is world z.) The steps stand 0.25 m
    // proud of it.
    const shape = new Shape();
    shape.moveTo(ESCALATOR_BOTTOM_Z - 0.25 / Math.tan(SLOPE), 0);
    shape.lineTo(ESCALATOR_TOP_Z, 0);
    shape.lineTo(ESCALATOR_TOP_Z, GALLERY_Y - 0.25);
    const truss = new ExtrudeGeometry(shape, {
      depth: ESCALATOR_OUTER * 2,
      bevelEnabled: false,
    });
    return {
      truss,
      steel: new MeshStandardMaterial({ color: "#9a9aa4", metalness: 0.85, roughness: 0.32 }),
      step: new MeshStandardMaterial({ color: "#3b3b42", metalness: 0.7, roughness: 0.45 }),
      edge: new MeshStandardMaterial({ color: "#d8b21c", roughness: 0.6 }),
      rubber: new MeshStandardMaterial({ color: "#121216", roughness: 0.55 }),
      glass: new MeshStandardMaterial({
        color: "#9fbccc",
        metalness: 0.3,
        roughness: 0.05,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: DoubleSide,
      }),
      sign: new MeshStandardMaterial({
        map: makeSignTexture(["OUT OF ORDER", "PLEASE USE AS STAIRS", "We apologise for any inconvenience"], {
          w: 512,
          h: 384,
          size: 52,
        }),
        roughness: 0.7,
      }),
    };
  });

  const steps = useRef<InstancedMesh>(null);
  const edges = useRef<InstancedMesh>(null);
  const rise = GALLERY_Y / STEPS;
  const tread = ESCALATOR_RUN / STEPS;
  const place = useMemo(
    () => (o: Object3D, i: number) => {
      const lane = Math.floor(i / STEPS);
      const k = i % STEPS;
      o.position.set(
        ESCALATOR_X[lane],
        (k + 0.5) * rise,
        ESCALATOR_BOTTOM_Z - (k + 0.5) * tread,
      );
    },
    [rise, tread],
  );
  const placeEdge = useMemo(
    () => (o: Object3D, i: number) => {
      place(o, i);
      o.position.y += rise / 2 + 0.004;
      o.position.z += tread / 2 - 0.04;
    },
    [place, rise, tread],
  );
  useInstances(steps, place);
  useInstances(edges, placeEdge);

  const midZ = (ESCALATOR_TOP_Z + ESCALATOR_BOTTOM_Z) / 2;
  const length = ESCALATOR_RUN / Math.cos(SLOPE);
  // Perpendicular to the slope, pointing up and back.
  const up = new Vector3(0, Math.cos(SLOPE), Math.sin(SLOPE));
  const along = (h: number): [number, number, number] => [
    0,
    GALLERY_Y / 2 + up.y * h,
    midZ + up.z * h,
  ];
  const rails = ESCALATOR_X.flatMap((cx) =>
    [-1, 1].map((s) => cx + s * (ESCALATOR_CLEAR / 2 + ESCALATOR_RAIL / 2)),
  );

  return (
    <group name="escalators">
      <mesh
        geometry={m.truss}
        material={m.steel}
        rotation={[0, -Math.PI / 2, 0]}
        position={[ESCALATOR_OUTER, 0, 0]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={steps}
        args={[undefined, undefined, STEPS * ESCALATOR_X.length]}
        material={m.step}
        castShadow
        receiveShadow>
        <boxGeometry args={[ESCALATOR_CLEAR - 0.2, rise, tread]} />
      </instancedMesh>
      <instancedMesh
        ref={edges}
        args={[undefined, undefined, STEPS * ESCALATOR_X.length]}
        material={m.edge}>
        <boxGeometry args={[ESCALATOR_CLEAR - 0.2, 0.01, 0.06]} />
      </instancedMesh>
      {rails.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* Skirt and deck along the steps. */}
          <mesh position={along(0.15)} rotation={[SLOPE, 0, 0]} material={m.steel} castShadow>
            <boxGeometry args={[ESCALATOR_RAIL, 0.5, length]} />
          </mesh>
          <mesh position={along(0.85)} rotation={[SLOPE, 0, 0]} material={m.glass}>
            <boxGeometry args={[0.02, 0.9, length]} />
          </mesh>
          <mesh position={along(1.34)} rotation={[SLOPE, 0, 0]} material={m.rubber} castShadow>
            <boxGeometry args={[0.09, 0.08, length + 0.6]} />
          </mesh>
        </group>
      ))}
      {/* Comb plates at the foot and the head. */}
      {[
        [0.012, ESCALATOR_BOTTOM_Z + 0.6],
        [GALLERY_Y + 0.012, ESCALATOR_TOP_Z - 0.6],
      ].map(([y, z]) => (
        <mesh key={z} position={[0, y, z]} material={m.steel} receiveShadow>
          <boxGeometry args={[ESCALATOR_OUTER * 2, 0.02, 1.2]} />
        </mesh>
      ))}
      {/* The sign at the foot, on a stand, beside the escalators. */}
      <group position={[ESCALATOR_SIGN[0], 0, ESCALATOR_SIGN[1]]} rotation={[0, -0.35, 0]}>
        <mesh position={[0, 0.55, 0]} material={m.steel}>
          <cylinderGeometry args={[0.025, 0.025, 1.1, 8]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={m.steel}>
          <cylinderGeometry args={[0.2, 0.22, 0.04, 16]} />
        </mesh>
        <mesh position={[0, 1.25, 0.01]} material={m.sign}>
          <planeGeometry args={[0.6, 0.45]} />
        </mesh>
        <mesh position={[0, 1.25, -0.005]} material={m.steel}>
          <boxGeometry args={[0.62, 0.47, 0.01]} />
        </mesh>
      </group>
    </group>
  );
}

// ── Fountain ───────────────────────────────────────────────────────────────

const COINS = 160;

export function Fountain() {
  const m = useDisposable(() => {
    // Basin: outside wall, a rim, the inside wall down to a dry floor.
    const basin = new LatheGeometry(
      [
        new Vector2(0, 0.16),
        new Vector2(FOUNTAIN_R - 0.4, 0.16),
        new Vector2(FOUNTAIN_R - 0.38, 0.5),
        new Vector2(FOUNTAIN_R - 0.32, 0.58),
        new Vector2(FOUNTAIN_R + 0.02, 0.6),
        new Vector2(FOUNTAIN_R + 0.06, 0.52),
        new Vector2(FOUNTAIN_R, 0.06),
        new Vector2(FOUNTAIN_R + 0.08, 0),
      ],
      64,
    );
    const bowl = (r: number) =>
      new LatheGeometry(
        [
          // A deep scalloped bowl on a stem, not a saucer.
          new Vector2(0.2, -0.55),
          new Vector2(r * 0.3, -0.48),
          new Vector2(r * 0.7, -0.3),
          new Vector2(r * 0.95, -0.05),
          new Vector2(r, 0.12),
          new Vector2(r * 0.93, 0.16),
          new Vector2(r * 0.86, -0.02),
          new Vector2(r * 0.5, -0.3),
          new Vector2(0, -0.36),
        ],
        48,
      );
    return {
      basin,
      bowlLow: bowl(1.5),
      bowlHigh: bowl(0.85),
      // Lathed shapes are seen from both sides (inside and out of the bowls).
      marble: new MeshStandardMaterial({
        color: "#e4dcd8",
        roughness: 0.32,
        side: DoubleSide,
      }),
      // The dry basin floor: chalky tide marks where the water stood.
      dry: new MeshStandardMaterial({ color: "#a39b95", roughness: 0.9 }),
      coin: new MeshStandardMaterial({ metalness: 0.9, roughness: 0.35, color: "#ffffff" }),
      sign: new MeshStandardMaterial({
        map: makeSignTexture(["PLEASE DO NOT", "THROW COINS", "IN THE FOUNTAIN"], {
          w: 512,
          h: 320,
          size: 54,
          bg: "#2c3a6a",
          fg: "#f2efe8",
        }),
        roughness: 0.6,
      }),
      brass: new MeshStandardMaterial({ color: "#a08850", metalness: 0.9, roughness: 0.35 }),
    };
  });

  const coins = useRef<InstancedMesh>(null);
  const placeCoin = useMemo(
    () => (o: Object3D, i: number) => {
      // More coins near the middle, where people aimed.
      const a = i * 2.39996 + Math.sin(i * 7.1) * 0.4;
      const r = 0.6 + (FOUNTAIN_R - 1.1) * Math.sqrt(((i * 0.618034) % 1) * 0.9 + 0.05);
      o.position.set(Math.cos(a) * r, 0.165 + (i % 3) * 0.004, Math.sin(a) * r);
      o.rotation.set(Math.sin(i) * 0.08, 0, Math.cos(i * 1.3) * 0.08);
    },
    [],
  );
  const coinColor = useMemo(() => {
    const palette = [new Color("#c98a4f"), new Color("#d9b45a"), new Color("#c7c7cc")];
    return (i: number) => palette[(i * 7) % 3];
  }, []);
  useInstances(coins, placeCoin, coinColor);

  return (
    <group name="fountain" position={[0, 0, FOUNTAIN_Z]}>
      <mesh geometry={m.basin} material={m.marble} castShadow receiveShadow />
      <mesh position={[0, 0.162, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.dry} receiveShadow>
        <circleGeometry args={[FOUNTAIN_R - 0.39, 48]} />
      </mesh>
      <instancedMesh ref={coins} args={[undefined, undefined, COINS]} material={m.coin}>
        <cylinderGeometry args={[0.035, 0.035, 0.006, 10]} />
      </instancedMesh>
      <mesh position={[0, 0.95, 0]} material={m.marble} castShadow>
        <cylinderGeometry args={[0.32, 0.5, 1.6, 24]} />
      </mesh>
      <mesh position={[0, 1.85, 0]} geometry={m.bowlLow} material={m.marble} castShadow receiveShadow />
      <mesh position={[0, 2.35, 0]} material={m.marble} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.0, 20]} />
      </mesh>
      <mesh position={[0, 2.95, 0]} geometry={m.bowlHigh} material={m.marble} castShadow receiveShadow />
      <mesh position={[0, 3.3, 0]} material={m.marble} castShadow>
        <sphereGeometry args={[0.2, 20, 14]} />
      </mesh>
      <mesh position={[0, 3.55, 0]} material={m.brass}>
        <cylinderGeometry args={[0.02, 0.04, 0.3, 8]} />
      </mesh>
      {/* The placard on the rim, facing the directory. */}
      <group position={[1.2, 0.6, FOUNTAIN_R - 0.18]} rotation={[-0.5, 0.25, 0]}>
        <mesh position={[0, 0.12, 0]} material={m.sign}>
          <planeGeometry args={[0.42, 0.26]} />
        </mesh>
        <mesh position={[0, 0.12, -0.006]} material={m.brass}>
          <boxGeometry args={[0.45, 0.29, 0.01]} />
        </mesh>
      </group>
    </group>
  );
}

// ── Palms ──────────────────────────────────────────────────────────────────

const FRONDS = 11;

function makeFrondGeometry() {
  // A strip along +x, arching up and drooping at the tip, cupped a little.
  const g = new PlaneGeometry(1.25, 3.9, 4, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const w = pos.getX(i); // across
    const l = pos.getY(i) + 1.95; // along, from the base
    const y = 0.75 * l - 0.21 * l * l + 0.25 * (w / 0.62) ** 2 * (l / 3.9);
    pos.setXYZ(i, l, y, w);
  }
  g.computeVertexNormals();
  return g;
}

export function Palms() {
  const m = useDisposable(() => ({
    frond: makeFrondGeometry(),
    frondMat: new MeshStandardMaterial({
      map: makeFrondTexture(),
      alphaTest: 0.5,
      side: DoubleSide,
      roughness: 0.38,
      color: "#cfe0b8",
    }),
    bark: new MeshStandardMaterial({ map: makeBarkTexture(), roughness: 0.75 }),
    planter: new MeshStandardMaterial({ color: "#d4c9c4", roughness: 0.4 }),
    soil: new MeshStandardMaterial({ color: "#2a211c", roughness: 1 }),
    tag: new MeshStandardMaterial({
      map: makeSignTexture(["ARTIFICIAL", "DO NOT WATER"], { w: 256, h: 128, size: 34 }),
      roughness: 0.6,
      side: DoubleSide,
    }),
  }));

  const palms = useMemo(
    () =>
      PLANTERS.map(([x, z], i) => {
        const lean = new Vector3(Math.sin(i * 2.1) * 0.9, 0, Math.cos(i * 1.7) * 0.9);
        const height = 7.2 + (i % 2) * 1.3;
        const curve = new CatmullRomCurve3([
          new Vector3(0, 0.8, 0),
          new Vector3(lean.x * 0.2, height * 0.45, lean.z * 0.2),
          new Vector3(lean.x * 0.6, height * 0.8, lean.z * 0.6),
          new Vector3(lean.x, height, lean.z),
        ]);
        return {
          x,
          z,
          top: curve.getPoint(1),
          trunk: new TubeGeometry(curve, 16, 0.2, 10, false),
          spin: i * 0.7,
        };
      }),
    [],
  );
  useEffect(() => () => palms.forEach((p) => p.trunk.dispose()), [palms]);

  return (
    <group name="palms">
      {palms.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.45, 0]} material={m.planter} castShadow receiveShadow>
            <boxGeometry args={[PLANTER_SIZE, 0.9, PLANTER_SIZE]} />
          </mesh>
          <mesh position={[0, 0.905, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.soil}>
            <planeGeometry args={[PLANTER_SIZE - 0.16, PLANTER_SIZE - 0.16]} />
          </mesh>
          <mesh geometry={p.trunk} material={m.bark} castShadow />
          <group position={p.top}>
            {Array.from({ length: FRONDS }, (_, k) => (
              <mesh
                key={k}
                geometry={m.frond}
                material={m.frondMat}
                rotation={[
                  Math.sin(k * 3.3) * 0.18,
                  p.spin + (k / FRONDS) * Math.PI * 2,
                  Math.sin(k * 1.9) * 0.22 - 0.05,
                ]}
                castShadow
              />
            ))}
          </group>
          {/* The tag, tied round the trunk at eye height, on one palm. */}
          {i === 2 && (
            <group position={[0.16, 1.55, 0.18]} rotation={[0, 0.7, 0.1]}>
              <mesh material={m.tag}>
                <planeGeometry args={[0.16, 0.08]} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

// ── Benches, the directory, the cleaner's things ──────────────────────────

export function Benches() {
  const m = useDisposable(() => ({
    wood: new MeshStandardMaterial({ color: "#7a5640", roughness: 0.55 }),
    steel: new MeshStandardMaterial({ color: "#2e2d33", metalness: 0.8, roughness: 0.4 }),
  }));
  return (
    <group name="benches">
      {BENCHES.map(({ x, z, yaw }, i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, yaw, 0]}>
          {[-0.18, 0, 0.18].map((dz) => (
            <mesh key={dz} position={[0, 0.45, dz]} material={m.wood} castShadow receiveShadow>
              <boxGeometry args={[2.2, 0.05, 0.14]} />
            </mesh>
          ))}
          {[-0.9, 0.9].map((dx) => (
            <mesh key={dx} position={[dx, 0.21, 0]} material={m.steel} castShadow>
              <boxGeometry args={[0.08, 0.42, 0.5]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Directory() {
  const m = useDisposable(() => ({
    body: new MeshStandardMaterial({ color: "#1d2240", metalness: 0.4, roughness: 0.4 }),
    // Backlit, but not so bright it blooms.
    face: new MeshBasicMaterial({
      map: makeDirectoryTexture(),
      color: new Color(0.95, 0.95, 1),
      toneMapped: false,
    }),
    header: new MeshBasicMaterial({
      map: makeSignTexture(["YOU ARE HERE"], {
        w: 512,
        h: 96,
        size: 52,
        bg: "#e0262e",
        fg: "#ffffff",
      }),
      toneMapped: false,
    }),
  }));
  return (
    <group name="directory" position={[0, 0, DIRECTORY_Z]}>
      <mesh position={[0, 1.4, 0]} material={m.body} castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.8, 0.4]} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <mesh position={[0, 1.3, 0.202]} material={m.face}>
            <planeGeometry args={[1.32, 2.2]} />
          </mesh>
          <mesh position={[0, 2.6, 0.202]} material={m.header}>
            <planeGeometry args={[1.32, 0.25]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Two A-boards and the mop bucket, where the cleaner stopped.
export function WetFloor() {
  const m = useDisposable(() => ({
    board: new MeshStandardMaterial({ map: makeWetFloorTexture(), roughness: 0.5, side: DoubleSide }),
    bucket: new MeshStandardMaterial({ color: "#e8c21a", roughness: 0.45 }),
    grey: new MeshStandardMaterial({ color: "#55555c", roughness: 0.5 }),
    handle: new MeshStandardMaterial({ color: "#2f5fa8", roughness: 0.4 }),
    mop: new MeshStandardMaterial({ color: "#cfc8b8", roughness: 1 }),
  }));
  return (
    <group name="wet-floor">
      {WET_FLOOR_BOARDS.map(([x, z, yaw], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, yaw, 0]}>
          {[1, -1].map((s) => (
            <mesh
              key={s}
              position={[0, 0.31, s * 0.1]}
              rotation={[s * 0.16, s > 0 ? 0 : Math.PI, 0]}
              material={m.board}
              castShadow>
              <planeGeometry args={[0.32, 0.64]} />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[BUCKET[0], 0, BUCKET[1]]} rotation={[0, 0.6, 0]}>
        <mesh position={[0, 0.2, 0]} material={m.bucket} castShadow>
          <cylinderGeometry args={[0.27, 0.23, 0.4, 20, 1, true]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={m.bucket}>
          <cylinderGeometry args={[0.23, 0.23, 0.04, 20]} />
        </mesh>
        <mesh position={[0, 0.48, -0.12]} material={m.grey} castShadow>
          <boxGeometry args={[0.36, 0.18, 0.2]} />
        </mesh>
        <group position={[0.05, 0.1, 0.05]} rotation={[0.28, 0, -0.12]}>
          <mesh position={[0, 0.75, 0]} material={m.handle} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 1.5, 8]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} material={m.mop}>
            <cylinderGeometry args={[0.1, 0.16, 0.22, 12]} />
          </mesh>
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.2, 0.03, 0.2]} material={m.grey}>
            <sphereGeometry args={[0.035, 8, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── Ceiling ────────────────────────────────────────────────────────────────

// Round speaker grilles in the ceilings over the concourse and the gallery,
// and between them the downlights, nearly all off for the night.
const CEILING_ROWS = [-28, -20, -12, -4, 4, 12, 20, 28];
const SPEAKER_X = (HALF_W + VOID_HALF_W) / 2;

export function CeilingFittings() {
  const m = useDisposable(() => ({
    grille: new MeshStandardMaterial({ color: "#cfcbc6", roughness: 0.6, metalness: 0.2 }),
    cone: new MeshStandardMaterial({ color: "#2a2a2e", roughness: 0.9 }),
    light: new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
  }));
  const spots = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const y of [SOFFIT_Y - 0.01, CEILING_Y - 0.01]) {
      for (const s of [-1, 1]) {
        for (const z of CEILING_ROWS) out.push([s * SPEAKER_X, y, z]);
      }
    }
    return out;
  }, []);
  const grilles = useRef<InstancedMesh>(null);
  const cones = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const placeSpeaker = useMemo(
    () => (o: Object3D, i: number) => {
      o.position.set(...spots[i]);
      o.rotation.x = Math.PI / 2;
    },
    [spots],
  );
  const placeCone = useMemo(
    () => (o: Object3D, i: number) => {
      placeSpeaker(o, i);
      o.position.y -= 0.002;
    },
    [placeSpeaker],
  );
  const placeLight = useMemo(
    () => (o: Object3D, i: number) => {
      const [x, y, z] = spots[i];
      o.position.set(x + (x > 0 ? -1.8 : 1.8), y, Math.min(z + 4, HALF_L - 2));
      o.rotation.x = Math.PI / 2;
    },
    [spots],
  );
  // Every fifth downlight is a night light: on, warm. The rest are off.
  const lightColor = useMemo(() => {
    const on = new Color(2.2, 1.9, 1.4);
    const off = new Color(0.08, 0.08, 0.09);
    return (i: number) => (i % 5 === 2 ? on : off);
  }, []);
  useInstances(grilles, placeSpeaker);
  useInstances(cones, placeCone);
  useInstances(lights, placeLight, lightColor);
  return (
    <group name="ceiling-fittings">
      <instancedMesh ref={grilles} args={[undefined, undefined, spots.length]} material={m.grille}>
        <ringGeometry args={[0.16, 0.22, 24]} />
      </instancedMesh>
      <instancedMesh ref={cones} args={[undefined, undefined, spots.length]} material={m.cone}>
        <circleGeometry args={[0.16, 24]} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, spots.length]} material={m.light}>
        <circleGeometry args={[0.12, 16]} />
      </instancedMesh>
    </group>
  );
}
