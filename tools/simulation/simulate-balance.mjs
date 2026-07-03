import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolDir, "..", "..");
const LOG_SHEET_ID = "1Sy_vOpjJXiDLIzIHGsKtWkls7DStSdkYBllsDpZoSBI";
const TELEMETRY_ENDPOINT = "https://script.google.com/macros/s/AKfycby2IXOmu8MttsGyU2x-_nIjdTINdsZVx52gjPi6sWIu-4rKDVxuKqzrwCUvn3ON_x9tYg/exec";

function parseArgs(argv) {
  const options = {
    sessions: 9,
    speed: 50,
    seed: null,
    mix: "beginner:34,intermediate:33,advanced:33",
    profile: "",
    coverage: true,
    show: false,
    dashboard: true,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sessions") options.sessions = Number(argv[++index]);
    else if (arg === "--speed") options.speed = Number(argv[++index]);
    else if (arg === "--seed") options.seed = Number(argv[++index]);
    else if (arg === "--mix") options.mix = argv[++index] || options.mix;
    else if (arg === "--profile") options.profile = argv[++index] || "";
    else if (arg === "--coverage") options.coverage = true;
    else if (arg === "--random-mix") options.coverage = false;
    else if (arg === "--show") options.show = true;
    else if (arg === "--no-dashboard") options.dashboard = false;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`알 수 없는 인자입니다: ${arg}`);
  }
  options.sessions = Math.max(1, Math.min(2000, Math.floor(options.sessions || 9)));
  options.speed = Math.max(1, Math.min(50, Number(options.speed) || 50));
  options.seed = Math.max(1, Math.floor(options.seed || (Date.now() % 2147483647)));
  if (options.profile && !["beginner", "intermediate", "advanced"].includes(options.profile)) {
    throw new Error(`지원하지 않는 프로필입니다: ${options.profile}`);
  }
  return options;
}

function findBrowser() {
  const candidates = [
    path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.ProgramFiles || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".gif": "image/gif",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".woff2": "font/woff2",
  })[path.extname(file).toLowerCase()] || "application/octet-stream";
}

function createServer(onResult) {
  return http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (request.method === "POST" && url.pathname === "/__simulation/result") {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
        if (body.length > 100 * 1024 * 1024) request.destroy(new Error("결과 데이터가 100MB를 초과했습니다."));
      });
      request.on("end", () => {
        try {
          const payload = JSON.parse(body);
          const result = onResult(payload);
          response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
          response.end(JSON.stringify({ ok: true, destination: result.destination }));
        } catch (error) {
          response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
      return;
    }

    const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^[/\\]+/, "");
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
      fs.createReadStream(file).pipe(response);
    });
  });
}

function updateDashboard() {
  const script = path.join(root, "tools", "build-balance-dashboard.mjs");
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error("대시보드 데이터 갱신에 실패했습니다.");
}

