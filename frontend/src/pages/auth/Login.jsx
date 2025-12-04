import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, loginWithGoogle, loginWithApple } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [losenord, setLosenord] = useState("");
  const setUser = useAuthStore((state) => state.setUser);

  const loggaIn = async () => {
    try {
      const response = await login(email, losenord);

      // Update Zustand store with user data
      if (response && response.user) {
        setUser(response.user);
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      // Redirect based on user role
      const userRole = response?.user?.role;
      if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/valj-restaurang");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Kunde inte logga in.");
    }
  };

  const loggaInMedGoogle = async () => {
    try {
      const response = await loginWithGoogle(window.googleToken || "");

      // Update Zustand store with user data
      if (response && response.user) {
        setUser(response.user);
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      // Redirect based on user role
      const userRole = response?.user?.role;
      if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/valj-restaurang");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Kunde inte logga in med Google.");
    }
  };

  const loggaInMedApple = async () => {
    try {
      const response = await loginWithApple(window.appleToken || "");

      // Update Zustand store with user data
      if (response && response.user) {
        setUser(response.user);
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      // Redirect based on user role
      const userRole = response?.user?.role;
      if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/valj-restaurang");
      }
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
