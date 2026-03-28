const fs = require('fs');
const f = 'c:/Users/MacBook/Desktop/BaeSoftIA/SSAD/frontend/src/components/workspace/WorkspaceScreen.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. Marketing panel feature text
c = c.replace('Deterministic BS 8110 / BS 5950 engine', 'Deterministic code-based calculation engine');

// 2. Marketing panel tagline
c = c.replace('runs BS 8110 calculations', 'runs code-based calculations');

// 3. Remove tier pill div from welcome banner
// Find and cut the entire right-side flex div containing tier pill (and possibly upgrade button)
const tierDivStart = c.indexOf('\n              <div style={{ display: "flex", alignItems: "center", gap: 10');
if (tierDivStart > 0) {
  // Find the matching closing </div> by tracking depth
  let depth = 0, i = tierDivStart + 1, found = -1;
  while (i < c.length) {
    if (c[i] === '<') {
      if (c[i+1] === '/') { if (depth === 0) { found = i; break; } depth--; }
      else if (c[i+1] !== '!' && c[i+1] !== '?') depth++;
    }
    i++;
  }
  if (found > 0) {
    // include the closing </div>\n
    const endTag = c.indexOf('>', found) + 1;
    c = c.slice(0, tierDivStart) + c.slice(endTag);
    console.log('Tier pill div removed');
  } else {
    console.log('Could not find closing div');
  }
} else {
  console.log('Tier pill anchor not found — may already be removed');
}

fs.writeFileSync(f, c, 'utf8');
console.log('Deterministic new:', c.includes('Deterministic code-based calculation engine'));
console.log('runs code-based:', c.includes('runs code-based calculations'));
console.log('tierLabel gone:', !c.includes('tierLabel'));
