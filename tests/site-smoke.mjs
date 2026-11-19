import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9333;
const profile = mkdtempSync(join(tmpdir(), "avopedev-qa-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore" });

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForChrome() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Chrome DevTools n’a pas démarré.");
}

async function openSession() {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
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
  await command("Page.navigate", { url: pathToFileURL(join(projectRoot, page)).href });
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
  const gallery = await evaluate(command, `(() => {
    document.querySelector("[data-gallery] button").click();
    const lightbox = document.querySelector("[data-lightbox]");
    const opened = !lightbox.hidden;
    const statusAnnounced = document.querySelector("[data-lightbox-status]").textContent === "1 sur 15";
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    return { opened, statusAnnounced, closed: lightbox.hidden, brokenImages: [...document.images].filter((image) => image.getAttribute("src") && image.complete && image.naturalWidth === 0).length };
  })()`);
  check(gallery.opened && gallery.closed, "La visionneuse de galerie ne répond pas au clavier.");
  check(gallery.statusAnnounced, "La position courante de la galerie n’est pas annoncée.");
  check(gallery.brokenImages === 0, "Une image de la galerie ne charge pas.");

  await navigate(command, "news.html", 1024);
  const news = await evaluate(command, `({ emptyVisible: !document.querySelector("[data-news-empty]").hidden })`);
  check(news.emptyVisible, "L’état vide des actualités n’est pas visible.");

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

  socket.close();
  console.log(JSON.stringify({ passed: failures.length === 0, report, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  chrome.kill();
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
