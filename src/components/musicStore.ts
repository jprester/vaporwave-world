// Music store: lives outside the R3F Canvas so play/pause/mute controls work
// reliably from the UI (no reconciler boundary to cross). The Canvas only
// writes the distance-based volume into the store; it never reads state.

const TRACKS = [
  "/sounds/music/Beach Condo.mp3",
  "/sounds/music/Osaka Lounge.mp3",
  "/sounds/music/Poolroom Afterimage.mp3",
  "/sounds/music/Seaside Resort.mp3",
  "/sounds/music/Classy Place.mp3",
  "/sounds/music/Travelogue.mp3",
];

const TRACK_LABELS = [
  "Beach Condo",
  "Osaka Lounge",
  "Poolroom Afterimage",
  "Seaside Resort",
  "Classy Place",
  "Travelogue",
];

interface Snapshot {
  isPlaying: boolean;
  isMuted: boolean;
  hasStarted: boolean;
  currentIndex: number;
  trackLabel: string;
  nearBoombox: boolean;
}

const FADE_IN_MS = 1500;

let audioElements: HTMLAudioElement[] = [];
let currentIndex = 0;
let isPlaying = false;
let isMuted = false;
let hasStarted = false;
let distanceVolume = 1;
let lastWrittenVolume = -1;
let nearBoombox = false;
// Multiplier ramped 0 -> 1 on the first start so playback fades in rather than
// hard-starting at full volume.
let fadeGain = 1;
let fadeRaf = 0;
let autoStartArmed = false;

// Web Audio graph, built on the first play (it needs a user gesture):
//   <audio> elements → musicGain → lowpass → master (mute) → speakers
//   fluorescent hum oscillators → humGain → master
// The lowpass is wide open on the island; in the cave it closes so the music
// sounds like it's coming through the ceiling. If Web Audio is unavailable,
// volume falls back to the elements' own volume and there's no muffling.
export type Acoustics = "open" | "muffled";
const OPEN_CUTOFF = 20000;
const MUFFLED_CUTOFF = 520;
const HUM_LEVEL = 0.03;
let acoustics: Acoustics = "open";
let audioCtx: AudioContext | null = null;
let graphFailed = false;
let musicGain: GainNode | null = null;
let lowpass: BiquadFilterNode | null = null;
let master: GainNode | null = null;
let humGain: GainNode | null = null;

function ensureGraph() {
  if (audioCtx || graphFailed || audioElements.length === 0) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) throw new Error("no AudioContext");
    const ctx = new Ctx();
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.Q.value = 0.9;
    master = ctx.createGain();
    humGain = ctx.createGain();
    humGain.gain.value = 0;

    musicGain.connect(lowpass).connect(master).connect(ctx.destination);
    humGain.connect(master);
    for (const a of audioElements) {
      ctx.createMediaElementSource(a).connect(musicGain);
      a.volume = 1;
    }

    // Mains hum: a 60 Hz fundamental plus a filtered 120 Hz buzz.
    const hum = ctx.createOscillator();
    hum.frequency.value = 60;
    const buzz = ctx.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 120;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = "lowpass";
    buzzFilter.frequency.value = 380;
    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0.35;
    hum.connect(humGain);
    buzz.connect(buzzFilter).connect(buzzGain).connect(humGain);
    hum.start();
    buzz.start();

    audioCtx = ctx;
    applyAcoustics(true);
  } catch (err) {
    console.warn("Web Audio unavailable, music won't be filtered:", err);
    graphFailed = true;
  }
}

function applyAcoustics(immediate = false) {
  if (!audioCtx || !lowpass || !humGain) return;
  const now = audioCtx.currentTime;
  const muffled = acoustics === "muffled";
  const cutoff = muffled ? MUFFLED_CUTOFF : OPEN_CUTOFF;
  const hum = muffled ? HUM_LEVEL : 0;
  if (immediate) {
    lowpass.frequency.value = cutoff;
    humGain.gain.value = hum;
  } else {
    lowpass.frequency.setTargetAtTime(cutoff, now, 0.35);
    humGain.gain.setTargetAtTime(hum, now, 0.6);
  }
}

export function setAcoustics(next: Acoustics) {
  if (next === acoustics) return;
  acoustics = next;
  applyAcoustics();
}

