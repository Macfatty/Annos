import { useEffect, useState } from "react";
import "./App.css";
import { fetchProfile } from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function MinaBeställningar({ onBeställIgen }) {
  const [bestallningar, setBestallningar] = useState([]);
  const [fel, setFel] = useState(null);
  const [laddar, setLaddar] = useState(true);

  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        if (!profile) {
          setFel("Du är inte inloggad.");
          return null;
        }
        return fetch(`${BASE_URL}/api/my-orders`, {
          credentials: "include",
        });
      })
      .then((res) => {
        if (!res) {
          return null;
        }
        if (!res.ok) {
          throw new Error("Kunde inte ladda beställningar.");
        }
        return res.json();
      })
      .then((data) => {
        const bearbetade = (data || []).map((order) => {
          let rader = [];
          try {
            rader = JSON.parse(order.order_json || "[]");
          } catch {
            rader = [];
          }
          return { ...order, rader };
        });
        setBestallningar(bearbetade);
        setLaddar(false);
      })
      .catch((err) => {
        setFel(err.message);
        setLaddar(false);
      });
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
            <strong>Restaurang:</strong> {order.restaurangSlug || "Okänd"}
          </p>
          <p>
            <strong>Status:</strong> {order.status}
          </p>
          <ul>
            {order.rader.map((rad, index) => (
              <li key={index}>
                {rad.namn} – {rad.pris} kr
                {Array.isArray(rad.tillval) && rad.tillval.length > 0 && (
                  <ul>
                    {rad.tillval.map((t, i) => (
                      <li key={i}>{t.namn}</li>
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
