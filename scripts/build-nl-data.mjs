import fs from "fs";
import * as turf from "@turf/turf";

const ALLOWED_PREFIXES = new Set(["50", "55", "56", "57", "59", "60", "61", "62", "63", "64"]);

const nlGemeenten = JSON.parse(fs.readFileSync("./scripts/nl-gemeenten.geojson", "utf8"));
// namespace NL ids so they can never collide with BE NIS codes, keep original name too
nlGemeenten.features.forEach((f) => {
  f.properties = { nis: "NL-" + f.properties.statcode, name: f.properties.statnaam };
});

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^'s-/, "s-")
    .replace(/[^a-z0-9]/g, "");
}

const nameToFeature = {};
nlGemeenten.features.forEach((f) => {
  nameToFeature[normalize(f.properties.name)] = f;
});

// parse the 4pp csv (id,postcode,woonplaats,alt,gemeente,provincie,netnummer,lat,lng,soort)
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync("./scripts/nl-postcodes-4pp.csv", "utf8").trim().split("\n");
const header = parseCsvLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

const postcodeToNis = {};
const postcodeToLatLng = {};
let matchedByName = 0, matchedByPoint = 0, unmatched = 0;

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i]);
  const postcode = row[idx["postcode"]];
  if (!postcode || postcode.length !== 4) continue;
  if (!ALLOWED_PREFIXES.has(postcode.slice(0, 2))) continue;

  const lat = parseFloat(row[idx["latitude"]]);
  const lng = parseFloat(row[idx["longitude"]]);
  if (isNaN(lat) || isNaN(lng)) continue;
  const gemeente = row[idx["gemeente"]];

  let feature = nameToFeature[normalize(gemeente)];
  if (feature) {
    matchedByName++;
  } else {
    // fallback: point-in-polygon
    const pt = turf.point([lng, lat]);
    for (const f of nlGemeenten.features) {
      try {
        if (turf.booleanPointInPolygon(pt, f)) { feature = f; break; }
      } catch (e) {}
    }
    if (feature) matchedByPoint++;
  }

  if (!feature) { unmatched++; continue; }

  // keep first occurrence per postcode (csv has multiple rows for some postcodes)
  if (!postcodeToNis[postcode]) {
    postcodeToNis[postcode] = feature.properties.nis;
    postcodeToLatLng[postcode] = [lat, lng];
  }
}

console.log("NL matched by name:", matchedByName, "by point:", matchedByPoint, "unmatched:", unmatched);
console.log("NL postcodes kept:", Object.keys(postcodeToNis).length);

// merge with existing BE data
const beMunicipalities = JSON.parse(fs.readFileSync("./public/data/municipalities.geojson", "utf8"));
const bePostcodeNis = JSON.parse(fs.readFileSync("./src/data/postcode-nis.json", "utf8"));
const bePostcodeLatLng = JSON.parse(fs.readFileSync("./src/data/postcode-latlng.json", "utf8"));

const combinedFeatures = beMunicipalities.features.concat(nlGemeenten.features);
const combined = { type: "FeatureCollection", features: combinedFeatures };

fs.writeFileSync("./public/data/municipalities.geojson", JSON.stringify(combined));
fs.writeFileSync("./src/data/postcode-nis.json", JSON.stringify({ ...bePostcodeNis, ...postcodeToNis }));
fs.writeFileSync("./src/data/postcode-latlng.json", JSON.stringify({ ...bePostcodeLatLng, ...postcodeToLatLng }));

console.log("total municipalities:", combined.features.length);
console.log("total postcodes:", Object.keys({ ...bePostcodeNis, ...postcodeToNis }).length);
