import { useState, useRef } from "react";
import "../../styles/App.css";
import { getAccessories } from "../../utils/getAccessoriesByRestaurant";

function Undermeny({ ratt, onClose, onAddToCart, isLoggedIn }) {
  const [oppenKategori, setOppenKategori] = useState(null);
 const kategoriRefs = useRef({});
  const darkMode = document.body.classList.contains("dark");

  const [valda, setValda] = useState({});
  const [valfriText, setValfriText] = useState({}); // För varje vald vara separat

  // Hämta rätt tillbehör baserat på restaurantSlug
  const slug = ratt?.restaurantSlug;
  const rattTillbehor = getAccessories(slug);

  const grupperade = rattTillbehor.reduce((acc, curr) => {
    const typ = curr.typ ?? "okänd";
    if (!acc[typ]) {
      acc[typ] = [];
    }

    if (curr.storlekar) {
      curr.storlekar.forEach((variant) => {
        acc[typ].push({
          id: variant.id,
          namn: `${curr.namn} – ${variant.namn}`,
          pris: variant.pris,
          parentId: curr.id,
          ärValfri: curr.namn.toLowerCase().includes("valfri"),
        });
      });
    } else {
        acc[typ].push({
          id: curr.id,
          namn: curr.namn,
          pris: curr.pris,
          parentId: curr.id,
          ärValfri: curr.typ === "valfri" || curr.allowCustom === true || curr.namn.toLowerCase().includes("valfri"),
        });
    }

    return acc;
  }, {});

  const toggleKategori = (kategori) => {
    setOppenKategori((prev) => {
      if (prev === kategori) {
        return null;
      } else {
        return kategori;
      }
    });
  };

  const scrollTo = (kategori) => {
    if (kategoriRefs.current[kategori]) {
      kategoriRefs.current[kategori].scrollIntoView({ behavior: "smooth" });
    }
  };

  const ändraVal = (id, checked) => {
    setValda((prev) => {
      const nytt = { ...prev };
      if (checked) {
        nytt[id] = 1;
      } else {
        delete nytt[id];
      }
      return nytt;
    });
  };

  const ökaAntal = (id) => {
    setValda((prev) => ({
      ...prev,
      [id]: (prev[id] || 1) + 1,
    }));
  };

  const minskaAntal = (id) => {
    setValda((prev) => {
      const nytt = { ...prev };
      if (nytt[id] > 1) {
        nytt[id] = nytt[id] - 1;
      } else {
        delete nytt[id];
      }
      return nytt;
    });
  };

  const baspris = ratt.pris;

  const valdaTillval = [];

  for (const t of rattTillbehor) {
    if (t.storlekar) {
      for (const v of t.storlekar) {
        if (valda[v.id]) {
          valdaTillval.push({
            id: v.id,
            namn: `${t.namn} – ${v.namn}`,
            pris: v.pris,
            antal: valda[v.id],
            totalpris: valda[v.id] * v.pris,
            custom_note: valfriText[v.id] || undefined,
          });
        }
      }
    } else if (valda[t.id]) {
      valdaTillval.push({
        id: t.id,
        namn: t.namn,
        pris: t.pris,
        antal: valda[t.id],
        totalpris: t.pris * valda[t.id],
        custom_note: valfriText[t.id] || undefined,
      });
    }
  }

  const total = baspris + valdaTillval.reduce((sum, t) => sum + t.totalpris, 0);

  const läggTill = () => {
    onAddToCart({
      namn: ratt.namn,
      pris: ratt.pris,
      tillval: valdaTillval,
      borttagna: [],
      total,
    });
  };

  return (
    <div className="modal">
      <div className="modal-content" style={{ display: "flex", flexDirection: "column", height: "90vh", padding: 0 }}>
        {/* Sticky Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: "inherit", padding: "1rem" }}>
          <button
            onClick={onClose}
            style={{ backgroundColor: darkMode ? "#802b2b" : "#dc3545", color: "white", width: "100%" }}
          >
            ❌ Stäng undermeny
          </button>
          <div style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            gap: "0.5rem", 
            justifyContent: "center", 
            marginTop: "0.5rem",
            maxWidth: "600px",
            margin: "0.5rem auto 0"
          }}>
            {Object.keys(grupperade).map((kategori) => (
              <button 
                key={`${slug}-${kategori}`} 
                onClick={() => { scrollTo(kategori); toggleKategori(kategori); }}
                style={{
                  flex: "1 1 calc(50% - 0.25rem)",
                  maxWidth: "calc(50% - 0.25rem)",
                  minWidth: "120px",
                  padding: "0.75rem 0.5rem",
                  fontSize: "0.9rem",
                  fontWeight: "bold"
                }}
              >
                {kategori}
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center", borderTop: "1px solid #ccc", marginTop: "0.5rem" }}>
            <h2>{ratt.namn}</h2>
            <p>{ratt.beskrivning}</p>
            <p><strong>Ingredienser:</strong> {ratt.ingredienser}</p>
            <p><strong>Grundpris: {baspris} kr</strong></p>
          </div>
        </div>

        {/* Scrollbar mitten - Mer utrymme för tillbehör */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", minHeight: "400px" }}>
          {oppenKategori && grupperade[oppenKategori] && (
            <div ref={(el) => (kategoriRefs.current[oppenKategori] = el)}>
              <h5 style={{ fontSize: "1rem", color: "#007bff" }}>{oppenKategori}</h5>
              <div style={{ marginLeft: "1rem", padding: "1rem", backgroundColor: darkMode ? "#2a2a2a" : "#f8f9fa", borderRadius: "8px" }}>
                {grupperade[oppenKategori].map((item) => (
                  <div key={`${slug}-${item.id}`} style={{ 
                    marginBottom: "1rem", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.75rem", 
                    flexWrap: "wrap",
                    padding: "0.75rem",
                    backgroundColor: darkMode ? "#3a3a3a" : "white",
                    borderRadius: "6px",
                    border: "1px solid #ddd"
                  }}>
                    <label htmlFor={`chk-${slug}-${item.id}`} style={{ flex: 1, fontSize: "1rem", fontWeight: "500" }}>
                      <input
                        id={`chk-${slug}-${item.id}`}
                        type="checkbox"
                        checked={valda[item.id] > 0}
                        onChange={(e) => ändraVal(item.id, e.target.checked)}
                        style={{ 
                          marginRight: "0.5rem", 
                          transform: "scale(1.2)",
                          accentColor: "#007bff"
                        }}
                      />
                      {item.namn} <span style={{ color: "#007bff", fontWeight: "bold" }}>(+{item.pris} kr)</span>
                    </label>
                    {valda[item.id] > 0 && (
                      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <button onClick={() => minskaAntal(item.id)} style={knappStil}>➖</button>
                        <span>{valda[item.id]}</span>
                        <button onClick={() => ökaAntal(item.id)} style={knappStil}>➕</button>
                      </div>
                    )}
                    {item.ärValfri && valda[item.id] > 0 && (
                      <div style={{ 
                        flexBasis: "100%", 
                        marginTop: "0.75rem",
                        padding: "0.5rem",
                        backgroundColor: darkMode ? "#4a4a4a" : "#f0f8ff",
                        borderRadius: "6px",
                        border: "2px solid #007bff"
                      }}>
                        <label htmlFor={`valfri-${slug}-${item.id}`} style={{ 
                          display: "block", 
                          fontSize: "0.9rem", 
                          fontWeight: "bold", 
                          marginBottom: "0.5rem",
                          color: "#007bff"
                        }}>
                          🍯 Ange vilken sås du vill ha:
                        </label>
                        <input
                          id={`valfri-${slug}-${item.id}`}
                          type="text"
                          value={valfriText[item.id] || ""}
                          onChange={(e) => setValfriText(prev => ({
                            ...prev,
                            [item.id]: e.target.value
                          }))}
                          placeholder="t.ex. sweet chili, teriyaki, soja..."
                          maxLength={140}
                          style={{ 
                            width: "100%",
                            padding: "0.75rem",
                            fontSize: "1rem",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            backgroundColor: darkMode ? "#2a2a2a" : "white",
                            color: darkMode ? "white" : "black"
                          }}
                          aria-label="Ange vilken sås du vill ha"
                        />
                        <div style={{ 
                          fontSize: "0.8rem", 
                          color: "#666", 
                          marginTop: "0.25rem",
                          textAlign: "right"
                        }}>
                          {(valfriText[item.id] || "").length}/140 tecken
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div style={{ position: "sticky", bottom: 0, padding: "1rem", background: "inherit", borderTop: "1px solid #ccc", zIndex: 15 }}>
          <p><strong>Totalpris: {total} kr</strong></p>
           {isLoggedIn ? (
            <button onClick={läggTill}>Lägg till i varukorg</button>
          ) : (
            <p style={{ color: "red", fontWeight: "bold" }}>
              🔒 Du måste vara inloggad för att lägga till i varukorgen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const knappStil = {
  all: "unset",
  cursor: "pointer",
  fontSize: "18px",
  padding: "0.25rem 0.5rem",
  userSelect: "none",
  backgroundColor: "#007bff",
  color: "white",
  borderRadius: "4px",
  minWidth: "32px",
  textAlign: "center",
  fontWeight: "bold"
};

export default Undermeny;
