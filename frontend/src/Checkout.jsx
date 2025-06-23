import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import { fetchProfile } from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Checkout({ varukorg, setVarukorg, restaurang }) {
  const navigate = useNavigate();
  const darkMode = document.body.classList.contains("dark");

  const [kundinfo, setKundinfo] = useState({
    namn: "",
    email: "",
    telefon: "",
    adress: "",
    ovrigt: "",
  });

  useEffect(() => {
    const sparad = localStorage.getItem("kundinfo");
    if (sparad) {
      try {
        const info = JSON.parse(sparad);
        setKundinfo({
          namn: info.namn || "",
          email: info.email || "",
          telefon: info.telefon || "",
          adress: info.adress || "",
          ovrigt: info.ovrigt || "",
        });
      } catch (err) {
        console.error("Fel vid parsing av kundinfo:", err);
      }
    }
  }, []);

  const totalPris = varukorg.reduce((summa, item) => {
    const tillvalPris = Array.isArray(item.tillval)
      ? item.tillval.reduce((acc, val) => acc + (val.pris || 0), 0)
      : 0;
    return summa + item.pris + tillvalPris;
  }, 0);

   const skickaBestallning = async () => {
    const profile = await fetchProfile();
    if (!profile) {
      alert("🔒 Du måste logga in för att kunna lägga en beställning.");
      navigate("/login");
      return;
    }

    const payload = {
      kund: {
        namn: kundinfo.namn,
        email: kundinfo.email,
        telefon: kundinfo.telefon,
        adress: kundinfo.adress,
        ovrigt: kundinfo.ovrigt, // ✅ OBS: viktigt att denna matchar servern
      },
      order: varukorg, // ✅ Skickar bara maträtter
      restaurangSlug: restaurang,
    };

    fetch(`${BASE_URL}/api/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Skicka med cookies för autentisering
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Misslyckades att skicka beställning");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Beställning skickad:", data);
        localStorage.setItem("kundinfo", JSON.stringify(kundinfo));
        sessionStorage.setItem("tack", "1");
        setVarukorg([]);
        navigate(`/tack?restaurang=${restaurang}`);
      })
      .catch((err) => {
        console.error("Fel vid beställning:", err);
        alert("Kunde inte lägga beställningen. Försök igen.");
      });
  };

  return (
    <div className="checkout" style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <h2>🧾 Slutför beställning</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          skickaBestallning();
        }}
      >
        <label htmlFor="coNamn">Namn:</label>
        <input
          id="coNamn"
          type="text"
          value={kundinfo.namn}
          onChange={(e) => setKundinfo({ ...kundinfo, namn: e.target.value })}
          required
        />
        <label htmlFor="coEmail">E-post:</label>
        <input
          id="coEmail"
          type="email"
          value={kundinfo.email}
          onChange={(e) => setKundinfo({ ...kundinfo, email: e.target.value })}
          required
        />
        <label htmlFor="coTelefon">Telefon:</label>
        <input
          id="coTelefon"
          type="tel"
          value={kundinfo.telefon}
          onChange={(e) => setKundinfo({ ...kundinfo, telefon: e.target.value })}
          required
        />
        <label htmlFor="coAdress">Adress:</label>
        <input
          id="coAdress"
          type="text"
          value={kundinfo.adress}
          onChange={(e) => setKundinfo({ ...kundinfo, adress: e.target.value })}
          required
        />
        <label htmlFor="coOvrigt">Övrigt:</label>
        <textarea
          id="coOvrigt"
          value={kundinfo.ovrigt}
          onChange={(e) => setKundinfo({ ...kundinfo, ovrigt: e.target.value })}
          aria-label="Övrig information till restaurangen"
        />

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "2rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            style={{ backgroundColor: darkMode ? "#2e7031" : "green", color: "white" }}
          >
            ✅ Bekräfta ({totalPris} kr)
          </button>
          <button
            type="button"
            onClick={() => navigate("/kundvagn")}
            style={{ backgroundColor: darkMode ? "#333" : "#444", color: "white" }}
          >
            🛒 Tillbaka till kundvagn
          </button>
        </div>
      </form>
    </div>
  );
}

export default Checkout;
