import { useState, useEffect } from 'react';
import './App.css';
import Undermeny from './Undermeny';

function App() {
  const [meny, setMeny] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [valdRatt, setValdRatt] = useState(null);
  const [varukorg, setVarukorg] = useState([]);


  useEffect(() => {
    const fetchMeny = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/meny');
        if (!res.ok) throw new Error('Något gick fel vid hämtning');
        const data = await res.json();
        setMeny(data);
      } catch (error) {
        console.error('Fel:', error);
        setError('Kunde inte ladda menydata från servern.');
      } finally {
        setLoading(false);
      }
    };

    fetchMeny();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Campino Meny</h1>

      {loading && <p>Laddar meny...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="menu-container">
        {!loading && !error && meny.map((ratt) => (
          <div
            key={ratt.id}
            className="menu-card"
            onClick={() => setValdRatt(ratt)}
            style={{ cursor: 'pointer' }}
          >
            <img
              src={`/bilder/${ratt.bild}`}
              alt={ratt.namn}
              className="menu-image"
              onError={(e) => (e.target.src = "/bilder/default.jpg")}
            />
            <h2>{ratt.namn}</h2>
            <p>{ratt.beskrivning}</p>
            <p><strong>{ratt.pris} kr</strong></p>
          </div>
        ))}
      </div>

      {valdRatt && (
  <Undermeny
    ratt={valdRatt}
    onClose={() => setValdRatt(null)}
    onAddToCart={(val) => {
      setVarukorg([...varukorg, val]);
      setValdRatt(null); // stänger popup efter tillägg
    }}
  />
)}

    </div>
  );
}

export default App;
