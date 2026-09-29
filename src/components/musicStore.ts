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
//
//   <audio> → musicGain ─┬─ directGain ─────────────────────────────┬→ master → out
//                        └─ TV speaker (band-limit, drive) → panner ─┤   (mute)
//   room tone + fluorescent hum ────────────── ambienceGain ─────────┘
//
// On the island the music plays straight ("open"). In the cave it comes out of
// the video wall ("tv"): small, tinny and overdriven, placed in 3D so it gets
// louder and shifts as you walk and turn, over the empty room's air handling
// and hum. If Web Audio is unavailable, volume falls back to the elements' own
// volume and there are no effects.
export type Acoustics = "open" | "tv";
const TV_LEVEL = 1.1;
const AMBIENCE_LEVEL = 1;
let acoustics: Acoustics = "open";
let audioCtx: AudioContext | null = null;
let graphFailed = false;
let musicGain: GainNode | null = null;
let directGain: GainNode | null = null;
let tvGain: GainNode | null = null;
let tvPanner: PannerNode | null = null;
let ambienceGain: GainNode | null = null;
let master: GainNode | null = null;

// Gentle tanh-style saturation for the TV speaker.
function driveCurve(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(amount * x) / Math.tanh(amount);
  }
  return curve;
}

function buildAmbience(ctx: AudioContext, out: AudioNode) {
  // Room tone: looping noise, filtered down to a soft air-handling rumble.
  const seconds = 3;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i++) {
    brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
    data[i] = brown * 3.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const air = ctx.createBiquadFilter();
  air.type = "lowpass";
  air.frequency.value = 420;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.05;
  noise.connect(air).connect(airGain).connect(out);
  noise.start();

  // Mains hum: a 60 Hz fundamental plus a filtered 120 Hz buzz.
  const hum = ctx.createOscillator();
  hum.frequency.value = 60;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.02;
  const buzz = ctx.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.value = 120;
  const buzzFilter = ctx.createBiquadFilter();
  buzzFilter.type = "lowpass";
  buzzFilter.frequency.value = 380;
  const buzzGain = ctx.createGain();
  buzzGain.gain.value = 0.008;
  hum.connect(humGain).connect(out);
  buzz.connect(buzzFilter).connect(buzzGain).connect(out);
  hum.start();
  buzz.start();
}

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
    directGain = ctx.createGain();
    tvGain = ctx.createGain();
    ambienceGain = ctx.createGain();
    master = ctx.createGain();

    // TV speaker: no bass, no air, a honky midrange peak and some drive.
    const tvHigh = ctx.createBiquadFilter();
    tvHigh.type = "highpass";
    tvHigh.frequency.value = 380;
    const tvLow = ctx.createBiquadFilter();
    tvLow.type = "lowpass";
    tvLow.frequency.value = 3400;
    tvLow.Q.value = 1.4;
    const tvDrive = ctx.createWaveShaper();
    tvDrive.curve = driveCurve(2.2);
    tvPanner = ctx.createPanner();
    tvPanner.panningModel = "HRTF";
    tvPanner.distanceModel = "inverse";
    tvPanner.refDistance = 4;
    tvPanner.rolloffFactor = 0.6;

    musicGain.connect(directGain).connect(master);
    musicGain
      .connect(tvHigh)
      .connect(tvLow)
      .connect(tvDrive)
      .connect(tvPanner)
      .connect(tvGain)
      .connect(master);
    ambienceGain.connect(master);
    master.connect(ctx.destination);
    buildAmbience(ctx, ambienceGain);

    for (const a of audioElements) {
      ctx.createMediaElementSource(a).connect(musicGain);
      a.volume = 1;
    }

    audioCtx = ctx;
    if (tvSource) setTvSource(...tvSource);
    applyAcoustics(true);
  } catch (err) {
    console.warn("Web Audio unavailable, music won't be processed:", err);
    graphFailed = true;
  }
}

function applyAcoustics(immediate = false) {
  if (!audioCtx || !directGain || !tvGain || !ambienceGain) return;
  const tv = acoustics === "tv";
  const targets: [AudioParam, number][] = [
    [directGain.gain, tv ? 0 : 1],
    [tvGain.gain, tv ? TV_LEVEL : 0],
    [ambienceGain.gain, tv ? AMBIENCE_LEVEL : 0],
  ];
  const now = audioCtx.currentTime;
  for (const [param, value] of targets) {
    if (immediate) param.value = value;
    else param.setTargetAtTime(value, now, 0.4);
  }
}

export function setAcoustics(next: Acoustics) {
  if (next === acoustics) return;
  acoustics = next;
  applyAcoustics();
}

// Where the TV speaker sound comes from, in world units.
let tvSource: [number, number, number] | null = null;
export function setTvSource(x: number, y: number, z: number) {
  tvSource = [x, y, z];
  if (!tvPanner) return;
  if (tvPanner.positionX) {
    tvPanner.positionX.value = x;
    tvPanner.positionY.value = y;
    tvPanner.positionZ.value = z;
  } else {
    tvPanner.setPosition(x, y, z);
  }
}

// The listener is the player's head: position plus facing direction.
export function setListenerPose(
  px: number,
  py: number,
  pz: number,
  fx: number,
  fy: number,
  fz: number,
) {
  if (!audioCtx) return;
  const l = audioCtx.listener;
  if (l.positionX) {
    const t = audioCtx.currentTime;
    l.positionX.setTargetAtTime(px, t, 0.02);
    l.positionY.setTargetAtTime(py, t, 0.02);
    l.positionZ.setTargetAtTime(pz, t, 0.02);
    l.forwardX.setTargetAtTime(fx, t, 0.02);
    l.forwardY.setTargetAtTime(fy, t, 0.02);
    l.forwardZ.setTargetAtTime(fz, t, 0.02);
    l.upX.value = 0;
    l.upY.value = 1;
    l.upZ.value = 0;
  } else {
    l.setPosition(px, py, pz);
    l.setOrientation(fx, fy, fz, 0, 1, 0);
  }
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
// current element. Mute lives on the master gain so it silences the ambience
// too.
function setOutputVolume(v: number) {
  if (audioCtx && musicGain && master) {
    // Written directly (no automation): this runs every frame with small
    // steps, and stacking scheduled ramps per frame misbehaves.
    musicGain.gain.value = distanceVolume * fadeGain;
    master.gain.value = isMuted ? 0 : 1;
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
