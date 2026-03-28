const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "frontend/src/components/workspace/WorkspaceScreen.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add SteelChatPanel import after AIChatPanel import
content = content.replace(
  'import AIChatPanel from "@/components/workspace/AIChatPanel";',
  'import AIChatPanel from "@/components/workspace/AIChatPanel";\nimport SteelChatPanel from "@/components/workspace/SteelChatPanel";'
);

// 2. Add steel screen route after the "ai" route
content = content.replace(
  'if (screen === "ai")             content = <AIChatPanel />;',
  'if (screen === "ai")             content = <AIChatPanel />;\n  else if (screen === "steel")          content = <SteelChatPanel />;'
);

// 3. Fix Steel card onClick: goScreen("ai") -> goScreen("steel")
// We need to target only the Steel card onClick, not the RC card one.
// The Steel card has a unique marker: position: "relative" on the same style object
content = content.replace(
  '                onClick={() => goScreen("ai")}\n                style={{\n                  background: "rgba(255,255,255,.055)", backdropFilter: "blur(10px)",\n                  border: "1px solid rgba(200,150,12,.28)", borderRadius: 18,\n                  padding: "22px 22px", cursor: "pointer", transition: "all .22s",\n                  position: "relative",\n                }}',
  '                onClick={() => goScreen("steel")}\n                style={{\n                  background: "rgba(255,255,255,.055)", backdropFilter: "blur(10px)",\n                  border: "1px solid rgba(200,150,12,.28)", borderRadius: 18,\n                  padding: "22px 22px", cursor: "pointer", transition: "all .22s",\n                  position: "relative",\n                }}'
);

// 4. Fix the "Open" text bug (has extra quotes: "Open" instead of Open)
content = content.replace(
  '"Open"\n                    </span>',
  'Open\n                    </span>'
);

fs.writeFileSync(filePath, content, "utf8");
console.log("WorkspaceScreen updated.");
console.log("SteelChatPanel import added:", content.includes('import SteelChatPanel'));
console.log("steel screen route added:", content.includes('screen === "steel"'));
console.log('Steel card onClick steel:', content.includes('goScreen("steel")'));
console.log('"Open" bug fixed:', !content.includes('"Open"\n'));
