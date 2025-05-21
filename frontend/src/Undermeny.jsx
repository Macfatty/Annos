import React, { useState } from "react";
import "./App.css";

function Undermeny({ ratt, tillbehor, onClose, onAddToCart }) {
  const [oppenKategori, setOppenKategori] = useState(null);
  const token = localStorage.getItem("token");

  const [förvaldaIds] = useState(() => {
    const innehall =
      typeof ratt.ingredienser === "string"
        ? ratt.ingredienser
            .toLowerCase()
            .split(",")
            .map((i) => i.trim())
        : [];

    return tillbehor
      .filter(
        (t) => !t.storlekar && innehall.includes(t.namn.toLowerCase().trim())
      )
      .map((t) => t.id);
  });

  const [valda, setValda] = useState(förvaldaIds);
  const [valdaVarianter, setValdaVarianter] = useState({});

  const toggle = (id) => {
    setValda((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleKategori = (kategori) => {
    setOppenKategori((prev) => (prev === kategori ? null : kategori));
  };

  const baspris = ratt.pris;

  const borttagnaFörvalda = förvaldaIds.filter((id) => !valda.includes(id));
  const extraValda = valda.filter((id) => !förvaldaIds.includes(id));

  const tillvalVanliga = tillbehor.filter((t) => extraValda.includes(t.id));
  const borttagnaObjekt = tillbehor.filter((t) =>
    borttagnaFörvalda.includes(t.id)
  );

  const tillvalVarianter = Object.values(valdaVarianter).map((variantId) => {
    const huvud = tillbehor.find((t) =>
      t.storlekar?.some((s) => s.id === variantId)
    );
    const variant = huvud?.storlekar.find((s) => s.id === variantId);
    return {
      id: variant.id,
      namn: `${huvud.namn} (${variant.namn})`,
      pris: variant.pris,
    };
  });

  const tillval = [...tillvalVanliga, ...tillvalVarianter];
  const minus = borttagnaObjekt.reduce((sum, t) => sum + t.pris, 0);
  const plus = tillval.reduce((sum, t) => sum + t.pris, 0);

  const totalpris = Math.max(baspris - minus + plus, baspris);

  const läggTill = () => {
    const beställning = {
      namn: ratt.namn,
      pris: ratt.pris,
      tillval: [...tillval],
      borttagna: [...borttagnaObjekt], // 🔴 detta gör att skinka etc. sparas
      total: totalpris,
    };
    onAddToCart(beställning);
  };

  const grupperade = tillbehor.reduce((acc, curr) => {
    const typ = curr.typ ?? "okänd";
    if (!acc[typ]) acc[typ] = [];
    acc[typ].push(curr);
    return acc;
  }, {});

  const ingaTillbehor = Object.keys(grupperade).length === 0;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{ratt.namn}</h2>
        <p>{ratt.beskrivning}</p>
        <p>
          <strong>Grundpris: {baspris} kr</strong>
        </p>
        <p>
          <strong>Ingredienser:</strong> {ratt.ingredienser}
        </p>

        <h4>Välj tillbehör:</h4>
        {ingaTillbehor && (
          <p style={{ color: "gray", fontStyle: "italic" }}>
            Inga tillbehör tillgängliga.
          </p>
        )}

        {Object.entries(grupperade).map(([kategori, items]) => (
          <div key={kategori} style={{ marginBottom: "1rem" }}>
            <h5
              style={{
                cursor: "pointer",
                textTransform: "capitalize",
                color: "#007bff",
              }}
              onClick={() => toggleKategori(kategori)}
            >
              {oppenKategori === kategori ? "▾" : "▸"} {kategori}
            </h5>

            {oppenKategori === kategori && (
              <div style={{ marginLeft: "1rem" }}>
                {items.map((item) => (
                  <div key={item.id} style={{ marginBottom: "0.5rem" }}>
                    {!item.storlekar ? (
                      <label
                        title={
                          förvaldaIds.includes(item.id)
                            ? "Detta tillbehör ingår i rätten, du kan ta bort det om du vill."
                            : ""
                        }
                      >
                        <input
                          type="checkbox"
                          checked={valda.includes(item.id)}
                          onChange={() => toggle(item.id)}
                        />{" "}
                        <span
                          style={{
                            color: förvaldaIds.includes(item.id)
                              ? "#666"
                              : "black",
                            fontStyle: förvaldaIds.includes(item.id)
                              ? "italic"
                              : "normal",
                          }}
                        >
                          {item.namn}
                          {förvaldaIds.includes(item.id) && " (ingår)"}
                        </span>
                        {` (+${item.pris} kr)`}
                      </label>
                    ) : (
                      <div>
                        <strong>{item.namn}</strong>
                        {item.storlekar.map((variant) => (
                          <label
                            key={variant.id}
                            style={{ display: "block", marginLeft: "1rem" }}
                          >
                            <input
                              type="radio"
                              name={`storlek-${item.id}`}
                              checked={valdaVarianter[item.id] === variant.id}
                              onChange={() =>
                                setValdaVarianter((prev) => ({
                                  ...prev,
                                  [item.id]: variant.id,
                                }))
                              }
                            />{" "}
                            {variant.namn} (+{variant.pris} kr)
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <p>
          <strong>Totalpris: {totalpris} kr</strong>
        </p>

        {token ? (
          <button onClick={läggTill}>Lägg till i varukorg</button>
        ) : (
          <p style={{ color: "red", fontWeight: "bold" }}>
            🔒 Du måste vara inloggad för att lägga till i varukorgen.
          </p>
        )}
        <button onClick={onClose}>Stäng</button>
      </div>
    </div>
  );
}

export default Undermeny;
