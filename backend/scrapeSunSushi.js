import { writeFile } from "fs/promises";
import { load } from "cheerio";

const resp = await fetch("https://www.sunsushi.se/");
const html = await resp.text();
const $ = load(html);

const items = [];
$(".menu-item").each((_, el) => {
  items.push({
    namn: $(el).find(".name").text().trim(),
    pris: $(el).find(".price").text().trim(),
  });
});

await writeFile(
  "backend/Data/menyer/sunsushi.json",
  JSON.stringify(items, null, 2),
);
console.log("Meny sparad.");
