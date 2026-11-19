import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9333;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};
const mockNews = [
  {
    id: "test-environment",
    title: "Test environnement récent",
    date: "2026-02-02",
    category: "Environnement",
    summary: "Résumé exclusivement utilisé par le test navigateur.",
    content: "Premier paragraphe de test.\n\nDeuxième paragraphe de test.",
    image: "assets/images/pepiniere-avopedev.jpg",
    alt: "Image utilisée dans le test navigateur",
    status: "published"
  },
  {
    id: "test-agriculture",
    title: "Test agriculture antérieur",
    date: "2026-01-01",
    category: "Agriculture",
    summary: "Deuxième résumé exclusivement utilisé par le test.",
    content: "Contenu agriculture du test navigateur.",
    image: "assets/images/champ-riz-kyatenga.jpg",
    alt: "Deuxième image utilisée dans le test navigateur",
    status: "published"
  },
  {
    id: "test-draft",
    title: "Brouillon de test invisible",
    date: "2026-03-01",
    category: "Test",
    summary: "Ce brouillon ne doit jamais être affiché.",
    content: "Contenu non publié.",
    image: "",
    alt: "",
    status: "draft"
  }
];

const generatorFixture = mkdtempSync(join(tmpdir(), "avopedev-generator-"));
try {
  const fixtureNewsPath = join(generatorFixture, "news.json");
  const fixtureConfigPath = join(generatorFixture, "site.config.json");
  const fixtureOutputPath = join(generatorFixture, "articles");
  writeFileSync(fixtureNewsPath, JSON.stringify(mockNews), "utf8");
  writeFileSync(fixtureConfigPath, JSON.stringify({ productionUrl: "https://avopedev.example.test" }), "utf8");
  const generation = spawnSync(process.execPath, [
    join(projectRoot, "scripts", "generate-articles.mjs"),
    "--news", fixtureNewsPath,
    "--output", fixtureOutputPath,
    "--config", fixtureConfigPath
  ], { encoding: "utf8" });
  if (generation.status !== 0) throw new Error(generation.stderr || "Le générateur d’articles a échoué.");
  const generatedFiles = readdirSync(fixtureOutputPath).filter((file) => file.endsWith(".html")).sort();
  if (generatedFiles.join(",") !== "test-agriculture.html,test-environment.html") {
    throw new Error("Le générateur doit publier les deux actualités validées et exclure le brouillon.");
  }
  const generatedArticle = readFileSync(join(fixtureOutputPath, "test-environment.html"), "utf8");
  if (!generatedArticle.includes('<link rel="canonical" href="https://avopedev.example.test/articles/test-environment.html">')) {
    throw new Error("Le lien canonique de l’article généré est absent.");
  }
  if (!generatedArticle.includes("Premier paragraphe de test.") || generatedArticle.includes("article.js")) {
    throw new Error("Le contenu statique de l’article généré est incorrect.");
  }
  const sitemapOutputPath = join(generatorFixture, "public");
  const sitemapGeneration = spawnSync(process.execPath, [
    join(projectRoot, "scripts", "generate-sitemap.mjs"),
    "--news", fixtureNewsPath,
    "--config", fixtureConfigPath,
    "--output", sitemapOutputPath
  ], { encoding: "utf8" });
  if (sitemapGeneration.status !== 0) throw new Error(sitemapGeneration.stderr || "La génération du sitemap a échoué.");
  const generatedSitemap = readFileSync(join(sitemapOutputPath, "sitemap.xml"), "utf8");
  if (!generatedSitemap.includes("articles/test-environment.html") || generatedSitemap.includes("test-draft")) {
    throw new Error("Le sitemap doit inclure les publications et exclure les brouillons.");
  }
} finally {
  rmSync(generatorFixture, { recursive: true, force: true });
}
let serveMockNews = false;

const staticServer = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
    if (pathname === "/data/news.json" && serveMockNews) {
      response.writeHead(200, { "Content-Type": mimeTypes[".json"] });
      response.end(JSON.stringify(mockNews));
      return;
    }
    const filePath = resolve(projectRoot, `.${pathname}`);
    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
await new Promise((resolveListen) => staticServer.listen(0, "127.0.0.1", resolveListen));
const siteBaseUrl = `http://127.0.0.1:${staticServer.address().port}/`;
const profile = mkdtempSync(join(tmpdir(), "avopedev-qa-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore" });

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForChrome() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Chrome DevTools n’a pas démarré.");
}

