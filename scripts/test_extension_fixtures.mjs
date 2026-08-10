import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FIXTURES = [
  {
    path: "/browser-extension/tests/form-fixture.html",
    marker: "STARJOB_EXTENSION_TEST_PASS",
    label: "本地规则填写夹具",
  },
  {
    path: "/browser-extension/tests/ai-autofill-fixture.html",
    marker: "STARJOB_AI_AUTOFILL_TEST_PASS",
    label: "AI 智能填写夹具",
  },
  {
    path: "/browser-extension/tests/ai-autofill-large-iframe-fixture.html",
    marker: "STARJOB_AI_AUTOFILL_LARGE_IFRAME_TEST_PASS",
    label: "AI 130+ 字段跨页面区域夹具",
  },
  {
    path: "/browser-extension/tests/ai-autofill-limit-fixture.html",
    marker: "STARJOB_AI_AUTOFILL_LIMIT_TEST_PASS",
    label: "AI 750 字段硬上限夹具",
  },
  {
    path: "/browser-extension/tests/ai-autofill-batch-failure-fixture.html",
    marker: "STARJOB_AI_AUTOFILL_BATCH_FAILURE_TEST_PASS",
    label: "AI 批次失败零写入夹具",
  },
];
const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
]);

const chromePath = findChromePath();
if (!chromePath) {
  throw new Error("未找到 Chrome/Edge。可通过 CHROME_PATH 指定浏览器可执行文件。");
}

const profileDirectory = await mkdtemp(path.join(tmpdir(), "starjob-extension-fixtures-"));
const server = createFixtureServer();

try {
  const port = await listen(server);
  for (const [index, fixture] of FIXTURES.entries()) {
    const html = await runFixture({
      chromePath,
      profileDirectory: path.join(profileDirectory, String(index + 1)),
      url: `http://127.0.0.1:${port}${fixture.path}`,
    });
    if (!html.includes(`<title>${fixture.marker}</title>`)) {
      const result = extractFixtureResult(html);
      throw new Error(`${fixture.label}未通过：${result || "页面没有返回测试结果"}`);
    }
    console.log(`✓ ${fixture.label}通过`);
  }
  console.log(`✓ 扩展浏览器夹具全部通过：${FIXTURES.length}/${FIXTURES.length}`);
} finally {
  await close(server);
  await removeTemporaryDirectory(profileDirectory);
}

function findChromePath() {
  const configured = process.env.CHROME_PATH?.trim();
  if (configured) return configured;

  const candidates = process.platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/microsoft-edge",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function createFixtureServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
      const absolutePath = path.resolve(ROOT, relativePath);
      if (absolutePath !== ROOT && !absolutePath.startsWith(`${ROOT}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      if (!(await stat(absolutePath)).isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": MIME_TYPES.get(path.extname(absolutePath)) ?? "application/octet-stream",
      });
      response.end(await readFile(absolutePath));
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address?.port) resolve(address.port);
      else reject(new Error("无法为扩展夹具分配本地端口"));
    });
  });
}

function close(server) {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

async function removeTemporaryDirectory(directory) {
  let lastError = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

function runFixture({ chromePath, profileDirectory, url }) {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, [
      "--headless=new",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-gpu",
      "--disable-sync",
      "--no-first-run",
      "--no-sandbox",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDirectory}`,
      "--virtual-time-budget=8000",
      "--dump-dom",
      url,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let html = "";
    let errors = "";
    let settled = false;
    let terminalError = null;
    let resultReady = false;
    let forceKillTimer = null;
    let forceCompleteTimer = null;
    const timeout = setTimeout(() => requestStop(new Error("浏览器夹具执行超过 20 秒")), 20_000);

    child.stdout.on("data", (chunk) => {
      html += chunk.toString();
      if (html.includes("</html>")) {
        resultReady = true;
        // Chrome 151 may keep the headless process alive after --dump-dom has
        // emitted the complete document. Stop only after the closing tag is
        // captured; the close handler will resolve with the collected HTML.
        requestStop();
      }
    });
    child.stderr.on("data", (chunk) => {
      errors += chunk.toString();
    });
    child.once("error", (error) => complete(error));
    child.once("close", (code) => {
      if (terminalError) complete(terminalError);
      else if (!resultReady && typeof code === "number" && code !== 0) complete(new Error(`Chrome 退出码 ${code}：${errors.slice(-800)}`));
      else if (!html.trim()) complete(new Error(`Chrome 未输出页面内容：${errors.slice(-800) || "无诊断信息"}`));
      else complete();
    });

    function requestStop(error = null) {
      if (settled) return;
      if (error) terminalError = error;
      if (child.exitCode !== null) {
        complete(terminalError);
        return;
      }
      child.kill("SIGTERM");
      if (forceKillTimer) return;
      forceKillTimer = setTimeout(() => {
        if (settled) return;
        if (child.exitCode === null) child.kill("SIGKILL");
        forceCompleteTimer = setTimeout(() => complete(terminalError), 500);
      }, 2_000);
    }

    function complete(error = null) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      if (forceCompleteTimer) clearTimeout(forceCompleteTimer);
      if (error) reject(error);
      else resolve(html);
    }
  });
}

function extractFixtureResult(html) {
  const match = html.match(/<pre id="result">([\s\S]*?)<\/pre>/i);
  return match?.[1]?.replaceAll("&quot;", '"').replaceAll("&amp;", "&").trim();
}
