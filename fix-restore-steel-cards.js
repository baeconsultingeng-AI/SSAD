const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "frontend/src/components/workspace/SteelChatPanel.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Replace the empty-state text with elem-cards for Steel sections
const re = /\{messages\.length === 0 && \(\s*<div[^>]*>\s*<div[^>]*>\s*Ready to design in steel\s*<\/div>\s*<div[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

if (!re.test(content)) {
  console.error("Regex did not match in SteelChatPanel. Showing context:");
  const pos = content.indexOf("Ready to design in steel");
  if (pos !== -1) console.log(JSON.stringify(content.slice(pos - 150, pos + 300)));
  else console.log("'Ready to design in steel' not found either");
  process.exit(1);
}

const STEEL_ICONS = {
  "UB Beam":  `<><rect x="2" y="10" width="20" height="3" rx=".5"/><rect x="5" y="6" width="14" height="2" rx=".5" fill="var(--blu)"/><rect x="5" y="16" width="14" height="2" rx=".5" fill="var(--blu)"/></>`,
  "UC Column":`<><rect x="9" y="2" width="6" height="20" rx=".5"/><rect x="5" y="2" width="14" height="3" rx=".5" fill="var(--blu)"/><rect x="5" y="19" width="14" height="3" rx=".5" fill="var(--blu)"/></>`,
  "RHS/SHS":  `<rect x="3" y="5" width="18" height="14" rx="1.5" strokeWidth="2"/>`,
  "CHS":      `<circle cx="12" cy="12" r="9" strokeWidth="2"/>`,
  "Truss":    `<><line x1="2" y1="18" x2="22" y2="18"/><line x1="2" y1="18" x2="12" y2="6"/><line x1="22" y1="18" x2="12" y2="6"/><line x1="7" y1="18" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="6"/><line x1="17" y1="18" x2="12" y2="6"/></>`,
};

const NEW = `{messages.length === 0 && !selectedElement && (
              <div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "var(--mut)", marginBottom: 12, lineHeight: 1.6 }}>
                  Welcome to <strong>Steel Design Suite</strong>. Select a section type to begin:
                </div>
                {STEEL_ELEMENTS.map(el => (
                  <div
                    key={el.id}
                    className="elem-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedElement(el.id); setPickerState("subtypes"); }}
                    onKeyDown={e => { if (e.key === "Enter") { setSelectedElement(el.id); setPickerState("subtypes"); } }}
                    style={{ marginBottom: 6 }}
                  >
                    <div className="elem-card-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blu)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {el.id === "UB Beam"   && <><rect x="2" y="10" width="20" height="3" rx=".5"/><rect x="5" y="6" width="14" height="2" rx=".5"/><rect x="5" y="16" width="14" height="2" rx=".5"/></>}
                        {el.id === "UC Column" && <><rect x="9" y="2" width="6" height="20" rx=".5"/><rect x="5" y="2" width="14" height="3" rx=".5"/><rect x="5" y="19" width="14" height="3" rx=".5"/></>}
                        {el.id === "RHS/SHS"   && <rect x="3" y="5" width="18" height="14" rx="1.5" strokeWidth="2"/>}
                        {el.id === "CHS"       && <circle cx="12" cy="12" r="9" strokeWidth="2"/>}
                        {el.id === "Truss"     && <><line x1="2" y1="18" x2="22" y2="18"/><line x1="2" y1="18" x2="12" y2="6"/><line x1="22" y1="18" x2="12" y2="6"/><line x1="7" y1="18" x2="12" y2="6"/><line x1="17" y1="18" x2="12" y2="6"/></>}
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
            )}
            {messages.length === 0 && selectedElement && (
              <div style={{ textAlign: "center", padding: "24px 16px 8px" }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>
                  {selectedElement} selected
                </div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: "var(--mut)", lineHeight: 1.6 }}>
                  Pick a member type from the list above — or describe your steel element in your own words below.
                </div>
              </div>
            )}`;

content = content.replace(re, NEW);

fs.writeFileSync(filePath, content, "utf8");
console.log("Done — Steel elem-cards restored successfully.");
