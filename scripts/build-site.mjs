import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateArticles } from "./generate-articles.mjs";
import { generateSitemap } from "./generate-sitemap.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(projectRoot, "dist");
const pages = [
  "index.html",
  "about.html",
  "domains.html",
  "achievements.html",
  "gallery.html",
  "news.html",
  "contact.html",
  "article.html"
];

if (dirname(outputDirectory) !== projectRoot || basename(outputDirectory) !== "dist") {
  throw new Error("Le dossier de sortie doit rester le dossier dist du projet.");
}

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const normalizeProductionUrl = (value) => {
  const configured = String(value || "").trim().replace(/\/$/, "");
  if (!configured) return "";
  const url = new URL(configured);
  if (url.protocol !== "https:" || url.search || url.hash) {
    throw new Error("productionUrl doit être une URL HTTPS sans paramètre ni ancre.");
  }
  return url.href.replace(/\/$/, "");
};

const addProductionMetadata = (html, page, productionUrl) => {
  if (!productionUrl || page === "article.html") return html;
  const pageUrl = page === "index.html" ? `${productionUrl}/` : `${productionUrl}/${page}`;
  let updated = html.replace("</head>", `  <link rel="canonical" href="${escapeHtml(pageUrl)}">\n  <meta property="og:url" content="${escapeHtml(pageUrl)}">\n</head>`);
  updated = updated.replace(/<meta property="og:image" content="(?!https?:\/\/)([^"]+)">/, `<meta property="og:image" content="${escapeHtml(productionUrl)}/$1">`);
  return updated;
};

const collectReferencedImages = (htmlPages, gallery, publishedNews) => {
  const images = new Set(["assets/images/logo-avopedev.png"]);
  for (const html of htmlPages) {
    for (const match of html.matchAll(/(?:src|content)="(assets\/images\/[^"]+)"/g)) images.add(match[1]);
    for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(",")) images.add(candidate.trim().split(/\s+/)[0]);
    }
  }
  for (const item of gallery) {
    if (item.src) images.add(String(item.src));
    for (const candidate of String(item.srcset || "").split(",")) {
      const path = candidate.trim().split(/\s+/)[0];
      if (path) images.add(path);
    }
  }
  for (const item of publishedNews) if (item.image) images.add(String(item.image));
  return images;
};

const [config, news, gallery] = await Promise.all([
  readJson(join(projectRoot, "site.config.json")),
  readJson(join(projectRoot, "data", "news.json")),
  readJson(join(projectRoot, "data", "gallery.json"))
]);
if (!Array.isArray(news) || !Array.isArray(gallery)) throw new Error("Les fichiers de contenu doivent contenir des listes.");
const productionUrl = normalizeProductionUrl(config.productionUrl);
const publishedNews = news.filter((item) => String(item.status || "draft").toLowerCase() === "published");

await rm(outputDirectory, { recursive: true, force: true });
await Promise.all([
  mkdir(join(outputDirectory, "assets", "images"), { recursive: true }),
  mkdir(join(outputDirectory, "data"), { recursive: true })
]);
await Promise.all([
  cp(join(projectRoot, "assets", "css"), join(outputDirectory, "assets", "css"), { recursive: true }),
  cp(join(projectRoot, "assets", "js"), join(outputDirectory, "assets", "js"), { recursive: true })
]);

const sourcePages = await Promise.all(pages.map(async (page) => ({
  page,
  html: await readFile(join(projectRoot, page), "utf8")
})));
await Promise.all(sourcePages.map(({ page, html }) => writeFile(
  join(outputDirectory, page),
  addProductionMetadata(html, page, productionUrl),
  "utf8"
)));
await Promise.all([
  writeFile(join(outputDirectory, "data", "news.json"), `${JSON.stringify(publishedNews, null, 2)}\n`, "utf8"),
  writeFile(join(outputDirectory, "data", "gallery.json"), `${JSON.stringify(gallery, null, 2)}\n`, "utf8")
]);

const referencedImages = collectReferencedImages(sourcePages.map(({ html }) => html), gallery, publishedNews);
await Promise.all([...referencedImages].map(async (relativePath) => {
  if (!relativePath.startsWith("assets/images/")) throw new Error(`Chemin d’image interdit : ${relativePath}`);
  await copyFile(join(projectRoot, relativePath), join(outputDirectory, relativePath));
}));

const generatedArticles = await generateArticles({
  newsPath: join(projectRoot, "data", "news.json"),
  outputDirectory: join(outputDirectory, "articles"),
  templatePath: join(projectRoot, "article.html"),
  configPath: join(projectRoot, "site.config.json")
});
await generateSitemap({
  newsPath: join(projectRoot, "data", "news.json"),
  configPath: join(projectRoot, "site.config.json"),
  outputDirectory
});

console.log(JSON.stringify({
  output: outputDirectory,
  pages: pages.length,
  articles: generatedArticles.length,
  publishedNews: publishedNews.length,
  images: referencedImages.size,
  productionUrl: productionUrl || null
}, null, 2));
