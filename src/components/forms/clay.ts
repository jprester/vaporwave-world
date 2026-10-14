import {
  BufferGeometry,
  CanvasTexture,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Object3D,
  SRGBColorSpace,
  type Material,
} from "three";

// Helpers for the forms' look: clay, black edge lines and viewport labels.
// The grey doors in the other worlds use the matcap and the edges too, so
// this module stays free of the forms' lazily loaded assets.

// A neutral clay matcap: a grey sphere lit from the upper left. Matcap
// materials ignore the scene's lights, so a grey door stays grey in the
// island's pink sunset and the cave's purple gloom.
export function makeClayMatcap() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#6f6f6f";
  ctx.fillRect(0, 0, size, size);
  const body = ctx.createRadialGradient(
    size * 0.4,
    size * 0.34,
    size * 0.02,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  body.addColorStop(0, "#f4f4f2");
  body.addColorStop(0.45, "#cfcfcc");
  body.addColorStop(0.85, "#9d9d9a");
  body.addColorStop(1, "#7c7c7a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// Edge lines for a mesh's geometry, the way a modelling viewport draws them.
export function makeEdges(
  geometry: BufferGeometry,
  material: LineBasicMaterial,
  thresholdAngle = 30,
) {
  return new LineSegments(
    new EdgesGeometry(geometry, thresholdAngle),
    material,
  );
}

// Clones a model with every mesh given `material` (geometry is shared), and
// optionally edge lines on top.
export function clayClone(
  source: Object3D,
  material: Material,
  edges?: LineBasicMaterial,
  edgeAngle = 35,
) {
  const clone = source.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  const meshes: Mesh[] = [];
  clone.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh);
  });
  for (const m of meshes) {
    m.material = material;
    m.castShadow = true;
    m.receiveShadow = true;
    if (edges) m.add(makeEdges(m.geometry, edges, edgeAngle));
  }
  return clone;
}

// A viewport label: dark text on nothing, as a texture for a sprite. Returns
// the texture and its aspect ratio (width / height).
export function makeLabelTexture(text: string, color = "#262626") {
  const fontPx = 44;
  const pad = 10;
  const measure = document.createElement("canvas").getContext("2d")!;
  const font = `500 ${fontPx}px "Helvetica Neue", Arial, sans-serif`;
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = fontPx + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.textBaseline = "middle";
  // A faint white halo keeps the text legible over grey and black lines.
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineJoin = "round";
  ctx.strokeText(text, pad, h / 2 + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, pad, h / 2 + 2);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, aspect: w / h };
}
