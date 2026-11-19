import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

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

const normalizeProductionUrl = (value) => String(value || "").trim().replace(/\/$/, "");

const validateNews = (items) => {
  if (!Array.isArray(items)) throw new Error("data/news.json doit contenir une liste.");
  const ids = new Set();
  return items.map((item) => {
    const normalized = {
      id: String(item.id || "").trim(),
      title: String(item.title || "").trim(),
      date: String(item.date || "").trim(),
      category: String(item.category || "Actualité").trim(),
      summary: String(item.summary || "").trim(),
      content: String(item.content || "").trim(),
      image: String(item.image || "").trim(),
      alt: String(item.alt || "").trim(),
      imageWidth: Number(item.imageWidth) || 0,
      imageHeight: Number(item.imageHeight) || 0,
      status: String(item.status || "draft").trim().toLowerCase()
    };
    if (!normalized.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized.id)) {
      throw new Error(`Identifiant d’actualité invalide : ${normalized.id || "(vide)"}`);
    }
    if (ids.has(normalized.id)) throw new Error(`Identifiant d’actualité dupliqué : ${normalized.id}`);
    if (!normalized.title || !/^\d{4}-\d{2}-\d{2}$/.test(normalized.date)) {
      throw new Error(`Actualité incomplète : ${normalized.id}`);
    }
    ids.add(normalized.id);
    return normalized;
  });
};

const prefixRootLinks = (html) => html
  .replace(/(href|src)="assets\//g, '$1="../assets/')
  .replace(/href="((?:index|about|domains|achievements|gallery|news|contact|article)\.html(?:#[^"]*)?)"/g, 'href="../$1"');

const createArticleMarkup = (item) => {
  const paragraphs = (item.content || item.summary)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `          <p>${escapeHtml(paragraph)}</p>`)
    .join("\n");
  const dimensions = item.imageWidth > 0 && item.imageHeight > 0
    ? ` width="${item.imageWidth}" height="${item.imageHeight}"`
    : "";
  const image = item.image
    ? `        <img class="article-media" src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.alt)}"${dimensions} decoding="async">\n`
    : "";

  return `  <main id="contenu">
    <section class="page-hero"><div class="container"><a class="article-back" href="../news.html">Retour aux actualités</a><p class="eyebrow">${escapeHtml(item.category)}</p><h1>${escapeHtml(item.title)}</h1><p class="lead">${escapeHtml(item.summary)}</p></div></section>
    <section class="section section--white"><div class="narrow">
      <article class="article-content">
        <div class="article-meta"><span class="category-badge">${escapeHtml(item.category)}</span><time datetime="${escapeHtml(item.date)}">${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${item.date}T12:00:00Z`))}</time></div>
${image}        <div class="article-body">
${paragraphs}
        </div>
      </article>
    </div></section>
  </main>`;
};

const createArticlePage = (template, item, productionUrl) => {
  const articleUrl = productionUrl ? `${productionUrl}/articles/${item.id}.html` : "";
  const socialImage = item.image && productionUrl ? `${productionUrl}/${item.image}` : item.image;
  let html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(item.title)} — AVOPEDEV</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(item.summary)}">`)
    .replace('<meta name="robots" content="noindex, follow">', '<meta name="robots" content="index, follow, max-image-preview:large">')
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(item.title)} — AVOPEDEV">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(item.summary)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escapeHtml(socialImage || "assets/images/pepiniere-avopedev.jpg")}">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${escapeHtml(item.alt || item.title)}">`)
    .replace("</head>", `  <meta property="article:published_time" content="${escapeHtml(item.date)}">\n</head>`)
    .replace(/  <main id="contenu">[\s\S]*?  <\/main>/, createArticleMarkup(item))
    .replace('<script src="assets/js/content.js"></script><script src="assets/js/article.js"></script>', "");

  if (articleUrl) {
    html = html.replace("</head>", `  <link rel="canonical" href="${escapeHtml(articleUrl)}">\n  <meta property="og:url" content="${escapeHtml(articleUrl)}">\n</head>`);
  }
  return prefixRootLinks(html);
};

export async function generateArticles({ newsPath, outputDirectory, templatePath, configPath }) {
  const [rawNews, template, config] = await Promise.all([
    readJson(newsPath),
    readFile(templatePath, "utf8"),
    readJson(configPath)
  ]);
  const publishedItems = validateNews(rawNews).filter((item) => item.status === "published");
  const productionUrl = normalizeProductionUrl(config.productionUrl);

  await mkdir(outputDirectory, { recursive: true });
  const existingFiles = await readdir(outputDirectory, { withFileTypes: true });
  await Promise.all(existingFiles
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => unlink(join(outputDirectory, entry.name))));

  await Promise.all(publishedItems.map((item) => writeFile(
    join(outputDirectory, `${item.id}.html`),
    createArticlePage(template, item, productionUrl),
    "utf8"
  )));
  return publishedItems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArguments();
  const publishedItems = await generateArticles({
    newsPath: args.get("--news") || join(projectRoot, "data", "news.json"),
    outputDirectory: args.get("--output") || join(projectRoot, "articles"),
    templatePath: args.get("--template") || join(projectRoot, "article.html"),
    configPath: args.get("--config") || join(projectRoot, "site.config.json")
  });
  console.log(`${publishedItems.length} page(s) d’actualité générée(s).`);
}
