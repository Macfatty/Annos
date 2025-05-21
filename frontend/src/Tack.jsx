import React from "react";
import { useNavigate } from "react-router-dom";

function Tack() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>🙏 Tack för din beställning!</h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
        Din beställning behandlas. Du får ett SMS när den är klar eller på väg.
      </p>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => navigate("/campino")}>📋 Till meny</button>
        <button onClick={() => navigate("/valj-restaurang")}>🍽️ Restauranger</button>
        <button onClick={() => navigate("/")}>🏠 Startsida</button>
      </div>
    </div>
  );
}

export default Tack;
