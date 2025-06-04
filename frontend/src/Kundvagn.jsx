import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Kundvagn({
  varukorg,
  setVarukorg,
  setValdRatt,
  setRedigeringsIndex,
  meny,
  restaurangSlug,
}) {
  const navigate = useNavigate();
  const [laddar, setLaddar] = useState(false);

  const taBort = (index) => {
    const ny = [...varukorg];
    ny.splice(index, 1);
    setVarukorg(ny);
  };

  const ändra = (index) => {
    const rätt = varukorg[index];
    const match = meny.find((r) => r.namn === rätt.namn);
    if (!match) {
      alert("❌ Kunde inte hitta ursprungsrätten.");
      return;
    }

    setValdRatt(match);
    setRedigeringsIndex(index);
    navigate(`/${restaurangSlug || "valj-restaurang"}`);
  };

  const total = varukorg.reduce((sum, item) => sum + item.total, 0);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🛒 Din Kundvagn</h1>

      {laddar && <p>⏳ Laddar innehåll...</p>}

      {varukorg.length === 0 ? (
        <p>Varukorgen är tom.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {varukorg.map((ratt, index) => (
            <li
              key={index}
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            >
              <strong>{ratt.namn}</strong> – {ratt.total} kr
              {ratt.tillval.length > 0 && (
                <ul
                  style={{
                    fontSize: "0.9rem",
                    paddingLeft: "1rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {ratt.tillval.map((t, i) => (
                    <li key={i}>
                      + {t.namn} ({t.pris} kr)
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => ändra(index)}
                  style={{ marginRight: "0.5rem" }}
                >
                  Ändra
                </button>
                <button type="button" onClick={() => taBort(index)}>
                  🗑️ Ta bort
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p>
        <strong>Totalt att betala:</strong> {total} kr
      </p>

      <button
        type="button"
        onClick={() => navigate(`/${restaurangSlug || "valj-restaurang"}`)}
        aria-label="Gå tillbaka till menyn"
      >
        🍕 Tillbaka till meny
      </button>

      <button
        type="button"
        onClick={() => {
          setLaddar(true);
          navigate("/checkout");
        }}
        disabled={varukorg.length === 0}
        aria-label="Fortsätt till betalning"
      >
        ✅ Gå vidare till betalning
      </button>
    </div>
  );
}

export default Kundvagn;
