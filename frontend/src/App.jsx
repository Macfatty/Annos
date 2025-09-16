import { useState, useEffect, useCallback } from "react";
import "./App.css";
import Undermeny from "./Undermeny";
import Kundvagn from "./Kundvagn";
import Checkout from "./Checkout";
import Restaurang from "./Restaurang";
import MinaBeställningar from "./MinaBeställningar";
import Login from "./Login";
import Register from "./Register";
import Start from "./Start";
import ValjRestaurang from "./ValjRestaurang";
import MinProfil from "./MinProfil";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Tack from "./Tack";
import AdminPanel from "./AdminPanel";
import KurirVy from "./KurirVy";
import RestaurangVy from "./RestaurangVy";
import { fetchProfile, logout, checkBackendHealth } from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  const [meny, setMeny] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [valdRatt, setValdRatt] = useState(null);
  const [redigeringsIndex, setRedigeringsIndex] = useState(null);
  const [varukorg, setVarukorg] = useState(() => {
    const sparad = localStorage.getItem("varukorg");
    return sparad ? JSON.parse(sparad) : [];
  });
  const [inloggad, setInloggad] = useState(false);
  const [role, setRole] = useState("");
  const [authLoading, setAuthLoading] = useState(true); // Ny state för auth-loading
  const [backendError, setBackendError] = useState(false); // Ny state för backend-fel
  const isAdmin = role === "admin";
  const isCourier = role === "courier";
  const isRestaurant = role === "restaurant";
  const [tema, setTema] = useState(
    () => localStorage.getItem("tema") || "light"
  );
  const [restaurant_slug, setRestaurant_slug] = useState("campino");

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const slug = query.get("restaurang");
    if (slug) {
      setRestaurant_slug(slug);
    }
  }, [location.search]);

  useEffect(() => {
    const slugPath = location.pathname.slice(1).toLowerCase();
    if (["campino", "sunsushi"].includes(slugPath)) {
        setRestaurant_slug(slugPath);
    }
  }, [location.pathname]);

  useEffect(() => {
    document.body.className = tema;
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    localStorage.setItem("varukorg", JSON.stringify(varukorg));
  }, [varukorg]);

  useEffect(() => {
    const fetchMeny = async () => {
      if (!BASE_URL) {
        setError(
          "Fel: VITE_API_BASE_URL saknas i .env. Ange adressen till backend."
        );
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${BASE_URL}/api/meny?restaurang=${restaurant_slug}`
        );
        if (!res.ok) {
          throw new Error("Något gick fel vid hämtning");
        }
        const data = await res.json();
        setMeny(data);
      } catch (err) {
        console.error("Fel:", err);
        if (err.message === "Failed to fetch") {
          setError(
            "Kunde inte ansluta till servern. Kontrollera VITE_API_BASE_URL."
          );
        } else {
          setError("Kunde inte ladda menydata från servern.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMeny();
  }, [restaurant_slug]);


  const loadProfile = useCallback(async () => {
    setAuthLoading(true);
    
    try {
      // Kontrollera först om vi har någon indikation på att användaren är inloggad
      const hasStoredAuth = localStorage.getItem("kundinfo");
      
      // Om ingen lagrad autentisering finns, hoppa över profilhämtning
      if (!hasStoredAuth) {
        setInloggad(false);
        setRole("");
        setBackendError(false); // Ingen backend-fel om ingen auth finns
        return;
      }

      // Kontrollera om backend är tillgänglig innan vi försöker hämta profil
      const backendAvailable = await checkBackendHealth();
      if (!backendAvailable) {
        console.warn("Backend inte tillgänglig - användaren förblir utloggad");
        setInloggad(false);
        setRole("");
        setBackendError(true);
        return;
      }
      
      setBackendError(false); // Backend är tillgänglig

      const data = await fetchProfile();
      setInloggad(true);
      setRole(data.role || "");
    } catch (err) {
      if (err?.status === 401) {
        // Session har förfallit - rensa lokal data
        localStorage.removeItem("kundinfo");
        localStorage.removeItem("varukorg");
        setInloggad(false);
        setRole("");
        console.log("Session förfallen - användaren är utloggad");
      } else if (err?.status === 0) {
        // Nätverksfel - backend är inte tillgänglig
        console.warn("Nätverksfel vid profilhämtning - användaren förblir utloggad");
        setInloggad(false);
        setRole("");
        setBackendError(true);
      } else if (err?.status === 408) {
        // Timeout - backend svarar för långsamt
        console.warn("Timeout vid profilhämtning - användaren förblir utloggad");
        setInloggad(false);
        setRole("");
        setBackendError(true);
      } else {
        // Andra fel
        console.error("Fel vid profilhämtning:", err);
        setInloggad(false);
        setRole("");
        setBackendError(true);
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const observer = () => {
      loadProfile();
    };
    window.addEventListener("storage", observer);
    return () => {
      window.removeEventListener("storage", observer);
    };
  }, [loadProfile]);

  const växlaTema = () => {
    setTema((prev) => (prev === "light" ? "dark" : "light"));
  };

  const retryConnection = () => {
    setBackendError(false);
    setAuthLoading(true);
    loadProfile();
  };

  // Lägg till retry-funktion för när användaren klickar på retry-knappen
  const handleRetry = () => {
    retryConnection();
  };

  // Visa loading-indikator medan autentisering kontrolleras
  if (authLoading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <div style={{ fontSize: "2rem" }}>🔄</div>
        <p>Kontrollerar autentisering...</p>
      </div>
    );
  }

  // Visa backend-fel med retry-knapp
  if (backendError) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        flexDirection: "column",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center"
      }}>
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <h2>Backend inte tillgänglig</h2>
        <p>Servern svarar inte. Kontrollera att backend körs på port 3001.</p>
        <button 
          onClick={handleRetry}
          style={{
            padding: "1rem 2rem",
            fontSize: "1.1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          🔄 Försök igen
        </button>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Starta backend med: <code>cd backend && npm start</code>
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        role="navigation"
        aria-label="Navigering"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1rem",
          padding: "1rem",
          flexWrap: "wrap",
        }}
      >
        {!["/", "/restaurang", "/login", "/register"].includes(path) && (
          <>
            {!inloggad ? (
              <>
                <button onClick={() => navigate("/")}>🏠 Startsida</button>
                <button onClick={() => navigate("/valj-restaurang")}>
                  🍽️ Restauranger
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/profil")}>
                  👤 Min profil
                </button>
                <button onClick={() => navigate("/valj-restaurang")}>
                  🏠 Välj restaurang
                </button>
                {isAdmin && (
                  <button onClick={() => navigate("/admin")}>
                    🛠 Adminpanel
                  </button>
                )}
                {isRestaurant && (
                  <button onClick={() => navigate(`/restaurang/${restaurant_slug}/incoming`)}>
                    🍽 Restaurangvy
                  </button>
                )}
                {isCourier && (
                  <button onClick={() => navigate("/kurir")}>
                    🚚 Kurirpanel
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      await logout();
                      localStorage.clear();
                      window.dispatchEvent(new Event("storage"));
                      alert("Du är nu utloggad.");
                      navigate("/");
                      setInloggad(false);
                    } catch (err) {
                      console.error("Logout error:", err);
                      // Logga ut lokalt även om API-anropet misslyckas
                      localStorage.clear();
                      window.dispatchEvent(new Event("storage"));
                      navigate("/");
                      setInloggad(false);
                    }
                  }}
                >
                  🚪 Logga ut
                </button>
              </>
            )}
          </>
        )}

        <button
          onClick={växlaTema}
          aria-label="Växla mellan mörkt och ljust läge"
        >
          {tema === "light" ? "🌙 Mörkt läge" : "☀️ Ljust läge"}
        </button>
      </div>

      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/valj-restaurang" element={<ValjRestaurang />} />
        <Route path="/profil" element={<MinProfil />} />
        <Route path="/mina-bestallningar" element={<MinaBeställningar />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/kurir" element={<KurirVy />} />
        <Route path="/kurir-vy" element={<KurirVy />} />
        <Route path="/restaurang/:slug/incoming" element={<RestaurangVy />} />
        <Route path="/restaurang-vy" element={<RestaurangVy />} />
        
        {/* Admin test routes */}
        <Route path="/admin-test" element={<Start />} />

        <Route
          path="/kundvagn"
          element={
            inloggad ? (
              <Kundvagn
                varukorg={varukorg}
                setVarukorg={setVarukorg}
                setValdRatt={setValdRatt}
                setRedigeringsIndex={setRedigeringsIndex}
                meny={meny}
                navigate={navigate}
                restaurant_slug={restaurant_slug}
              />
            ) : (
              <Start />
            )
          }
        />
        <Route
          path="/checkout"
          element={
            <Checkout
              varukorg={varukorg}
              setVarukorg={setVarukorg}
              restaurant_slug={restaurant_slug}
            />
          }
        />
        <Route path="/tack" element={<Tack />} />
        <Route path="/restaurang" element={<Restaurang />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/campino"
          element={
            <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
              <h1>Campino Meny</h1>
              {loading && <p>Laddar meny...</p>}
              {error && <p style={{ color: "red" }}>{error}</p>}
              <div className="menu-container">
                {!loading &&
                  !error &&
                  meny.map((ratt) => (
                    <div
                      key={ratt.id}
                      className="menu-card"
                      onClick={() => {
                        if (!inloggad) {
                          alert(
                            "🔒 Du måste logga in för att kunna göra en beställning."
                          );
                          navigate("/login");
                          return;
                        }
                        setValdRatt({ ...ratt, restaurantSlug: "campino" });
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={`/bilder/${ratt.bild}`}
                        alt={ratt.namn}
                        className="menu-image"
                        onError={(e) => {
                          e.target.src = "/bilder/default.jpg";
                        }}
                      />
                      <h2>{ratt.namn}</h2>
                      <p>{ratt.beskrivning}</p>
                      <p>
                        <strong>{ratt.pris} kr</strong>
                      </p>
                    </div>
                  ))}
              </div>

              {valdRatt && (
                <Undermeny
                  ratt={valdRatt}
                  isLoggedIn={inloggad}
                  onClose={() => setValdRatt(null)}
                  onAddToCart={(val) => {
                    if (redigeringsIndex !== null) {
                      const ny = [...varukorg];
                      ny[redigeringsIndex] = val;
                      setVarukorg(ny);
                      setRedigeringsIndex(null);
                    } else {
                      setVarukorg([...varukorg, val]);
                    }
                    setValdRatt(null);
                  }}
                />
              )}
            </div>
          }
        />
        <Route
          path="/sunsushi"
          element={
            <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
              <h1>SunSushi Meny</h1>
              {loading && <p>Laddar meny...</p>}
              {error && <p style={{ color: "red" }}>{error}</p>}
              <div className="menu-container">
                {!loading &&
                  !error &&
                  meny.map((ratt) => (
                    <div
                      key={ratt.id}
                      className="menu-card"
                      onClick={() => {
                        if (!inloggad) {
                          alert(
                            "🔒 Du måste logga in för att kunna göra en beställning."
                          );
                          navigate("/login");
                          return;
                        }
                        setValdRatt({ ...ratt, restaurantSlug: "sunsushi" });
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={`/bilder/${ratt.bild}`}
                        alt={ratt.namn}
                        className="menu-image"
                        onError={(e) => {
                          e.target.src = "/bilder/default.jpg";
                        }}
                      />
                      <h2>{ratt.namn}</h2>
                      <p>{ratt.beskrivning}</p>
                      <p>
                        <strong>{ratt.pris} kr</strong>
                      </p>
                    </div>
                  ))}
              </div>

              {valdRatt && (
                <Undermeny
                  ratt={valdRatt}
                  isLoggedIn={inloggad}
                  onClose={() => setValdRatt(null)}
                  onAddToCart={(val) => {
                    if (redigeringsIndex !== null) {
                      const ny = [...varukorg];
                      ny[redigeringsIndex] = val;
                      setVarukorg(ny);
                      setRedigeringsIndex(null);
                    } else {
                      setVarukorg([...varukorg, val]);
                    }
                    setValdRatt(null);
                  }}
                />
              )}
            </div>
          }
        />
      </Routes>

      {inloggad &&
        (path === "/campino" || path === "/sunsushi" || path === "/kundvagn") && (
          <button
            onClick={() => navigate(`/checkout?restaurang=${restaurant_slug}`)}
            className="kundvagn-flyt"
            aria-label="Gå till kundvagn"
          >
            🛒 Kundvagn ({varukorg.length})
          </button>
        )}
      {isCourier && (
        <button onClick={() => navigate("/kurir")}>🚚 Kurirpanel</button>
      )}
    </>
  );
}

export default App;
