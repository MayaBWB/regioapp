const fs = require('fs');

const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

const oldStr = [
  '<Tooltip permanent direction="top" className="sticky-note">',
  '                  <span style={{ display: "inline-block", transform: `scale(${Math.min(1.2, Math.max(0.55, (zoom- 6) / 5))})` }}>',
  '                    {n.text}',
  '                  </span>',
  '                </Tooltip>'
].join('\n');

const newStr = [
  '<Tooltip permanent direction="top" className="sticky-note-wrap">',
  '                  <div',
  '                    className="sticky-note"',
  '                    style={{ transform: `scale(${Math.min(1.2, Math.max(0.55, (zoom - 6) / 5))})` }}',
  '                  >',
  '                    {n.text}',
  '                  </div>',
  '                </Tooltip>'
].join('\n');

c = c.split(oldStr).join(newStr);

if (c === before) {
  console.log('GEEN WIJZIGING - nog steeds niet gevonden');
} else {
  fs.writeFileSync(p, c);
  console.log('App.jsx aangepast');
}