async function openSession() {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" });
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });

  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolveCommand, rejectCommand } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectCommand(new Error(message.error.message));
    else resolveCommand(message.result);
  });

  const command = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    id += 1;
    pending.set(id, { resolveCommand, rejectCommand });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await command("Page.enable");
  await command("Runtime.enable");
  return { socket, command };
}

async function navigate(command, page, width = 1440, height = 900) {
  await command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 820
  });
  await command("Page.navigate", { url: new URL(page, siteBaseUrl).href });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const readiness = await command("Runtime.evaluate", {
      expression: 'document.readyState === "complete" && Boolean(document.querySelector(".site-header"))',
      returnByValue: true
    });
    if (readiness.result.value) return;
    await delay(100);
  }
  throw new Error(`La page ${page} n’a pas terminé son chargement.`);
}

async function evaluate(command, expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitForExpression(command, expression, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await evaluate(command, expression)) return;
    await delay(100);
  }
  throw new Error(message);
}

const failures = [];
const report = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

try {
  await waitForChrome();
  const { socket, command } = await openSession();
  const viewports = [
    { width: 320, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 667, height: 375 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 900 }
  ];

  for (const { width, height } of viewports) {
    await navigate(command, "index.html", width, height);
    const metrics = await evaluate(command, `({
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      h1: document.querySelectorAll("h1").length,
      headerCtaVisible: document.querySelector(".header-cta").offsetParent !== null
    })`);
    report.push({ page: "index.html", width, height, ...metrics });
    check(metrics.scrollWidth <= metrics.innerWidth, `Débordement horizontal à ${width}×${height}px.`);
    check(metrics.brokenImages === 0, `Image non chargée sur l’accueil à ${width}×${height}px.`);
    check(metrics.h1 === 1, `Hiérarchie H1 incorrecte à ${width}×${height}px.`);
    if (width >= 1024) check(metrics.headerCtaVisible, `Le bouton Contact du header est masqué à ${width}px.`);
  }

  await navigate(command, "index.html", 375);
  const menu = await evaluate(command, `(() => {
    const button = document.querySelector("[data-menu-toggle]");
    button.click();
    const opened = button.getAttribute("aria-expanded") === "true" && document.querySelector("[data-navigation]").classList.contains("is-open");
    const focusEnteredMenu = document.activeElement === document.querySelector("[data-navigation] a");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    return {
      opened,
      focusEnteredMenu,
      closed: button.getAttribute("aria-expanded") === "false",
      focusReturned: document.activeElement === button,
      labelRestored: button.getAttribute("aria-label") === "Ouvrir le menu"
    };
  })()`);
  check(menu.opened && menu.closed, "Le menu mobile ne s’ouvre ou ne se ferme pas correctement.");
  check(menu.focusEnteredMenu && menu.focusReturned, "Le focus du menu mobile n’est pas correctement géré.");
  check(menu.labelRestored, "Le libellé accessible du menu mobile n’est pas restauré.");

  await navigate(command, "gallery.html", 768);
  await waitForExpression(command, 'document.querySelectorAll("[data-gallery] figure").length === 15', "La galerie JSON ne s’est pas chargée.");
  const gallery = await evaluate(command, `(() => {
    const sensibilisation = [...document.querySelectorAll("[data-filter]")].find((button) => button.dataset.filter === "sensibilisation");
    sensibilisation.click();
    const filteredCount = document.querySelectorAll("[data-gallery] figure").length;
    document.querySelector('[data-filter="all"]').click();
    document.querySelector("[data-gallery] button").click();
    const lightbox = document.querySelector("[data-lightbox]");
    const opened = !lightbox.hidden;
    const statusAnnounced = document.querySelector("[data-lightbox-status]").textContent === "1 sur 15";
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    return { filteredCount, opened, statusAnnounced, closed: lightbox.hidden, brokenImages: [...document.images].filter((image) => image.getAttribute("src") && image.complete && image.naturalWidth === 0).length };
  })()`);
  check(gallery.filteredCount === 1, "Le filtre Sensibilisation de la galerie est incorrect.");
  check(gallery.opened && gallery.closed, "La visionneuse de galerie ne répond pas au clavier.");
  check(gallery.statusAnnounced, "La position courante de la galerie n’est pas annoncée.");
  check(gallery.brokenImages === 0, "Une image de la galerie ne charge pas.");

  await navigate(command, "news.html", 1024);
  await waitForExpression(command, '!document.querySelector("[data-news-empty]").hidden', "L’état vide des actualités ne s’est pas affiché.");
  const news = await evaluate(command, `({ emptyVisible: !document.querySelector("[data-news-empty]").hidden })`);
  check(news.emptyVisible, "L’état vide des actualités n’est pas visible.");

  serveMockNews = true;
  await navigate(command, "news.html", 1024);
  await waitForExpression(command, 'document.querySelectorAll("[data-news-list] .news-card").length === 2', "Les cartes d’actualités de test ne se sont pas affichées.");
  const newsInteractions = await evaluate(command, `(() => {
    const initialTitles = [...document.querySelectorAll("[data-news-list] h2")].map((item) => item.textContent);
    const search = document.querySelector("[data-news-search]");
    search.value = "agriculture";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    const searchCount = document.querySelectorAll("[data-news-list] .news-card").length;
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    const category = document.querySelector("[data-news-category]");
    category.value = "Environnement";
    category.dispatchEvent(new Event("change", { bubbles: true }));
    const categoryCount = document.querySelectorAll("[data-news-list] .news-card").length;
    return { initialTitles, searchCount, categoryCount };
  })()`);
  check(newsInteractions.initialTitles[0] === "Test environnement récent", "Le tri décroissant des actualités est incorrect.");
  check(newsInteractions.searchCount === 1, "La recherche d’actualités est incorrecte.");
  check(newsInteractions.categoryCount === 1, "Le filtre de catégorie des actualités est incorrect.");

  await navigate(command, "article.html?id=test-environment", 1024);
  await waitForExpression(command, '!document.querySelector("[data-article-content]").hidden', "L’article de test ne s’est pas affiché.");
  const article = await evaluate(command, `({
    title: document.querySelector("[data-article-title]").textContent,
    paragraphs: document.querySelectorAll("[data-article-body] p").length
  })`);
  check(article.title === "Test environnement récent" && article.paragraphs === 2, "La page article réutilisable est incorrecte.");

  await navigate(command, "article.html?id=identifiant-inconnu", 1024);
  await waitForExpression(command, '!document.querySelector("[data-article-missing]").hidden', "L’état article introuvable ne s’est pas affiché.");
  const missingArticle = await evaluate(command, 'document.querySelector("[data-article-title]").textContent');
  check(missingArticle === "Actualité introuvable", "L’identifiant d’article inconnu n’est pas géré.");

  await navigate(command, "index.html", 1024);
  await waitForExpression(command, 'document.querySelectorAll("[data-home-news-list] .news-card").length === 2', "Les actualités de l’accueil ne se sont pas affichées.");
  serveMockNews = false;

  for (const page of ["about.html", "domains.html", "achievements.html", "contact.html"]) {
    await navigate(command, page, 1024);
    const result = await evaluate(command, `({
      h1: document.querySelectorAll("h1").length,
      current: document.querySelectorAll('[aria-current="page"]').length,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length
    })`);
    check(result.h1 === 1, `${page} doit contenir un seul H1.`);
    check(result.current === 1, `${page} doit signaler un seul lien de navigation actif.`);
    check(result.brokenImages === 0, `${page} contient une image non chargée.`);
  }

  await navigate(command, "contact.html", 375);
  const contactValidation = await evaluate(command, `(() => {
    const form = document.querySelector("[data-mail-form]");
    form.requestSubmit();
    return {
      firstInvalidFocused: document.activeElement.id === "name",
      invalidCount: form.querySelectorAll('[aria-invalid="true"]').length,
      status: form.querySelector("[data-form-status]").textContent
    };
  })()`);
  check(contactValidation.firstInvalidFocused, "Le formulaire ne place pas le focus sur la première erreur.");
  check(contactValidation.invalidCount === 4, "Les champs obligatoires du formulaire ne sont pas tous validés.");
  check(contactValidation.status.includes("Vérifiez"), "Le message d’erreur global du formulaire est absent.");

  socket.close();
  console.log(JSON.stringify({ passed: failures.length === 0, report, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  chrome.kill();
  await new Promise((resolveClose) => staticServer.close(resolveClose));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rmSync(profile, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) console.warn(`Nettoyage différé du profil Chrome temporaire : ${error.code}`);
      else await delay(300);
    }
  }
}
