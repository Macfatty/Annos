
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Checkout({ varukorg, setVarukorg }) {
  const [kundinfo, setKundinfo] = useState({});
  const [ovrigt, setOvrigt] = useState("");
  const navigate = useNavigate();

  const total = varukorg.reduce((sum, item) => sum + item.pris, 0);

  useEffect(() => {
    const lagrad = JSON.parse(localStorage.getItem("kundinfo"));
    if (lagrad) setKundinfo(lagrad);
  }, []);

  const skickaBestallning = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kund: { ...kundinfo, ovrigt },
          order: varukorg,
        }),
      });

      if (res.ok) {
        alert("Beställningen är skickad!");
        setVarukorg([]);
        navigate("/tack"); // byt till tack-sida senare
      } else {
        alert("Fel vid beställning.");
      }
    } catch (err) {
      console.error("Nätverksfel:", err);
      alert("Något gick fel.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <h1>🧾 Checkout</h1>
      <p><strong>Totalt att betala:</strong> {total} kr</p>
      <h3>Kunduppgifter</h3>
      <input value={kundinfo.namn || ""} readOnly />
      <input value={kundinfo.telefon || ""} readOnly />
      <input value={kundinfo.email || ""} readOnly />
      <textarea
        placeholder="Skriv ett meddelande till restaurangen..."
        value={ovrigt}
        onChange={(e) => setOvrigt(e.target.value)}
        style={{
          width: "100%",
          minHeight: "100px",
          padding: "1rem",
          borderRadius: "8px",
          fontSize: "1rem",
          backgroundColor: "#222",
          color: "white",
          border: "1px solid #444",
          resize: "vertical",
          marginBottom: "1rem",
        }}
      />
      <input value={kundinfo.adress || ""} readOnly />

      <button
        onClick={() => navigate("/kundvagn")}
        style={{
          marginTop: "1.5rem",
          backgroundColor: "#444",
          color: "white",
          padding: "0.75rem 1.25rem",
          borderRadius: "10px",
          border: "1px solid #777",
          cursor: "pointer",
          fontSize: "1rem",
          marginRight: "1rem",
        }}
      >
        🔙 Tillbaka till kundvagn
      </button>

      <button onClick={skickaBestallning} style={{ marginTop: "1.5rem" }}>
        ✅ Bekräfta och skicka beställning
      </button>
    </div>
  );
}

export default Checkout;
