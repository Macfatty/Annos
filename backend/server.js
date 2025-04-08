const express = require('express');
const cors = require('cors'); // fick lägga till detta så att knappen fungerar fronten--backend
const app = express();
const PORT = 3001;
const meny = require('./Data/menuData.js');
// const meny = require('./Data/campino_meny_slutgiltig.json'); // Importera menydata från JSON-filen


// Middleware för att tolka JSON-data
app.use(cors()); // för cross ska fungeara
app.use(express.json());


// Test-rutt
app.get('/', (req, res) => {
  res.send('backend funkar!');
});
// Rutt för att hämta menyn
app.get('/api/meny', (req, res) => {
  res.json(meny);
});

// starta servern
app.listen(PORT, () => {
  console.log('Servern körs på http://localhost:${PORT}');
});
