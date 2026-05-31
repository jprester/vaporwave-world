import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

// Palette lifted straight from the scene so the loading screen matches what
// loads behind it:
//   sky gradient  → src/shaders/sky.frag.glsl (skyTop / skyMid / skyHorizon)
//   neon pinks    → Scene.tsx (outlineColor #ff7cc8, neon text #ff5cb0, dir light #ff6ea5)
//   sun magenta / cyan rim → sky.frag.glsl sun colors
const SKY_TOP = "#999eba";
const SKY_MID = "#c7a8c7";
const SKY_HORIZON = "#ebadc2";
const NEON_PINK = "#ff5cb0";
const NEON_PINK_SOFT = "#ff7cc8";
const SUN_MAGENTA = "#ff59b2";
const SUN_CYAN = "#4cd9ff";

// A vaporwave loading screen shown while the scene's models and textures stream
// in. It reads real progress from THREE's DefaultLoadingManager (via drei's
// `useProgress`), which every `useGLTF` / `useLoader` call in the scene feeds.
//
// Rendered as a DOM overlay (a sibling of the Canvas, not a child), so it covers
// the black canvas until assets are ready, then fades out and unmounts.
export default function LoadingScreen() {
  const { active, progress } = useProgress();
  const [done, setDone] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  // Once the loading manager goes idle and progress has reached 100%, fade out,
  // then stop rendering entirely so the overlay never blocks interaction.
  useEffect(() => {
    if (active || progress < 100) return;
    const fade = window.setTimeout(() => setDone(true), 400);
    const remove = window.setTimeout(() => setUnmounted(true), 1300);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(remove);
    };
  }, [active, progress]);

  if (unmounted) return null;

  const pct = Math.min(100, Math.round(progress));

  return (
    <div
      aria-hidden={done}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        overflow: "hidden",
        background: `linear-gradient(180deg, ${SKY_TOP} 0%, ${SKY_MID} 45%, ${SKY_HORIZON} 100%)`,
        color: "white",
        fontFamily: "monospace",
        opacity: done ? 0 : 1,
        pointerEvents: done ? "none" : "auto",
        transition: "opacity 0.9s ease",
      }}>
      {/* Retro sun: a glowing disc sliced by horizontal scanlines, sitting on a
          neon horizon line. */}
      <div style={{ position: "relative", width: 180, height: 110 }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: 160,
            height: 160,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background: `linear-gradient(180deg, #ffe3f1 0%, ${NEON_PINK_SOFT} 45%, ${SUN_MAGENTA} 72%, ${NEON_PINK} 100%)`,
            WebkitMaskImage:
              "repeating-linear-gradient(180deg, #000 0 13px, transparent 13px 18px)",
            maskImage:
              "repeating-linear-gradient(180deg, #000 0 13px, transparent 13px 18px)",
            boxShadow: `0 0 60px ${SUN_MAGENTA}b3`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: 220,
            height: 2,
            transform: "translateX(-50%)",
            background: NEON_PINK_SOFT,
            boxShadow: `0 0 12px ${NEON_PINK_SOFT}`,
          }}
        />
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 8,
            textTransform: "uppercase",
            textShadow: `0 0 18px ${SUN_MAGENTA}cc`,
          }}>
          Plato's Cove
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.75,
          }}>
          A liminal poolroom on an endless ocean
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: 260, textAlign: "center" }}>
        <div
          style={{
            width: "100%",
            height: 6,
            borderRadius: 4,
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            overflow: "hidden",
          }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${SUN_CYAN}, ${SUN_MAGENTA}, ${NEON_PINK})`,
              boxShadow: `0 0 12px ${NEON_PINK}e6`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            letterSpacing: 2,
            opacity: 0.85,
          }}>
          {pct < 100 ? `Loading ${pct}%` : "Ready"}
        </div>
      </div>
    </div>
  );
}
