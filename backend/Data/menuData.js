const fs = require("fs");
const path = require("path");

module.exports = {
  campino: JSON.parse(
    fs.readFileSync(path.join(__dirname, "menyer/campino.json"))
  ),
  sunsushi: JSON.parse(
    fs.readFileSync(path.join(__dirname, "menyer/sunsushi.json"))
  ),
};
