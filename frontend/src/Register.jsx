import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Register() {
  const navigate = useNavigate();
  const [namn, setNamn] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [losenord, setLosenord] = useState("");

  const registrera = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namn, email, telefon, losenord }),
      });

      if (res.ok) {
        alert("Registrering lyckades!");
        navigate("/login");
      } else {
        alert("Registrering misslyckades.");
      }
    } catch (err) {
      console.error(err);
      alert("Fel vid registrering.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto", textAlign: "center" }}>
      <h1>📝 Registrera dig</h1>
      <label htmlFor="regNamn">Namn</label>
      <input
        id="regNamn"
        type="text"
        placeholder="Namn"
        value={namn}
        aria-label="Skriv ditt namn"
        onChange={(e) => setNamn(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "1rem", fontSize: "1.1rem", padding: "0.75rem" }}
      />
      <label htmlFor="regEmail">E-postadress</label>
      <input
        id="regEmail"
        type="email"
        placeholder="E-postadress"
        value={email}
        aria-label="Skriv din e-postadress"
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "1rem", fontSize: "1.1rem", padding: "0.75rem" }}
      />
      <label htmlFor="regTelefon">Telefonnummer</label>
      <input
        id="regTelefon"
        type="tel"
        placeholder="Telefonnummer"
        value={telefon}
        aria-label="Skriv ditt telefonnummer"
        onChange={(e) => setTelefon(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "1rem", fontSize: "1.1rem", padding: "0.75rem" }}
      />
      <label htmlFor="regLosen">Lösenord</label>
      <input
        id="regLosen"
        type="password"
        placeholder="Lösenord"
        value={losenord}
        aria-label="Skriv ett lösenord"
        onChange={(e) => setLosenord(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "1.5rem", fontSize: "1.1rem", padding: "0.75rem" }}
      />
      <button onClick={registrera} style={{ marginBottom: "1.5rem" }}>Skapa konto</button>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => navigate("/login")}>⬅ Till inloggning</button>
        <button onClick={() => navigate("/valj-restaurang")}>🍴 Restauranger</button>
        <button onClick={() => navigate("/")}>🏠 Startsida</button>
      </div>
    </div>
  );
}

export default Register;
