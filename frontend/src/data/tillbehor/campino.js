// Importera alla Campino-tillbehör
import campinoGront from "./campino-grönt.json";
import campinoKött from "./campino-kött.json";
import campinoDrycker from "./campino-drycker.json";
import campinoOvrigt from "./campino-övrigt.json";
import campinoSåser from "./campino-såser.json";

// Slå ihop alla kategorier
const CAMPINO_TILLBEHOR = [
  ...campinoGront,
  ...campinoKött,
  ...campinoDrycker,
  ...campinoOvrigt,
  ...campinoSåser,
];

export default CAMPINO_TILLBEHOR;
