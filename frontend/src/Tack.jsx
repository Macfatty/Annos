import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Tack() {
  const navigate = useNavigate();
  const initial = useRef({ done: false });

  useEffect(() => {
    if (initial.current.done) {
      return;
    }
    const tillganglig = sessionStorage.getItem("tack");
    if (!tillganglig) {
      navigate("/");
    } else {
      sessionStorage.removeItem("tack");
    }
    initial.current.done = true;
  }, [navigate]);

  return (
    <div
      className="tack-container"
      style={{
        padding: "2rem",
        maxWidth: "600px",
        margin: "auto",
        textAlign: "center",
      }}
    >
      <h2>🎉 Tack för din beställning!</h2>
      <p>Vi har tagit emot din beställning och den hanteras nu av restaurangen.</p>
      <div
        role="navigation"
        aria-label="Tack-sidans knappar"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginTop: "2rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/valj-restaurang")}
          style={{ backgroundColor: "#4caf50", color: "white" }}
        >
          🍽️ Till restauranger
        </button>
        <button
          type="button"
          onClick={() => navigate("/profil")}
          style={{ backgroundColor: "#1976d2", color: "white" }}
        >
          👤 Min profil
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.clear();
            window.dispatchEvent(new Event("storage"));
            alert("Du är nu utloggad.");
            navigate("/");
          }}
          style={{ backgroundColor: "#f44336", color: "white" }}
        >
          🚪 Logga ut
        </button>
      </div>
    </div>
  );
}

export default Tack;
