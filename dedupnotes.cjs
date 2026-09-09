const fs = require('fs');
const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

// dubbele imports weg
c = c.replace(
  'import notesData from "./data/notes.json";\nimport notesData from "./data/notes.json";',
  'import notesData from "./data/notes.json";'
);
c = c.replace(
  'import notesDataAlkmaar from "./data/notes-alkmaar.json";\nimport notesDataAlkmaar from "./data/notes-alkmaar.json";',
  'import notesDataAlkmaar from "./data/notes-alkmaar.json";'
);

// dubbele notes: regel in de departement-configs weg
c = c.replace(
  'notes: notesData,\n    notes: notesData,',
  'notes: notesData,'
);
c = c.replace(
  'notes: notesDataAlkmaar,\n    notes: notesDataAlkmaar,',
  'notes: notesDataAlkmaar,'
);

// dubbele notes in de destructuring weg
c = c.replace(
  'icons, notes, notes,',
  'icons, notes,'
);

// dubbele activeNotes-berekening weg (twee identieke blokken na elkaar)
const dupBlock = `const activeNotes = useMemo(() => {
    const today = new Date();
    return (notes || []).filter((n) => new Date(n.expires) >= today);
  }, [notes]);

  const activeNotes = useMemo(() => {
    const today = new Date();
    return (notes || []).filter((n) => new Date(n.expires) >= today);
  }, [notes]);`;
c = c.replace(dupBlock, `const activeNotes = useMemo(() => {
    const today = new Date();
    return (notes || []).filter((n) => new Date(n.expires) >= today);
  }, [notes]);`);

// dubbele post-it-laag op de kaart weg (twee identieke activeNotes.map-blokken na elkaar)
const dupMap = `{activeNotes.map((n) => {
            const c = postcodeToCentroid[n.postcode];
            if (!c) return null;
            return (
              <CircleMarker key={"note-" + n.postcode} center={c} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="top" className="sticky-note">{n.text}</Tooltip>
              </CircleMarker>
            );
          })}

          {activeNotes.map((n) => {
            const c = postcodeToCentroid[n.postcode];
            if (!c) return null;
            return (
              <CircleMarker key={"note-" + n.postcode} center={c} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="top" className="sticky-note">{n.text}</Tooltip>
              </CircleMarker>
            );
          })}`;
c = c.replace(dupMap, `{activeNotes.map((n) => {
            const c = postcodeToCentroid[n.postcode];
            if (!c) return null;
            return (
              <CircleMarker key={"note-" + n.postcode} center={c} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="top" className="sticky-note">{n.text}</Tooltip>
              </CircleMarker>
            );
          })}`);

if (c === before) {
  console.log('GEEN WIJZIGING - niets dubbel gevonden om te verwijderen');
} else {
  fs.writeFileSync(p, c);
  console.log('klaar - dubbels verwijderd');
}
