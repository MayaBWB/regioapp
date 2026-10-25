import { useEffect, useRef, useState } from "react";
import { firebaseEnabled, adminSignIn } from "./firebase.js";

const VIEW_CODE = import.meta.env.VITE_ACCESS_CODE || "Bawaba";
// only used when Firebase isn't configured (local dev) -- there's no shared
// database to protect in that case, so a plain code is fine as a fallback
const LOCAL_ADMIN_CODE = import.meta.env.VITE_ADMIN_ACCESS_CODE || "adminbawaba";
// the single shared admin account's email (created once in the Firebase
// Console); the login form itself only asks for the password
const ADMIN_EMAIL = import.meta.env.VITE_FIREBASE_ADMIN_EMAIL || "admin@regioapp.local";

// Eén login (Maya, 24/10): wie in BawabaDash is ingelogd, komt hier zonder code binnen.
// BawabaDash geeft een eenmalige code mee (#bawaba=...); People controleert ze (2 min, één keer).
const BAWABADASH_SSO = "https://bawabadash.vercel.app/api/sso/regio";
const PEOPLE_INWISSELEN = "https://mybawaba.vercel.app/api/v1/sso/inwisselen";

// Eigen ingang voor FavorCool-kantoor (Maya, 25/10): /kantoor toont meteen een codescherm,
// met een eigen code los van Bawaba, enkel kijken. Zonder ingestelde code: geen toegang.
const KANTOOR_CODE = (import.meta.env.VITE_KANTOOR_CODE || "").trim();
const isKantoor = () => window.location.pathname.replace(/\/+$/, "") === "/kantoor";

function KantoorLogin({ onSuccess }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    if (KANTOOR_CODE && code.trim() === KANTOOR_CODE) onSuccess("viewer");
    else setError("Foute code, probeer opnieuw");
  }
  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={submit}>
        <h1>Adviseurs regiokaart</h1>
        <p className="hint">Voer de toegangscode in</p>
        <input
          type="password"
          autoFocus
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(""); }}
          placeholder="Toegangscode"
        />
        {error && <p className="warning">{error}</p>}
        <button type="submit" className="save-btn">Openen</button>
      </form>
    </div>
  );
}

export default function Login({ onSuccess }) {
  if (isKantoor()) return <KantoorLogin onSuccess={onSuccess} />;
  return <BawabaLogin onSuccess={onSuccess} />;
}

function leesSso() {
  const m = window.location.hash.match(/bawaba=([a-f0-9]{64})/);
  const fout = /bawaba-fout/.test(window.location.hash);
  if (m || fout) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return { code: m ? m[1] : null, fout };
}

function BawabaLogin({ onSuccess }) {
  const [sso] = useState(leesSso);
  // Zonder code en zonder fout: meteen via BawabaDash (?code=1 toont het oude formulier).
  const [ssoBezig, setSsoBezig] = useState(() => !sso.fout && !new URLSearchParams(window.location.search).has("code"));

  const gestart = useRef(false);
  useEffect(() => {
    if (!ssoBezig || gestart.current) return;
    gestart.current = true;
    if (!sso.code) { window.location.replace(BAWABADASH_SSO); return; }
    fetch(PEOPLE_INWISSELEN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: sso.code }) })
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d) => { if (d.ok) onSuccess("viewer"); else setSsoBezig(false); })
      .catch(() => setSsoBezig(false));
  }, [ssoBezig, sso.code, onSuccess]);

  const [mode, setMode] = useState("viewer");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  function handleViewerSubmit(e) {
    e.preventDefault();
    if (code.trim() === VIEW_CODE) {
      onSuccess("viewer");
    } else {
      setError("Foute code, probeer opnieuw");
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setError("");

    if (!firebaseEnabled) {
      if (password === LOCAL_ADMIN_CODE) {
        onSuccess("admin");
      } else {
        setError("Foute code, probeer opnieuw");
      }
      return;
    }

    setBusy(true);
    try {
      await adminSignIn(ADMIN_EMAIL, password);
      onSuccess("admin");
    } catch {
      setError("Foute code, probeer opnieuw");
    } finally {
      setBusy(false);
    }
  }

  if (ssoBezig) {
    return (
      <div className="login-screen">
        <div className="login-box"><p className="hint">Even inloggen via BawabaDash...</p></div>
      </div>
    );
  }

  if (mode === "admin") {
    return (
      <div className="login-screen">
        <form className="login-box" onSubmit={handleAdminSubmit}>
          <h1>Beheerder inloggen</h1>
          <p className="hint">Voer de beheerderscode in</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Beheerderscode"
          />
          {error && <p className="warning">{error}</p>}
          <button type="submit" className="save-btn" disabled={busy}>
            {busy ? "Bezig..." : "Inloggen"}
          </button>
          <button type="button" className="login-switch" onClick={() => switchMode("viewer")}>
            ← Terug naar normale login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={handleViewerSubmit}>
        <h1>Adviseurs regiokaart</h1>
        <p className="hint">Voer de toegangscode in</p>
        <input
          type="password"
          autoFocus
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(""); }}
          placeholder="Toegangscode"
        />
        {error && <p className="warning">{error}</p>}
        <button type="submit" className="save-btn">Openen</button>
        <a className="login-switch" href={BAWABADASH_SSO}>Inloggen via BawabaDash →</a>
        <button type="button" className="login-switch" onClick={() => switchMode("admin")}>
          Ben je beheerder? Log hier in →
        </button>
      </form>
    </div>
  );
}
