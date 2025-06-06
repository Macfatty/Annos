import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [losenord, setLosenord] = useState("");

  const loggaIn = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, losenord }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);

        // 🔐 Spara användarinfo för profil & checkout
        localStorage.setItem("kundinfo", JSON.stringify({
          namn: data.namn,
          email: data.email,
          telefon: data.telefon,
          adress: data.adress || ""
        }));

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

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto", textAlign: "center" }}>
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

      <button onClick={loggaIn} style={{ marginBottom: "1rem" }}>
        Logga in
      </button>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => navigate("/register")}>🧾 Registrera dig</button>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/")}>⬅ Startsida</button>
          <button onClick={() => navigate("/valj-restaurang")}>⬅ Välj restaurang</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
