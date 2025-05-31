import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MinaBeställningar from "./MinaBeställningar";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function MinProfil() {
  const navigate = useNavigate();
  const [aktiv, setAktiv] = useState("info");
  const [profil, setProfil] = useState(null);
  const darkMode = document.body.classList.contains("dark");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfil(data);
        localStorage.setItem("kundinfo", JSON.stringify(data));
      })
      .catch((err) => {
        console.error(err);
        const fallback = localStorage.getItem("kundinfo");
        if (fallback) {
          setProfil(JSON.parse(fallback));
        } else {
          navigate("/login");
        }
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
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  };

  const exporteraData = () => {
    const blob = new Blob([JSON.stringify(profil, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const länk = document.createElement("a");
    länk.href = url;
    länk.download = "användardata.json";
    länk.click();
  };

  const renderInnehall = () => {
    if (!profil) {
      return <p>Laddar...</p>;
    }

    switch (aktiv) {
      case "info": {
        return (
          <div>
            <h2>👤 Mina uppgifter</h2>
            <label htmlFor="namn">Namn</label>
            <input id="namn" value={profil.namn || ""} readOnly aria-label="Ditt namn" />

            <label htmlFor="email">E-postadress</label>
            <input id="email" type="email" value={profil.email || ""} readOnly aria-label="Din e-postadress" />

            <label htmlFor="telefon">Telefonnummer</label>
            <input id="telefon" type="tel" value={profil.telefon || ""} readOnly aria-label="Ditt telefonnummer" />

            <label htmlFor="adress">Adress</label>
            <textarea id="adress" value={profil.adress || ""} readOnly aria-label="Din adress" />
          </div>
        );
      }

      case "sakerhet": {
        return (
          <div>
            <h2>🔒 Säkerhet</h2>
            <label htmlFor="nytt-losen">Lösenord (ej aktivt ännu)</label>
            <input id="nytt-losen" type="password" placeholder="Nytt lösenord" disabled />

            <label htmlFor="ny-email">Ny e-postadress (ej aktivt ännu)</label>
            <input id="ny-email" type="email" placeholder="Ny e-post" disabled />
          </div>
        );
      }

      case "exportera": {
        return (
          <div>
            <h2>📁 Exportera data</h2>
            <button onClick={exporteraData}>⬇️ Ladda ner JSON</button>
          </div>
        );
      }

      case "radera": {
        return (
          <div>
            <h2>❌ Radera konto</h2>
            <p>Denna åtgärd är permanent. Bekräfta om du vill ta bort allt.</p>
            <button
              style={{ backgroundColor: "red" }}
              onClick={() => alert("Radering ej aktiv än")}
            >
              Bekräfta radering
            </button>
          </div>
        );
      }

      case "bestallningar": {
        return (
          <div>
            <h2>📦 Beställningshistorik</h2>
            <MinaBeställningar />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="profil-container" style={{ display: "flex", minHeight: "80vh", flexWrap: "wrap" }}>
      <aside
        style={{
          width: "240px",
          background: darkMode ? "#1e1e1e" : "#f5f5f5",
          padding: "1rem",
        }}
      >
        <h3>👋 Hej, {profil?.namn || "Användare"}</h3>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
          {sektioner.map((s) => (
            <button
              key={s.id}
              onClick={() => setAktiv(s.id)}
              style={{
                backgroundColor: aktiv === s.id ? "#007bff" : darkMode ? "#333" : "white",
                color: aktiv === s.id ? "white" : darkMode ? "white" : "black",
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "0.5rem",
                textAlign: "left",
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
              border: "none",
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
