const fs = require('fs');

const p = 'src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
const before = c;

// 1. Marker importeren naast de andere react-leaflet-onderdelen
c = c.split('import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, ZoomControl, Pane, useMapEvents } from "react-leaflet";')
     .join('import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Tooltip, ZoomControl, Pane, useMapEvents } from "react-leaflet";');

// 2. het huisje-icoon toevoegen, net na de Pane met thuisbasis-stipjes opent
const anchor = '<Pane name="homes" style={{ zIndex: 700 }}>';
const houseMarker = anchor + '\n' +
'            {selected && homeCoords[selected] && (\n' +
'              <Marker\n' +
'                position={homeCoords[selected]}\n' +
'                icon={L.divIcon({ html: "\uD83C\uDFE0", className: "home-house-icon", iconSize: [26, 26], iconAnchor: [13, 26] })}\n' +
'              />\n' +
'            )}';

c = c.split(anchor).join(houseMarker);

if (c === before) {
  console.log('GEEN WIJZIGING - controleer handmatig');
} else {
  fs.writeFileSync(p, c);
  console.log('App.jsx aangepast');
}

// 3. CSS zodat het huisje-icoon er netjes uitziet (geen standaard kader eromheen)
const cssPath = 'src/App.css';
let css = fs.readFileSync(cssPath, 'utf8');
css += '\n\n.home-house-icon {\n  font-size: 22px;\n  text-align: center;\n  line-height: 26px;\n  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));\n}\n';
fs.writeFileSync(cssPath, css);
console.log('CSS toegevoegd');