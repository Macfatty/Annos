const fs = require('fs');
const path = require('path');

// Läs menydata
const menyPath = path.join(__dirname, 'meny.json');
const meny = JSON.parse(fs.readFileSync(menyPath, 'utf8'));

// Läs alla tillbehör från undermappen Tillbehör/
const tillbehorPath = (filnamn) => path.join(__dirname, 'Tillbehör', filnamn);

const allaTillbehor = [
  ...JSON.parse(fs.readFileSync(tillbehorPath('kött.json'))),
  ...JSON.parse(fs.readFileSync(tillbehorPath('grönt.json'))),
  ...JSON.parse(fs.readFileSync(tillbehorPath('såser.json'))),
  ...JSON.parse(fs.readFileSync(tillbehorPath('övrigt.json'))),
  ...JSON.parse(fs.readFileSync(tillbehorPath('drycker.json'))),
];

// Skapa snabb lookup-tabell
const tillbehorMap = {};
allaTillbehor.forEach(t => {
  tillbehorMap[t.namn.toLowerCase().trim()] = t.id;
});

// Koppla tillbehör baserat på ingredienser
const uppdateradMeny = meny.map(ratt => {
  const ingredienser = typeof ratt.ingredienser === 'string'
    ? ratt.ingredienser.toLowerCase().split(',').map(i => i.trim())
    : [];

  const tillbehorIds = [];
  const ejMatchade = [];

  for (const ingr of ingredienser) {
    const match = tillbehorMap[ingr];
    if (match) {
      tillbehorIds.push(match);
    } else {
      ejMatchade.push(ingr);
    }
  }

  if (ejMatchade.length > 0) {
    console.warn(`❗ Ingen matchning: ${ejMatchade.join(', ')} i rätt "${ratt.namn}"`);
  }

  return {
    ...ratt,
    tillbehor: tillbehorIds,
  };
});

// Spara tillbaka till meny.json
fs.writeFileSync(menyPath, JSON.stringify(uppdateradMeny, null, 2), 'utf8');

console.log('✅ meny.json har uppdaterats med tillbehörs-ID:n.');
