import { useState } from "react";

const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE || "wijzigmij";

export default function Login({ onSuccess }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    console.log("hows life")
    if (code.trim() === ACCESS_CODE) {
      onSuccess();
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
