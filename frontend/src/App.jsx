import { useState, useEffect } from 'react';
import './App.css';
import Undermeny from './Undermeny';
import Kundvagn from './Kundvagn';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';

function App() {
  const [meny, setMeny] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [valdRatt, setValdRatt] = useState(null);
  const [redigeringsIndex, setRedigeringsIndex] = useState(null);
  const [varukorg, setVarukorg] = useState(() => {
    const sparad = localStorage.getItem('varukorg');
    return sparad ? JSON.parse(sparad) : [];
  });
  const [tillbehor, setTillbehor] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('varukorg', JSON.stringify(varukorg));
  }, [varukorg]);

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

  useEffect(() => {
    const fetchTillbehor = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/tillbehor');
        if (!res.ok) throw new Error('Kunde inte ladda tillbehör');
        const data = await res.json();
        setTillbehor(data);
      } catch (error) {
        console.error('Fel vid tillbehör:', error);
      }
    };

    fetchTillbehor();
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>Campino Meny</h1>

            <button onClick={() => navigate('/kundvagn')}>
              🛒 Visa kundvagn ({varukorg.length})
            </button>

            {loading && <p>Laddar meny...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div className="menu-container">
              {!loading &&
                !error &&
                meny.map((ratt) => (
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
                      onError={(e) => (e.target.src = '/bilder/default.jpg')}
                    />
                    <h2>{ratt.namn}</h2>
                    <p>{ratt.beskrivning}</p>
                    <p>
                      <strong>{ratt.pris} kr</strong>
                    </p>
                  </div>
                ))}
            </div>

            {valdRatt && (
              <Undermeny
                ratt={valdRatt}
                tillbehor={tillbehor}
                onClose={() => setValdRatt(null)}
                onAddToCart={(val) => {
                  if (redigeringsIndex !== null) {
                    const ny = [...varukorg];
                    ny[redigeringsIndex] = val;
                    setVarukorg(ny);
                    setRedigeringsIndex(null);
                  } else {
                    setVarukorg([...varukorg, val]);
                  }
                  setValdRatt(null);
                }}
              />
            )}
          </div>
        }
      />

      <Route
        path="/kundvagn"
        element={
          <Kundvagn
            varukorg={varukorg}
            setVarukorg={setVarukorg}
            setValdRatt={setValdRatt}
            setRedigeringsIndex={setRedigeringsIndex}
            meny={meny}
          />
        }
      />
    </Routes>
  );
}

export default App;
