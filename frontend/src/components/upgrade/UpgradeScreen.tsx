"use client";

import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";

const COMPARISON = [
  { element: "RC Beam", free: "✓", pro: "✓" },
  { element: "RC Slab", free: "✓", pro: "✓" },
  { element: "RC Column", free: "✓", pro: "✓" },
  { element: "Pad Foundation", free: "—", pro: "✓" },
  { element: "Steel Beam", free: "—", pro: "✓" },
  { element: "Steel Column", free: "—", pro: "✓" },
  { element: "Steel Truss", free: "—", pro: "✓" },
  { element: "PDF Reports", free: "—", pro: "✓" },
  { element: "Detailing SVG", free: "—", pro: "✓" },
];

export default function UpgradeScreen() {
  const { goScreen } = useWorkspace();
  const { user, logout } = useAuth();

  const showToast = (msg: string) => { alert(msg); };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg2)", overflow: "hidden" }}>

      {/* Status bar */}
      <div className="sb">
        <span style={{ fontSize: 15, fontWeight: 700 }}>9:41</span>
        <span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>

      {/* Blue header */}
      <div style={{ background: "#1a4a8a", padding: "14px 18px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "var(--ser)", fontSize: 17, fontWeight: 700, color: "#fff" }}>Upgrade to Pro</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.85)", marginTop: 2 }}>Unlock all elements</div>
        </div>
        <button
          onClick={() => goScreen("workspace")}
          style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", padding: "5px 12px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 10, cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>

      {/* Scrollable content */}
      <div className="scr" style={{ padding: "20px 18px", background: "var(--bg2)" }}>
        <div style={{ maxWidth: 400, margin: "0 auto" }}>

          {/* Current plan */}
          <div style={{ background: "#fff", border: "1px solid var(--bdr)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)" }}>CURRENT PLAN</div>
            <div style={{ fontFamily: "var(--ser)", fontSize: 18, fontWeight: 700, color: "var(--txt)", margin: "4px 0" }}>
              {user?.tier === "pro" ? "Pro" : "Free Trial"}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--grn)", fontWeight: 700 }}>
              {user?.tier === "pro" ? "All elements unlocked" : "Full access"}
            </div>
          </div>

          {/* Comparison table */}
          <div style={{ background: "#fff", border: "1px solid var(--bdr)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#1a4a8a", padding: "10px 14px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.6)" }}>Element</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.6)", textAlign: "center" }}>Free</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--gold)", fontWeight: 700, textAlign: "center" }}>Pro</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.element} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "9px 14px", borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--bdr)" : undefined }}>
                <div style={{ fontFamily: "var(--ui)", fontSize: 11, color: "var(--txt)" }}>{row.element}</div>
                <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 11, color: row.free === "✓" ? "var(--grn)" : "var(--dim)" }}>{row.free}</div>
                <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--grn)", fontWeight: 700 }}>{row.pro}</div>
              </div>
            ))}
          </div>

          {/* Plan label */}
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)", textAlign: "center", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".8px" }}>
            Choose your plan
          </div>

          {/* Monthly card */}
          <div style={{ background: "#fff", border: "2px solid rgba(200,150,12,.35)", borderRadius: 14, padding: "18px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 700, color: "var(--txt)" }}>Monthly</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)" }}>Cancel anytime</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 22, fontWeight: 700, color: "var(--blu)" }}>€19</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--dim)" }}>/month</div>
              </div>
            </div>
            <button
              onClick={() => showToast("Monthly plan — payments coming in Sprint 3")}
              style={{ width: "100%", padding: 11, borderRadius: 11, border: "none", background: "#1a4a8a", color: "#fff", fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Choose Monthly
            </button>
          </div>

          {/* Annual card */}
          <div style={{ background: "#fff", border: "2px solid #1a4a8a", borderRadius: 14, padding: "18px 16px", marginBottom: 10, position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--gold)", color: "#fff", padding: "3px 12px", borderRadius: 10, fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, letterSpacing: ".5px", whiteSpace: "nowrap" }}>
              BEST VALUE
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 700, color: "var(--txt)" }}>Annual</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--grn)", fontWeight: 700 }}>Save €46 vs monthly</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 22, fontWeight: 700, color: "var(--blu)" }}>€182</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--dim)" }}>/year · €15.20/mo</div>
              </div>
            </div>
            <button
              onClick={() => showToast("Annual plan — payments coming in Sprint 3")}
              style={{ width: "100%", padding: 11, borderRadius: 11, border: "none", background: "linear-gradient(135deg,#1a4a8a,#2563b0)", color: "#fff", fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Choose Annual ★
            </button>
          </div>

          {/* Enterprise */}
          <div style={{ background: "var(--bg3)", border: "1px solid var(--bdr)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>Firm / Enterprise</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)", marginTop: 2 }}>
                Multiple seats · firm letterhead · priority support
              </div>
            </div>
            <button
              onClick={() => showToast("Contact hello@baeconsult.com for firm pricing")}
              style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "1.5px solid var(--blu)", background: "transparent", color: "var(--blu)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
            >
              Contact us
            </button>
          </div>

          {/* Account section */}
          {user && (
            <div style={{ background: "#fff", border: "1px solid var(--bdr)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>Account</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt)", marginBottom: 12, lineHeight: 1.7 }}>
                {user.fullName && <div>{user.fullName}</div>}
                <div>{user.email}</div>
                <div style={{ color: "var(--mut)" }}>Plan: {user.tier}</div>
              </div>
              <button
                onClick={() => { if (window.confirm("Sign out of SSAD?")) { logout(); goScreen("workspace"); } }}
                style={{ width: "100%", padding: 9, borderRadius: 10, border: "1px solid rgba(192,57,43,.3)", background: "rgba(192,57,43,.05)", color: "var(--red)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
              >
                Sign Out
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Bottom nav */}
      <div className="bnav">
        <div className="bni" onClick={() => goScreen("workspace")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
            </svg>
          </div>
          <span>Home</span>
        </div>
        <div className="bni on">
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
            </svg>
          </div>
          <span>Upgrade</span>
        </div>
        <div className="bni" onClick={() => goScreen("projects")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 7h18M3 12h18M3 17h18"/>
            </svg>
          </div>
          <span>Projects</span>
        </div>
        <div className="bni" onClick={() => goScreen("settings")} role="button" tabIndex={0}>
          <div className="bni-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
          <span>Settings</span>
        </div>
      </div>

    </div>
  );
}


