import { useNavigate } from "react-router-dom";

function ValjRestaurang() {
  const navigate = useNavigate();
  // const darkMode = document.body.classList.contains("dark");

  const restauranger = [
    {
      namn: "Campino",
      bild: "/bilder/campino.png", // byt till en riktig logotyp om du har
      länk: "/campino",
      slug: "campino",
    },
    {
      namn: "SunSushi",
      bild: "/bilder/sunsushi.png", // placeholderbild
      länk: "/sunsushi",
      slug: "sunsushi",
    },
    // framtida: { namn: "SushiBar", bild: "...", länk: "/sushibar" }
  ];

  return (
    <div className="valj-restaurang-sida">
      <h1 className="valj-rubrik">Välj Restaurang</h1>

      <div className="restaurang-lista">
        {restauranger.map((r, index) => (
          <button
            key={index}
            type="button"
            onClick={() => navigate(`${r.länk}?restaurang=${r.slug}`)}
            className="restaurang-kort"
          >
            <img
              src={r.bild}
              alt={r.namn}
              onError={(e) => {
                e.target.src = "/bilder/default.jpg";
              }}
            />
            <h3>{r.namn}</h3>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ValjRestaurang;
