const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const meny = require('./Data/menuData.js');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('backend funkar!');
});

app.get('/api/meny', (req, res) => {
  res.json(meny);
});

app.get('/api/tillbehor', (req, res) => {
  try {
    const base = path.join(__dirname, 'Data', 'Tillbehör');

    const kött = JSON.parse(fs.readFileSync(path.join(base, 'Kött.json')));
    const grönt = JSON.parse(fs.readFileSync(path.join(base, 'grönt.json')));
    const såser = JSON.parse(fs.readFileSync(path.join(base, 'såser.json')));
    const drycker = JSON.parse(fs.readFileSync(path.join(base, 'drycker.json')));
    const övrigt = JSON.parse(fs.readFileSync(path.join(base, 'övrigt.json')));

    const alla = [...kött, ...grönt, ...såser, ...drycker, ...övrigt];
    res.json(alla);
  } catch (err) {
    console.error('Fel vid laddning av tillbehör:', err);
    res.status(500).json({ fel: 'Kunde inte ladda tillbehör' });
  }
});


app.post('/api/order', (req, res) => {
  const order = req.body;
  console.log('📦 Ny beställning mottagen:', JSON.stringify(order, null, 2));
  res.status(201).json({ message: 'Beställning mottagen', orderId: Date.now() });
});


app.listen(PORT, () => {
  console.log(`Servern körs på http://localhost:${PORT}`);
});
