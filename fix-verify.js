const fs = require("fs");
const c = fs.readFileSync("frontend/src/components/workspace/WorkspaceScreen.tsx", "utf8");
console.log("upgrade in onClick:", c.includes('effectiveTier === "guest" ? goScreen("upgrade")'));
console.log("opacity 0.55 present:", c.includes("0.55"));
console.log("PRO badge present:", c.includes('effectiveTier === "guest" && ('));
console.log('Locked text present:', c.includes('"Locked"'));
console.log("goScreen ai direct:", c.includes('onClick={() => goScreen("ai")}'));
