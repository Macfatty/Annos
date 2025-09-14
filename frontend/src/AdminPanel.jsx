// src/AdminPanel.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function AdminPanel() {
  const navigate = useNavigate();
  const [ordrar, setOrdrar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fel, setFel] = useState(null);
  const [valdRestaurang, setValdRestaurang] = useState("alla");

  // Kontrollera adminroll
  useEffect(() => {
    const kontrollera = async () => {
      try {
        const profil = await fetchProfile();
        if (!profil || profil.role !== "admin") {
          navigate("/");
        }
      } catch (err) {
        console.error("Fel vid hämtning av profil:", err);
        navigate("/");
      }
    };
    kontrollera();
  }, [navigate]);

  // Hämta ordrar
  const hamtaOrdrar = useCallback(async (valdRestaurang = null) => {
    setLoading(true);
    try {
      const url = valdRestaurang 
        ? `${BASE_URL}/api/admin/orders/today?slug=${valdRestaurang}`
        : `${BASE_URL}/api/admin/orders/today`;
      
      const res = await fetch(url, {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Kunde inte hämta ordrar");
      }
      const data = await res.json();
      setOrdrar(data);
      setFel(null);
    } catch (err) {
      console.error(err);
      setFel("Fel vid hämtning av ordrar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hamtaOrdrar(valdRestaurang === "alla" ? null : valdRestaurang);
  }, [hamtaOrdrar, valdRestaurang]);

  const hanteraRestaurangVal = (restaurang) => {
    setValdRestaurang(restaurang);
  };

  // Markera som klar
  const markeraSomKlar = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/${id}/klart`, {
        method: "PATCH",
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Kunde inte markera som klar");
      }
      setOrdrar((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error(err);
      alert("❌ Misslyckades att markera ordern som klar");
    }
  };

  const darkMode = document.body.classList.contains("dark");

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📋 Adminpanel – Dagens ordrar</h1>
      
      {/* Admin Navigation Dropdown */}
      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="admin-nav">Admin Navigation:</label>
        <select 
          id="admin-nav"
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              navigate(value);
            }
          }}
          style={{ padding: "0.5rem", fontSize: "1rem" }}
          defaultValue=""
        >
          <option value="">Välj vy...</option>
          <option value="/admin">📋 Admin Panel</option>
          <option value="/restaurang-vy">🍽️ Visa som Restaurang</option>
          <option value="/kurir-vy">🚚 Visa som Kurir</option>
          <option value="/">🏠 Startsida</option>
          <option value="/valj-restaurang">🍕 Välj Restaurang</option>
          <option value="/campino">🍕 Campino Meny</option>
          <option value="/sunsushi">🍣 SunSushi Meny</option>
          <option value="/login">🔐 Login</option>
          <option value="/register">📝 Register</option>
        </select>
      </div>
      
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="restaurang-val">Visa ordrar för:</label>
        <select 
          id="restaurang-val"
          value={valdRestaurang} 
          onChange={(e) => hanteraRestaurangVal(e.target.value)}
          style={{ padding: "0.5rem", fontSize: "1rem" }}
        >
          <option value="alla">Alla restauranger</option>
          <option value="campino">Campino</option>
          <option value="sunsushi">SunSushi</option>
        </select>
        <button onClick={() => hamtaOrdrar(valdRestaurang === "alla" ? null : valdRestaurang)} disabled={loading}>
          🔄 Uppdatera
        </button>
      </div>

      {loading && <p>Laddar...</p>}
      {fel && <p style={{ color: "red" }}>{fel}</p>}

      {ordrar.length === 0 && !loading ? (
        <p>Inga beställningar ännu.</p>
      ) : (
        ordrar.map((order) => {
          let rader = [];
          try {
            // Försök först med den nya strukturen (order_json)
            if (order.order_json) {
              rader = JSON.parse(order.order_json);
            } else if (order.items) {
              // Om det är den nya datastrukturen med items
              rader = order.items.map(item => ({
                namn: item.name,
                total: item.line_total / 100, // Konvertera från öre till kronor
                tillval: [] // TODO: Lägg till tillval-hantering för nya strukturen
              }));
            }
          } catch {
            rader = [];
          }

          return (
            <div
              key={order.id}
              style={{
                backgroundColor: darkMode ? "#2a2a2a" : "#f5f5f5",
                color: darkMode ? "white" : "black",
                border: "1px solid #ccc",
                padding: "1rem",
                marginBottom: "1.5rem",
                borderRadius: "8px",
              }}
            >
              <p><strong>⏰ Tid:</strong> {new Date(order.created_at).toLocaleTimeString("sv-SE")}</p>
              <p><strong>🏪 Restaurang:</strong> {order.restaurant_slug || order.restaurangSlug || 'Okänd'}</p>
              <p><strong>👤 Kund:</strong> {order.customer_name || order.namn} | {order.customer_phone || order.telefon}</p>
              <p><strong>📍 Adress:</strong> {order.customer_address || order.adress}</p>
              {order.extraInfo && <p><strong>📦 Info:</strong> {order.extraInfo}</p>}
              <p><strong>Total:</strong> {order.grand_total ? (order.grand_total / 100) : order.total} kr</p>
              <ul>
                {rader.map((rad, i) => (
                  <li key={i}>
                    {rad.namn} ({rad.total} kr)
                    {rad.tillval?.length > 0 && (
                      <ul>
                        {rad.tillval.map((t, j) => (
                          <li key={j}>+ {t.namn} ({t.pris} kr)</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <button onClick={() => markeraSomKlar(order.id)} style={{ marginTop: "1rem" }}>
                ✅ Markera som klar
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

export default AdminPanel;
