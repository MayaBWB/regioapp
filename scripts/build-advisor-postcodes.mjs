import fs from "fs";

const postcodesGeojson = JSON.parse(fs.readFileSync("./public/data/postcodes.geojson", "utf8"));
const allPostcodes = Array.from(new Set(postcodesGeojson.features.map((f) => f.properties.postcode)));
const prefixMap = JSON.parse(fs.readFileSync("./scripts/advisor-prefixes.json", "utf8"));

function expand(token) {
  if (token === "39_noord") {
    return allPostcodes.filter((pc) => {
      const n = parseInt(pc, 10);
      return n >= 3900 && n <= 3969;
    });
  }
  if (token === "39_zuid") {
    return allPostcodes.filter((pc) => {
      const n = parseInt(pc, 10);
      return n >= 3970 && n <= 3999;
    });
  }
  return allPostcodes.filter((pc) => pc.slice(0, 2) === token);
}

const result = {};
for (const [advisor, tokens] of Object.entries(prefixMap)) {
  const set = new Set();
  tokens.forEach((t) => expand(t).forEach((pc) => set.add(pc)));
  result[advisor] = Array.from(set).sort();
}

// postcode-level exceptions from the original table that a 2-digit zone
// can't express: zone "20" explicitly excludes 2000 for everyone, Stieven
// only covers 2070 (not the rest of zone 20), and Tom H. excludes
// Antwerpen-Linkeroever (2050)
if (result["Stieven"]) {
  result["Stieven"] = result["Stieven"].filter((pc) => pc.slice(0, 2) !== "20" || pc === "2070");
}
if (result["Sam G."]) {
  result["Sam G."] = result["Sam G."].filter((pc) => pc !== "2000");
}
if (result["Sam DeLaet"]) {
  result["Sam DeLaet"] = result["Sam DeLaet"].filter((pc) => pc !== "2000");
}
if (result["Tom H."]) {
  result["Tom H."] = result["Tom H."].filter((pc) => pc !== "2000" && pc !== "2050");
}

fs.writeFileSync("./src/data/advisor-postcodes.json", JSON.stringify(result, null, 0));
console.log("advisors:", Object.keys(result).length);
for (const [a, list] of Object.entries(result)) {
  console.log(a, list.length);
}
