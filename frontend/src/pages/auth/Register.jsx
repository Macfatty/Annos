import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../services/api";

function Register({ onRegisterSuccess }) {
  const navigate = useNavigate();
  const [namn, setNamn] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [losenord, setLosenord] = useState("");

  const registrera = async () => {
    try {
      await register({ namn, email, telefon, losenord });

      alert("Registrering lyckades!");

      if (onRegisterSuccess) {
        onRegisterSuccess();
      }

      navigate("/login");
    } catch (err) {
      console.error(err);
      alert(err.message || "Fel vid registrering.");
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
      <h1>📝 Registrera dig</h1>
      <label htmlFor="regNamn">Namn</label>
      <input
        id="regNamn"
        type="text"
        placeholder="Namn"
        value={namn}
        aria-label="Skriv ditt namn"
        onChange={(e) => setNamn(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: "1rem",
          fontSize: "1.1rem",
          padding: "0.75rem",
        }}
      />
      <label htmlFor="regEmail">E-postadress</label>
      <input
        id="regEmail"
        type="email"
        placeholder="E-postadress"
        value={email}
        aria-label="Skriv din e-postadress"
        onChange={(e) => setEmail(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: "1rem",
          fontSize: "1.1rem",
          padding: "0.75rem",
        }}
      />
      <label htmlFor="regTelefon">Telefonnummer</label>
      <input
        id="regTelefon"
        type="tel"
        placeholder="Telefonnummer"
        value={telefon}
        aria-label="Skriv ditt telefonnummer"
        onChange={(e) => setTelefon(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: "1rem",
          fontSize: "1.1rem",
          padding: "0.75rem",
        }}
      />
      <label htmlFor="regLosen">Lösenord</label>
      <input
        id="regLosen"
        type="password"
        placeholder="Lösenord"
        value={losenord}
        aria-label="Skriv ett lösenord"
        onChange={(e) => setLosenord(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: "1.5rem",
          fontSize: "1.1rem",
          padding: "0.75rem",
        }}
      />
      <button
        onClick={registrera}
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "auto",
          marginBottom: "1.5rem",
        }}
      >
        ✅ Skapa konto
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => navigate("/login")}>⬅ Till inloggning</button>
        <button onClick={() => navigate("/valj-restaurang")}>
          🍴 Restauranger
        </button>
        <button onClick={() => navigate("/")}>🏠 Startsida</button>
      </div>
    </div>
  );
}

export default Register;
