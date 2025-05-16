// Undermeny.jsx
import React, { useState } from 'react';
import './App.css';

function Undermeny({ ratt, onClose, onAddToCart }) {
  const [tillval, setTillval] = useState({
    extraOst: false,
    pommes: false,
    dryck: false,
  });

  const baspris = ratt.pris;

  const totalpris =
    baspris +
    (tillval.extraOst ? 10 : 0) +
    (tillval.pommes ? 20 : 0) +
    (tillval.dryck ? 15 : 0);

  const toggle = (namn) => {
    setTillval({ ...tillval, [namn]: !tillval[namn] });
  };

  const läggTill = () => {
    const beställning = {
      namn: ratt.namn,
      pris: ratt.pris,
      tillval: {
        extraOst: tillval.extraOst,
        pommes: tillval.pommes,
        dryck: tillval.dryck,
      },
      total: totalpris,
    };

    onAddToCart(beställning); // skicka till App.jsx
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{ratt.namn}</h2>
        <p>{ratt.beskrivning}</p>
        <p><strong>Grundpris: {baspris} kr</strong></p>

        <h4>Välj tillbehör:</h4>
        <label>
          <input type="checkbox" checked={tillval.extraOst} onChange={() => toggle('extraOst')} />
          Extra ost (+10 kr)
        </label><br />
        <label>
          <input type="checkbox" checked={tillval.pommes} onChange={() => toggle('pommes')} />
          Pommes (+20 kr)
        </label><br />
        <label>
          <input type="checkbox" checked={tillval.dryck} onChange={() => toggle('dryck')} />
          Loka burk (+15 kr)
        </label><br />

        <p><strong>Totalpris: {totalpris} kr</strong></p>

        <button onClick={läggTill}>Lägg till i varukorg</button>{' '}
        <button onClick={onClose}>Stäng</button>
      </div>
    </div>
  );
}

export default Undermeny;

