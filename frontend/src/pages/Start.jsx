import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Start() {
  const navigate = useNavigate();
  const [visaInfo, setVisaInfo] = useState(null); // "om", "support", "villkor"
  const darkMode = document.body.classList.contains("dark");

  const öppnaInfo = (typ) => {
    setVisaInfo(typ);
  };

  const stängInfo = () => {
    setVisaInfo(null);
  };

  const texter = {
    om: {
      titel: "Om Annos",
      innehåll:
        "Annos är en plattform för enkel beställning och leverans från lokala restauranger och butiker. Vårt mål är att förenkla vardagen."
    },
    support: {
      titel: "Kontakt & Support",
      innehåll:
        "Har du frågor eller problem? Kontakta oss på support@example.com eller ring 010-123 45 67."
    },
    villkor: {
      titel: "Användarvillkor",
      innehåll:
        "Genom att använda Annos godkänner du att dina uppgifter hanteras enligt GDPR. Se vår policy för detaljer."
    },
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        VÄLKOMMEN TILL <span style={{ color: "var(--link-color)" }}>ANNOS-HEMKÖRNING</span>
      </h1>
      <p style={{ fontSize: "1.25rem", marginBottom: "2rem", maxWidth: "600px", margin: "auto" }}>
        Varsågod och registrera dig för att smidigt beställa från din favorit restaurang eller butik.
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={() => navigate("/register")} style={{ maxWidth: "200px" }}>
          🧾 Registrera dig
        </button>
        <button onClick={() => navigate("/login")} style={{ maxWidth: "200px" }}>
          🔐 Logga in
        </button>
        <button onClick={() => navigate("/valj-restaurang")} style={{ maxWidth: "200px" }}>
          🍕 Titta på restauranger
        </button>
      </div>


      {visaInfo && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: darkMode ? "#333" : "white",
            padding: "2rem",
            borderRadius: "10px",
            maxWidth: "500px",
            width: "90%",
            textAlign: "center",
            color: darkMode ? "white" : "black"
          }}>
            <h2>{texter[visaInfo].titel}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{texter[visaInfo].innehåll}</p>
            <button onClick={stängInfo} style={{ marginTop: "1rem" }}>❌ Stäng</button>
          </div>
        </div>
      )}

      {/* Footer med länkar */}
      <footer style={{ marginTop: "4rem", fontSize: "0.9rem", color: "var(--text-color)", opacity: "0.7" }}>
        <p>
          Vi lagrar dina uppgifter enligt GDPR och använder dem endast för att hantera din beställning.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "0.5rem" }}>
          <button onClick={() => öppnaInfo("om")} style={{ fontSize: "0.8rem" }}>📄 Om Annos</button>
          <button onClick={() => öppnaInfo("support")} style={{ fontSize: "0.8rem" }}>📬 Support</button>
          <button onClick={() => öppnaInfo("villkor")} style={{ fontSize: "0.8rem" }}>📚 Villkor</button>
        </div>
      </footer>
    </div>
  );
}

export default Start;
