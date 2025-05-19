import React from 'react';
import { useNavigate } from 'react-router-dom';

function Kundvagn({ varukorg, setVarukorg, setValdRatt, setRedigeringsIndex, meny }) {
  const navigate = useNavigate();

  const taBort = (index) => {
    const ny = [...varukorg];
    ny.splice(index, 1);
    setVarukorg(ny);
  };

  const ändra = (index) => {
    const rätt = varukorg[index];
    const match = meny.find((r) => r.namn === rätt.namn);
    if (!match) return alert('❌ Kunde inte hitta ursprungsrätten.');

    setValdRatt(match);
    setRedigeringsIndex(index);
    navigate('/');
  };

  const total = varukorg.reduce((sum, item) => sum + item.total, 0);

  const beställ = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(varukorg),
      });

      const data = await res.json();
      alert(`✅ Beställning skickad!\nOrder ID: ${data.orderId}`);
      setVarukorg([]);
      localStorage.removeItem('varukorg');
      navigate('/');
    } catch (err) {
      console.error('Fel vid beställning:', err);
      alert('❌ Kunde inte skicka beställning.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🛒 Din Kundvagn</h1>

      {varukorg.length === 0 ? (
        <p>Varukorgen är tom.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {varukorg.map((ratt, index) => (
            <li
              key={index}
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                border: '1px solid #ccc',
                borderRadius: '8px',
              }}
            >
              <strong>{ratt.namn}</strong> – {ratt.total} kr
              {ratt.tillval.length > 0 && (
                <ul style={{ fontSize: '0.9rem', paddingLeft: '1rem', marginTop: '0.5rem' }}>
                  {ratt.tillval.map((t, i) => (
                    <li key={i}>
                      + {t.namn} ({t.pris} kr)
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: '0.5rem' }}>
                <button onClick={() => ändra(index)} style={{ marginRight: '0.5rem' }}>
                   Ändra
                </button>
                <button onClick={() => taBort(index)}>🗑️ Ta bort</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p><strong>Totalt att betala:</strong> {total} kr</p>

      <button onClick={() => navigate('/')} style={{ marginRight: '1rem' }}>
         Tillbaka till meny
      </button>
      <button onClick={beställ} disabled={varukorg.length === 0}>
        ✅ Skicka beställning
      </button>
    </div>
  );
}

export default Kundvagn;
