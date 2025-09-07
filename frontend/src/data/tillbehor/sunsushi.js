// Importera alla SunSushi-tillbehör
import sunGront from "./sungrönt.json";
import sunKött from "./sunkött.json";
import sunDrycker from "./sundrycker.json";
import sunOvrigt from "./sunövrigt.json";
import sunSåser from "./sunsåser.json";
import sunVegetarisk from "./sunvegetarisk.json";

// Slå ihop alla kategorier
const SUNSUSHI_TILLBEHOR = [
  ...sunGront,
  ...sunKött,
  ...sunDrycker,
  ...sunOvrigt,
  ...sunSåser,
  ...sunVegetarisk,
];

export default SUNSUSHI_TILLBEHOR;
