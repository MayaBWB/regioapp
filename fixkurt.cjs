const fs = require('fs');
const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

c = c.split('"Kurt M."').join('"Kurt Moonen"');

if (c === before) {
  console.log('GEEN WIJZIGING - Kurt M. niet gevonden in App.jsx');
} else {
  fs.writeFileSync(p, c);
  console.log('klaar - iconen hernoemd naar Kurt Moonen');
}