import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const files = {
  game: fs.readFileSync(path.join(root, "index.html"), "utf8"),
  bot: fs.readFileSync(path.join(root, "assets", "js", "balance-simulator.js"), "utf8"),
  runner: fs.readFileSync(path.join(root, "tools", "simulation", "simulate-balance.mjs"), "utf8"),
  dashboard: fs.readFileSync(path.join(root, "balance-dashboard", "dashboard.js"), "utf8"),
  dashboardHtml: fs.readFileSync(path.join(root, "balance-dashboard", "index.html"), "utf8"),
  builder: fs.readFileSync(path.join(root, "tools", "build-balance-dashboard.mjs"), "utf8"),
};

const checks = [
  [files.game.includes("window.BALANCE_SIMULATION = Object.freeze"), "게임 시뮬레이션 인터페이스"],
  [files.game.includes("moveSelectedToSlot(toSlot, toCell)"), "실제 소팅 함수 연결"],
  [files.game.includes("selectUpgrade(index)"), "실제 특전 선택 함수 연결"],
  [files.game.includes("SIMULATION_QUERY.active && !SIMULATION_QUERY.upload"), "기본 원격 로그 차단"],
  [files.game.includes("remaining = realDt * (SIMULATION_QUERY.active ? SIMULATION_QUERY.speed : 1)"), "배속 서브스텝"],
  [files.bot.includes("logNormalWithMean"), "소팅 시간 확률분포"],
  [!files.bot.includes("targetAttempts") && !files.bot.includes("attempts <"), "게임 종료까지 소팅 지속"],
  [files.bot.includes("perkScore"), "특전 전략 점수"],
  [files.bot.includes("beginner") && files.bot.includes("intermediate") && files.bot.includes("advanced"), "3개 숙련도 프로필"],
  [files.bot.includes("const COVERAGE_PLAN") && files.runner.includes("coverage: true"), "9세션 기본 커버리지 배치"],
  [files.runner.includes("/__simulation/result"), "로컬 결과 수집기"],
  [files.runner.includes("async function uploadTelemetryEvents") && files.runner.includes("TELEMETRY_ENDPOINT"), "실행기 순차 시트 업로드"],
  [!files.runner.includes("writeFileSync(savedFile"), "시뮬레이션 JSON 미생성"],
  [files.builder.includes("--simulation"), "대시보드 시뮬레이션 병합"],
  [files.dashboard.includes("sessionSource") && files.dashboardHtml.includes("filter-source"), "실사용자/시뮬레이션 필터"],
];

let failures = 0;
for (const [passed, label] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}
if (failures) process.exitCode = 1;
else console.log(`PASS ${checks.length} simulator checks`);
