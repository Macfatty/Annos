import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Tack() {
  const navigate = useNavigate();

  useEffect(() => {
    const flagga = sessionStorage.getItem("bestallningSkickad");
    if (flagga === "true") {
      setTimeout(() => {
        sessionStorage.removeItem("bestallningSkickad");
      }, 500);
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div
      role="main"
      style={{
        padding: "2rem",
        textAlign: "center",
        fontFamily: "sans-serif",
        minHeight: "100vh",
      }}
    >
      <h1>🙏 Tack för din beställning!</h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
        Restaurangen har fått din beställning.<br />
        Du får ett meddelande när en förare är på väg.
      </p>

      <button onClick={() => navigate("/valj-restaurang")}>
        🍽️ Tillbaka till restauranger
      </button>
    </div>
  );
}

export default Tack;
