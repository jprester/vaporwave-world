import { useEffect, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import {
  armAutoStart,
  getSnapshot,
  nextTrack,
  subscribe,
  togglePlay,
  toggleMute,
} from "./musicStore";
import {
  FADE_IN_MS,
  FADE_OUT_MS,
  getSnapshot as getWorldSnapshot,
  subscribe as subscribeWorld,
  travel,
} from "./worldStore";

// Fullscreen helpers. Toggling fullscreen makes the experience more immersive
// and keeps browser chrome out of screen recordings. `requestFullscreen` must
// run inside a user gesture (key press / click), which is always the case here.
// Older Safari needs the `webkit`-prefixed variants.
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function isFullscreenActive(): boolean {
  const doc = document as FsDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

function toggleFullscreen(): void {
  const doc = document as FsDocument;
  if (isFullscreenActive()) {
    (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
  } else {
    const el = document.documentElement as FsElement;
    (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  }
}

export default function UI() {
  const isQaMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("qa") === "1";

  const music = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const world = useSyncExternalStore(
    subscribeWorld,
    getWorldSnapshot,
    getWorldSnapshot,
  );
  const [helpOpen, setHelpOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isQaMode) return;
    armAutoStart();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "KeyE") {
        e.preventDefault();
        nextTrack();
      } else if (e.code === "KeyP") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === "Enter" && getWorldSnapshot().nearDoor) {
        e.preventDefault();
        travel();
      }
    };
    // While the mouse is captured, a click at the door opens it. (The click
    // that first captures the mouse is left alone.)
    const onPointerDown = () => {
      if (document.pointerLockElement && getWorldSnapshot().nearDoor) {
        travel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isQaMode]);

  // Keep the button label in sync with the actual fullscreen state, including
  // when the user exits via Esc or the system, which don't go through our toggle.
  useEffect(() => {
    if (isQaMode) return;
    const onChange = () => setIsFullscreen(isFullscreenActive());
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [isQaMode]);

  const transition = (
    <TransitionOverlay
      phase={world.phase}
      towardLight={world.destination === "island"}
    />
  );

  if (isQaMode) {
    return transition;
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "white",
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.55,
          background: "rgba(0, 0, 0, 0.42)",
          padding: helpOpen ? "12px 14px" : "8px 12px",
          borderRadius: 6,
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}>
          <strong>Plato's Cove</strong>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
              onClick={(e) => {
                toggleFullscreen();
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              style={iconButtonStyle}>
              {isFullscreen ? "⤡" : "⤢"}
            </button>
            <button
              type="button"
              aria-label={
                helpOpen ? "Minimize instructions" : "Show instructions"
              }
              onClick={(e) => {
                setHelpOpen((v) => !v);
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              style={iconButtonStyle}>
              {helpOpen ? "–" : "?"}
            </button>
          </div>
        </div>
        {helpOpen && (
          <>
            <div>Click to capture mouse</div>
            <div>WASD / arrows move</div>
            <div>Space jumps</div>
            <div>Esc releases mouse</div>
            <div>F fullscreen</div>
            <div style={{ marginTop: 8, opacity: 0.85 }}>
              Walk to the boombox for music
            </div>
            <div style={{ opacity: 0.85 }}>
              P play/pause &nbsp; E next &nbsp; M mute
            </div>
            <div style={{ opacity: 0.85 }}>Some doors open</div>
            <div style={creditStyle}>
              <span style={{ opacity: 0.7 }}>Made by</span>{" "}
              <strong>J. Prester</strong>
              <div style={{ marginTop: 2 }}>
                <a
                  href="https://github.com/jprester"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={creditLinkStyle}>
                  GitHub
                </a>
                <span style={{ opacity: 0.45 }}> · </span>
                <a
                  href="mailto:janko.prester@gmail.com"
                  style={creditLinkStyle}>
                  Email
                </a>
                <span style={{ opacity: 0.45 }}> · </span>
                <a
                  href="https://www.jankoprester.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={creditLinkStyle}>
                  Web
                </a>
              </div>
            </div>
          </>
        )}
      </div>
      <MusicControls
        isPlaying={music.isPlaying}
        isMuted={music.isMuted}
        hasStarted={music.hasStarted}
        trackLabel={music.trackLabel}
        visible={music.nearBoombox}
      />
      <DoorPrompt visible={world.nearDoor && world.phase === "idle"} />
      {transition}
    </>
  );
}

function DoorPrompt({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "58%",
        left: "50%",
        transform: "translateX(-50%)",
        color: "white",
        fontFamily: "monospace",
        fontSize: 13,
        letterSpacing: 2,
        background: "rgba(0, 0, 0, 0.45)",
        padding: "8px 14px",
        borderRadius: 6,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        pointerEvents: "none",
      }}>
      Click or Enter to open
    </div>
  );
}

// Full-screen fade between worlds. Walking into the cave fades to darkness;
// walking back out fades through a blinding pink-white, like stepping into
// sunlight.
function TransitionOverlay({
  phase,
  towardLight,
}: {
  phase: "idle" | "out" | "in";
  towardLight: boolean;
}) {
  const covering = phase === "out";
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        pointerEvents: "none",
        background: towardLight
          ? "radial-gradient(circle at 50% 45%, #ffffff 0%, #ffe6f2 45%, #ffc2de 100%)"
          : "#07040a",
        opacity: covering ? 1 : 0,
        transition: `opacity ${covering ? FADE_OUT_MS : FADE_IN_MS}ms ease-in-out`,
      }}
    />
  );
}

const creditStyle: CSSProperties = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: "1px solid rgba(255, 255, 255, 0.15)",
  fontSize: 11,
  opacity: 0.85,
};

const creditLinkStyle: CSSProperties = {
  color: "#ff7cc8",
  textDecoration: "none",
};

const iconButtonStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.35)",
  color: "white",
  fontFamily: "monospace",
  fontSize: 13,
  lineHeight: 1,
  width: 22,
  height: 22,
  borderRadius: 4,
  cursor: "pointer",
};

interface MusicControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  hasStarted: boolean;
  trackLabel: string;
  visible: boolean;
}

function MusicControls({
  isPlaying,
  isMuted,
  hasStarted,
  trackLabel,
  visible,
}: MusicControlsProps) {
  const statusLabel = !hasStarted
    ? "Music off"
    : isPlaying
      ? `Playing — ${trackLabel}`
      : `Paused — ${trackLabel}`;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "50%",
        left: "50%",
        transform: "translate(-50%, 50%)",
        color: "white",
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.45,
        background: "rgba(0, 0, 0, 0.55)",
        padding: "10px 12px",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 180,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}>
      <div style={{ opacity: 0.85 }}>{statusLabel}</div>
      <div style={{ display: "flex", gap: 6 }}>
        <ControlButton onClick={togglePlay}>
          {isPlaying ? "Pause (P)" : "Play (P)"}
        </ControlButton>
        <ControlButton onClick={nextTrack}>Next (E)</ControlButton>
        <ControlButton onClick={toggleMute}>
          {isMuted ? "Unmute (M)" : "Mute (M)"}
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick();
        (e.currentTarget as HTMLButtonElement).blur();
      }}
      style={{
        flex: 1,
        minWidth: 90,
        whiteSpace: "nowrap",
        background: "rgba(255, 92, 176, 0.18)",
        border: "1px solid rgba(255, 92, 176, 0.55)",
        color: "white",
        fontFamily: "monospace",
        fontSize: 11,
        padding: "5px 8px",
        borderRadius: 4,
        cursor: "pointer",
      }}>
      {children}
    </button>
  );
}
