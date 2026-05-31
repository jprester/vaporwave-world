import type { CompatibilityIssue } from "./compatibility";

interface CompatibilityNoticeProps {
  issue: CompatibilityIssue;
  /** Only present for dismissible (`warn`) issues. */
  onContinue?: () => void;
}

/**
 * Full-screen overlay shown when the environment can't (or shouldn't) run the
 * scene. `block` issues have no escape hatch; `warn` issues offer a "Continue
 * anyway" button.
 */
export default function CompatibilityNotice({
  issue,
  onContinue,
}: CompatibilityNoticeProps) {
  const dismissible =
    issue.severity === "warn" && typeof onContinue === "function";

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
          Vaporwave Worlds Compatibility Notice
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
        {dismissible && (
          <button
            type="button"
            onClick={onContinue}
            style={{
              marginTop: 22,
              background: "rgba(255, 92, 176, 0.18)",
              border: "1px solid rgba(255, 92, 176, 0.6)",
              color: "white",
              fontFamily: "monospace",
              fontSize: 13,
              padding: "9px 18px",
              borderRadius: 5,
              cursor: "pointer",
            }}>
            Continue anyway
          </button>
        )}
      </div>
    </div>
  );
}
