const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "frontend/src/components/workspace/AIChatPanel.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Replace the empty-state placeholder (just text) with proper element cards
const OLD = `            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontFamily: "var(--ser)", fontSize: 18, fontWeight: 700, color: "var(--txt)", marginBottom: 8 }}>
                  Ready to design
                </div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>
                  Choose an element type above, pick a sub-type — or describe your element freely in the box below.
                </div>
              </div>
            )}`;

const NEW = `            {messages.length === 0 && !selectedElement && (
              <div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: "var(--mut)", marginBottom: 12, lineHeight: 1.6 }}>
                  Welcome to <strong>RC Elements Suite</strong>. Select an element type to begin:
                </div>
                {RC_ELEMENTS.map(el => (
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
                        {el.id === "Slab"        && <rect x="2" y="9" width="20" height="6" rx="1"/>}
                        {el.id === "Beam"        && <><rect x="2" y="8" width="20" height="8" rx="1"/><line x1="6" y1="4" x2="6" y2="8"/><line x1="18" y1="4" x2="18" y2="8"/><line x1="6" y1="4" x2="18" y2="4"/></>}
                        {el.id === "Column"      && <><rect x="8" y="2" width="8" height="20" rx="1"/><line x1="5" y1="2" x2="19" y2="2"/><line x1="5" y1="22" x2="19" y2="22"/></>}
                        {el.id === "Foundation"  && <><line x1="10" y1="3" x2="10" y2="12"/><rect x="4" y="12" width="16" height="6" rx="1"/><line x1="1" y1="20" x2="23" y2="20"/><line x1="3" y1="22" x2="6" y2="20"/><line x1="8" y1="22" x2="11" y2="20"/><line x1="13" y1="22" x2="16" y2="20"/><line x1="18" y1="22" x2="21" y2="20"/></>}
                        {el.id === "Ancillaries" && <><line x1="8" y1="3" x2="8" y2="21"/><rect x="5" y="18" width="14" height="3" rx="1"/><line x1="8" y1="7" x2="18" y2="7"/><line x1="8" y1="11" x2="18" y2="11"/><line x1="8" y1="15" x2="18" y2="15"/></>}
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
                  Pick a sub-type from the list above — or describe your element in your own words below.
                </div>
              </div>
            )}`;

const idx = content.indexOf(OLD);
if (idx === -1) {
  console.error("OLD string not found — dumping nearby context:");
  const marker = "messages.length === 0 && (";
  const pos = content.indexOf(marker);
  console.log("marker position:", pos);
  if (pos !== -1) console.log(content.slice(pos - 10, pos + 400));
  process.exit(1);
}

content = content.slice(0, idx) + NEW + content.slice(idx + OLD.length);

fs.writeFileSync(filePath, content, "utf8");
console.log("Done — elem-cards restored in main chat area.");
