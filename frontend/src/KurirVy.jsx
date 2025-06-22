// src/KurirVy.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function KurirVy() {
  const navigate = useNavigate();
  const [ordrar, setOrdrar] = useState([]);
  const [fel, setFel] = useState(null);
  const darkMode = document.body.classList.contains("dark");

  useEffect(() => {
    const check = async () => {
      const profile = await fetchProfile();
      if (!profile) {
        navigate("/login");
        return;
      }
      if (profile.role !== "courier") {
        navigate("/");
      }
    };
    check();
  }, [navigate]);

  const hämtaOrdrar = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/today`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Kunde inte hämta ordrar");
      }
      const data = await res.json();
      setOrdrar(data);
    } catch (err) {
      console.error(err);
      setFel("Fel vid hämtning av leveranser.");
    }
  }, []);

  useEffect(() => {
    hämtaOrdrar();
  }, [hämtaOrdrar]);

  const markeraSomLevererad = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/orders/${id}/klart`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Kunde inte markera som klar");
      }
      setOrdrar((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error(err);
      alert("❌ Kunde inte markera som levererad.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🚚 Kurirpanel – Leveranser</h1>
      {fel && <p style={{ color: "red" }}>{fel}</p>}
      {ordrar.map((order) => (
        <div
          key={order.id}
          style={{
            border: "1px solid #ccc",
            marginBottom: "1.5rem",
            padding: "1rem",
            borderRadius: "10px",
            backgroundColor: darkMode ? "#2a2a2a" : "#f0f8ff",
            color: darkMode ? "white" : "black",
          }}
        >
          <p>
            <strong>Tid:</strong>{" "}
            {new Date(order.created_at).toLocaleTimeString("sv-SE")}
          </p>
          <p>
            <strong>Kund:</strong> {order.namn} – {order.telefon}
          </p>
          <p>
            <strong>Adress:</strong> {order.adress}
          </p>
          <p>
            <strong>Info:</strong> {order.extraInfo || "–"}
          </p>
          <p>
            <strong>Totalt:</strong> {order.total} kr
          </p>
          <button onClick={() => markeraSomLevererad(order.id)}>
            ✅ Markera som levererad
          </button>
        </div>
      ))}
    </div>
  );
}

export default KurirVy;
