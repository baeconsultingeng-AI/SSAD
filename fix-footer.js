const fs = require('fs');
const f = 'c:/Users/MacBook/Desktop/BaeSoftIA/SSAD/frontend/src/components/workspace/WorkspaceScreen.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. Remove BAE CONSULTING footer from the marketing panel
c = c.replace(/\s*\{\/\* footer \*\/\}\s*<div[^>]*marginTop[^>]*>\s*<div[^>]*>BAE CONSULTING ENGINEERS[^<]*<\/div>\s*<\/div>/g, '');

// 2. Add copyright footer to the left column
const year = new Date().getFullYear();
const anchor = '        </div>{/* /inner padding */}';
const footerHtml = [
  '',
  '        {/* ── Footer ── */}',
  '        <div style={{ padding: "12px 32px", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>',
  '          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.22)", letterSpacing: ".3px" }}>',
  '            \u00a9 ' + year + ' BAE Consulting Engineers. All rights reserved.',
  '          </span>',
  '          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(200,150,12,.35)", letterSpacing: ".3px" }}>',
  '            v0.1.0-beta',
  '          </span>',
  '        </div>',
].join('\n');

const idx = c.indexOf(anchor);
if (idx < 0) { console.error('Anchor not found'); process.exit(1); }
c = c.slice(0, idx + anchor.length) +'\n' + footerHtml + '\n' + c.slice(idx + anchor.length);

fs.writeFileSync(f, c, 'utf8');
console.log('Footer added:', c.includes('BAE Consulting Engineers. All rights reserved'));
console.log('Old BAE removed:', !c.includes('MIStructE'));
