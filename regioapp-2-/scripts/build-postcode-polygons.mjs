import fs from "fs";

const be = JSON.parse(fs.readFileSync("./scripts/be-postcodes-raw.geojson", "utf8"));
const nl = JSON.parse(fs.readFileSync("./scripts/nl-postcodes-raw.geojson", "utf8"));

const ALLOWED_NL_PREFIXES = new Set(["50", "55", "56", "57", "59", "60", "61", "62", "63", "64"]);

const features = [];

// Belgium: keep Flanders + Brussels, drop Wallonia (postcodes 4000-7999)
for (const f of be.features) {
  const pc = f.properties.nouveau_PO;
  if (!pc || pc.length !== 4) continue;
  if (!f.geometry) continue;
  const n = parseInt(pc, 10);
  if (n >= 4000 && n < 8000) continue; // Wallonia
  features.push({
    type: "Feature",
    properties: { postcode: pc, country: "BE" },
    geometry: f.geometry,
  });
}

// Netherlands: keep only the prefixes actually in scope
for (const f of nl.features) {
  const pc = f.properties.PC4;
  if (!pc || pc.length !== 4) continue;
  if (!f.geometry) continue;
  if (!ALLOWED_NL_PREFIXES.has(pc.slice(0, 2))) continue;
  features.push({
    type: "Feature",
    properties: { postcode: pc, country: "NL" },
    geometry: f.geometry,
  });
}

const fc = { type: "FeatureCollection", features };
fs.writeFileSync("./public/data/postcodes.geojson", JSON.stringify(fc));
console.log("BE+NL postcode features kept:", features.length);
console.log(
  "unique postcodes:",
  new Set(features.map((f) => f.properties.postcode)).size
);
