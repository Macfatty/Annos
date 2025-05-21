import React, { useEffect, useState } from "react";

function MinaBeställningar() {
  const [ordrar, setOrdrar] = useState([]);
  const [fel, setFel] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token)
      return setFel("Du måste vara inloggad för att se dina beställningar.");

    fetch("http://localhost:3001/api/my-orders", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrdrar(data);
        } else {
          setFel(data.error || "Kunde inte hämta beställningar.");
        }
      })
      .catch(() => {
        setFel("Tekniskt fel vid hämtning av beställningar.");
      });
  }, []);

  const formateraTid = (timestamp) => {
    return new Date(timestamp).toLocaleString("sv-SE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const beställIgen = (innehall) => {
    localStorage.setItem("varukorg", JSON.stringify(innehall));
    alert("✅ Beställningen har lagts till i kundvagnen");
    window.location.href = "/kundvagn";
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>📦 Mina Beställningar</h1>

      {fel && <p style={{ color: "red" }}>{fel}</p>}
      {ordrar.length === 0 && !fel && (
        <p>Du har inga tidigare beställningar.</p>
      )}

      {ordrar.map((order) => {
        const innehall = JSON.parse(order.order_json);

        return (
          <div
            key={order.id}
            style={{
              border: "1px solid #ccc",
              marginBottom: "1rem",
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            <p>
              <strong>🕒 Tid:</strong> {formateraTid(order.created_at)}
            </p>
            <p>
              <strong>📍 Adress:</strong> {order.adress}
            </p>
            {order.extraInfo && (
              <p>
                <strong>📝 Info:</strong> {order.extraInfo}
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

            <button
              onClick={() => beställIgen(innehall)}
              style={{ marginTop: "1rem" }}
            >
              🔁 Beställ igen
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default MinaBeställningar;
