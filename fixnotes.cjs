const fs = require('fs');

// 1. nieuw databestand met de notitie
fs.writeFileSync('src/data/notes.json', JSON.stringify([
  { postcode: "2870", text: "Maarten 16/09", expires: "2026-09-16" }
]));
if (!fs.existsSync('src/data/notes-alkmaar.json')) {
  fs.writeFileSync('src/data/notes-alkmaar.json', JSON.stringify([]));
}
console.log('notes.json aangemaakt');

// 2. App.jsx aanpassen
const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

// import toevoegen
c = c.replace(
  'import postcodeNames from "./data/postcode-names.json";',
  'import postcodeNames from "./data/postcode-names.json";\nimport notesData from "./data/notes.json";'
);
c = c.replace(
  'import postcodeNamesAlkmaar from "./data/postcode-names-alkmaar.json";',
  'import postcodeNamesAlkmaar from "./data/postcode-names-alkmaar.json";\nimport notesDataAlkmaar from "./data/notes-alkmaar.json";'
);

// notes toevoegen aan elk departement-object (na postcodeNames: regel)
c = c.replace(
  'postcodeNames,\n    storageKey: "advisor-postcode-overrides",',
  'postcodeNames,\n    notes: notesData,\n    storageKey: "advisor-postcode-overrides",'
);
c = c.replace(
  'postcodeNames: postcodeNamesAlkmaar,\n    storageKey: "advisor-postcode-overrides-alkmaar",',
  'postcodeNames: postcodeNamesAlkmaar,\n    notes: notesDataAlkmaar,\n    storageKey: "advisor-postcode-overrides-alkmaar",'
);

// destructuren in DeptMap
c = c.replace(
  'storageKey, firebasePath, center, zoom: initialZoom, icons,\n  } = config;',
  'storageKey, firebasePath, center, zoom: initialZoom, icons, notes,\n  } = config;'
);

// actieve (niet-verlopen) notities berekenen
c = c.replace(
  'const showPostcodeLabels = zoom >= 10;',
  `const activeNotes = useMemo(() => {
    const today = new Date();
    return (notes || []).filter((n) => new Date(n.expires) >= today);
  }, [notes]);

  const showPostcodeLabels = zoom >= 10;`
);

// de post-its op de kaart tekenen (na de postcodeLabels-laag)
c = c.replace(
  `          {showPostcodeLabels &&
            postcodeLabels.map(({ pc, lat, lng }) => (
              <CircleMarker key={"pc-" + pc} center={[lat, lng]} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="center" className="postcode-label">{pc}</Tooltip>
              </CircleMarker>
            ))}`,
  `          {showPostcodeLabels &&
            postcodeLabels.map(({ pc, lat, lng }) => (
              <CircleMarker key={"pc-" + pc} center={[lat, lng]} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="center" className="postcode-label">{pc}</Tooltip>
              </CircleMarker>
            ))}

          {activeNotes.map((n) => {
            const c = postcodeToCentroid[n.postcode];
            if (!c) return null;
            return (
              <CircleMarker key={"note-" + n.postcode} center={c} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="top" className="sticky-note">{n.text}</Tooltip>
              </CircleMarker>
            );
          })}`
);

if (c === before) {
  console.log('GEEN WIJZIGING in App.jsx - controleer handmatig, geef me dan de betreffende regels');
} else {
  fs.writeFileSync(p, c);
  console.log('App.jsx aangepast');
}

// 3. CSS voor het gele post-it-uiterlijk
const cssPath = 'src/App.css';
let css = fs.readFileSync(cssPath, 'utf8');
css += `

.sticky-note {
  background: #fff7a8 !important;
  border: 1px solid #e6d94a !important;
  box-shadow: 1px 2px 4px rgba(0,0,0,0.25) !important;
  color: #4a3f00 !important;
  font-size: 11px !important;
  font-weight: 600;
  padding: 4px 7px !important;
  border-radius: 2px;
  transform: rotate(-2deg);
}
.sticky-note::before {
  border-top-color: #e6d94a !important;
}
`;
fs.writeFileSync(cssPath, css);
console.log('CSS toegevoegd');