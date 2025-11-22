import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MinaBeställningar from "./MinaBeställningar";
import { fetchProfile, updateProfile } from "../../services/api";

function MinProfil() {
  const navigate = useNavigate();
  const [aktiv, setAktiv] = useState("info");
  const [profil, setProfil] = useState(null);
  const [redigerar, setRedigerar] = useState(false);
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
      try {
        const data = await fetchProfile();

        // Validate that we got a proper user object
        if (data && typeof data === 'object' && data.email) {
          setProfil(data);
          localStorage.setItem("kundinfo", JSON.stringify(data));
        } else {
          console.warn("[MinProfil] Invalid profile data received:", data);
          throw new Error("Invalid profile data");
        }
      } catch (err) {
        console.error("[MinProfil] Error loading profile:", err);

        // Try localStorage as fallback
        const fallback = localStorage.getItem("kundinfo");
        if (fallback) {
          try {
            const parsed = JSON.parse(fallback);

            // Clean up contaminated localStorage (from before authService fix)
            if (parsed.success !== undefined || (parsed.data && typeof parsed.data === 'object' && !parsed.email)) {
              console.log("[MinProfil] Detected contaminated localStorage - clearing and redirecting to login");
              localStorage.removeItem("kundinfo");
              alert("Din session har förfallit. Vänligen logga in igen.");
              navigate("/login");
              return;
            }

            // Valid localStorage data
            setProfil(parsed);
          } catch (parseErr) {
            console.error("[MinProfil] Invalid localStorage data:", parseErr);
            localStorage.removeItem("kundinfo");
            alert("Kunde inte ladda profil. Vänligen logga in igen.");
            navigate("/login");
          }
        } else {
          // No fallback, redirect to login
          alert("Kunde inte ladda profil. Vänligen logga in igen.");
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

  const hanteraInputChange = (fält, värde) => {
    console.log(`[MinProfil] hanteraInputChange: ${fält} = "${värde}"`);
    setProfil(prev => {
      const updated = {
        ...prev,
        [fält]: värde
      };
      console.log("[MinProfil] Uppdaterad profil:", updated);
      return updated;
    });
  };

  const sparaProfil = async () => {
    try {
      // Skicka till backend för att spara i databasen
      const updatedProfile = await updateProfile({
        namn: profil.namn,
        telefon: profil.telefon,
        adress: profil.adress || ""
      });
      
      // Uppdatera lokal state med den sparade profilen
      setProfil(updatedProfile);
      
      // Uppdatera även localStorage för kompatibilitet
      localStorage.setItem("kundinfo", JSON.stringify(updatedProfile));
      
      setRedigerar(false);
      alert("✅ Profil sparad i databasen!");
    } catch (err) {
      console.error("Fel vid sparande av profil:", err);
      alert("❌ Kunde inte spara profil");
    }
  };

  const renderInnehall = () => {
    if (!profil) {
      return <p>Laddar...</p>;
    }

    switch (aktiv) {
      case "info": {
        console.log("[MinProfil] Rendering info section. redigerar:", redigerar);
        return (
          <div style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2>👤 Mina uppgifter</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!redigerar ? (
                  <button
                    onClick={() => {
                      console.log("[MinProfil] Aktiverar redigeringsläge");
                      console.log("[MinProfil] Profil före redigering:", profil);
                      setRedigerar(true);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    ✏️ Redigera
                  </button>
                ) : (
                  <>
                    <button
                      onClick={sparaProfil}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        backgroundColor: "#28a745", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "4px", 
                        cursor: "pointer" 
                      }}
                    >
                      💾 Spara
                    </button>
                    <button
                      onClick={() => setRedigerar(false)}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        backgroundColor: "#6c757d", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "4px", 
                        cursor: "pointer" 
                      }}
                    >
                      ❌ Avbryt
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: "100%", maxWidth: "400px" }}>
                <label htmlFor="namn" style={{ display: "block", marginBottom: "0.5rem", textAlign: "left" }}>Namn</label>
                <input
                  id="namn"
                  value={profil.namn || ""}
                  readOnly={!redigerar}
                  onChange={(e) => {
                    console.log("[MinProfil] Namn onChange:", e.target.value, "readOnly:", !redigerar);
                    hanteraInputChange("namn", e.target.value);
                  }}
                  onFocus={() => console.log("[MinProfil] Namn focused. redigerar:", redigerar, "readOnly:", !redigerar)}
                  aria-label="Ditt namn"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    backgroundColor: redigerar ? "white" : "#f8f9fa"
                  }}
                />
              </div>

              <div style={{ width: "100%", maxWidth: "400px" }}>
                <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem", textAlign: "left" }}>
                  E-postadress
                  <span style={{ fontSize: "0.8rem", color: "#999", marginLeft: "0.5rem" }}>
                    (kan ej ändras)
                  </span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={profil.email || ""}
                  readOnly={true}
                  aria-label="Din e-postadress (kan ej ändras)"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    backgroundColor: "#f0f0f0",
                    cursor: "not-allowed",
                    color: "#666"
                  }}
                />
              </div>

              <div style={{ width: "100%", maxWidth: "400px" }}>
                <label htmlFor="telefon" style={{ display: "block", marginBottom: "0.5rem", textAlign: "left" }}>Telefonnummer</label>
                <input
                  id="telefon"
                  type="tel"
                  value={profil.telefon || ""}
                  readOnly={!redigerar}
                  onChange={(e) => hanteraInputChange("telefon", e.target.value)}
                  aria-label="Ditt telefonnummer"
                  style={{ 
                    width: "100%", 
                    padding: "0.75rem", 
                    borderRadius: "4px", 
                    border: "1px solid #ccc",
                    backgroundColor: redigerar ? "white" : "#f8f9fa"
                  }}
                />
              </div>

              <div style={{ width: "100%", maxWidth: "400px" }}>
                <label htmlFor="adress" style={{ display: "block", marginBottom: "0.5rem", textAlign: "left" }}>Adress</label>
                <textarea
                  id="adress"
                  value={profil.adress || ""}
                  readOnly={!redigerar}
                  onChange={(e) => hanteraInputChange("adress", e.target.value)}
                  aria-label="Din adress"
                  style={{ 
                    width: "100%", 
                    padding: "0.75rem", 
                    borderRadius: "4px", 
                    border: "1px solid #ccc", 
                    minHeight: "80px", 
                    resize: "vertical",
                    backgroundColor: redigerar ? "white" : "#f8f9fa"
                  }}
                />
              </div>
            </div>
          </div>
        );
      }

      case "sakerhet": {
        return (
          <div style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
            <h2>🔒 Säkerhet</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: "100%", maxWidth: "400px" }}>
                <label htmlFor="nytt-losen" style={{ display: "block", marginBottom: "0.5rem", textAlign: "left" }}>Lösenord (ej aktivt ännu)</label>
                <input
                  id="nytt-losen"
                  type="password"
                  placeholder="Nytt lösenord"
                  disabled
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>

              <div style={{ width: "100%", maxWidth: "400px" }}>
                <label htmlFor="ny-email" style={{ display: "block", marginBottom: "0.5rem", textAlign: "left" }}>Ny e-postadress (ej aktivt ännu)</label>
                <input
                  id="ny-email"
                  type="email"
                  placeholder="Ny e-post"
                  disabled
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #ccc" }}
                />
              </div>
            </div>
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
