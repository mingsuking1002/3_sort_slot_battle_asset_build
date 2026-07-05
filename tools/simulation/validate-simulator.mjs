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
  telemetryScript: fs.readFileSync(path.join(root, "tools", "exhibition-telemetry-apps-script.gs"), "utf8"),
  guide: fs.readFileSync(path.join(root, "docs", "BALANCE_SIMULATOR_GUIDE.md"), "utf8"),
};

const coveragePlanBlock = files.bot.match(/const COVERAGE_PLAN = \[[\s\S]*?\];/)?.[0] || "";
const countCoverageProfile = (profile) => (coveragePlanBlock.match(new RegExp(`profile: "${profile}"`, "g")) || []).length;
const retiredScenarioPattern = /weakStart|mistakeHeavy|repairFirst/;

const checks = [
  [files.game.includes("window.BALANCE_SIMULATION = Object.freeze"), "게임 시뮬레이션 인터페이스"],
  [files.game.includes("moveSelectedToSlot(toSlot, toCell)"), "실제 소팅 함수 연결"],
  [files.game.includes("selectUpgrade(index)"), "실제 특전 선택 함수 연결"],
  [files.game.includes("SIMULATION_QUERY.active && !SIMULATION_QUERY.upload"), "기본 원격 로그 차단"],
  [files.game.includes("remaining = realDt * (SIMULATION_QUERY.active ? SIMULATION_QUERY.speed : 1)"), "배속 서브스텝"],
  [files.bot.includes("logNormalWithMean"), "소팅 시간 확률분포"],
  [!files.bot.includes("targetAttempts") && !files.bot.includes("attempts <"), "게임 종료까지 소팅 지속"],
  [files.bot.includes("pairSetups") && files.bot.includes("planningRate"), "다음 소팅을 준비하는 스마트 이동"],
  [files.bot.includes("createPlanState") && files.bot.includes("plannedSortRatio") && files.bot.includes("plan-followup"), "계획 큐 기반 선행 소팅"],
  [files.bot.includes("isMeaningfulFallbackMove") && !files.bot.includes("mistakeRate: 0.13") && !files.bot.includes("mistakeRate: 0.045"), "무의미 이동/실수 이동 제거"],
  [files.bot.includes("return bestIndex;") && !files.bot.includes("score += normal() * profile.perkNoise"), "특전 오판 랜덤성 제거"],
  [files.game.includes("getSimulationThreatSnapshot") && files.game.includes("pressureScore"), "실전 전장 압박 스냅샷"],
  [files.bot.includes('successful = { attack: [], repair: [] }') && files.bot.includes("chooseMoveForKind"), "공격/수리 소팅 후보 분리"],
  [files.bot.includes("updatePressureMode") && files.bot.includes("getPressureDelayMultiplier"), "압박 시 공격 우선 및 소팅 가속"],
  [files.bot.includes("perkScore") && files.bot.includes("boardTypeCounts") && files.bot.includes("actionTags"), "상황 기반 특전 전략 점수"],
  [files.bot.includes("beginner") && files.bot.includes("intermediate") && files.bot.includes("advanced"), "3개 숙련도 프로필"],
  [files.bot.includes("const SCENARIOS") && files.bot.includes("pressureAttack") && files.bot.includes("comboFocus"), "시나리오 프리셋"],
  [files.bot.includes("const COVERAGE_PLAN") && files.runner.includes("coverage: true"), "9세션 기본 커버리지 배치"],
  [countCoverageProfile("beginner") === 2 && countCoverageProfile("intermediate") === 5 && countCoverageProfile("advanced") === 2, "9세션 커버리지 2:5:2 숙련도 비율"],
  [!retiredScenarioPattern.test(files.bot) && !retiredScenarioPattern.test(files.runner) && !retiredScenarioPattern.test(files.guide), "제외 시나리오 비활성화"],
  [files.runner.includes("--scenario") && files.runner.includes("scenario ${options.scenario}"), "시나리오 실행 옵션"],
  [files.runner.includes("--stage") && files.runner.includes("--pieces") && files.bot.includes("experimentPieces"), "스테이지/기물 조합 실행 옵션"],
  [files.game.includes("applySimulationExperimentConfig") && files.game.includes("botLoadoutHash"), "시뮬레이션 스테이지/편성 강제 적용"],
  [files.runner.includes("/__simulation/result"), "로컬 결과 수집기"],
  [files.runner.includes("async function uploadTelemetryEvents") && files.runner.includes("TELEMETRY_ENDPOINT"), "실행기 순차 시트 업로드"],
  [files.runner.includes("--speed-check") && files.runner.includes("runSpeedCheck") && files.runner.includes("compareSpeedSignatures"), "1x/10x/50x 동일 seed 속도 검증"],
  [files.runner.includes('spawnSync("taskkill.exe"') && files.runner.includes("closeAllConnections"), "Windows 브라우저 프로세스 및 서버 연결 정리"],
  [!files.runner.includes("writeFileSync(savedFile"), "시뮬레이션 JSON 미생성"],
  [files.builder.includes("--simulation"), "대시보드 시뮬레이션 병합"],
  [files.dashboard.includes("sessionSource") && files.dashboardHtml.includes("filter-source"), "실사용자/시뮬레이션 필터"],
  [files.dashboard.includes("sessionSimulationVersion") && files.dashboardHtml.includes("filter-sim-version"), "시뮬레이터 버전 필터"],
  [files.dashboardHtml.includes('data-view="calibration"') && files.dashboard.includes("renderCalibration"), "실제 로그/시뮬 보정 화면"],
  [files.dashboard.includes("inferSkillProfile") && files.dashboard.includes("getSkillCalibrationRows"), "실제 로그 숙련도 추정 비교"],
  [files.dashboardHtml.includes("filter-skill-profile") && files.dashboard.includes("sessionSkillProfile"), "숙련도 필터"],
  [files.dashboard.includes("renderSkillSummary") && files.dashboard.includes("getSkillSummaryRows"), "초보자/중급자/상급자 핵심 지표"],
  [files.dashboardHtml.includes("filter-stage") && files.dashboardHtml.includes("filter-loadout") && files.dashboard.includes("getLoadoutExperimentRows"), "스테이지/기물 조합 대시보드 필터와 지표"],
  [files.game.includes("sortIntervalAvg") && files.game.includes("sortIntervalStddev"), "실제 소팅 간격 텔레메트리"],
  [files.game.includes("botScenario") && files.telemetryScript.includes("bot_scenario"), "자동 플레이 시나리오 텔레메트리"],
  [files.telemetryScript.includes("bot_stage_key") && files.telemetryScript.includes("bot_loadout_hash"), "자동 플레이 스테이지/기물 조합 텔레메트리"],
  [files.dashboard.includes('kpi("평균 소팅 시도"') && files.dashboard.includes('kpi("소팅 전환율"') && files.dashboard.includes('kpi("평균 소팅 간격"'), "대시보드 소팅 품질 지표"],
  [files.dashboard.includes("const intervalValue =") && files.dashboard.includes("intervalValue(row.interval, row.intervalSamples)"), "대시보드 평균 소팅 간격 포맷터"],
  [files.guide.includes("--scenario") && files.guide.includes("시뮬 보정") && files.guide.includes("숙련도 기준"), "시뮬레이터 가이드 갱신"],
];

let failures = 0;
for (const [passed, label] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures += 1;
}
if (failures) process.exitCode = 1;
else console.log(`PASS ${checks.length} simulator checks`);
