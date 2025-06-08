const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'Tillbehör');

const tillbehorData = [
  ...JSON.parse(fs.readFileSync(path.join(base, 'Kött.json'), 'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(base, 'grönt.json'), 'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(base, 'såser.json'), 'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(base, 'drycker.json'), 'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(base, 'övrigt.json'), 'utf8')),
];

module.exports = tillbehorData;
