import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [losenord, setLosenord] = useState("");

  const loggaIn = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, losenord }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        window.dispatchEvent(new Event("storage")); // 🧠 Trigger observern
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
    <div
      style={{
        padding: "2rem",
        maxWidth: "600px",
        margin: "auto",
        textAlign: "center",
      }}
    >
      <h1>🔐 Logga in</h1>
      <input
        type="email"
        placeholder="E-postadress"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "1rem" }}
      />
      <input
        type="password"
        placeholder="Lösenord"
        value={losenord}
        onChange={(e) => setLosenord(e.target.value)}
        style={{ display: "block", width: "100%", marginBottom: "1.5rem" }}
      />
      <button onClick={loggaIn} style={{ marginBottom: "1rem" }}>
        Logga in
      </button>

      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={() => navigate("/register")}
          style={{ marginBottom: "1rem" }}
        >
          🧾 Registrera dig
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => navigate("/")}>⬅ Startsida</button>
          <button onClick={() => navigate("/valj-restaurang")}>
            ⬅ Välj restaurang
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
