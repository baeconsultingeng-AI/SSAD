const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "frontend", "src", "components", "workspace", "WorkspaceScreen.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Fix 1: Remove guest check from onClick
content = content.replace(
  /onClick=\{\(\) => effectiveTier === "guest" \? goScreen\("upgrade"\) : goScreen\("ai"\)\}/,
  'onClick={() => goScreen("ai")}'
);

// Fix 2: Remove opacity reduction for guest
content = content.replace(
  /opacity: effectiveTier === "guest" \? 0\.55 : 1, position: "relative"/,
  'position: "relative"'
);

// Fix 3: Remove PRO badge block for Steel card
// Match the entire conditional block
content = content.replace(
  /\s*\{effectiveTier === "guest" && \(\s*<span style=\{\{ position: "absolute", top: 14, right: 14[\s\S]*?<\/span>\s*\)\}\}/,
  ""
);

// Fix 4: "Locked"/"Open" label → always "Open"
content = content.replace(
  /\{effectiveTier === "guest" \? "Locked" : "Open"\}/,
  '"Open"'
);

// Fix 5: Arrow stroke always gold
content = content.replace(
  /stroke=\{effectiveTier === "guest" \? "rgba\(255,255,255,\.3\)" : "rgba\(200,150,12,\.8\)"\}/,
  'stroke="rgba(200,150,12,.8)"'
);

// Fix 6: Label colour always gold
content = content.replace(
  /color: effectiveTier === "guest" \? "rgba\(255,255,255,\.35\)" : "rgba\(200,150,12,\.8\)"/,
  'color: "rgba(200,150,12,.8)"'
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Done. Steel card fully unlocked.");
