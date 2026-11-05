// Сборка страниц сайта EnerGO: src/pages/*.html + src/partials/* → готовые HTML в корне проекта.
// Запуск: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const P = (n) => read(`src/partials/${n}.html`);
const headOpen = P("head-open"), headClose = P("head-close"), header = P("header"), footer = P("footer");

// Неразрывные пробелы после коротких слов: в тексте не остаётся «висячих» предлогов и союзов
const SHORT = "в|во|на|с|со|к|ко|о|об|у|и|а|но|не|ни|по|за|из|от|до|для|при|про|без|над|под|как|что|или|же|ли|бы|то";
const nbspText = (t) => t
  .replace(new RegExp(`(^|[\\s(«"„—–-])(${SHORT}) (?=\\S)`, "gi"), (m, a, b) => `${a}${b} `)
  .replace(/ (—|–) /g, " $1 ")
  .replace(/(\d) (₽|мА·ч|мин|ч|сек|км|м|см|%|шт\.?)/g, "$1 $2");
function typo(html) {
  // обрабатываем только текст между тегами; script/style/svg/комментарии не трогаем
  const parts = html.split(/(<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<[^>]+>)/g);
  return parts.map((s, i) => (i % 2 ? s : nbspText(s))).join("");
}

for (const f of readdirSync(join(ROOT, "src/pages")).filter((n) => n.endsWith(".html"))) {
  const name = f.replace(".html", "");
  const src = read(`src/pages/${f}`);
  const title = (src.match(/<!--title: (.*?)-->/) || [])[1] || "EnerGO";
  const desc = (src.match(/<!--desc: (.*?)-->/) || [])[1] || "";
  const main = src.replace(/<!--(title|desc): .*?-->\n?/g, "").trim();
  const nav = header.replace(new RegExp(`(<a href="${name}\\.html")(?=>)`), '$1 aria-current="page"');
  const html = headOpen + `<title>${title}</title>` + headClose.replace(/\{\{desc\}\}/g, desc).replace(/\{\{title\}\}/g, title) + nav + `\n<main id="main">\n${process.env.NOTYPO ? main : typo(main)}\n</main>` + footer;
  writeFileSync(join(ROOT, `${name}.html`), html);
  console.log("✓", `${name}.html`);
}
