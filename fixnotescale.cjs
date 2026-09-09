const fs = require('fs');
const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

const oldStr = `<CircleMarker key={"note-" + n.postcode} center={c} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="top" className="sticky-note">{n.text}</Tooltip>
              </CircleMarker>`;

const newStr = `<CircleMarker key={"note-" + n.postcode} center={c} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="top" className="sticky-note">
                  <span style={{ display: "inline-block", transform: \`scale(\${Math.min(1.2, Math.max(0.55, (zoom - 6) / 5))})\` }}>
                    {n.text}
                  </span>
                </Tooltip>
              </CircleMarker>`;

c = c.split(oldStr).join(newStr);

if (c === before) {
  console.log('GEEN WIJZIGING - niets gevonden');
} else {
  fs.writeFileSync(p, c);
  console.log('klaar');
}