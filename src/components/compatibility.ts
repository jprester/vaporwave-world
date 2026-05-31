// Runtime compatibility checks for Plato's Cove.
//
// The experience is a first-person, pointer-lock 3D scene driven by a mouse and
// a keyboard (WASD). It relies on WebGL and a reasonably capable GPU, so it does
// not work on phones/tablets and degrades badly on very weak machines. We detect
// those cases up front and show a friendly notice instead of a broken scene.

export type Severity = "block" | "warn";

export interface CompatibilityIssue {
  severity: Severity;
  title: string;
  message: string;
}

function isMobileOrTablet(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";

  // Classic user-agent sniff. Covers phones and most tablets.
  const uaLooksMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i.test(
      ua,
    );

  // iPadOS 13+ reports a desktop Safari UA, so fall back to a touch + platform
  // check (a Mac never has touch points).
  const iPadOnDesktopUA =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  // A coarse pointer (finger) with no fine pointer (mouse) is a strong signal
  // for a touch-only device.
  const coarsePointerOnly =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches &&
    !window.matchMedia("(any-pointer: fine)").matches;

  return uaLooksMobile || iPadOnDesktopUA || coarsePointerOnly;
}

function webGLSupport(): { supported: boolean; software: boolean } {
  if (typeof document === "undefined") return { supported: false, software: false };

  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) return { supported: false, software: false };

    // Detect software / virtualised renderers (SwiftShader, llvmpipe, ANGLE
    // software fallback) which run far too slowly for this scene.
    let software = false;
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = String(
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "",
      ).toLowerCase();
      software =
        renderer.includes("swiftshader") ||
        renderer.includes("llvmpipe") ||
        renderer.includes("software") ||
        renderer.includes("microsoft basic render");
    }

    return { supported: true, software };
  } catch {
    return { supported: false, software: false };
  }
}

function looksUnderpowered(): boolean {
  if (typeof navigator === "undefined") return false;

  // `deviceMemory` is in GiB and capped at 8 for privacy. <= 2GB is very low.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMemory = typeof memory === "number" && memory > 0 && memory <= 2;

  // Dual-core (or single-core) machines will struggle with the postprocessing.
  const cores = navigator.hardwareConcurrency;
  const fewCores = typeof cores === "number" && cores > 0 && cores <= 2;

  return lowMemory || fewCores;
}

/**
 * Inspects the current environment and returns the most important compatibility
 * issue, or `null` if everything looks fine.
 *
 * A `block` issue means the experience genuinely cannot run; a `warn` issue
 * means it will probably run poorly but the user can choose to continue.
 */
export function detectCompatibilityIssue(): CompatibilityIssue | null {
  if (isMobileOrTablet()) {
    return {
      severity: "block",
      title: "Best on a desktop",
      message:
        "Plato's Cove is a first-person 3D experience that needs a mouse and keyboard (WASD to move, mouse to look around). It won't work on a phone or tablet. Please visit again on a laptop or desktop computer.",
    };
  }

  const { supported, software } = webGLSupport();

  if (!supported) {
    return {
      severity: "block",
      title: "WebGL not available",
      message:
        "Your browser can't run WebGL, which this 3D experience requires. Try a recent version of Chrome, Firefox, Edge, or Safari, and make sure hardware acceleration is enabled in your browser settings.",
    };
  }

  if (software) {
    return {
      severity: "warn",
      title: "Software rendering detected",
      message:
        "Your browser is rendering 3D in software rather than on a GPU, which will be very slow. Enabling hardware acceleration in your browser settings will help a lot. You can still try to continue.",
    };
  }

  if (looksUnderpowered()) {
    return {
      severity: "warn",
      title: "This may run slowly",
      message:
        "Your device looks like it might not have enough power for a smooth experience. You can still continue, but expect a low frame rate.",
    };
  }

  return null;
}
