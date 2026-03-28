const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "frontend", "src", "components", "workspace", "WorkspaceScreen.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Remove the PRO badge block on Steel card (the one right after the Steel card opening div)
// It's a single line block:  {effectiveTier === "guest" && ( <span ...>PRO</span> )}
const proBadgeRe = /\s*\{effectiveTier === "guest" && \(\s*\n\s*<span[^>]+>PRO<\/span>\s*\n\s*\)\}/;
const before = content.includes('effectiveTier === "guest" && (');
content = content.replace(proBadgeRe, "");
const after = content.includes('effectiveTier === "guest" && (');

// Also remove opacity: isLocked ? .5 for elem-card  stays as is (in AIChatPanel, isLocked=false so it renders 1)
// Check if 0.55 is still in WorkspaceScreen
console.log("PRO badge was present:", before);
console.log("PRO badge still present after fix:", after);
console.log("0.55 in file:", content.includes("0.55"));
// Show context around 0.55 if present
const idx = content.indexOf("0.55");
if (idx !== -1) console.log("Context:", content.slice(idx - 60, idx + 60));

fs.writeFileSync(filePath, content, "utf8");
console.log("Done");
