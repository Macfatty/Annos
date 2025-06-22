import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MinaBeställningar from "./MinaBeställningar";
import { fetchProfile } from "./api";

function MinProfil() {
  const navigate = useNavigate();
  const [aktiv, setAktiv] = useState("info");
  const [profil, setProfil] = useState(null);
  const [tema, setTema] = useState(
    () => localStorage.getItem("tema") || "light"
  );
  // const darkMode = tema === "dark";

  useEffect(() => {
    document.body.className = tema;
  }, [tema]);

  useEffect(() => {
    const handleStorage = () => {
      const lagrat = localStorage.getItem("tema") || "light";
      setTema(lagrat);
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const data = await fetchProfile();
      if (data) {
        setProfil(data);
        localStorage.setItem("kundinfo", JSON.stringify(data));
      } else {
        const fallback = localStorage.getItem("kundinfo");
        if (fallback) {
          setProfil(JSON.parse(fallback));
        } else {
          navigate("/login");
        }
      }
    };
    load();
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
            <input
              id="namn"
              value={profil.namn || ""}
              readOnly
              aria-label="Ditt namn"
            />

            <label htmlFor="email">E-postadress</label>
            <input
              id="email"
              type="email"
              value={profil.email || ""}
              readOnly
              aria-label="Din e-postadress"
            />

            <label htmlFor="telefon">Telefonnummer</label>
            <input
              id="telefon"
              type="tel"
              value={profil.telefon || ""}
              readOnly
              aria-label="Ditt telefonnummer"
            />

            <label htmlFor="adress">Adress</label>
            <textarea
              id="adress"
              value={profil.adress || ""}
              readOnly
              aria-label="Din adress"
            />
          </div>
        );
      }

      case "sakerhet": {
        return (
          <div>
            <h2>🔒 Säkerhet</h2>
            <label htmlFor="nytt-losen">Lösenord (ej aktivt ännu)</label>
            <input
              id="nytt-losen"
              type="password"
              placeholder="Nytt lösenord"
              disabled
            />

            <label htmlFor="ny-email">Ny e-postadress (ej aktivt ännu)</label>
            <input
              id="ny-email"
              type="email"
              placeholder="Ny e-post"
              disabled
            />
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
    <div className="profil-container">
      <aside>
        <h3>👋 Hej, {profil?.namn || "Användare"}</h3>
        <nav className="profil-nav">
          {sektioner.map((s) => (
            <button
              key={s.id}
              onClick={() => setAktiv(s.id)}
              className={`profil-knapp ${aktiv === s.id ? "aktiv" : ""}`}
              type="button"
            >
              {s.namn}
            </button>
          ))}
          <button onClick={loggaUt} className="profil-logout" type="button">
            🚪 Logga ut
          </button>
        </nav>
      </aside>
      <main>{renderInnehall()}</main>
    </div>
  );
}

export default MinProfil;
