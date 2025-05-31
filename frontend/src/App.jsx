import { useState, useEffect } from "react";
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


const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [meny, setMeny] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [valdRatt, setValdRatt] = useState(null);
  const [redigeringsIndex, setRedigeringsIndex] = useState(null);
  const [varukorg, setVarukorg] = useState(() => {
    const sparad = localStorage.getItem("varukorg");
    return sparad ? JSON.parse(sparad) : [];
  });
  const [tillbehor, setTillbehor] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [inloggad, setInloggad] = useState(!!localStorage.getItem("token"));

  const [tema, setTema] = useState(() => {
    return localStorage.getItem("tema") || "light";
  });

  useEffect(() => {
    document.body.className = tema;
    localStorage.setItem("tema", tema);
  }, [tema]);

  const växlaTema = () => {
    setTema((prev) => {
      return prev === "light" ? "dark" : "light";
    });
  };

  useEffect(() => {
    localStorage.setItem("varukorg", JSON.stringify(varukorg));
  }, [varukorg]);

  useEffect(() => {
    const fetchMeny = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/meny`);
        if (!res.ok) {
          throw new Error("Något gick fel vid hämtning");
        }
        const data = await res.json();
        setMeny(data);
      } catch (error) {
        console.error("Fel:", error);
        setError("Kunde inte ladda menydata från servern.");
      } finally {
        setLoading(false);
      }
    };

    fetchMeny();
  }, []);

  useEffect(() => {
    const fetchTillbehor = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/tillbehor`);
        if (!res.ok) {
          throw new Error("Kunde inte ladda tillbehör");
        }
        const data = await res.json();
        setTillbehor(data);
      } catch (error) {
        console.error("Fel vid tillbehör:", error);
      }
    };

    fetchTillbehor();
  }, []);

  useEffect(() => {
    const observer = () => {
      setInloggad(!!localStorage.getItem("token"));
    };
    window.addEventListener("storage", observer);
    return () => {
      window.removeEventListener("storage", observer);
    };
  }, []);

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
        {!["/", "/restaurang", "/login", "/register"].includes(location.pathname) && (
          <>
            {!inloggad ? (
              <>
                <button onClick={() => navigate("/")}>🏠 Startsida</button>
                <button onClick={() => navigate("/valj-restaurang")}>🍽️ Restauranger</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/profil")}>👤 Min profil</button>
                <button onClick={() => navigate("/valj-restaurang")}>🏠 Välj restaurang</button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    alert("Du är nu utloggad.");
                    navigate("/");
                    setInloggad(false);
                  }}
                >
                  🚪 Logga ut
                </button>
              </>
            )}
          </>
        )}

        <button onClick={växlaTema} aria-label="Växla mellan mörkt och ljust läge">
          {tema === "light" ? "🌙 Mörkt läge" : "☀️ Ljust läge"}
        </button>
      </div>

      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/valj-restaurang" element={<ValjRestaurang />} />
        <Route path="/profil" element={<MinProfil />} />
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
              />
            ) : (
              <Start />
            )
          }
        />
        <Route path="/checkout" element={<Checkout varukorg={varukorg} setVarukorg={setVarukorg} />} />
        <Route path="/tack" element={<Tack />} />
        <Route path="/restaurang" element={<Restaurang />} />
        <Route path="/mina-bestallningar" element={<MinaBeställningar />} />
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
                          alert("🔒 Du måste logga in för att kunna göra en beställning.");
                          return navigate("/login");
                        }
                        setValdRatt(ratt);
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
                  tillbehor={tillbehor}
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

      {/* ✅ Dölj kundvagnsflyt på profil/start/restaurang */}
      {inloggad &&
        !["/profil", "/restaurang", "/"].includes(location.pathname) && (
          <button
            onClick={() => navigate("/kundvagn")}
            className="kundvagn-flyt"
            aria-label="Gå till kundvagn"
          >
            🛒 Kundvagn ({varukorg.length})
          </button>
        )}
    </>
  );
}

export default App;
