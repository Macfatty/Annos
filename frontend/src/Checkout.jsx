import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Checkout({ varukorg, setVarukorg }) {
  const [kundinfo, setKundinfo] = useState({
    namn: "",
    email: "",
    telefon: "",
    adress: ""
  });
  const [ovrigt, setOvrigt] = useState("");
  const navigate = useNavigate();

  const total = varukorg.reduce((sum, item) => {
    return sum + item.total;
  }, 0);

  useEffect(() => {
    const lagrad = localStorage.getItem("kundinfo");
    if (lagrad) {
      setKundinfo(JSON.parse(lagrad));
    }
  }, []);

  const skickaBestallning = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kund: { ...kundinfo, ovrigt },
          order: varukorg,
        }),
      });

      if (res.ok) {
        setVarukorg([]);
        sessionStorage.setItem("bestallningSkickad", "true");

        await new Promise((res) => setTimeout(res, 150));
        navigate("/tack");
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
      <p>
        <strong>Totalt att betala:</strong> {total} kr
      </p>

      <h3>Kunduppgifter</h3>

      <label htmlFor="namn">Namn</label>
      <input
        id="namn"
        value={kundinfo.namn}
        readOnly
        aria-label="Ditt namn"
      />

      <label htmlFor="telefon">Telefonnummer</label>
      <input
        id="telefon"
        value={kundinfo.telefon}
        readOnly
        aria-label="Ditt telefonnummer"
      />

      <label htmlFor="email">E-postadress</label>
      <input
        id="email"
        type="email"
        value={kundinfo.email}
        readOnly
        aria-label="Din e-postadress"
      />

      <label htmlFor="ovrigt">Meddelande till restaurangen</label>
      <textarea
        id="ovrigt"
        placeholder="Skriv ett meddelande till restaurangen..."
        value={ovrigt}
        onChange={(e) => {
          setOvrigt(e.target.value);
        }}
        aria-label="Meddelande till restaurangen"
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

      <label htmlFor="adress">Adress</label>
      <input
        id="adress"
        value={kundinfo.adress}
        readOnly
        aria-label="Din adress"
      />

      <button
        onClick={() => {
          navigate("/kundvagn");
        }}
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

      <button
        onClick={skickaBestallning}
        style={{ marginTop: "1.5rem" }}
        disabled={varukorg.length === 0}
      >
        ✅ Bekräfta och skicka beställning
      </button>
    </div>
  );
}

export default Checkout;
