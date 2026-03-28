const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "frontend", "src", "components", "workspace", "AIChatPanel.tsx");
let content = fs.readFileSync(filePath, "utf8");

const hasCRLF = content.includes("\r\n");
if (hasCRLF) content = content.replace(/\r\n/g, "\n");

// 1. Replace the RC_PROMPTS block (from "// Suggestion prompts" to closing "];")
const OLD_PROMPTS_RE = /\/\/ Suggestion prompts for the right panel\nconst RC_PROMPTS[\s\S]+?\];\n/;

const NEW_DATA = `// --- Element categories ---

type SubType = { name: string; desc: string; prompt: string };

const RC_ELEMENTS: { id: string; sub: string }[] = [
  { id: "Slab",        sub: "Solid \u00B7 Ribbed \u00B7 Waffle \u00B7 Flat \u00B7 Hollow pot" },
  { id: "Beam",        sub: "Simply supported \u00B7 Continuous \u00B7 Cantilever \u00B7 T-Beam" },
  { id: "Column",      sub: "Axial \u00B7 Uniaxial \u00B7 Biaxial \u00B7 Short \u00B7 Slender" },
  { id: "Foundation",  sub: "Isolated pad \u00B7 Strip \u00B7 Combined \u00B7 Raft \u00B7 Pile cap" },
  { id: "Ancillaries", sub: "Retaining wall \u00B7 Tank \u00B7 Staircase \u00B7 Shear wall" },
];

const ELEMENT_SUBTYPES: Record<string, SubType[]> = {
  Slab: [
    { name: "Solid Two-Way",  desc: "Two-way spanning, supported on 4 sides",          prompt: "Design a solid two-way RC slab, 4mx5m, 175mm thick, Gk=5kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "Solid One-Way",  desc: "One-way spanning, supported on 2 sides",           prompt: "Design a solid one-way RC slab, 4m span, 150mm thick, Gk=4kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "Ribbed Slab",    desc: "Ribs with topping slab, reduces weight",           prompt: "Design a ribbed RC slab, 6m span, 300mm deep, 150mm ribs at 600mm c/c, Gk=5kN/m2, Qk=3kN/m2, C35, BS 8110" },
    { name: "Flat Slab",      desc: "Slab directly on columns, no beams",               prompt: "Design a flat slab, 7x7m panel, 250mm thick, internal column strip, Gk=6kN/m2, Qk=4kN/m2, C35, BS 8110" },
    { name: "Hollow Pot",     desc: "Hollow blocks reduce slab self-weight",             prompt: "Design a hollow pot slab, 5m span, 250mm deep, Gk=5kN/m2, Qk=3kN/m2, C35, BS 8110" },
  ],
  Beam: [
    { name: "Simply Supported", desc: "Spans between two supports, pinned ends",  prompt: "Design a simply supported RC beam, 6m span, 300x500mm, Gk=15kN/m, Qk=10kN/m, C35, fy460, BS 8110" },
    { name: "Continuous Beam",  desc: "Multiple spans, moment redistribution",    prompt: "Design a continuous RC beam, 3 spans of 5m, 300x500mm, Gk=12kN/m, Qk=8kN/m, C35, fy460, BS 8110" },
    { name: "Cantilever",       desc: "Fixed at one end, free at the other",      prompt: "Design a cantilever RC beam, 2.5m projection, 300x500mm, Gk=10kN/m, Qk=6kN/m, C35, fy460, BS 8110" },
    { name: "T-Beam",           desc: "Beam with integral floor slab flange",     prompt: "Design a T-beam, 6m span, web 300x500mm, flange 900x150mm, Gk=15kN/m, Qk=10kN/m, C35, BS 8110" },
  ],
  Column: [
    { name: "Axially Loaded",   desc: "Concentric load only, no bending",   prompt: "Design an axially loaded RC column, 300x300mm, 3.5m height, N=1500kN, C35, fy460, BS 8110" },
    { name: "Uniaxial Bending", desc: "Axial load + bending about one axis", prompt: "Design an RC column, 300x400mm, 3.5m, N=1200kN, Mx=80kNm, C35, fy460, BS 8110" },
    { name: "Biaxial Bending",  desc: "Axial load + bending about both axes", prompt: "Design a biaxially loaded RC column, 350x350mm, 4m, N=900kN, Mx=60kNm, My=45kNm, C35, BS 8110" },
    { name: "Slender Column",   desc: "High slenderness, additional moments",  prompt: "Design a slender RC column, 250x250mm, 6m effective height, N=600kN, C35, fy460, BS 8110" },
  ],
  Foundation: [
    { name: "Isolated Pad",     desc: "Single column footing on firm soil",               prompt: "Design an isolated pad foundation, soil 150kN/m2, column N=1200kN, depth 1.5m, C35, BS 8004" },
    { name: "Strip Foundation", desc: "Continuous footing under wall or row of columns",  prompt: "Design a strip foundation, wall load 120kN/m, soil 100kN/m2, depth 1.0m, C35, BS 8004" },
    { name: "Combined Footing", desc: "Single footing shared by two columns",             prompt: "Design a combined footing, two columns 1200kN each at 3m centres, soil 150kN/m2, C35, BS 8004" },
    { name: "Raft Foundation",  desc: "Full building footprint, poor soil",               prompt: "Design a raft foundation, 12x8m, UDL 60kN/m2, soil 80kN/m2, C35, BS 8004" },
    { name: "Pile Cap",         desc: "Cap connecting group of piles",                    prompt: "Design a pile cap for 4 piles, column N=2400kN, pile diameter 450mm, C35, BS 8004" },
  ],
  Ancillaries: [
    { name: "Retaining Wall",  desc: "Cantilever wall retaining soil or fill", prompt: "Design a cantilever retaining wall, retained height 3m, soil unit weight 18kN/m3, phi=30 deg, BS 8110" },
    { name: "Shear Wall",      desc: "RC wall resisting lateral loads",        prompt: "Design an RC shear wall, 200mm thick, 3m wide, 3m high, lateral load 150kN, C35, BS 8110" },
    { name: "Staircase",       desc: "RC stair flight with landings",          prompt: "Design an RC staircase, 3.3m floor height, 175mm risers, 250mm treads, Qk=4kN/m2, C35, BS 8110" },
    { name: "Water Tank",      desc: "Rectangular below or above ground tank", prompt: "Design a rectangular RC water tank 4x3x2m, C35, fy460, BS 8007" },
  ],
};

const ELEMENT_PROMPTS: Record<string, { name: string; text: string }[]> = {
  Slab: [
    { name: "Two-Way Slab",    text: "Design a solid two-way RC slab, 4mx5m, 175mm thick, Gk=5kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "One-Way Slab",    text: "Design a solid one-way RC slab, 4m span, 150mm thick, Gk=4kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
    { name: "Ribbed Slab",     text: "Design a ribbed RC slab, 6m span, 300mm deep, 150mm ribs at 600mm c/c, Gk=5kN/m2, C35" },
    { name: "Flat Slab",       text: "Design a flat slab, 7x7m panel, 250mm thick, Gk=6kN/m2, Qk=4kN/m2, C35, BS 8110" },
  ],
  Beam: [
    { name: "Simply Supported", text: "Design a simply supported RC beam, 6m span, 300x500mm, Gk=15kN/m, C35, BS 8110" },
    { name: "Continuous Beam",  text: "Design a continuous RC beam, 3 spans of 5m, 300x500mm, Gk=12kN/m, C35, BS 8110" },
    { name: "Cantilever Beam",  text: "Design a cantilever RC beam, 2.5m projection, 300x500mm, Gk=10kN/m, C35, fy460, BS 8110" },
    { name: "T-Beam",           text: "Design a T-beam, 6m span, web 300x500mm, flange 900x150mm, Gk=15kN/m, C35, BS 8110" },
  ],
  Column: [
    { name: "Axially Loaded",   text: "Design an axially loaded RC column, 300x300mm, 3.5m height, N=1500kN, C35, BS 8110" },
    { name: "Uniaxial Bending", text: "Design an RC column, 300x400mm, 3.5m, N=1200kN, Mx=80kNm, C35, fy460, BS 8110" },
    { name: "Biaxial Bending",  text: "Biaxial RC column, 350x350mm, N=900kN, Mx=60kNm, My=45kNm, C35, BS 8110" },
    { name: "Slender Column",   text: "Slender RC column, 250x250mm, 6m effective height, N=600kN, C35, BS 8110" },
  ],
  Foundation: [
    { name: "Isolated Pad",     text: "Isolated pad foundation, soil 150kN/m2, column N=1200kN, depth 1.5m, C35" },
    { name: "Strip Foundation", text: "Strip foundation, wall load 120kN/m, soil 100kN/m2, depth 1.0m, C35, BS 8004" },
    { name: "Raft Foundation",  text: "Raft foundation, 12x8m, UDL 60kN/m2, soil 80kN/m2, C35, BS 8004" },
    { name: "Pile Cap",         text: "Pile cap for 4 piles, column N=2400kN, pile diam 450mm, C35" },
  ],
  Ancillaries: [
    { name: "Retaining Wall",  text: "Cantilever retaining wall, retained height 3m, soil unit wt 18kN/m3, phi=30 deg" },
    { name: "Shear Wall",      text: "RC shear wall, 200mm thick, 3m wide, 3m high, lateral load 150kN, C35" },
    { name: "Staircase",       text: "RC staircase, 3.3m floor height, 175mm risers, 250mm treads, Qk=4kN/m2, C35" },
    { name: "Water Tank",      text: "RC water tank, 4x3x2m, C35, fy460, BS 8007" },
  ],
};

const DEFAULT_PROMPTS = [
  { name: "RC Slab",    text: "Design a solid two-way RC slab, 4mx5m, 175mm thick, Gk=5kN/m2, Qk=3kN/m2, C35, fy460, BS 8110" },
  { name: "RC Beam",    text: "Design a simply supported RC beam, 6m span, 300x500mm, Gk=15kN/m, Qk=10kN/m, C35, fy460, BS 8110" },
  { name: "RC Column",  text: "Design an axially loaded RC column, 300x300mm, 3.5m height, N=1500kN, C35, fy460, BS 8110" },
  { name: "Foundation", text: "Design an isolated pad foundation, soil 150kN/m2, column N=1200kN, depth 1.5m, C35, BS 8004" },
];

`;

