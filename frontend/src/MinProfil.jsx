import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function MinProfil() {
  const navigate = useNavigate();
  const [aktiv, setAktiv] = useState("info");
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    fetch("http://localhost:3001/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProfil(data))
      .catch((err) => {
        console.error(err);
        navigate("/login");
      });
  }, [navigate]);

  const sektioner = [
    { id: "bestallningar", namn: "📦 Mina beställningar" },
    { id: "info", namn: "👤 Min information" },
    { id: "sakerhet", namn: "🔒 Säkerhet & lösenord" },
    { id: "exportera", namn: "📁 Exportera min data" },
    { id: "radera", namn: "❌ Radera konto" },
  ];

  const loggaUt = () => {
    localStorage.clear();
    navigate("/");
  };

  const renderInnehall = () => {
    if (!profil) return <p>Laddar...</p>;

    switch (aktiv) {
      case "info":
        return (
          <div>
            <h2>👤 Mina uppgifter</h2>
            <input type="text" value={profil.namn} readOnly />
            <input type="email" value={profil.email} readOnly />
            <input type="tel" value={profil.telefon} readOnly />
            <textarea value={profil.adress} readOnly />
          </div>
        );
      case "sakerhet":
        return (
          <div>
            <h2>🔒 Säkerhet</h2>
            <input type="password" placeholder="Nytt lösenord (ej aktivt ännu)" disabled />
            <input type="email" placeholder="Ny e-postadress (ej aktivt ännu)" disabled />
          </div>
        );
      case "exportera":
        return (
          <div>
            <h2>📁 Exportera data</h2>
            <button onClick={() => alert("Export skickad som JSON – funktion kommer")}>Ladda ner JSON</button>
          </div>
        );
      case "radera":
        return (
          <div>
            <h2>❌ Radera konto</h2>
            <p>Denna åtgärd är permanent. Bekräfta om du vill ta bort allt.</p>
            <button style={{ backgroundColor: "red" }} onClick={() => alert("Radering inte aktiv än")}>Bekräfta radering</button>
          </div>
        );
      case "bestallningar":
        return (
          <div>
            <h2>📦 Beställningshistorik</h2>
            <p>Se dina tidigare beställningar (funktion kopplas till MinaBeställningar.jsx).</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "80vh" }}>
      <aside style={{ width: "240px", background: "#f5f5f5", padding: "1rem" }}>
        <h3>👋 Hej, {profil?.namn || "Användare"}</h3>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
          {sektioner.map((s) => (
            <button
              key={s.id}
              onClick={() => setAktiv(s.id)}
              style={{
                backgroundColor: aktiv === s.id ? "#007bff" : "white",
                color: aktiv === s.id ? "white" : "black",
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "0.5rem",
                textAlign: "left"
              }}
            >
              {s.namn}
            </button>
          ))}
          <button
            onClick={loggaUt}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              marginTop: "2rem",
              padding: "0.6rem",
              borderRadius: "6px",
              border: "none"
            }}
          >
            🚪 Logga ut
          </button>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "2rem" }}>{renderInnehall()}</main>
    </div>
  );
}

export default MinProfil;
