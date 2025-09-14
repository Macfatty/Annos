import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import { fetchProfile, createOrder } from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Checkout({ varukorg, setVarukorg, restaurant_slug }) {
  const navigate = useNavigate();
  const darkMode = document.body.classList.contains("dark");

  const [kundinfo, setKundinfo] = useState({
    namn: "",
    email: "",
    telefon: "",
    adress: "",
    ovrigt: "",
  });

  useEffect(() => {
    const loadKundinfo = async () => {
      try {
        // Först försök hämta från profil
        const profile = await fetchProfile();
        if (profile) {
          setKundinfo({
            namn: profile.namn || "",
            email: profile.email || "",
            telefon: profile.telefon || "",
            adress: profile.adress || "",
            ovrigt: "", // Övrigt fylls alltid i manuellt
          });
          return;
        }
      } catch (err) {
        console.log("Kunde inte hämta profil, försöker med localStorage");
      }

      // Fallback till localStorage om profil inte kunde hämtas
      const sparad = localStorage.getItem("kundinfo");
      if (sparad) {
        try {
          const info = JSON.parse(sparad);
          setKundinfo({
            namn: info.namn || "",
            email: info.email || "",
            telefon: info.telefon || "",
            adress: info.adress || "",
            ovrigt: info.ovrigt || "",
          });
        } catch (err) {
          console.error("Fel vid parsing av kundinfo:", err);
        }
      }
    };

    loadKundinfo();
  }, []);

  const totalPris = varukorg.reduce((summa, item) => {
    const tillvalPris = Array.isArray(item.tillval)
      ? item.tillval.reduce((acc, val) => acc + (val.pris || 0), 0)
      : 0;
    return summa + item.pris + tillvalPris;
  }, 0);

  const skickaBestallning = async () => {
    try {
      const profile = await fetchProfile();
      if (!profile) {
        alert("🔒 Du måste logga in för att kunna lägga en beställning.");
        navigate("/login");
        return;
      }

      // Validera att alla obligatoriska fält är ifyllda
      const saknadeFalt = [];
      if (!kundinfo.namn?.trim()) {
        saknadeFalt.push("Namn");
      }
      if (!kundinfo.email?.trim()) {
        saknadeFalt.push("E-post");
      }
      if (!kundinfo.telefon?.trim()) {
        saknadeFalt.push("Telefon");
      }
      if (!kundinfo.adress?.trim()) {
        saknadeFalt.push("Adress");
      }

      if (saknadeFalt.length > 0) {
        alert(`❌ Fyll i eller uppdatera din information för att kunna lägga en beställning.\n\nSaknade fält: ${saknadeFalt.join(", ")}\n\nAnvänd "🔄 Uppdatera från profil"-knappen för att fylla i automatiskt.`);
        return;
      }

      const payload = {
        kund: {
          namn: kundinfo.namn,
          email: kundinfo.email,
          telefon: kundinfo.telefon,
          adress: kundinfo.adress,
          ovrigt: kundinfo.ovrigt,
        },
        order: varukorg,
        restaurant_slug: restaurant_slug,
      };

      await createOrder(payload);
      localStorage.setItem("kundinfo", JSON.stringify(kundinfo));
      sessionStorage.setItem("tack", "1");
      setVarukorg([]);
      navigate(`/tack?restaurang=${restaurant_slug}`);
    } catch (err) {
      if (err?.status === 401) {
        localStorage.clear();
        alert("🔒 Din session har gått ut. Logga in igen.");
        navigate("/login");
      } else {
        console.error("Fel vid beställning:", err);
        alert("❌ Kunde inte lägga beställningen. Kontrollera att alla fält är korrekt ifyllda och försök igen.");
      }
    }
  };

  return (
    <div className="checkout" style={{ padding: "2rem", maxWidth: "1200px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>🧾 Slutför beställning</h2>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr", 
        gap: "2rem",
        alignItems: "start"
      }}>
        
        {/* Vänster kolumn - Kunduppgifter */}
        <div style={{ 
          backgroundColor: darkMode ? "#2a2a2a" : "#f8f9fa", 
          padding: "1.5rem", 
          borderRadius: "8px",
          border: `1px solid ${darkMode ? "#444" : "#ddd"}`
        }}>
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, color: darkMode ? "white" : "black" }}>👤 Kunduppgifter</h3>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              skickaBestallning();
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="coNamn" style={{ display: "block", marginBottom: "0.5rem", color: darkMode ? "white" : "black" }}>Namn:</label>
              <input
                id="coNamn"
                type="text"
                value={kundinfo.namn}
                onChange={(e) => setKundinfo({ ...kundinfo, namn: e.target.value })}
                required
                style={{ 
                  width: "100%", 
                  padding: "0.75rem", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc",
                  backgroundColor: darkMode ? "#333" : "white",
                  color: darkMode ? "white" : "black"
                }}
              />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="coEmail" style={{ display: "block", marginBottom: "0.5rem", color: darkMode ? "white" : "black" }}>E-post:</label>
              <input
                id="coEmail"
                type="email"
                value={kundinfo.email}
                onChange={(e) => setKundinfo({ ...kundinfo, email: e.target.value })}
                required
                style={{ 
                  width: "100%", 
                  padding: "0.75rem", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc",
                  backgroundColor: darkMode ? "#333" : "white",
                  color: darkMode ? "white" : "black"
                }}
              />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="coTelefon" style={{ display: "block", marginBottom: "0.5rem", color: darkMode ? "white" : "black" }}>Telefon:</label>
              <input
                id="coTelefon"
                type="tel"
                value={kundinfo.telefon}
                onChange={(e) => setKundinfo({ ...kundinfo, telefon: e.target.value })}
                required
                style={{ 
                  width: "100%", 
                  padding: "0.75rem", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc",
                  backgroundColor: darkMode ? "#333" : "white",
                  color: darkMode ? "white" : "black"
                }}
              />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="coAdress" style={{ display: "block", marginBottom: "0.5rem", color: darkMode ? "white" : "black" }}>Adress:</label>
              <input
                id="coAdress"
                type="text"
                value={kundinfo.adress}
                onChange={(e) => setKundinfo({ ...kundinfo, adress: e.target.value })}
                required
                style={{ 
                  width: "100%", 
                  padding: "0.75rem", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc",
                  backgroundColor: darkMode ? "#333" : "white",
                  color: darkMode ? "white" : "black"
                }}
              />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="coOvrigt" style={{ display: "block", marginBottom: "0.5rem", color: darkMode ? "white" : "black" }}>Övrigt:</label>
              <textarea
                id="coOvrigt"
                value={kundinfo.ovrigt}
                onChange={(e) => setKundinfo({ ...kundinfo, ovrigt: e.target.value })}
                aria-label="Övrig information till restaurangen"
                style={{ 
                  width: "100%", 
                  padding: "0.75rem", 
                  borderRadius: "4px", 
                  border: "1px solid #ccc",
                  backgroundColor: darkMode ? "#333" : "white",
                  color: darkMode ? "white" : "black",
                  minHeight: "80px",
                  resize: "vertical"
                }}
              />
            </div>
            
            {/* Uppdatera från profil knapp */}
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const profile = await fetchProfile();
                    if (profile) {
                      setKundinfo({
                        namn: profile.namn || "",
                        email: profile.email || "",
                        telefon: profile.telefon || "",
                        adress: profile.adress || "",
                        ovrigt: kundinfo.ovrigt, // Behåll övrigt
                      });
                      alert("✅ Profiluppgifter uppdaterade!");
                    } else {
                      alert("❌ Kunde inte hämta profiluppgifter");
                    }
                  } catch (err) {
                    console.error("Kunde inte uppdatera från profil:", err);
                    alert("❌ Kunde inte uppdatera från profil. Kontrollera att du är inloggad.");
                  }
                }}
                style={{
                  backgroundColor: darkMode ? "#007bff" : "#0056b3",
                  color: "white",
                  border: "none",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  transition: "background-color 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = darkMode ? "#0056b3" : "#004085";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = darkMode ? "#007bff" : "#0056b3";
                }}
              >
                🔄 Uppdatera från profil
              </button>
            </div>
          </form>
        </div>

        {/* Mitten kolumn - Betalning */}
        <div style={{ 
          backgroundColor: darkMode ? "#2a2a2a" : "#f8f9fa", 
          padding: "1.5rem", 
          borderRadius: "8px",
          border: `1px solid ${darkMode ? "#444" : "#ddd"}`,
          textAlign: "center"
        }}>
          <h3 style={{ marginBottom: "1rem", color: darkMode ? "white" : "black" }}>💳 Betalning</h3>
          
          <div style={{ 
            backgroundColor: darkMode ? "#1a1a1a" : "#e9ecef", 
            padding: "1rem", 
            borderRadius: "8px", 
            marginBottom: "1.5rem" 
          }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: darkMode ? "white" : "black", marginBottom: "0.5rem" }}>
              Total: {totalPris} kr
            </div>
            <div style={{ fontSize: "0.9rem", color: darkMode ? "#ccc" : "#666" }}>
              Inkl. moms och leverans
            </div>
          </div>

          <button
            type="submit"
            onClick={skickaBestallning}
            style={{ 
              backgroundColor: "#00D4AA", 
              color: "white", 
              border: "none",
              padding: "1rem 2rem", 
              borderRadius: "8px", 
              fontSize: "1.1rem", 
              fontWeight: "bold",
              cursor: "pointer",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            💚 Betala med Swish
          </button>

          <button
            type="button"
            onClick={() => navigate("/kundvagn")}
            style={{ 
              backgroundColor: darkMode ? "#333" : "#6c757d", 
              color: "white", 
              border: "none",
              padding: "0.75rem 1.5rem", 
              borderRadius: "6px", 
              marginTop: "1rem",
              cursor: "pointer",
              width: "100%"
            }}
          >
            🛒 Tillbaka till kundvagn
          </button>
        </div>

        {/* Höger kolumn - Beställningsdetaljer */}
        <div style={{ 
          backgroundColor: darkMode ? "#2a2a2a" : "#f8f9fa", 
          padding: "1.5rem", 
          borderRadius: "8px",
          border: `1px solid ${darkMode ? "#444" : "#ddd"}`
        }}>
          <h3 style={{ marginBottom: "1rem", color: darkMode ? "white" : "black" }}>🛒 Din beställning</h3>
          
          {varukorg.length === 0 ? (
            <p style={{ color: darkMode ? "#ccc" : "#666", textAlign: "center" }}>Inga varor i kundvagnen</p>
          ) : (
            <div>
              {varukorg.map((item, index) => (
                <div key={index} style={{ 
                  borderBottom: `1px solid ${darkMode ? "#444" : "#ddd"}`, 
                  paddingBottom: "0.75rem", 
                  marginBottom: "0.75rem" 
                }}>
                  <div style={{ 
                    fontWeight: "bold", 
                    color: darkMode ? "white" : "black",
                    marginBottom: "0.25rem"
                  }}>
                    {item.namn}
                  </div>
                  
                  {item.tillval && item.tillval.length > 0 && (
                    <div style={{ marginLeft: "1rem", marginBottom: "0.5rem" }}>
                      {item.tillval.map((tillval, tillvalIndex) => (
                        <div key={tillvalIndex} style={{ 
                          fontSize: "0.9rem", 
                          color: darkMode ? "#ccc" : "#666",
                          marginBottom: "0.25rem"
                        }}>
                          + {tillval.namn} ({tillval.pris} kr)
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    color: darkMode ? "white" : "black"
                  }}>
                    <span>Antal: {item.antal || 1}</span>
                    <span style={{ fontWeight: "bold" }}>{item.total || item.pris} kr</span>
                  </div>
                </div>
              ))}
              
              <div style={{ 
                borderTop: `2px solid ${darkMode ? "#444" : "#ddd"}`, 
                paddingTop: "0.75rem", 
                marginTop: "1rem" 
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  color: darkMode ? "white" : "black"
                }}>
                  <span>Totalt:</span>
                  <span>{totalPris} kr</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Checkout;
