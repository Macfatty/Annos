import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function normalizeUser(payload, fallbackEmail) {
  if (!payload) {
    return null;
  }

  const candidate = payload.user || payload.data?.user || payload;

  if (!candidate) {
    return null;
  }

  return {
    namn: candidate.namn ?? "",
    email: candidate.email ?? fallbackEmail ?? "",
    telefon: candidate.telefon ?? "",
    adress: candidate.adress ?? "",
  };
}

function persistUser(user) {
  localStorage.setItem("kundinfo", JSON.stringify(user));
  window.dispatchEvent(new Event("storage"));
}

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

      const payload = await res.json().catch(() => null);

      if (!res.ok || (payload && payload.success === false)) {
        const message = payload?.message || "Fel inloggningsuppgifter";
        throw new Error(message);
      }

      const user = normalizeUser(payload?.data ?? payload, email);

      if (!user) {
        throw new Error("Kunde inte tolka användaruppgifterna");
      }

      persistUser(user);

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      navigate("/valj-restaurang");
    } catch (err) {
      console.error(err);
      alert(err.message || "Kunde inte logga in.");
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

      const payload = await res.json().catch(() => null);

      if (!res.ok || (payload && payload.success === false)) {
        throw new Error(payload?.message || "Kunde inte logga in med Google");
      }

      const user = normalizeUser(payload?.data ?? payload, email);

      if (user) {
        persistUser(user);
      }

      navigate("/valj-restaurang");
    } catch (err) {
      console.error(err);
      alert(err.message || "Kunde inte logga in med Google.");
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

      const payload = await res.json().catch(() => null);

      if (!res.ok || (payload && payload.success === false)) {
        throw new Error(payload?.message || "Kunde inte logga in med Apple");
      }

      const user = normalizeUser(payload?.data ?? payload, email);

      if (user) {
        persistUser(user);
      }

      navigate("/valj-restaurang");
    } catch (err) {
      console.error(err);
      alert(err.message || "Kunde inte logga in med Apple.");
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
          gap: "1.25rem",
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
