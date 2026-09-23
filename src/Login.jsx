import { useState } from "react";

const VIEW_CODE = import.meta.env.VITE_ACCESS_CODE || "Bawaba";
const ADMIN_CODE = import.meta.env.VITE_ADMIN_ACCESS_CODE || "adminbawaba";

export default function Login({ onSuccess }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed === ADMIN_CODE) {
      onSuccess("admin");
    } else if (trimmed === VIEW_CODE) {
      onSuccess("viewer");
    } else {
      setError("Foute code, probeer opnieuw");
    }
  }

  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={handleSubmit}>
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
