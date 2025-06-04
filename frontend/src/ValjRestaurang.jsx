import { useNavigate } from "react-router-dom";

function ValjRestaurang() {
  const navigate = useNavigate();

  const restauranger = [
    {
      namn: "Campino",
      bild: "/bilder/campino.png", // byt till en riktig logotyp om du har
      länk: "/campino",
    },
    // framtida: { namn: "SushiBar", bild: "...", länk: "/sushibar" }
  ];

  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "2rem" }}>Välj Restaurang</h1>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "2rem",
        }}
      >
        {restauranger.map((r, index) => (
          <div
            key={index}
            onClick={() => navigate(r.länk)}
            style={{
              cursor: "pointer",
              padding: "1rem",
              borderRadius: "12px",
              backgroundColor: "#f5f5f5",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              maxWidth: "200px",
              width: "100%",
            }}
          >
            <img
              src={r.bild}
              alt={r.namn}
              style={{ width: "100%", borderRadius: "8px", marginBottom: "0.5rem" }}
              onError={(e) => (e.target.src = "/bilder/default.jpg")}
            />
            <h3>{r.namn}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ValjRestaurang;
