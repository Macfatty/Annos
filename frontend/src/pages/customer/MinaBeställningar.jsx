import { useEffect, useState } from "react";
import "../../styles/App.css";
import { fetchProfile, fetchMyOrders } from "../../services/api";

function MinaBeställningar({ onBeställIgen }) {
  const [bestallningar, setBestallningar] = useState([]);
  const [fel, setFel] = useState(null);
  const [laddar, setLaddar] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const profile = await fetchProfile();
        if (!profile) {
          setFel("Du är inte inloggad.");
          setLaddar(false);
          return;
        }

        const data = await fetchMyOrders();

        const bearbetade = (data || []).map((order) => {
          let rader = [];
          try {
            // Försök först med den nya strukturen (order_json)
            if (order.order_json) {
              rader = JSON.parse(order.order_json);
            } else if (order.items) {
              // Om det är den nya datastrukturen med items och options
              rader = order.items.map(item => ({
                namn: item.name,
                total: item.line_total / 100, // Konvertera från öre till kronor
                tillval: item.options ? item.options.map(option => ({
                  namn: option.label,
                  pris: option.price_delta / 100, // Konvertera från öre till kronor
                  typ: option.typ,
                  customNote: option.custom_note
                })) : []
              }));
            }
          } catch {
            rader = [];
          }
          return { ...order, rader };
        });

        setBestallningar(bearbetade);
        setLaddar(false);
      } catch (err) {
        setFel(err.message);
        setLaddar(false);
      }
    };

    loadOrders();
  }, []);

  if (laddar) {
    return <p>Laddar dina tidigare beställningar...</p>;
  }

  if (fel) {
    return <p style={{ color: "red" }}>{fel}</p>;
  }

  if (bestallningar.length === 0) {
    return <p>Du har inga tidigare beställningar.</p>;
  }

  return (
    <div className="bestallningar">
      <h2>Tidigare beställningar</h2>
      {bestallningar.map((order) => (
        <div key={order.id} className="bestallningskort">
          <p>
            <strong>Datum:</strong>{" "}
            {new Date(order.created_at).toLocaleString("sv-SE")}
          </p>
          <p>
            <strong>Restaurang:</strong> {order.restaurant_slug || "Okänd"}
          </p>
          <p>
            <strong>Status:</strong> {order.status}
          </p>
          <ul>
            {order.rader.map((rad, index) => (
              <li key={index}>
                {rad.namn} – {rad.total || rad.pris} kr
                {Array.isArray(rad.tillval) && rad.tillval.length > 0 && (
                  <ul>
                    {rad.tillval.map((t, i) => (
                      <li key={i}>
                        + {t.namn}
                        {t.pris !== 0 && ` (${t.pris > 0 ? "+" : ""}${t.pris} kr)`}
                        {t.customNote && (
                          <span style={{ fontStyle: "italic", color: "#666" }}>
                            {" "}- "{t.customNote}"
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p>
            <strong>Total:</strong> {order.total} kr
          </p>
          {onBeställIgen && (
            <button
              onClick={() => onBeställIgen(order.rader)}
              aria-label="Beställ igen"
            >
              🔁 Beställ igen
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default MinaBeställningar;
