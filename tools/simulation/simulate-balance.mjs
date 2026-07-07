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
    mix: "beginner:2,intermediate:5,advanced:2",
    profile: "",
    scenario: "",
    stage: "",
    pieces: [],
    coverage: true,
    show: false,
    dashboard: true,
    dryRun: false,
    speedCheck: false,
    checkSpeeds: [1, 10, 50],
    checkSessions: 1,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sessions") options.sessions = Number(argv[++index]);
    else if (arg === "--speed") options.speed = Number(argv[++index]);
    else if (arg === "--seed") options.seed = Number(argv[++index]);
    else if (arg === "--mix") options.mix = argv[++index] || options.mix;
    else if (arg === "--profile") options.profile = argv[++index] || "";
    else if (arg === "--scenario") options.scenario = argv[++index] || "";
    else if (arg === "--stage") options.stage = argv[++index] || "";
    else if (arg === "--pieces") options.pieces = String(argv[++index] || "").split(",").map((key) => key.trim()).filter(Boolean);
    else if (arg === "--coverage") options.coverage = true;
    else if (arg === "--random-mix") options.coverage = false;
    else if (arg === "--show") options.show = true;
    else if (arg === "--no-dashboard") options.dashboard = false;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--speed-check") options.speedCheck = true;
    else if (arg === "--check-speeds") options.checkSpeeds = String(argv[++index] || "1,10,50").split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0);
    else if (arg === "--check-sessions") options.checkSessions = Number(argv[++index]);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`알 수 없는 인자입니다: ${arg}`);
  }
  options.sessions = Math.max(1, Math.min(2000, Math.floor(options.sessions || 9)));
  options.speed = Math.max(1, Math.min(50, Number(options.speed) || 50));
  options.checkSpeeds = [...new Set(options.checkSpeeds.map((value) => Math.max(1, Math.min(50, Math.floor(value)))))]
    .sort((a, b) => a - b);
  options.checkSessions = Math.max(1, Math.min(12, Math.floor(Number(options.checkSessions) || 1)));
  options.seed = Math.max(1, Math.floor(options.seed || (Date.now() % 2147483647)));
  if (options.profile && !["beginner", "intermediate", "advanced"].includes(options.profile)) {
    throw new Error(`지원하지 않는 프로필입니다: ${options.profile}`);
  }
  const scenarios = ["standard", "highRoll", "lowRoll", "pressureAttack", "comboFocus"];
  if (options.scenario && !scenarios.includes(options.scenario)) {
    throw new Error(`지원하지 않는 시나리오입니다: ${options.scenario}`);
  }
  if (options.pieces.length) {
    if (options.pieces.length !== 6) throw new Error(`--pieces는 정확히 6개 입력해야 합니다: ${options.pieces.length}개`);
    if (new Set(options.pieces).size !== options.pieces.length) {
      throw new Error(`--pieces에는 중복 Piece ID를 넣을 수 없습니다: ${options.pieces.join(",")}`);
    }
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
      request.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const result = await onResult(payload);
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

async function collectSimulationPayload(options, browser, overrides = {}) {
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
    return { destination: overrides.destination || "local speed check" };
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const port = server.address().port;
  const runId = overrides.runId || `sim-${Date.now()}-${process.pid}`;
  const query = new URLSearchParams({
    simulation: "1",
    sessions: String(overrides.sessions ?? options.sessions),
    speed: String(overrides.speed ?? options.speed),
    seed: String(overrides.seed ?? options.seed),
    mix: options.mix,
    runId,
  });
  if (options.profile) query.set("profile", options.profile);
  if (options.scenario) query.set("scenario", options.scenario);
  if (options.stage) query.set("stage", options.stage);
  if (options.pieces.length) query.set("pieces", options.pieces.join(","));
  if (options.coverage) query.set("coverage", "1");
  const url = `http://127.0.0.1:${port}/index.html?${query}`;
  const profileDir = path.join(os.tmpdir(), `3sort-balance-sim-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
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
  if (!options.show && !overrides.show) browserArgs.push("--headless=new", "--disable-gpu");
  browserArgs.push(url);

  const speed = overrides.speed ?? options.speed;
  const sessions = overrides.sessions ?? options.sessions;
  const child = spawn(browser, browserArgs, { stdio: "ignore", windowsHide: !options.show && !overrides.show });
  child.once("error", rejectResult);
  child.once("exit", (code) => {
    if (!resultReceived) console.warn(`[SIM] browser launcher exited before completion (code=${code}); waiting for browser worker`);
  });

  const estimatedMs = Math.max(300000, Math.ceil(sessions * (500 / speed + 12) * 1000));
  const timeout = setTimeout(() => rejectResult(new Error(`시뮬레이션 제한시간 초과 (${Math.round(estimatedMs / 60000)}분)`)), estimatedMs);
  try {
    const payload = await resultPromise;
    clearTimeout(timeout);
    if (payload.error) throw new Error(payload.error);
    return payload;
  } finally {
    clearTimeout(timeout);
    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else if (!child.killed) child.kill();
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
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

function stableNumber(value, digits = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0;
}

function eventFingerprint(event) {
  const payload = event.payload || {};
  return [
    event.eventType,
    event.waveOrdinal,
    event.sortAttempts,
    event.sortSuccesses,
    event.enemyCount,
    stableNumber(event.damageDone, 1),
    stableNumber(event.slotHpRatioAvg, 3),
    payload.result || "",
    payload.reason || "",
    Array.isArray(payload.pickedPerks) ? payload.pickedPerks.map((perk) => perk.id || perk.title).join("|") : "",
  ].join(":");
}

function checksumText(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function payloadSpeedSignature(payload) {
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
  const events = Array.isArray(payload.events) ? payload.events : [];
  return {
    sessions: sessions.map((session) => ({
      profile: session.profile,
      strategy: session.strategy,
      scenario: session.scenario,
      result: session.result,
      reachedWave: Number(session.reachedWave || 0),
      attempts: Number(session.actualAttempts || 0),
      perkPicks: Number(session.perkPicks || 0),
      plannedSortRatio: stableNumber(session.plannedSortRatio, 3),
    })),
    checksum: checksumText(events.map(eventFingerprint).join("\n")),
    eventCount: events.length,
  };
}

function compareSpeedSignatures(base, candidate) {
  const issues = [];
  const warnings = [];
  const length = Math.max(base.sessions.length, candidate.sessions.length);
  if (base.sessions.length !== candidate.sessions.length) issues.push(`세션 수 불일치 ${base.sessions.length} != ${candidate.sessions.length}`);
  for (let index = 0; index < length; index += 1) {
    const a = base.sessions[index] || {};
    const b = candidate.sessions[index] || {};
    if (a.result !== b.result) issues.push(`S${index + 1} result ${a.result} != ${b.result}`);
    if (a.reachedWave !== b.reachedWave) issues.push(`S${index + 1} wave ${a.reachedWave} != ${b.reachedWave}`);
    if (a.attempts !== b.attempts) issues.push(`S${index + 1} attempts ${a.attempts} != ${b.attempts}`);
    if (a.perkPicks !== b.perkPicks) warnings.push(`S${index + 1} perk picks ${a.perkPicks} != ${b.perkPicks}`);
    if (Math.abs(Number(a.plannedSortRatio || 0) - Number(b.plannedSortRatio || 0)) > 0.03) {
      warnings.push(`S${index + 1} planned ratio ${a.plannedSortRatio} != ${b.plannedSortRatio}`);
    }
  }
  if (base.eventCount !== candidate.eventCount) warnings.push(`event count ${base.eventCount} != ${candidate.eventCount}`);
  if (base.checksum !== candidate.checksum) warnings.push(`checksum ${base.checksum} != ${candidate.checksum}`);
  return { issues, warnings };
}

async function runSpeedCheck(options, browser) {
  const speeds = options.checkSpeeds.length ? options.checkSpeeds : [1, 10, 50];
  console.log(`[SIM] speed check ${speeds.join("x / ")}x / sessions ${options.checkSessions} / seed ${options.seed}`);
  const results = [];
  for (const speed of speeds) {
    console.log(`[SIM] speed check run x${speed}`);
    const payload = await collectSimulationPayload(options, browser, {
      speed,
      sessions: options.checkSessions,
      runId: `speed-check-${options.seed}-${speed}`,
      destination: "local speed check",
    });
    const signature = payloadSpeedSignature(payload);
    results.push({ speed, payload, signature });
    console.log(`[SIM] x${speed}: ${signature.sessions.map((session, index) => `S${index + 1}:${session.result}/W${session.reachedWave}/A${session.attempts}/P${session.plannedSortRatio}`).join(" | ")} / checksum ${signature.checksum}`);
  }
  const base = results[0];
  let failures = 0;
  for (const result of results.slice(1)) {
    const diff = compareSpeedSignatures(base.signature, result.signature);
    for (const warning of diff.warnings) console.warn(`[SIM] speed check warning x${base.speed}->x${result.speed}: ${warning}`);
    for (const issue of diff.issues) console.error(`[SIM] speed check mismatch x${base.speed}->x${result.speed}: ${issue}`);
    if (diff.issues.length) failures += diff.issues.length;
  }
  if (failures) throw new Error(`속도 검증 실패: ${failures}개 핵심 불일치`);
  console.log("[SIM] speed check passed: core session results match");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node tools/simulation/simulate-balance.mjs [--sessions 9] [--speed 50] [--seed <number>]");
    console.log("  [--mix beginner:2,intermediate:5,advanced:2] [--profile beginner|intermediate|advanced]");
    console.log("  [--scenario standard|highRoll|lowRoll|pressureAttack|comboFocus]");
    console.log("  [--stage stage-1] [--pieces basic_1_1,scatter_1_1,sniper_1_1,breaker_1_1,blast_1_1,support_1_1]");
    console.log("  [--coverage|--random-mix] [--show] [--no-dashboard] [--dry-run]");
    console.log("  [--speed-check] [--check-speeds 1,10,50] [--check-sessions 1]");
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
    if (options.stage) console.log(`OK stage option: ${options.stage}`);
    if (options.pieces.length) console.log(`OK pieces option: ${options.pieces.join(",")}`);
    console.log("OK storage: Google Sheet only");
    return;
  }
  if (options.speedCheck) {
    await runSpeedCheck(options, browser);
    return;
  }

  let resolveResult;
  let rejectResult;
  const resultPromise = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  let resultReceived = false;
  let checkpointCount = 0;
  let checkpointEventCount = 0;
  let checkpointQueuedCount = 0;
  let checkpointQueuedEventCount = 0;
  const checkpointSessionIds = new Set();
  const uploadFailures = [];
  let uploadQueue = Promise.resolve();
  function enqueueTelemetryUpload(label, events, sessions = []) {
    const source = Array.isArray(events) ? events : [];
    const sessionRows = Array.isArray(sessions) ? sessions : [];
    checkpointQueuedCount += 1;
    checkpointQueuedEventCount += source.length;
    uploadQueue = uploadQueue
      .then(async () => {
        if (!source.length) return;
        console.log(`[SIM] ${label}: uploading ${source.length} events`);
        await uploadTelemetryEvents(source);
        checkpointCount += 1;
        checkpointEventCount += source.length;
        for (const session of sessionRows) {
          if (session.sessionId) checkpointSessionIds.add(session.sessionId);
        }
      })
      .catch((error) => {
        uploadFailures.push(error);
        console.error(`[SIM] ${label}: upload failed - ${error.message}`);
      });
  }
  const server = createServer((payload) => {
    if (payload.checkpoint) {
      const events = Array.isArray(payload.events) ? payload.events : [];
      const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
      const checkpointIndex = payload.checkpointIndex || checkpointQueuedCount + 1;
      console.log(`[SIM] checkpoint ${checkpointIndex}/${options.sessions}: queued ${events.length} events`);
      enqueueTelemetryUpload(`checkpoint ${checkpointIndex}/${options.sessions}`, events, sessions);
      return { destination: `Google Sheet checkpoint queued ${checkpointIndex}` };
    }
    resultReceived = true;
    resolveResult({
      ...payload,
      checkpointCount,
      checkpointEventCount,
      checkpointQueuedCount,
      checkpointQueuedEventCount,
      checkpointSessionIds: [...checkpointSessionIds],
    });
    return { destination: "Google Sheet final" };
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
    checkpoint: "1",
  });
  if (options.profile) query.set("profile", options.profile);
  if (options.scenario) query.set("scenario", options.scenario);
  if (options.stage) query.set("stage", options.stage);
  if (options.pieces.length) query.set("pieces", options.pieces.join(","));
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

  console.log(`[SIM] ${options.sessions} sessions / speed x${options.speed} / seed ${options.seed} / ${options.coverage ? "coverage" : "random mix"}${options.scenario ? ` / scenario ${options.scenario}` : ""}${options.stage ? ` / stage ${options.stage}` : ""}${options.pieces.length ? ` / pieces ${options.pieces.join(",")}` : ""}`);
  console.log("[SIM] telemetry Google Sheet only");
  console.log(`[SIM] browser ${path.basename(browser)} ${options.show ? "visible" : "headless"}`);
  const child = spawn(browser, browserArgs, { stdio: "ignore", windowsHide: !options.show });
  child.once("error", rejectResult);
  child.once("exit", (code) => {
    if (!resultReceived) console.warn(`[SIM] browser launcher exited before completion (code=${code}); waiting for browser worker`);
  });

  const estimatedMs = Math.max(300000, Math.ceil(options.sessions * (500 / options.speed + 12) * 1000));
  const timeout = setTimeout(() => rejectResult(new Error(`시뮬레이션 제한시간 초과 (${Math.round(estimatedMs / 60000)}분)`)), estimatedMs);
  try {
    const payload = await resultPromise;
    clearTimeout(timeout);
    if (payload.error) throw new Error(payload.error);
    if (payload.checkpointQueuedCount) {
      console.log(`[SIM] waiting for checkpoint uploads (${payload.checkpointQueuedCount} checkpoints / ${payload.checkpointQueuedEventCount || 0} events queued)`);
      await uploadQueue;
      if (uploadFailures.length) throw new Error(`체크포인트 업로드 실패: ${uploadFailures.map((error) => error.message).join(" / ")}`);
      console.log(`[SIM] checkpoint upload complete: ${checkpointCount} checkpoints / ${checkpointEventCount} events`);
    }
    if (payload.events?.length) {
      console.log(`[SIM] uploading ${payload.events.length} final events to Google Sheet`);
      await uploadTelemetryEvents(payload.events);
    } else {
      console.log(`[SIM] checkpoint upload complete: ${payload.checkpointCount || 0} checkpoints / ${payload.checkpointEventCount || 0} events`);
    }
    console.log("[SIM] waiting for Google Sheet session confirmation");
    await waitForSheetSessions((payload.sessions || []).map((session) => session.sessionId));
    console.log("[SIM] Google Sheet session confirmation complete");
    for (const [profile, summary] of Object.entries(payload.summary?.groups || {})) {
      if (!summary.sessions) continue;
      console.log(`[SIM] ${profile}: ${summary.sessions} sessions / attempts ${summary.averageAttempts.toFixed(2)} / delay ${summary.averageDecisionSec.toFixed(2)}s / planned ${((summary.averagePlannedSortRatio || 0) * 100).toFixed(1)}% / clear ${(summary.clearRate * 100).toFixed(1)}%`);
    }
    console.log(`[SIM] strategies ${Object.entries(payload.summary?.strategies || {}).map(([key, count]) => `${key}:${count}`).join(" / ")}`);
    console.log(`[SIM] scenarios ${Object.entries(payload.summary?.scenarios || {}).map(([key, count]) => `${key}:${count}`).join(" / ")}`);
    if (options.dashboard) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      updateDashboard();
    }
  } finally {
    clearTimeout(timeout);
    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else if (!child.killed) child.kill();
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
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
