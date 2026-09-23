const fs = require('fs');

const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

const pattern = /<Tooltip permanent direction="top" className="sticky-note">\s*<span style=\{\{ display: "inline-block", transform: `scale\(\$\{Math\.min\(1\.2,\s*Math\.max\(0\.55, \(zoom\s*-\s*6\) \/ 5\)\)\}\)`\s*\}\}>\s*\{n\.text\}\s*<\/span>\s*<\/Tooltip>/;

const replacement = '<Tooltip permanent direction="top" className="sticky-note-wrap">\n' +
'                  <div\n' +
'                    className="sticky-note"\n' +
'                    style={{ transform: `scale(${Math.min(1.2, Math.max(0.55, (zoom - 6) / 5))})` }}\n' +
'                  >\n' +
'                    {n.text}\n' +
'                  </div>\n' +
'                </Tooltip>';

if (pattern.test(c)) {
  c = c.replace(pattern, replacement);
  fs.writeFileSync(p, c);
  console.log('App.jsx aangepast');
} else {
  console.log('GEEN WIJZIGING - patroon niet gevonden, stuur de laatste JSON.stringify-uitvoer opnieuw door');
}