const fs = require("fs");
const path = require("path");

const menyPath = path.join(__dirname, "meny.json");
// const menyPath = path.join(__dirname, "menuData.json");
const menyData = JSON.parse(fs.readFileSync(menyPath, "utf8"));

module.exports = menyData;