if (OLD_PROMPTS_RE.test(content)) {
  content = content.replace(OLD_PROMPTS_RE, NEW_DATA);
  console.log("1. Replaced RC_PROMPTS block");
} else {
  // fallback - insert before "// Phase step IDs"
  const FALLBACK = "// Phase step IDs";
  const idx = content.indexOf(FALLBACK);
  if (idx === -1) { console.error("ERROR: Cannot find insertion point"); process.exit(1); }
  content = content.slice(0, idx) + NEW_DATA + content.slice(idx);
  console.log("1. Inserted data block (fallback)");
}

// 2. Add picker state
const STATE_OLD = `  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<Phase>(1);`;
const STATE_NEW = `  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<Phase>(1);
  const [pickerState, setPickerState] = useState<"elements" | "subtypes" | "chat">("elements");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);`;
content = content.replace(STATE_OLD, STATE_NEW);
console.log("2. Picker state added:", content.includes("pickerState"));

// 3. Transition picker on send
const SEND_OLD = `    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    addMessage({ role: "user", content: text });`;
const SEND_NEW = `    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setPickerState("chat");
    addMessage({ role: "user", content: text });`;
content = content.replace(SEND_OLD, SEND_NEW);
console.log("3. handleSend patched:", content.includes(`setPickerState("chat")`));