let snapshot: Snapshot = {
  isPlaying: false,
  isMuted: false,
  hasStarted: false,
  currentIndex: 0,
  trackLabel: TRACK_LABELS[0],
  nearBoombox: false,
};

const listeners = new Set<() => void>();

function notify() {
  snapshot = {
    isPlaying,
    isMuted,
    hasStarted,
    currentIndex,
    trackLabel: TRACK_LABELS[currentIndex] ?? `Track ${currentIndex + 1}`,
    nearBoombox,
  };
  listeners.forEach((l) => l());
}

function ensureAudio() {
  if (audioElements.length > 0) return;
  audioElements = TRACKS.map((src) => {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0;
    return a;
  });
  audioElements.forEach((a, i) => {
    a.addEventListener("ended", () => {
      if (i === currentIndex && isPlaying) {
        nextTrack();
      }
    });
  });
}

function effectiveVolume() {
  return isMuted ? 0 : distanceVolume * fadeGain;
}

// Writes the volume to the gain node when the graph exists, else to the
// current element. Mute lives on the master gain so it silences the hum too.
function setOutputVolume(v: number) {
  if (audioCtx && musicGain && master) {
    const now = audioCtx.currentTime;
    musicGain.gain.setTargetAtTime(distanceVolume * fadeGain, now, 0.03);
    master.gain.setTargetAtTime(isMuted ? 0 : 1, now, 0.03);
  } else {
    audioElements[currentIndex].volume = v;
  }
}

function startFadeIn() {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  fadeGain = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / FADE_IN_MS);
    fadeGain = t;
    writeVolume(true);
    fadeRaf = t < 1 ? requestAnimationFrame(step) : 0;
  };
  fadeRaf = requestAnimationFrame(step);
}

function writeVolume(force = false) {
  if (audioElements.length === 0) return;
  const v = effectiveVolume();
  if (!force && Math.abs(v - lastWrittenVolume) < 0.005) return;
  setOutputVolume(v);
  lastWrittenVolume = v;
}

export function play() {
  ensureAudio();
  ensureGraph();
  if (audioCtx?.state === "suspended") {
    audioCtx.resume().catch(() => undefined);
  }
  const a = audioElements[currentIndex];
  if (!hasStarted) {
    a.currentTime = 0;
    startFadeIn();
  } else {
    fadeGain = 1;
  }
  writeVolume(true);
  const result = a.play();
  if (result && typeof result.then === "function") {
    result.catch((err) => {
      console.warn("Music playback blocked by browser:", err);
    });
  }
  hasStarted = true;
  isPlaying = true;
  notify();
}

export function pause() {
  if (audioElements.length === 0) return;
  audioElements[currentIndex].pause();
  isPlaying = false;
  notify();
}

export function togglePlay() {
  if (isPlaying) pause();
  else play();
}

export function nextTrack() {
  ensureAudio();
  const wasPlaying = isPlaying;
  const prev = audioElements[currentIndex];
  prev.pause();
  prev.currentTime = 0;
  currentIndex = (currentIndex + 1) % TRACKS.length;
  lastWrittenVolume = -1;
  if (wasPlaying || !hasStarted) {
    play();
  } else {
    notify();
  }
}

export function toggleMute() {
  isMuted = !isMuted;
  writeVolume(true);
  notify();
}

export function setDistanceVolume(v: number) {
  distanceVolume = Math.max(0, Math.min(1, v));
  writeVolume();
}

export function setNearBoombox(v: boolean) {
  if (v === nearBoombox) return;
  nearBoombox = v;
  notify();
}

// Browsers block autoplay until a user gesture, so we can't start music on
// load. Arm a one-shot listener that starts the track (with fade-in) on the
// first click/keypress — typically the same click that captures the mouse.
export function armAutoStart() {
  if (autoStartArmed || typeof window === "undefined") return;
  autoStartArmed = true;
  const trigger = () => {
    window.removeEventListener("pointerdown", trigger);
    window.removeEventListener("keydown", trigger);
    if (!hasStarted) play();
  };
  window.addEventListener("pointerdown", trigger);
  window.addEventListener("keydown", trigger);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Snapshot {
  return snapshot;
}
