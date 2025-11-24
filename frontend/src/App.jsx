import { useState, useEffect } from "react";
import "./styles/App.css";
import Undermeny from "./components/forms/Undermeny";
import Kundvagn from "./pages/customer/Kundvagn";
import Checkout from "./pages/customer/Checkout";
import Restaurang from "./pages/restaurant/Restaurang";
import MinaBeställningar from "./pages/customer/MinaBeställningar";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Start from "./pages/Start";
import ValjRestaurang from "./pages/restaurant/ValjRestaurang";
import MinProfil from "./pages/customer/MinProfil";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Tack from "./pages/customer/Tack";
import AdminPanel from "./pages/admin/AdminPanel";
import KurirVy from "./pages/courier/KurirVy";
import RestaurangVy from "./pages/restaurant/RestaurangVy";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useAuth, useCart, useTheme } from "./hooks";
import { fetchMenu } from "./services/api";
import { RoleProvider } from "./contexts/RoleContext";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  // Custom hooks
  const {
    inloggad,
    authLoading,
    backendError,
    isAdmin,
    isCourier,
    isRestaurant,
    loggaUt,
    role,
    profil
  } = useAuth();
  
  const { 
    varukorg, 
    valdRatt, 
    antalVaror, 
    addToCart, 
    setValdRatt, 
    setRedigeringsIndex,
    setVarukorg
  } = useCart();
  
  const { tema, växlaTema } = useTheme();

  // Local state för meny
  const [meny, setMeny] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Tema och varukorg hanteras nu av custom hooks

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        const data = await fetchMenu(restaurant_slug);
        setMeny(data);
        setError(null);
      } catch (err) {
        console.error("Fel vid hämtning av meny:", err);
        if (err.status === 0) {
          setError("Kunde inte ansluta till servern. Kontrollera att backend körs.");
        } else if (err.status === 404) {
          setError(`Meny hittades inte för restaurang: ${restaurant_slug}`);
        } else {
          setError("Kunde inte ladda menydata från servern.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, [restaurant_slug]);


  // Autentisering, tema och varukorg hanteras nu av custom hooks

  // Retry-funktion för backend-fel
  const handleRetry = () => {
    window.location.reload(); // Enkel lösning för att ladda om sidan
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
        <p style={{ fontSize: "0.9rem", color: "var(--text-color)", opacity: "0.7" }}>
          Starta backend med: <code>cd backend && npm start</code>
        </p>
      </div>
    );
  }

  return (
    <RoleProvider role={role} profil={profil}>
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
                    await loggaUt();
                    alert("Du är nu utloggad.");
                    navigate("/");
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
        <Route path="/admin" element={
          <ErrorBoundary>
            <AdminPanel />
          </ErrorBoundary>
        } />
        <Route path="/kurir" element={
          <ErrorBoundary>
            <KurirVy />
          </ErrorBoundary>
        } />
        <Route path="/kurir-vy" element={
          <ErrorBoundary>
            <KurirVy />
          </ErrorBoundary>
        } />
        <Route path="/restaurang/:slug/incoming" element={
          <ErrorBoundary>
            <RestaurangVy />
          </ErrorBoundary>
        } />
        <Route path="/restaurang-vy" element={
          <ErrorBoundary>
            <RestaurangVy />
          </ErrorBoundary>
        } />
        
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
            <ErrorBoundary>
              <Checkout
                varukorg={varukorg}
                setVarukorg={setVarukorg}
                restaurant_slug={restaurant_slug}
              />
            </ErrorBoundary>
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
                  onAddToCart={addToCart}
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
                  onAddToCart={addToCart}
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
            🛒 Kundvagn ({antalVaror})
          </button>
        )}
      {isCourier && (
        <button onClick={() => navigate("/kurir")}>🚚 Kurirpanel</button>
      )}
    </RoleProvider>
  );
}

export default App;