async function waitForSheetSessions(sessionIds, timeoutMs = 90000) {
  const expected = [...new Set(sessionIds.filter(Boolean))];
  if (!expected.length) throw new Error("완료된 시뮬레이션 세션 ID가 없습니다.");
  const started = Date.now();
  let lastMissing = expected;
  while (Date.now() - started < timeoutMs) {
    const url = `https://docs.google.com/spreadsheets/d/${LOG_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=sessions&_=${Date.now()}`;
    try {
      const response = await fetch(url, { redirect: "follow", cache: "no-store" });
      if (response.ok) {
        const csv = await response.text();
        lastMissing = expected.filter((sessionId) => !csv.includes(sessionId));
        if (!lastMissing.length) return;
      }
    } catch {
      // Keep the browser alive and retry while its telemetry queue drains.
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`Google Sheet 기록 확인 시간 초과: ${lastMissing.length}/${expected.length}세션 누락`);
}

async function uploadTelemetryEvents(events) {
  const source = Array.isArray(events) ? events : [];
  if (!source.length) throw new Error("업로드할 시뮬레이션 이벤트가 없습니다.");
  const batchSize = 30;
  const batchTotal = Math.ceil(source.length / batchSize);
  for (let offset = 0; offset < source.length; offset += batchSize) {
    const batch = source.slice(offset, offset + batchSize);
    const response = await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        buildVersion: batch[0]?.buildVersion || "balance-simulation",
        sentAt: new Date().toISOString(),
        events: batch,
      }),
    });
    if (!response.ok) throw new Error(`Apps Script 업로드 실패: ${response.status} ${response.statusText}`);
    const result = await response.json();
    if (!result?.ok) throw new Error(`Apps Script 업로드 거부: ${result?.error || "unknown"}`);
    console.log(`[SIM] Sheet batch ${Math.floor(offset / batchSize) + 1}/${batchTotal}: ${result.events} events`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node tools/simulation/simulate-balance.mjs [--sessions 9] [--speed 50] [--seed <number>]");
    console.log("  [--mix beginner:34,intermediate:33,advanced:33] [--profile beginner|intermediate|advanced]");
    console.log("  [--coverage|--random-mix] [--show] [--no-dashboard] [--dry-run]");
    return;
  }

  const browser = findBrowser();
  if (!browser) throw new Error("Microsoft Edge 또는 Google Chrome을 찾지 못했습니다.");
  for (const required of ["index.html", path.join("assets", "js", "balance-simulator.js")]) {
    if (!fs.existsSync(path.join(root, required))) throw new Error(`필수 파일이 없습니다: ${required}`);
  }
  if (options.dryRun) {
    console.log(`OK game: ${root}`);
    console.log(`OK browser: ${browser}`);
    console.log("OK storage: Google Sheet only");
    return;
  }

  let resolveResult;
  let rejectResult;
  const resultPromise = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  let resultReceived = false;
  const server = createServer((payload) => {
    resultReceived = true;
    resolveResult(payload);
    return { destination: "Google Sheet" };
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const port = server.address().port;
  const runId = `sim-${Date.now()}-${process.pid}`;
  const query = new URLSearchParams({
    simulation: "1",
    sessions: String(options.sessions),
    speed: String(options.speed),
    seed: String(options.seed),
    mix: options.mix,
    runId,
  });
  if (options.profile) query.set("profile", options.profile);
  if (options.coverage) query.set("coverage", "1");
  const url = `http://127.0.0.1:${port}/index.html?${query}`;
  const profileDir = path.join(os.tmpdir(), `3sort-balance-sim-${process.pid}`);
  const browserArgs = [
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--autoplay-policy=no-user-gesture-required",
    "--window-size=430,900",
  ];
  if (!options.show) browserArgs.push("--headless=new", "--disable-gpu");
  browserArgs.push(url);

  console.log(`[SIM] ${options.sessions} sessions / speed x${options.speed} / seed ${options.seed} / ${options.coverage ? "coverage" : "random mix"}`);
  console.log("[SIM] telemetry Google Sheet only");
  console.log(`[SIM] browser ${path.basename(browser)} ${options.show ? "visible" : "headless"}`);
  const child = spawn(browser, browserArgs, { stdio: "ignore", windowsHide: !options.show });
  child.once("error", rejectResult);
  child.once("exit", (code) => {
    if (!resultReceived) console.warn(`[SIM] browser launcher exited before completion (code=${code}); waiting for browser worker`);
  });

  const estimatedMs = Math.max(180000, Math.ceil(options.sessions * (500 / options.speed + 12) * 1000));
  const timeout = setTimeout(() => rejectResult(new Error(`시뮬레이션 제한시간 초과 (${Math.round(estimatedMs / 60000)}분)`)), estimatedMs);
  try {
    const payload = await resultPromise;
    clearTimeout(timeout);
    if (payload.error) throw new Error(payload.error);
    console.log(`[SIM] uploading ${payload.events?.length || 0} events to Google Sheet`);
    await uploadTelemetryEvents(payload.events);
    console.log("[SIM] waiting for Google Sheet session confirmation");
    await waitForSheetSessions((payload.sessions || []).map((session) => session.sessionId));
    console.log("[SIM] Google Sheet session confirmation complete");
    for (const [profile, summary] of Object.entries(payload.summary?.groups || {})) {
      if (!summary.sessions) continue;
      console.log(`[SIM] ${profile}: ${summary.sessions} sessions / attempts ${summary.averageAttempts.toFixed(2)} / delay ${summary.averageDecisionSec.toFixed(2)}s / clear ${(summary.clearRate * 100).toFixed(1)}%`);
    }
    console.log(`[SIM] strategies ${Object.entries(payload.summary?.strategies || {}).map(([key, count]) => `${key}:${count}`).join(" / ")}`);
    if (options.dashboard) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      updateDashboard();
    }
  } finally {
    clearTimeout(timeout);
    if (!child.killed) child.kill();
    if (process.platform === "win32") {
      const escapedProfile = profileDir.replace(/'/g, "''");
      spawnSync("powershell.exe", [
        "-NoProfile",
        "-Command",
        `$needle='${escapedProfile}'; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \"*$needle*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
      ], { stdio: "ignore", windowsHide: true });
    }
    await new Promise((resolve) => server.close(resolve));
    const tempRoot = path.resolve(os.tmpdir());
    const resolvedProfile = path.resolve(profileDir);
    if (resolvedProfile.startsWith(`${tempRoot}${path.sep}`) && path.basename(resolvedProfile).startsWith("3sort-balance-sim-")) {
      try {
        fs.rmSync(resolvedProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch (error) {
        console.warn(`[SIM] temporary browser profile cleanup skipped: ${error.code || error.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(`[SIM] ERROR ${error.stack || error.message}`);
  process.exitCode = 1;
});
