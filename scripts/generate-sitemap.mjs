import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const institutionalPages = [
  "",
  "about.html",
  "domains.html",
  "achievements.html",
  "gallery.html",
  "news.html",
  "contact.html"
];

const escapeXml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const parseArguments = () => {
  const argumentsMap = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    const option = process.argv[index];
    const value = process.argv[index + 1];
    if (!option?.startsWith("--") || !value) throw new Error(`Option invalide : ${option || "valeur manquante"}`);
    argumentsMap.set(option, resolve(value));
  }
  return argumentsMap;
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

export async function generateSitemap({ newsPath, configPath, outputDirectory }) {
  const [news, config] = await Promise.all([readJson(newsPath), readJson(configPath)]);
  if (!Array.isArray(news)) throw new Error("data/news.json doit contenir une liste.");
  const productionUrl = String(config.productionUrl || "").trim().replace(/\/$/, "");
  const publishedIds = news
    .filter((item) => String(item.status || "draft").toLowerCase() === "published")
    .map((item) => String(item.id || "").trim())
    .filter((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id));

  const paths = [
    ...institutionalPages,
    ...publishedIds.map((id) => `articles/${id}.html`)
  ];
  const entries = productionUrl
    ? paths.map((path) => `  <url><loc>${escapeXml(`${productionUrl}/${path}`)}</loc></url>`).join("\n")
    : "  <!-- Renseigner productionUrl dans site.config.json, puis relancer la génération. -->";
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
  const robots = productionUrl
    ? `User-agent: *\nAllow: /\n\nSitemap: ${productionUrl}/sitemap.xml\n`
    : "User-agent: *\nAllow: /\n\n# Sitemap ajouté automatiquement après configuration d’une URL de production vérifiée.\n";

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(join(outputDirectory, "sitemap.xml"), sitemap, "utf8"),
    writeFile(join(outputDirectory, "robots.txt"), robots, "utf8")
  ]);
  return { pages: productionUrl ? paths.length : 0, productionUrl };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArguments();
  const result = await generateSitemap({
    newsPath: args.get("--news") || join(projectRoot, "data", "news.json"),
    configPath: args.get("--config") || join(projectRoot, "site.config.json"),
    outputDirectory: args.get("--output") || projectRoot
  });
  console.log(result.productionUrl
    ? `${result.pages} URL(s) ajoutée(s) au sitemap.`
    : "Sitemap conservé sans URL jusqu’à la confirmation du domaine de production.");
}
