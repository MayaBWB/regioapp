import { useEffect, useMemo, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, ZoomControl, Pane, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import Login from "./Login.jsx";
import { firebaseEnabled, subscribeToOverrides, saveOverridesShared } from "./firebase.js";

import advisorPostcodesBase from "./data/advisor-postcodes.json";
import advisorsHome from "./data/advisors-home.json";
import postcodeNames from "./data/postcode-names.json";

import advisorPostcodesAlkmaar from "./data/advisor-postcodes-alkmaar.json";
import advisorsHomeAlkmaar from "./data/advisors-home-alkmaar.json";
import postcodeNamesAlkmaar from "./data/postcode-names-alkmaar.json";

const AUTH_KEY = "map-auth-ok";

const COLORS = [
  "#D85A30", "#378ADD", "#639922", "#7F77DD", "#D4537E",
  "#BA7517", "#1D9E75", "#888780", "#e24b4a", "#0c447c",
];

const SEARCH_COLORS = ["#EF9F27", "#3B8BD4", "#639922", "#D4537E", "#8B5CF6", "#0c447c"];
const MAX_SEARCH_FIELDS = SEARCH_COLORS.length;

const PRIO_ADVISORS = new Set(["Jimmy", "Kris", "Kurt M.", "Maarten", "Mario", "Stieven", "Sven V.", "Vincent", "Yoeri"]);

const AIRCO_ADVISORS = new Set([
  "Amanda", "Gilles", "Glenn", "Inge", "Jimmy", "Johan S.", "Jonas D.", "Jonas Loos",
  "Kevin D.", "Kuen", "Kurt M.", "Kurt Smeets", "Leroy", "Maarten", "Mario", "Michel",
  "Robert", "Roderik", "Roger", "Roland", "Sam DeLaet", "Sam G.", "Stefan",
  "Stefanie", "Steven", "Stieven", "Sven V.", "Timothy", "Tom H.",
  "Tom Janssens", "Tom Vereecke", "Tom van Diest", "Vincent", "Wilfried", "Wim", "Yoeri",
]);

const ZP_ADVISORS = new Set([
  "Amanda", "Gilles", "Glenn", "Inge", "Jimmy", "Johan S.", "Jonas D.", "Jonas Loos",
  "Kevin D.", "Kuen", "Kurt M.", "Kurt Smeets", "Leroy", "Maarten", "Mario", "Michel",
  "Robert", "Roderik", "Roger", "Sam DeLaet", "Sam G.", "Stefan", "Stefanie",
  "Steven", "Stieven", "Sven V.", "Timothy", "Tom H.", "Tom Janssens",
  "Tom Vereecke", "Tom van Diest", "Vincent", "Wim", "Yoeri",
]);

const WPB_ADVISORS = new Set([
  "Glenn", "Inge", "Johan S.", "Jonas Loos", "Kuen", "Kurt M.", "Leroy",
  "Maarten", "Robert", "Roger", "Stefan", "Steven", "Stieven", "Sven V.",
  "Tom H.", "Vincent", "Wim", "Yoeri",
]);

const WPLW_ADVISORS = new Set(["Bjorn", "Wim"]);

// elk departement is volledig apart: eigen kaartdata, eigen adviseurs, eigen
// opslag-sleutel. Ze delen geen data en botsen dus nooit met elkaar.
const DEPARTMENTS = [
  {
    id: "vlaanderen",
    label: "Vlaanderen & Zuid-NL",
    postcodesUrl: "/data/postcodes.geojson",
    advisorPostcodesBase,
    advisorsHome,
    postcodeNames,
    storageKey: "advisor-postcode-overrides",
    firebasePath: "advisorPostcodeOverrides",
    center: [50.95, 4.6],
    zoom: 8,
    icons: [
      { set: PRIO_ADVISORS, emoji: "👑", label: "Prioriteit", bold: true },
      { set: AIRCO_ADVISORS, emoji: "🌬️", label: "Airco" },
      { set: ZP_ADVISORS, emoji: "☀️", label: "Zonnepanelen" },
      { set: WPB_ADVISORS, emoji: "💧", label: "Warmtepompboiler" },
      { set: WPLW_ADVISORS, emoji: "🔥", label: "Warmtepomp lucht-water" },
    ],
  },
  {
    id: "alkmaar",
    label: "Alkmaar",
    postcodesUrl: "/data/postcodes-alkmaar.geojson",
    advisorPostcodesBase: advisorPostcodesAlkmaar,
    advisorsHome: advisorsHomeAlkmaar,
    postcodeNames: postcodeNamesAlkmaar,
    storageKey: "advisor-postcode-overrides-alkmaar",
    firebasePath: "advisorPostcodeOverridesAlkmaar",
    center: [52.6, 5.0],
    zoom: 8,
    icons: [],
  },
];

function colorForIndex(i) {
  return COLORS[i % COLORS.length];
}

function loadOverrides(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverridesLocal(key, overrides) {
  localStorage.setItem(key, JSON.stringify(overrides));
}

function centroidOfRing(ring) {
  let sx = 0, sy = 0;
  ring.forEach(([x, y]) => { sx += x; sy += y; });
  return [sy / ring.length, sx / ring.length];
}

function MapEvents({ onZoom }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [activeDept, setActiveDept] = useState(DEPARTMENTS[0].id);

  if (!authed) {
    return <Login onSuccess={() => { sessionStorage.setItem(AUTH_KEY, "1"); setAuthed(true); }} />;
  }

  const dept = DEPARTMENTS.find((d) => d.id === activeDept);

  return (
    <div className="app-shell">
      <div className="dept-tabs">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            className={d.id === activeDept ? "dept-tab active" : "dept-tab"}
            onClick={() => setActiveDept(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <DeptMap key={dept.id} config={dept} />
    </div>
  );
}

function DeptMap({ config }) {
  const {
    postcodesUrl, advisorPostcodesBase, advisorsHome, postcodeNames,
    storageKey, firebasePath, center, zoom: initialZoom, icons,
  } = config;

  const [postcodesGeo, setPostcodesGeo] = useState(null);
  const [selected, setSelected] = useState(null);
  const [overrides, setOverrides] = useState(() => loadOverrides(storageKey));
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [zoom, setZoom] = useState(initialZoom);
  const [searchFields, setSearchFields] = useState(["", ""]);
  const [activeSearch, setActiveSearch] = useState([]);
  const [searchError, setSearchError] = useState("");
  const mapRef = useRef(null);
  const homeRenderer = useMemo(() => L.svg({ pane: "homes" }), []);
  const advisorLayerRef = useRef(null);
  const searchLayerRef = useRef(null);

  useEffect(() => {
    if (firebaseEnabled) {
      const unsubscribe = subscribeToOverrides(firebasePath, (shared) => setOverrides(shared));
      return unsubscribe;
    }
  }, [firebasePath]);

  const advisorPostcodes = useMemo(() => {
    return { ...advisorPostcodesBase, ...overrides };
  }, [advisorPostcodesBase, overrides]);

  const advisorNames = useMemo(
    () => Object.keys(advisorPostcodes).sort((a, b) => a.localeCompare(b)),
    [advisorPostcodes]
  );

  useEffect(() => {
    fetch(postcodesUrl)
      .then((r) => r.json())
      .then((geo) => {
        geo.features = geo.features.filter((f) => f && f.geometry);
        setPostcodesGeo(geo);
      });
  }, [postcodesUrl]);

  const postcodeToCentroid = useMemo(() => {
    if (!postcodesGeo) return {};
    const sums = {};
    postcodesGeo.features.forEach((f) => {
      const pc = f.properties.postcode;
      const rings = f.geometry.type === "Polygon" ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0]);
      rings.forEach((ring) => {
        const [lat, lng] = centroidOfRing(ring);
        if (!sums[pc]) sums[pc] = { lat: 0, lng: 0, n: 0 };
        sums[pc].lat += lat;
        sums[pc].lng += lng;
        sums[pc].n += 1;
      });
    });
    const out = {};
    Object.entries(sums).forEach(([pc, s]) => { out[pc] = [s.lat / s.n, s.lng / s.n]; });
    return out;
  }, [postcodesGeo]);

  const availablePostcodes = useMemo(() => new Set(Object.keys(postcodeToCentroid)), [postcodeToCentroid]);

  const homeCoords = useMemo(() => {
    const coords = {};
    Object.entries(advisorsHome).forEach(([name, info]) => {
      if (postcodeToCentroid[info.postcode]) coords[name] = postcodeToCentroid[info.postcode];
    });
    return coords;
  }, [postcodeToCentroid, advisorsHome]);

  const zoneLabels = useMemo(() => {
    const groups = {};
    Object.entries(postcodeToCentroid).forEach(([pc, c]) => {
      const zoneKey = pc.slice(0, 2);
      if (!groups[zoneKey]) groups[zoneKey] = [];
      groups[zoneKey].push(c);
    });
    return Object.entries(groups).map(([zoneKey, pts]) => {
      const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return { zone: zoneKey, lat, lng };
    });
  }, [postcodeToCentroid]);

  const postcodeLabels = useMemo(() => {
    return Object.entries(postcodeToCentroid).map(([pc, c]) => ({ pc, lat: c[0], lng: c[1] }));
  }, [postcodeToCentroid]);

  const showPostcodeLabels = zoom >= 10;

  const selectedPostcodeSet = useMemo(() => {
    if (!selected) return null;
    return new Set(advisorPostcodes[selected] || []);
  }, [selected, advisorPostcodes]);

  const colorIndex = selected ? advisorNames.indexOf(selected) : 0;
  const highlightColor = colorForIndex(colorIndex);

  const styleFn = (feature) => {
    const isActive = selectedPostcodeSet && selectedPostcodeSet.has(feature.properties.postcode);
    if (isActive) {
      return { fillColor: highlightColor, fillOpacity: 0.4, color: highlightColor, weight: 1.5 };
    }
    return { fillColor: "#888", fillOpacity: 0, color: "#999", weight: 0.3 };
  };

  const searchStyleFn = (feature) => {
    const hit = activeSearch.find((s) => s.postcode === feature.properties.postcode);
    if (hit) {
      return { fillColor: hit.color, fillOpacity: 0.5, color: hit.color, weight: 3 };
    }
    return { fillOpacity: 0, opacity: 0, weight: 0 };
  };

  useEffect(() => {
    if (advisorLayerRef.current) advisorLayerRef.current.setStyle(styleFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPostcodeSet, highlightColor]);

  useEffect(() => {
    if (searchLayerRef.current) searchLayerRef.current.setStyle(searchStyleFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearch]);

  function selectAdvisor(name) {
    if (selected === name) {
      setSelected(null);
      return;
    }
    setSelected(name);
    setDraft((advisorPostcodes[name] || []).join(", "));
    setSaved(false);
  }

  function handleSave() {
    const list = draft
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d{4}$/.test(s));
    const unique = Array.from(new Set(list)).sort();
    const next = { ...overrides, [selected]: unique };
    setOverrides(next);
    if (firebaseEnabled) {
      saveOverridesShared(firebasePath, next);
    } else {
      saveOverridesLocal(storageKey, next);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleReset() {
    const ok = window.confirm(
      "Alle lokale aanpassingen voor dit tabblad wissen en teruggaan naar de standaardgegevens?"
    );
    if (!ok) return;
    localStorage.removeItem(storageKey);
    setOverrides({});
    if (firebaseEnabled) {
      saveOverridesShared(firebasePath, {});
    }
    setSelected(null);
    setDraft("");
  }

  const namesToPostcodes = useMemo(() => {
    return Object.entries(postcodeNames).map(([pc, name]) => ({ pc, name, lower: name.toLowerCase() }));
  }, [postcodeNames]);

  function runSearch() {
    const entries = searchFields.map((s) => s.trim()).filter(Boolean);
    const results = [];
    const missing = [];
    entries.forEach((entry, i) => {
      const isPostcode = /^\d{4}$/.test(entry);
      let matchedPostcodes = [];
      if (isPostcode && availablePostcodes.has(entry)) {
        matchedPostcodes = [entry];
      } else if (!isPostcode) {
        const needle = entry.toLowerCase();
        matchedPostcodes = namesToPostcodes.filter((n) => n.lower.includes(needle)).map((n) => n.pc);
      }
      if (matchedPostcodes.length) {
        matchedPostcodes.forEach((pc) => {
          const advisors = advisorNames.filter((name) => (advisorPostcodes[name] || []).includes(pc));
          results.push({ postcode: pc, name: postcodeNames[pc], color: SEARCH_COLORS[i], advisors });
        });
      } else {
        missing.push(entry);
      }
    });
    setActiveSearch(results);
    setSearchError(missing.length ? `Niet gevonden: ${missing.join(", ")}` : "");

    if (results.length && mapRef.current) {
      const points = results.map((r) => postcodeToCentroid[r.postcode]).filter(Boolean);
      if (points.length === 1) {
        mapRef.current.flyTo(points[0], 12);
      } else if (points.length > 1) {
        mapRef.current.flyToBounds(points, { padding: [60, 60], maxZoom: 12 });
      }
    }
  }

  function updateSearchField(i, value) {
    setSearchFields((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function addSearchField() {
    setSearchFields((prev) => (prev.length < MAX_SEARCH_FIELDS ? [...prev, ""] : prev));
  }

  function clearSearch() {
    setActiveSearch([]);
    setSearchFields(["", ""]);
    setSearchError("");
  }

  const advisorSearchHighlight = useMemo(() => {
    const map = {};
    activeSearch.forEach(({ color, advisors }) => {
      advisors.forEach((name) => {
        if (!map[name]) map[name] = [];
        map[name].push(color);
      });
    });
    return map;
  }, [activeSearch]);

  const unknownInDraft = draft
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && (!/^\d{4}$/.test(s) || !availablePostcodes.has(s)));

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Adviseurs</h1>
        <p className={firebaseEnabled ? "sync-status live" : "sync-status local"}>
          {firebaseEnabled ? "● Live gedeeld met iedereen" : "○ Enkel lokaal (niet gedeeld)"}
        </p>
        <button className="reset-btn" onClick={handleReset} title="Wist eventuele lokale aanpassingen en gaat terug naar de standaardgegevens">
          ↺ Herstel naar standaardgegevens
        </button>
        <p className="hint">Klik op een naam om de regio te tonen en te bewerken</p>
        <ul className="advisor-list">
          {advisorNames.map((name, i) => {
            const searchHit = advisorSearchHighlight[name];
            const isPrio = icons.some((ic) => ic.bold && ic.set.has(name));
            return (
              <li key={name}>
                <button
                  className={selected === name ? "active" : ""}
                  style={
                    searchHit
                      ? { borderLeft: `4px solid ${searchHit[0]}`, background: searchHit[0] + "1a" }
                      : selected === name
                      ? { borderColor: colorForIndex(i), background: colorForIndex(i) + "22" }
                      : {}
                  }
                  onClick={() => selectAdvisor(name)}
                >
                  <span className="dot" style={{ background: colorForIndex(i) }} />
                  <span style={isPrio ? { fontWeight: 700 } : {}}>{name}</span>
                  {advisorsHome[name]?.postcode && (
                    <span className="home-pc">{advisorsHome[name].postcode}</span>
                  )}
                  {icons.map((ic, idx) => ic.set.has(name) && <span key={idx} title={ic.label}>{ic.emoji}</span>)}
                  {overrides[name] && <span className="edited-mark" title="Aangepast">●</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {selected && (
          <div className="editor">
            <h2>{selected}</h2>
            <p className="hint">Postcodes, gescheiden door komma</p>
            <textarea rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} />
            {unknownInDraft.length > 0 && (
              <p className="warning">Onbekend of ongeldig: {unknownInDraft.join(", ")}</p>
            )}
            <div className="editor-actions">
              <button className="save-btn" onClick={handleSave}>
                {saved ? "Opgeslagen ✓" : "Opslaan"}
              </button>
              <span className="count">{draft.split(",").map((s) => s.trim()).filter(Boolean).length} postcodes</span>
            </div>
          </div>
        )}
      </aside>

      <main className="map-wrap">
        <div className="search-bar">
          {searchFields.map((val, i) => (
            <input
              key={i}
              type="text"
              placeholder={i === 0 ? "Postcode of plaats, bv. 3600 of Genk" : `Postcode of plaats ${i + 1} (optioneel)`}
              value={val}
              onChange={(e) => updateSearchField(i, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              style={{ borderLeft: `3px solid ${SEARCH_COLORS[i]}` }}
            />
          ))}
          <div className="search-actions">
            <button className="search-btn" onClick={runSearch}>Zoek</button>
            {searchFields.length < MAX_SEARCH_FIELDS && (
              <button className="search-add" onClick={addSearchField} title="Nog een postcode toevoegen">+ veld</button>
            )}
            {activeSearch.length > 0 && (
              <button className="search-clear" onClick={clearSearch}>Wissen</button>
            )}
          </div>
          {searchError && <span className="search-error">{searchError}</span>}
          {activeSearch.length > 0 && (
            <div className="search-results">
              {activeSearch.map(({ postcode, name, color, advisors }) => (
                <div key={postcode} className="search-result-row">
                  <span className="search-result-pc" style={{ color }}>{postcode}{name ? ` · ${name}` : ""}</span>
                  <span className="search-result-names">
                    {advisors.length
                      ? advisors.map((n, idx) => {
                          const isPrio = icons.some((ic) => ic.bold && ic.set.has(n));
                          return (
                            <span key={n} style={isPrio ? { fontWeight: 700 } : {}}>
                              {n}{idx < advisors.length - 1 ? ", " : ""}
                            </span>
                          );
                        })
                      : "niemand toegewezen"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <MapContainer ref={mapRef} center={center} zoom={initialZoom} zoomControl={false} style={{ height: "100%", width: "100%" }}>
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onZoom={setZoom} />

          {postcodesGeo && (
            <GeoJSON ref={advisorLayerRef} data={postcodesGeo} style={styleFn} />
          )}
          {postcodesGeo && (
            <GeoJSON ref={searchLayerRef} data={postcodesGeo} style={searchStyleFn} />
          )}

          {!showPostcodeLabels &&
            zoneLabels.map(({ zone, lat, lng }) => (
              <CircleMarker key={"zone-" + zone} center={[lat, lng]} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="center" className="zone-label">{zone}</Tooltip>
              </CircleMarker>
            ))}

          {showPostcodeLabels &&
            postcodeLabels.map(({ pc, lat, lng }) => (
              <CircleMarker key={"pc-" + pc} center={[lat, lng]} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip permanent direction="center" className="postcode-label">{pc}</Tooltip>
              </CircleMarker>
            ))}

          <Pane name="homes" style={{ zIndex: 700 }}>
            {Object.entries(homeCoords).map(([name, latlng]) => (
              <CircleMarker
                key={name}
                center={latlng}
                renderer={homeRenderer}
                radius={selected === name ? 7 : 4}
                pathOptions={{
                  color: "#222",
                  weight: 1,
                  fillColor: selected === name ? highlightColor : "#444",
                  fillOpacity: 1,
                }}
                eventHandlers={{ click: () => selectAdvisor(name) }}
              >
                <Tooltip>
                  {name} · {postcodeNames[advisorsHome[name]?.postcode] || advisorsHome[name]?.city} ({advisorsHome[name]?.postcode})
                </Tooltip>
              </CircleMarker>
            ))}
          </Pane>
        </MapContainer>
      </main>
    </div>
  );
}
