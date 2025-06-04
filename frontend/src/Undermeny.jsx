import { useState, useRef } from "react";
import "./App.css";

function Undermeny({ ratt, tillbehor, onClose, onAddToCart }) {
  const [oppenKategori, setOppenKategori] = useState(null);
  const kategoriRefs = useRef({});
  const token = localStorage.getItem("token");

  const [valda, setValda] = useState({});
  const [valfriSasText, setValfriSasText] = useState("");

  const grupperade = tillbehor.reduce((acc, curr) => {
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
          ärValfri: curr.id === 211,
        });
      });
    } else {
      acc[typ].push({
        id: curr.id,
        namn: curr.namn,
        pris: curr.pris,
        parentId: curr.id,
        ärValfri: curr.id === 211,
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

  for (const t of tillbehor) {
    if (t.storlekar) {
      for (const v of t.storlekar) {
        if (valda[v.id]) {
          valdaTillval.push({
            id: v.id,
            namn: `${t.namn} – ${v.namn}`,
            pris: v.pris,
            antal: valda[v.id],
            totalpris: valda[v.id] * v.pris,
            extraKommentar:
              t.id === 211 ? valfriSasText : undefined,
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
          <button onClick={onClose} style={{ backgroundColor: "#dc3545", color: "white", width: "100%" }}>
            ❌ Stäng undermeny
          </button>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginTop: "0.5rem" }}>
            {Object.keys(grupperade).map((kategori) => (
              <button key={kategori} onClick={() => { scrollTo(kategori); toggleKategori(kategori); }}>
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

        {/* Scrollbar mitten */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {oppenKategori && grupperade[oppenKategori] && (
            <div ref={(el) => (kategoriRefs.current[oppenKategori] = el)}>
              <h5 style={{ fontSize: "1rem", color: "#007bff" }}>{oppenKategori}</h5>
              <div style={{ marginLeft: "1rem" }}>
                {grupperade[oppenKategori].map((item) => (
                  <div key={item.id} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <label htmlFor={`chk-${item.id}`} style={{ flex: 1 }}>
                      <input
                        id={`chk-${item.id}`}
                        type="checkbox"
                        checked={valda[item.id] > 0}
                        onChange={(e) => ändraVal(item.id, e.target.checked)}
                      />{" "}
                      {item.namn} (+{item.pris} kr)
                    </label>
                    {valda[item.id] > 0 && (
                      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <button onClick={() => minskaAntal(item.id)} style={knappStil}>➖</button>
                        <span>{valda[item.id]}</span>
                        <button onClick={() => ökaAntal(item.id)} style={knappStil}>➕</button>
                      </div>
                    )}
                    {item.ärValfri && valda[item.id] > 0 && (
                      <input
                        type="text"
                        value={valfriSasText}
                        onChange={(e) => setValfriSasText(e.target.value)}
                        placeholder="Önskad sås"
                        style={{ flexBasis: "100%", marginLeft: "2rem", marginTop: "0.2rem" }}
                        aria-label="Skriv önskad sås"
                      />
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
          {token ? (
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
  padding: "0 6px",
  userSelect: "none",
};

export default Undermeny;
