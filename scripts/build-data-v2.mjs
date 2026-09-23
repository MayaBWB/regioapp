import fs from "fs";
import * as topojson from "topojson-client";
import * as turf from "@turf/turf";

const topo = JSON.parse(fs.readFileSync("./scripts/belgium.json", "utf8"));
const fc = topojson.feature(topo, topo.objects.municipalities);

// keep only Flanders (02000) and Brussels (04000) -- drop Wallonia (03000),
// we don't work there and it only adds noise / postcode-number collisions
fc.features = fc.features.filter((f) => f.properties.reg_nis !== "03000");
fc.features.forEach((f) => {
  f.properties = { nis: f.properties.nis, name: f.properties.name_nl };
});
fs.writeFileSync("./public/data/municipalities.geojson", JSON.stringify(fc));
console.log("municipalities kept:", fc.features.length);

const validNis = new Set(fc.features.map((f) => f.properties.nis));

// primary source: official Statbel-derived postcode -> NIS5 dictionary
// (far more reliable than guessing from a single lat/lng point)
const dictRaw = fs.readFileSync("./scripts/be-dictionary.csv", "latin1").trim().split("\n");
const dictHeader = dictRaw[0].split(",");
const pcIdx = dictHeader.indexOf("PostCode");
const nisIdx = dictHeader.indexOf("NIS5");

const postcodeToNis = {};
for (let i = 1; i < dictRaw.length; i++) {
  const cols = dictRaw[i].split(",");
  const pc = cols[pcIdx];
  const nis = cols[nisIdx];
  if (pc && nis && validNis.has(nis)) postcodeToNis[pc] = nis;
}
console.log("postcodes from official dictionary:", Object.keys(postcodeToNis).length);

// fallback: point-in-polygon from the coordinates csv, only for postcodes
// the dictionary didn't cover
const csv = fs.readFileSync("./scripts/zipcode-belgium.csv", "utf8").trim().split("\n");
const postcodeToLatLng = {};
let fallbackUsed = 0;

for (const line of csv) {
  const parts = line.split(",");
  if (parts.length < 4) continue;
  const postcode = parts[0].trim();
  const lng = parseFloat(parts[2]);
  const lat = parseFloat(parts[3]);
  if (isNaN(lng) || isNaN(lat)) continue;
  postcodeToLatLng[postcode] = [lat, lng];

  if (!postcodeToNis[postcode]) {
    const pt = turf.point([lng, lat]);
    for (const feature of fc.features) {
      try {
        if (turf.booleanPointInPolygon(pt, feature)) {
          postcodeToNis[postcode] = feature.properties.nis;
          fallbackUsed++;
          break;
        }
      } catch (e) {}
    }
  }
}
console.log("postcodes needing point-in-polygon fallback:", fallbackUsed);

fs.writeFileSync("./src/data/postcode-nis.json", JSON.stringify(postcodeToNis));
fs.writeFileSync("./src/data/postcode-latlng.json", JSON.stringify(postcodeToLatLng));
console.log("postcodes mapped:", Object.keys(postcodeToNis).length);
