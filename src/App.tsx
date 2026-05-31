import { useMemo, useState } from "react";
import { ACESFilmicToneMapping } from "three";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";

import Scene from "./components/Scene";
import UI from "./components/UI";
import LoadingScreen from "./components/LoadingScreen";
import CompatibilityNotice from "./components/CompatibilityNotice";
import { detectCompatibilityIssue } from "./components/compatibility";

export default function App() {
  // ?qa=1 hides dev overlays (Leva panel) for clean headless screenshots.
  const isQaMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("qa") === "1";

  // Never show the Leva debug panel in a production build — only in `npm run dev`.
  const hideLeva = isQaMode || import.meta.env.PROD;

  // Detect mobile / missing-WebGL / underpowered environments. Run once on
  // mount; the result can't change without a reload. QA mode skips the gate so
  // headless screenshots always render the scene.
  const issue = useMemo(
    () => (isQaMode ? null : detectCompatibilityIssue()),
    [isQaMode],
  );
  const [dismissed, setDismissed] = useState(false);

  // Hard block (mobile / no WebGL): never mount the Canvas or load assets.
  if (issue && issue.severity === "block") {
    return <CompatibilityNotice issue={issue} />;
  }

  // Soft warning (slow device): let the user choose to continue.
  if (issue && issue.severity === "warn" && !dismissed) {
    return (
      <CompatibilityNotice issue={issue} onContinue={() => setDismissed(true)} />
    );
  }

  return (
    <>
      <Leva hidden={hideLeva} />
      <Canvas
        shadows
        camera={{ fov: 55, near: 1, far: 20000, position: [30, 30, 100] }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.6;
        }}
        style={{ background: "#000", width: "100vw", height: "100vh" }}>
        <Scene />
      </Canvas>
      <UI />
      {!isQaMode && <LoadingScreen />}
    </>
  );
}
