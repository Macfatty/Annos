import React, { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Restaurang() {
  const [dagensOrdrar, setDagensOrdrar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fel, setFel] = useState(null);

  const hamtaOrdrar = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/today`);
      if (!res.ok) throw new Error("Kunde inte hämta dagens ordrar");
      const data = await res.json();
      setDagensOrdrar(data);
      setFel(null);
    } catch (err) {
      console.error(err);
      setFel("Något gick fel vid hämtning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hamtaOrdrar();
    const interval = setInterval(() => {
      hamtaOrdrar();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const markeraSomKlar = async (orderId) => {
    try {
      await fetch(`${BASE_URL}/api/admin/orders/${orderId}/klart`, {
        method: "POST",
      });
      setDagensOrdrar((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      alert("❌ Kunde inte markera som klar");
      console.error(err);
    }
  };

  const formateraTid = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ärMörktLäge = localStorage.getItem("tema") === "dark";

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📋 Dagens Beställningar</h1>

      <button
        onClick={hamtaOrdrar}
        disabled={loading}
        style={{
          marginBottom: "1rem",
          opacity: loading ? 0.5 : 1,
        }}
      >
        🔄 Uppdatera manuellt
      </button>

      {loading && <p>Laddar...</p>}
      {fel && <p style={{ color: "red" }}>{fel}</p>}

      {dagensOrdrar.length === 0 && !loading ? (
        <p>Inga beställningar idag.</p>
      ) : (
        dagensOrdrar.map((order) => {
          const innehall = JSON.parse(order.order_json);
          const tid = new Date(order.created_at);
          const nu = new Date();
          const diffMin = (nu - tid) / (1000 * 60);

          let färg = "white";
          if (order.status === "klar") färg = "lightgreen";
          else if (diffMin < 1) färg = "lightcoral";

          if (ärMörktLäge) {
            if (order.status === "klar") färg = "#2e7031";
            else if (diffMin < 1) färg = "#803333";
            else färg = "#2a2a2a";
          }

          return (
            <div
              key={order.id}
              className="restaurang-kort"
              style={{
                border: "2px solid #ccc",
                padding: "1rem",
                marginBottom: "1.5rem",
                borderRadius: "10px",
                backgroundColor: färg,
                color: ärMörktLäge ? "white" : "black", // 🔧 säkrar färg
              }}
            >
              <p>
                <strong>⏰ Tid:</strong> {formateraTid(order.created_at)}
              </p>
              <p>
                <strong>👤 Kund:</strong> {order.namn} | {order.telefon}
              </p>
              <p>
                <strong>📍 Adress:</strong> {order.adress}
              </p>
              {order.extraInfo && (
                <p>
                  <strong>📦 Info:</strong> {order.extraInfo}
                </p>
              )}
              <ul>
                {innehall.map((rätt, i) => (
                  <li key={i}>
                    🍕 <strong>{rätt.namn}</strong> – {rätt.total} kr
                    {rätt.tillval?.length > 0 && (
                      <ul>
                        {rätt.tillval.map((t, j) => (
                          <li key={j}>
                            ➕ {t.namn} ({t.pris} kr)
                          </li>
                        ))}
                      </ul>
                    )}
                    {rätt.borttagna?.length > 0 && (
                      <ul style={{ color: "red", fontSize: "0.9rem" }}>
                        {rätt.borttagna.map((b, j) => (
                          <li key={j}>❌ {b.namn}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              {order.status !== "klar" && (
                <button
                  onClick={() => markeraSomKlar(order.id)}
                  style={{ marginTop: "1rem" }}
                >
                  ✅ Markera som klar
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default Restaurang;
