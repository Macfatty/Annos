import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

  const fetchMessage = async () => {
    try {
      const res = await fetch('http://localhost:3001/');
      const text = await res.text();
      setMessage(text);
    } catch (error) {
      setMessage('Fel vid hämtning från backend!');
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Välkommen till Annos!</h1>
      <button onClick={fetchMessage}>Testa backend-anslutning</button>
      <p>{message}</p>
    </div>
  );
}

export default App;
