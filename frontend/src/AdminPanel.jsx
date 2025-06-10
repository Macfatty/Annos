// src/AdminPanel.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function AdminPanel() {
  const navigate = useNavigate();
  const [ordrar, setOrdrar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fel, setFel] = useState(null);

  const token = localStorage.getItem("token");

  // Kontrollera adminroll
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (!payload.isAdmin) {
        navigate("/");
      }
    } catch (err) {
      console.error("Ogiltig token:", err);
      navigate("/");
    }
  }, [navigate, token]);

  // Hämta ordrar
  const hamtaOrdrar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/today`, {
        headers: { Authorization: `Bearer ${token}` },
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
  }, [token]);

  useEffect(() => {
    hamtaOrdrar();
  }, [hamtaOrdrar]);

  // Markera som klar
  const markeraSomKlar = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/${id}/klart`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
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

  const tema = localStorage.getItem("tema") === "dark";

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📋 Adminpanel – Dagens ordrar</h1>
      <button onClick={hamtaOrdrar} disabled={loading} style={{ marginBottom: "1rem" }}>
        🔄 Uppdatera
      </button>

      {loading && <p>Laddar...</p>}
      {fel && <p style={{ color: "red" }}>{fel}</p>}

      {ordrar.length === 0 && !loading ? (
        <p>Inga beställningar ännu.</p>
      ) : (
        ordrar.map((order) => {
          let rader = [];
          try {
            rader = JSON.parse(order.order_json);
          } catch {
            rader = [];
          }

          return (
            <div
              key={order.id}
              style={{
                backgroundColor: tema ? "#2a2a2a" : "#f5f5f5",
                color: tema ? "white" : "black",
                border: "1px solid #ccc",
                padding: "1rem",
                marginBottom: "1.5rem",
                borderRadius: "8px",
              }}
            >
              <p><strong>⏰ Tid:</strong> {new Date(order.created_at).toLocaleTimeString("sv-SE")}</p>
              <p><strong>👤 Kund:</strong> {order.namn} | {order.telefon}</p>
              <p><strong>📍 Adress:</strong> {order.adress}</p>
              {order.extraInfo && <p><strong>📦 Info:</strong> {order.extraInfo}</p>}
              <p><strong>Total:</strong> {order.total} kr</p>
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
