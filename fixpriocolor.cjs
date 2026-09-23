const fs = require('fs');
const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

const oldStr = '<span style={isPrio ? { fontWeight: 700 } : {}}>{name}</span>';
const newStr = '<span style={isPrio ? { fontWeight: 700, background: "#FFD70055", padding: "1px 5px", borderRadius: "4px" } : {}}>{name}</span>';

c = c.split(oldStr).join(newStr);

if (c === before) {
  console.log('GEEN WIJZIGING - niets gevonden');
} else {
  fs.writeFileSync(p, c);
  console.log('klaar');
}