// 4. Inject picker UI
const MSGS_MARKER = `            {messages.map((m) => {`;
const PICKER = `            {/* Element picker */}
            {pickerState === "elements" && messages.length === 0 && (
              <div className="ai-msg">
                <div className="ai-av ag">
                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
                    <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.2"/>
                    <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                    <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                    <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                  </svg>
                </div>
                <div className="bbl ag" style={{ maxWidth: "96%", padding: "10px 10px 8px" }}>
                  <div style={{ fontFamily: "var(--ui)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                    Welcome to <strong>RC Elements Suite</strong>.<br/>
                    Select an element type to design:
                  </div>
                  {RC_ELEMENTS.map(el => (
                    <div
                      key={el.id}
                      className="elem-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedElement(el.id); setPickerState("subtypes"); }}
                      onKeyDown={e => { if (e.key === "Enter") { setSelectedElement(el.id); setPickerState("subtypes"); } }}
                    >
                      <div className="elem-card-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blu)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          {el.id === "Slab"       && <rect x="2" y="9" width="20" height="6" rx="1"/>}
                          {el.id === "Beam"       && <><rect x="2" y="8" width="20" height="8" rx="1"/><line x1="6" y1="4" x2="6" y2="8"/><line x1="18" y1="4" x2="18" y2="8"/><line x1="6" y1="4" x2="18" y2="4"/></>}
                          {el.id === "Column"     && <><rect x="8" y="2" width="8" height="20" rx="1"/><line x1="5" y1="2" x2="19" y2="2"/><line x1="5" y1="22" x2="19" y2="22"/></>}
                          {el.id === "Foundation" && <><line x1="10" y1="3" x2="10" y2="12"/><rect x="4" y="12" width="16" height="6" rx="1"/><line x1="1" y1="20" x2="23" y2="20"/><line x1="3" y1="22" x2="6" y2="20"/><line x1="8" y1="22" x2="11" y2="20"/><line x1="13" y1="22" x2="16" y2="20"/><line x1="18" y1="22" x2="21" y2="20"/></>}
                          {el.id === "Ancillaries"&& <><line x1="8" y1="3" x2="8" y2="21"/><rect x="5" y="18" width="14" height="3" rx="1"/><line x1="8" y1="7" x2="18" y2="7"/><line x1="8" y1="11" x2="18" y2="11"/><line x1="8" y1="15" x2="18" y2="15"/></>}
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 1 }}>{el.id}</div>
                        <div style={{ fontSize: 10, color: "var(--mut)", fontFamily: "var(--mono)" }}>{el.sub}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--blu)" strokeWidth="1.8"><path d="M3 7h8M7 3l4 4-4 4"/></svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-element picker */}
            {pickerState === "subtypes" && selectedElement && messages.length === 0 && (
              <div className="ai-msg">
                <div className="ai-av ag">
                  <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="23" fill="#1a4a8a"/>
                    <rect x="13" y="12" width="22" height="17" rx="4" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.2"/>
                    <rect x="16" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                    <rect x="26" y="17" width="6" height="4" rx="1.5" fill="#c8960c"/>
                    <rect x="11" y="32" width="26" height="10" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                  </svg>
                </div>
                <div className="bbl ag" style={{ maxWidth: "96%", padding: "10px 10px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--blu)", letterSpacing: ".5px", textTransform: "uppercase" }}>
                      {selectedElement} Types
                    </div>
                    <button
                      onClick={() => { setPickerState("elements"); setSelectedElement(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)", padding: "2px 6px", borderRadius: 4, textDecoration: "underline" }}
                    >
                      Back
                    </button>
                  </div>
                  {(ELEMENT_SUBTYPES[selectedElement] ?? []).map(sub => (
                    <div
                      key={sub.name}
                      className="elem-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => { setInput(sub.prompt); setTimeout(() => void handleSend(), 0); }}
                      onKeyDown={e => { if (e.key === "Enter") { setInput(sub.prompt); setTimeout(() => void handleSend(), 0); } }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 1 }}>{sub.name}</div>
                        <div style={{ fontSize: 10, color: "var(--mut)", fontFamily: "var(--mono)" }}>{sub.desc}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--blu)" strokeWidth="1.8"><path d="M3 7h8M7 3l4 4-4 4"/></svg>
                    </div>
                  ))}
                  <div style={{ padding: "6px 2px 2px" }}>
                    <div
                      style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)", cursor: "pointer", textDecoration: "underline" }}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPickerState("chat")}
                      onKeyDown={e => { if (e.key === "Enter") setPickerState("chat"); }}
                    >
                      Or describe in your own words
                    </div>
                  </div>
                </div>
              </div>
            )}

`;
const markerIdx = content.indexOf(MSGS_MARKER);
if (markerIdx === -1) {
  const chatIdx = content.indexOf("{/* messages */}");
  console.error("ERROR: messages marker not found. Nearby:", content.substring(Math.max(0,chatIdx-5), chatIdx+80));
  process.exit(1);
}
content = content.slice(0, markerIdx) + PICKER + content.slice(markerIdx);
console.log("4. Picker UI injected");

// 5. Replace right panel static prompts
content = content.replace(
  /\{RC_PROMPTS\.map\(p => \(/,
  "{(selectedElement ? (ELEMENT_PROMPTS[selectedElement] ?? DEFAULT_PROMPTS) : DEFAULT_PROMPTS).map(p => ("
);
console.log("5. Right panel prompts updated:", content.includes("ELEMENT_PROMPTS[selectedElement]"));

// 6. Update header
content = content.replace(
  ">Prompt Examples</div>",
  ">{selectedElement ? selectedElement + \" Prompts\" : \"Prompt Examples\"}</div>"
);
console.log("6. Header updated:", content.includes('selectedElement + " Prompts"'));

if (hasCRLF) content = content.replace(/\n/g, "\r\n");
fs.writeFileSync(filePath, content, "utf8");
console.log("\nDone!");
