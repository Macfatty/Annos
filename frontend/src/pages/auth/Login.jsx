import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [losenord, setLosenord] = useState("");

  const loggaIn = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, losenord }),
      });

      const data = await res.json();

      if (res.ok) {
        // 🔐 Spara användarinfo för profil & checkout
        localStorage.setItem(
          "kundinfo",
          JSON.stringify({
            namn: data.namn,
            email: data.email,
            telefon: data.telefon,
            adress: data.adress || "",
          })
        );

        // Direkt state-uppdatering för samma flik
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        
        // Cross-tab sync
        window.dispatchEvent(new Event("storage"));
        navigate("/valj-restaurang");
      } else {
        alert("Fel inloggningsuppgifter");
      }
    } catch (err) {
      console.error(err);
      alert("Kunde inte logga in.");
    }
  };

  const loggaInMedGoogle = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: window.googleToken || "" }),
      });

      await res.json();

      if (res.ok) {
        window.dispatchEvent(new Event("storage"));
        navigate("/valj-restaurang");
      } else {
        alert("Kunde inte logga in med Google");
      }
    } catch (err) {
      console.error(err);
      alert("Kunde inte logga in med Google.");
    }
  };

  const loggaInMedApple = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/apple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identityToken: window.appleToken || "" }),
      });

      await res.json();

      if (res.ok) {
        window.dispatchEvent(new Event("storage"));
        navigate("/valj-restaurang");
      } else {
        alert("Kunde inte logga in med Apple");
      }
    } catch (err) {
      console.error(err);
      alert("Kunde inte logga in med Apple.");
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "600px",
        margin: "auto",
        textAlign: "center",
      }}
    >
      <h1>🔐 Logga in</h1>
      <label htmlFor="email">E-postadress</label>
      <input
        id="email"
        type="email"
        placeholder="E-postadress"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Skriv in din e-postadress"
        style={{ display: "block", width: "100%", marginBottom: "1rem" }}
      />

      <label htmlFor="losenord">Lösenord</label>
      <input
        id="losenord"
        type="password"
        placeholder="Lösenord"
        value={losenord}
        onChange={(e) => setLosenord(e.target.value)}
        aria-label="Skriv in ditt lösenord"
        style={{ display: "block", width: "100%", marginBottom: "1.5rem" }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem", // mellanrum mellan alla knappar
          marginBottom: "2rem",
        }}
      >
        <button onClick={loggaIn} style={{ width: "100%", maxWidth: "400px" }}>
          🔐 Logga in
        </button>

        <button
          onClick={loggaInMedGoogle}
          aria-label="Logga in med Google"
          style={{ width: "100%", maxWidth: "400px" }}
        >
           Logga in med Google
        </button>

        <button
          onClick={loggaInMedApple}
          aria-label="Logga in med Apple"
          style={{ width: "100%", maxWidth: "400px" }}
        >
           Logga in med Apple
        </button>

        <button
          onClick={() => navigate("/register")}
          style={{ width: "100%", maxWidth: "400px" }}
        >
          🧾 Registrera dig
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginTop: "1rem",
        }}
      >
        <button onClick={() => navigate("/")}>⬅ Startsida</button>
        <button onClick={() => navigate("/valj-restaurang")}>
          ⬅ Välj restaurang
        </button>
      </div>
    </div>
  );
}

export default Login;
