const fs = require('fs');
const f = 'c:/Users/MacBook/Desktop/BaeSoftIA/SSAD/frontend/src/components/workspace/WorkspaceScreen.tsx';
let c = fs.readFileSync(f, 'utf8');

// Remove the entire right-side div (tier pill + upgrade button) from welcome banner
const start = c.indexOf('\n              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>');
const end = c.indexOf('\n            </div>\n\n            {/* Workflow steps');
if (start < 0 || end < 0) { console.error('Anchors not found', start, end); process.exit(1); }

c = c.slice(0, start) + c.slice(end);
fs.writeFileSync(f, c, 'utf8');
console.log('Tier pill + upgrade button removed:', !c.includes('UPGRADE') && !c.includes('tierLabel'));
