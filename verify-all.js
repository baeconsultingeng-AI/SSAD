const fs = require("fs");
const ac = fs.readFileSync("frontend/src/components/workspace/AIChatPanel.tsx", "utf8");
const sc = fs.readFileSync("frontend/src/components/workspace/SteelChatPanel.tsx", "utf8");
const ws = fs.readFileSync("frontend/src/components/workspace/WorkspaceScreen.tsx", "utf8");

console.log("=== AIChatPanel ===");
console.log("Persistent nav:", ac.includes("Persistent Element Navigation"));
console.log("Old picker gone:", !ac.includes("messages.length === 0 && ("));
console.log("ELEMENT pill label:", ac.includes("ELEMENT:"));

console.log("=== SteelChatPanel ===");
console.log("STEEL_ELEMENTS:", sc.includes("STEEL_ELEMENTS"));
console.log("Steel header:", sc.includes("Steel Design Assistant"));
console.log("BS 5950:", sc.includes("BS 5950-1"));

console.log("=== WorkspaceScreen ===");
console.log("SteelChatPanel imported:", ws.includes("import SteelChatPanel"));
console.log("steel screen route:", ws.includes('screen === "steel"'));
console.log("Steel goScreen(steel):", ws.includes('goScreen("steel")'));
