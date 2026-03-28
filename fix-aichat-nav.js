const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "frontend/src/components/workspace/AIChatPanel.tsx");
let content = fs.readFileSync(filePath, "utf8");

// ─── 1. INSERT persistent nav section before {/* Chat messages */} ──────────
const INSERT_MARKER = "          {/* Chat messages */}";
const insertPos = content.indexOf(INSERT_MARKER);
if (insertPos === -1) throw new Error("Insert marker not found: " + INSERT_MARKER);

const NAV_SECTION = `          {/* ── Persistent Element Navigation ── */}
          <div style={{ flexShrink: 0, background: "#e8e2d9", borderBottom: "1px solid #ddd8cf" }}>
            {/* Element pills row */}
            <div style={{ display: "flex", gap: 5, padding: "8px 14px 5px", overflowX: "auto", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "rgba(26,74,138,.55)", letterSpacing: ".6px", flexShrink: 0, marginRight: 4, fontWeight: 700, textTransform: "uppercase" }}>Element:</span>
              {RC_ELEMENTS.map(el => (
                <button
                  key={el.id}
                  onClick={() => { setSelectedElement(el.id); setPickerState("subtypes"); }}
                  style={{
                    fontFamily: "var(--mono)", fontSize: 9,
                    fontWeight: selectedElement === el.id ? 700 : 500,
                    padding: "4px 11px", borderRadius: 20, cursor: "pointer", flexShrink: 0,
                    border: selectedElement === el.id
                      ? "1px solid rgba(200,150,12,.8)"
                      : "1px solid rgba(26,74,138,.28)",
                    background: selectedElement === el.id
                      ? "rgba(200,150,12,.16)"
                      : "rgba(26,74,138,.07)",
                    color: selectedElement === el.id ? "#c8960c" : "rgba(26,74,138,.75)",
                    transition: "all .18s",
                  }}
                >
                  {el.id}
                </button>
              ))}
              {selectedElement && (
                <button
                  onClick={() => { setSelectedElement(null); setPickerState("elements"); }}
                  style={{ fontFamily: "var(--mono)", fontSize: 8, padding: "3px 8px", marginLeft: 4, borderRadius: 20, cursor: "pointer", border: "1px solid rgba(200,150,12,.25)", background: "none", color: "rgba(200,150,12,.6)", flexShrink: 0 }}
                >× clear</button>
              )}
            </div>

            {/* Subtype cards for selected element — always visible */}
            {selectedElement && (
              <div style={{ padding: "0 14px 10px", display: "flex", flexDirection: "column", gap: 5, maxHeight: 230, overflowY: "auto" }}>
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
                      <div style={{ fontFamily: "var(--ser)", fontSize: 12, fontWeight: 700, color: "var(--txt)", marginBottom: 1 }}>{sub.name}</div>
                      <div style={{ fontSize: 10, color: "var(--mut)", fontFamily: "var(--mono)" }}>{sub.desc}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--blu)" strokeWidth="1.8"><path d="M3 7h8M7 3l4 4-4 4"/></svg>
                  </div>
                ))}
                <div style={{ padding: "4px 2px 0", fontFamily: "var(--mono)", fontSize: 9, color: "var(--mut)" }}>
                  Or describe in your own words below ↓
                </div>
              </div>
            )}
          </div>

`;

content = content.slice(0, insertPos) + NAV_SECTION + content.slice(insertPos);

// ─── 2. REMOVE old element picker chat-bubble ─────────────────────────────
const PICKER_START = "            {/* Element picker */}";
const MESSAGES_MAP  = "            {messages.map((m) => {";

const pickerStart = content.indexOf(PICKER_START);
const messagesMap = content.indexOf(MESSAGES_MAP);

if (pickerStart === -1) throw new Error("Element picker start not found");
if (messagesMap === -1) throw new Error("messages.map not found");
if (pickerStart > messagesMap) throw new Error("Picker start is after messages.map — file may have changed");

content = content.slice(0, pickerStart) + content.slice(messagesMap);

// ─── 3. UPDATE empty-state text ──────────────────────────────────────────
content = content.replace(
  "Describe your structural element",
  "Ready to design"
);
content = content.replace(
  "Use plain English — e.g. &ldquo;Design a 175mm simply-supported slab spanning 4.5m with 1.5 kPa imposed load&rdquo;",
  "Choose an element type above, pick a sub-type — or describe your element freely in the box below."
);

fs.writeFileSync(filePath, content, "utf8");
console.log("AIChatPanel: persistent nav inserted, old pickers removed.");
console.log("Nav insert pos:", insertPos);
console.log("Picker removal: from", pickerStart, "to", messagesMap);
