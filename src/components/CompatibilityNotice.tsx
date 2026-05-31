import { useState } from "react";
import type { CSSProperties } from "react";
import type { CompatibilityIssue } from "./compatibility";

// Gameplay/trailer video shown to visitors who can't run the live scene (e.g. on
// mobile). Leave empty to hide the "Watch the video" button until you have a URL.
// TODO: paste your YouTube / Vimeo / etc. link here once the clip is uploaded.
const PROMO_VIDEO_URL = "";

interface CompatibilityNoticeProps {
  issue: CompatibilityIssue;
  /** Only present for dismissible (`warn`) issues. */
  onContinue?: () => void;
}

/**
 * Full-screen overlay shown when the environment can't (or shouldn't) run the
 * scene. `block` issues have no escape hatch; `warn` issues offer a "Continue
 * anyway" button. Both offer a "Watch the video" fallback (when a URL is set)
 * and a "Copy link" button so phone visitors can reopen it on a desktop.
 */
export default function CompatibilityNotice({
  issue,
  onContinue,
}: CompatibilityNoticeProps) {
  const dismissible =
    issue.severity === "warn" && typeof onContinue === "function";
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (e.g. insecure context). Fall back to a
      // prompt so the user can still grab the link manually.
      window.prompt("Copy this link and open it on a desktop:", url);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="compat-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(circle at 50% 35%, #2a1840 0%, #100a1f 60%, #05030c 100%)",
        color: "white",
        fontFamily: "monospace",
      }}>
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          background: "rgba(0, 0, 0, 0.45)",
          border: "1px solid rgba(255, 92, 176, 0.45)",
          borderRadius: 10,
          padding: "28px 26px",
          boxShadow: "0 0 40px rgba(255, 92, 176, 0.25)",
        }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: 0.6,
            marginBottom: 14,
          }}>
          Vaporwave World Compatibility Notice
        </div>
        <h1
          id="compat-title"
          style={{
            fontSize: 22,
            margin: "0 0 14px",
            color: "#ff8fd0",
            fontWeight: 700,
          }}>
          {issue.title}
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
            opacity: 0.9,
          }}>
          {issue.message}
        </p>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}>
          {PROMO_VIDEO_URL && (
            <a
              href={PROMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...buttonStyle,
                ...primaryButtonStyle,
                textDecoration: "none",
              }}>
              ▶ Watch the video
            </a>
          )}

          <button type="button" onClick={copyLink} style={buttonStyle}>
            {copied ? "Link copied!" : "Copy link for desktop"}
          </button>

          {dismissible && (
            <button
              type="button"
              onClick={onContinue}
              style={{ ...buttonStyle, ...primaryButtonStyle }}>
              Continue anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  color: "white",
  fontFamily: "monospace",
  fontSize: 13,
  padding: "9px 18px",
  borderRadius: 5,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  background: "rgba(255, 92, 176, 0.18)",
  border: "1px solid rgba(255, 92, 176, 0.6)",
};
