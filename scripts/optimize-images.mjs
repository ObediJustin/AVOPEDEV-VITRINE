import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imagesDirectory = join(projectRoot, "assets", "images");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9334;
const profile = mkdtempSync(join(tmpdir(), "avopedev-images-"));
const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    if (pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      response.end("<!doctype html><title>AVOPEDEV image optimizer</title>");
      return;
    }
    const filePath = resolve(projectRoot, `.${pathname}`);
    if (!filePath.startsWith(`${projectRoot}${sep}`)) throw new Error("Chemin interdit");
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": extname(filePath) === ".jpg" ? "image/jpeg" : "application/octet-stream",
      "Access-Control-Allow-Origin": "*"
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  baseUrl
], { stdio: "ignore" });

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Chrome DevTools n’a pas démarré.");
}

async function createSession() {
  await waitForChrome();
  const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" });
  const target = await targetResponse.json();
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
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(message.error.message));
    else handlers.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    id += 1;
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Page.navigate", { url: baseUrl });
  await delay(500);
  return { socket, command };
}

const encodeExpression = (url, maximumWidth) => `
  (async () => {
    const source = await createImageBitmap(await (await fetch(${JSON.stringify(url)})).blob());
    const width = Math.min(source.width, ${maximumWidth || "source.width"});
    const height = Math.round(source.height * width / source.width);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d").drawImage(source, 0, 0, width, height);
    source.close();
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    return { base64: btoa(binary), width, height, size: bytes.length };
  })()`;

async function encode(command, fileName, maximumWidth = 0) {
  const result = await command("Runtime.evaluate", {
    expression: encodeExpression(`${baseUrl}/assets/images/${encodeURIComponent(fileName)}`, maximumWidth),
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Conversion WebP impossible.");
  return result.result.value;
}

try {
  const { socket, command } = await createSession();
  const jpgFiles = (await readdir(imagesDirectory)).filter((name) => name.endsWith(".jpg")).sort();
  const report = [];
  for (const fileName of jpgFiles) {
    const sourcePath = join(imagesDirectory, fileName);
    const sourceSize = (await stat(sourcePath)).size;
    const originalWidth = await encode(command, fileName);
    const baseName = fileName.replace(/\.jpg$/i, "");
    const webpPath = join(imagesDirectory, `${baseName}.webp`);
    const keepWebp = originalWidth.size < sourceSize * 0.95;
    if (keepWebp) await writeFile(webpPath, Buffer.from(originalWidth.base64, "base64"));

    let responsive = null;
    if (keepWebp && originalWidth.width > 1000) {
      responsive = await encode(command, fileName, 720);
      await writeFile(join(imagesDirectory, `${baseName}-720.webp`), Buffer.from(responsive.base64, "base64"));
    }
    report.push({
      image: fileName,
      sourceBytes: sourceSize,
      webpBytes: keepWebp ? originalWidth.size : null,
      savedPercent: keepWebp ? Math.round((1 - originalWidth.size / sourceSize) * 100) : 0,
      responsiveBytes: responsive?.size || null,
      width: originalWidth.width,
      height: originalWidth.height
    });
  }
  socket.close();
  console.table(report);
} finally {
  chrome.kill();
  await new Promise((resolveClose) => server.close(resolveClose));
  await delay(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
