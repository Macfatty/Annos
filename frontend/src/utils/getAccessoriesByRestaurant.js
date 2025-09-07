import CAMPINO_TILLBEHOR from "../data/tillbehor/campino.js";
import SUNSUSHI_TILLBEHOR from "../data/tillbehor/sunsushi.js";

export function getAccessories(slug) {
  const map = {
    campino: CAMPINO_TILLBEHOR,
    sunsushi: SUNSUSHI_TILLBEHOR,
  };
  return map[slug] ?? [];
}
