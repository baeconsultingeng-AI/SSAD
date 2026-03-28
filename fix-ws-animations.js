const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend/src/components/workspace/WorkspaceScreen.tsx');
let src = fs.readFileSync(file, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1.  Replace the entire MarketingPanel function
// ─────────────────────────────────────────────────────────────────────────────
const mpStart = src.indexOf('/* ─── Animated Marketing Panel');
const mpEnd   = src.indexOf('/* ─── Workspace Home');
if (mpStart === -1 || mpEnd === -1) { console.error('MarketingPanel markers not found'); process.exit(1); }

const newMP = `/* ─── Animated Marketing Panel ─────────────────────────────────────────────── */
function MarketingPanel() {
  const [stats, setStats] = useState([0, 0, 0]);
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    { text: "Natural language parameter extraction", icon: "💬" },
    { text: "Deterministic BS 8110 / BS 5950 engine", icon: "⚙️" },
    { text: "7-section professional report output",   icon: "📄" },
    { text: "SVG detailing sketches + bar schedule",  icon: "✏️" },
    { text: "Instant PDF export & sharing",           icon: "📤" },
  ];

  const targetStats = [98, 12, 7];
  const statLabels = ["Accuracy %", "Sec avg calc", "Report sections"];

  // counter tick-up on mount
  useEffect(() => {
    const steps = 50, iv = 32;
    let step = 0;
    const t = setInterval(() => {
      step++;
      const ease = 1 - Math.pow(1 - Math.min(step / steps, 1), 3);
      setStats(targetStats.map(v => Math.round(v * ease)));
      if (step >= steps) clearInterval(t);
    }, iv);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // cycling spotlight — advances every 1.8 s
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(p => (p + 1) % features.length), 1800);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [glow, setGlow] = useState(0);
  useEffect(() => {
    let raf: number;
    const tick = () => { setGlow(g => g + 0.025); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const dot = 8 + 4 * Math.sin(glow);
  const dotOpacity = 0.7 + 0.3 * Math.sin(glow);

  return (
    <div className="ws-marketing" style={{
      flex: "0 0 340px",
      background: "linear-gradient(160deg,#0a1f3d 0%,#0d2a50 60%,#0f2d5a 100%)",
      borderLeft: "1px solid rgba(200,150,12,.2)",
      display: "flex", flexDirection: "column", justifyContent: "flex-start",
      padding: "32px 28px", overflowY: "auto", position: "relative",
    }}>
      {/* slow sweeping radial glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: \`radial-gradient(ellipse 70% 55% at \${50 + 22 * Math.sin(glow * .18)}% \${45 + 22 * Math.cos(glow * .13)}%, rgba(200,150,12,.07) 0%, transparent 70%)\`,
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* label row with pulsing dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <div style={{ width: dot, height: dot, borderRadius: "50%", background: "var(--gold2)", opacity: dotOpacity, boxShadow: \`0 0 \${dot * 2}px rgba(200,150,12,.65)\`, transition: "width .05s, height .05s" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "rgba(200,150,12,.9)", letterSpacing: "1.2px", textTransform: "uppercase" }}>
            AI-Powered Structural Design
          </span>
        </div>

        {/* headline */}
        <div style={{ fontFamily: "var(--ser)", fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-.5px", lineHeight: 1.2, marginBottom: 12 }}>
          The Future of<br/>Structural Engineering<br/>
          <span style={{ color: "var(--gold2)" }}>Is Here.</span>
        </div>

        <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 22 }}>
          Describe your element in plain English. SSAD extracts parameters, runs BS 8110 calculations, and delivers a signed report — in seconds.
        </div>

        {/* animated stat counters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {stats.map((val, i) => (
            <div key={statLabels[i]} style={{ textAlign: "center", flex: 1, background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "10px 4px", border: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontFamily: "var(--ser)", fontSize: 20, fontWeight: 700, color: i === 0 ? "rgba(200,150,12,.9)" : "#fff", lineHeight: 1 }}>{val}{i === 0 ? "%" : ""}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "rgba(255,255,255,.38)", letterSpacing: ".5px", marginTop: 4 }}>{statLabels[i]}</div>
            </div>
          ))}
        </div>

        {/* ── Cycling spotlight feature list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {features.map((f, i) => {
            const active = i === activeFeature;
            return (
              <div key={f.text} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 12,
                background: active ? "rgba(200,150,12,.14)" : "rgba(255,255,255,.03)",
                border: \`1px solid \${active ? "rgba(200,150,12,.6)" : "rgba(255,255,255,.06)"}\`,
                boxShadow: active ? "0 0 20px rgba(200,150,12,.20), inset 0 0 14px rgba(200,150,12,.07)" : "none",
                transform: active ? "scale(1.03) translateX(3px)" : "scale(1) translateX(0)",
                opacity: active ? 1 : 0.5,
                transition: "all .5s cubic-bezier(.4,0,.2,1)",
              }}>
                {/* left accent bar */}
                <div style={{
                  width: 3, minHeight: 28, borderRadius: 2, flexShrink: 0,
                  background: active ? "linear-gradient(180deg,#e0a820,#c8960c)" : "rgba(255,255,255,.12)",
                  boxShadow: active ? "0 0 10px rgba(200,150,12,.8)" : "none",
                  transition: "all .5s",
                }} />
                <span style={{ fontSize: 15, flexShrink: 0 }}>{f.icon}</span>
                <span style={{
                  fontFamily: "var(--ui)", fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  color: active ? "#fff" : "rgba(255,255,255,.5)",
                  transition: "all .5s", flex: 1, lineHeight: 1.4,
                }}>{f.text}</span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="#c8960c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".5px" }}>BAE CONSULTING ENGINEERS · CEng MIStructE</div>
        </div>
      </div>
    </div>
  );
}

`;

src = src.slice(0, mpStart) + newMP + src.slice(mpEnd);

// ─────────────────────────────────────────────────────────────────────────────
// 2.  Replace WorkspaceHome — inject activeStep state + new workflow render
// ─────────────────────────────────────────────────────────────────────────────

// Find the function opening up to where the return starts
const whFuncStart = src.indexOf('/* ─── Workspace Home');
const whReturnStart = src.indexOf('\n  return (', whFuncStart);
if (whFuncStart === -1 || whReturnStart === -1) { console.error('WorkspaceHome markers not found'); process.exit(1); }

const newWHHead = `/* ─── Workspace Home ────────────────────────────────────────────────────────── */
function WorkspaceHome() {
  const { goScreen } = useWorkspace();
  const { effectiveTier, user } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = (user as any)?.fullName || (user as any)?.email?.split("@")[0] || "Engineer";

  const tierColor = effectiveTier === "pro" ? "#22c55e" : effectiveTier === "trial" ? "#3b82f6" : "rgba(255,255,255,.4)";
  const tierLabel = effectiveTier === "pro" ? "PRO" : effectiveTier === "trial" ? "TRIAL" : "GUEST";

  // ── Traffic-light workflow animation ──
  const STEPS = ["Describe", "Extract", "Confirm", "Calculate", "Report"];
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % STEPS.length), 1100);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
`;

src = src.slice(0, whFuncStart) + newWHHead + src.slice(whReturnStart);

// ─────────────────────────────────────────────────────────────────────────────
// 3.  Replace the static workflow steps render with the traffic-light version
// ─────────────────────────────────────────────────────────────────────────────
const wfOld = `            {/* Workflow steps */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              {["Describe", "Extract", "Confirm", "Calculate", "Report"].map((step, i, arr) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.45)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)" }}>
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5h6M6 2l3 3-3 3" stroke="rgba(200,150,12,.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>`;

const wfNew = `            {/* Workflow steps — traffic-light */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              {STEPS.map((step, i) => {
                const isLit  = i === activeStep;
                const isPast = i < activeStep;
                return (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      display: "inline-block",
                      fontFamily: "var(--mono)", fontSize: 9,
                      fontWeight: isLit ? 700 : 500,
                      padding: "4px 12px", borderRadius: 20,
                      border: \`1px solid \${isLit ? "rgba(200,150,12,.85)" : isPast ? "rgba(200,150,12,.25)" : "rgba(255,255,255,.1)"}\`,
                      background: isLit ? "rgba(200,150,12,.22)" : isPast ? "rgba(200,150,12,.07)" : "rgba(255,255,255,.03)",
                      color: isLit ? "#e0a820" : isPast ? "rgba(200,150,12,.55)" : "rgba(255,255,255,.32)",
                      boxShadow: isLit ? "0 0 12px rgba(200,150,12,.5)" : "none",
                      transform: isLit ? "scale(1.1)" : "scale(1)",
                      transition: "all .38s cubic-bezier(.4,0,.2,1)",
                    }}>
                      {step}
                    </span>
                    {i < STEPS.length - 1 && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5h6M6 2l3 3-3 3"
                          stroke={isPast || isLit ? "rgba(200,150,12,.5)" : "rgba(255,255,255,.18)"}
                          strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>`;

if (!src.includes(wfOld.trim().slice(0, 60))) {
  console.error('Workflow steps marker not found — check for whitespace mismatch');
  // try a looser search
  const idx = src.indexOf('{/* Workflow steps */}');
  if (idx === -1) { console.error('Cannot locate workflow steps at all'); process.exit(1); }
  // find the containing div end (the closing </div> after the map)
  // we'll do a simpler replace by finding unique text
}

src = src.replace(wfOld, wfNew);

// verify replacements
if (src.includes('setActiveStep') && src.includes('setActiveFeature') && !src.includes('visibleFeatures')) {
  fs.writeFileSync(file, src, 'utf8');
  console.log('OK — WorkspaceScreen.tsx updated,', src.length, 'chars');
} else {
  console.error('Verification failed:',
    'setActiveStep:', src.includes('setActiveStep'),
    'setActiveFeature:', src.includes('setActiveFeature'),
    'visibleFeatures (should be false):', src.includes('visibleFeatures'),
  );
  process.exit(1);
}
