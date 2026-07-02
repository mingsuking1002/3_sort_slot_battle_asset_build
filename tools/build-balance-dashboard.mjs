import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_LOG_SHEET = "1Sy_vOpjJXiDLIzIHGsKtWkls7DStSdkYBllsDpZoSBI";
const DEFAULT_OUTPUT = path.join(root, "balance-dashboard", "data", "dashboard-data.js");
const LOG_TABS = ["sessions", "piece_damage", "wave_stats", "piece_wave_stats", "perk_options", "system_stats", "events"];
const LOG_TAB_KEYS = {
  sessions: ["session_id", "result"],
  piece_damage: ["session_id", "piece_key"],
  wave_stats: ["session_id", "remaining_enemy_count"],
  piece_wave_stats: ["session_id", "piece_key", "active_sec"],
  perk_options: ["session_id", "perk_id", "selected"],
  system_stats: ["session_id", "source", "damage_done"],
  events: ["session_id", "event_type"],
};

function parseArgs(argv) {
  const options = { logSheet: DEFAULT_LOG_SHEET, output: DEFAULT_OUTPUT, offline: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--log-sheet") options.logSheet = argv[++index] || "";
    else if (arg === "--output") options.output = path.resolve(root, argv[++index] || "");
    else if (arg === "--offline") options.offline = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`알 수 없는 인자입니다: ${arg}`);
  }
  return options;
}

function sheetId(value) {
  const match = String(value || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : String(value || "").trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function rowsToObjects(rows) {
  const normalizeHeader = (cell) => {
    const text = String(cell || "").trim();
    if (/^[a-z][a-z0-9_]*$/.test(text)) return text;
    return text.match(/(?:^|\s)([a-z][a-z0-9_]*)$/)?.[1] || text;
  };
  const headerIndex = rows.findIndex((row) => row.map(normalizeHeader).includes("received_at"));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map(normalizeHeader);
  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function safeJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadBalanceSnapshot() {
  const file = path.join(root, "assets", "data", "generated", "game-data.generated.js");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  const snapshot = context.window.GENERATED_GAME_DATA;
  if (!snapshot?.valid || !snapshot?.designTables) throw new Error("유효한 생성 밸런스 스냅샷이 없습니다.");
  const wanted = ["StageData", "WaveData", "WavePatternData", "MonsterGroupData", "MonsterData", "PieceData", "TowerData", "ProjectileData", "RarityData", "EffectData", "PerkData", "LevelData", "ExpData"];
  return {
    contractVersion: snapshot.contractVersion,
    generatedAt: snapshot.generatedAt,
    snapshotId: `${snapshot.contractVersion}@${snapshot.generatedAt}`,
    spreadsheetId: snapshot.spreadsheetId,
    tables: Object.fromEntries(wanted.map((name) => [name, snapshot.designTables[name] || []])),
  };
}

async function fetchTab(spreadsheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const text = await response.text();
  if (/<!doctype html|<html/i.test(text)) throw new Error("공개 CSV 응답이 아닙니다");
  const rows = rowsToObjects(parseCsv(text));
  const headers = new Set(Object.keys(rows[0] || {}));
  if (!LOG_TAB_KEYS[tabName].every((key) => headers.has(key))) {
    throw new Error("탭 없음 또는 스키마 불일치");
  }
  return rows;
}

function deriveNormalizedLogs(logs) {
  const events = logs.events || [];
  if (!logs.wave_stats?.length) {
    logs.wave_stats = events.filter((event) => event.event_type === "wave_end").map((event) => {
      const payload = safeJson(event.payload_json, {});
      const slot = payload.slotHp || {};
      return {
        received_at: event.received_at,
        session_id: event.session_id,
        event_id: event.event_id,
        build_version: event.build_version,
        balance_snapshot_id: event.balance_snapshot_id || "legacy",
        stage_key: event.stage_key,
        wave: payload.wave || event.wave,
        wave_ordinal: payload.waveOrdinal || event.wave_ordinal,
        reason: payload.reason,
        elapsed_sec: payload.elapsedSec || event.elapsed_sec,
        enemy_spawned: payload.enemySpawned || "",
        enemy_defeated: payload.enemyDefeated || "",
        remaining_enemy_count: payload.remainingEnemyCount ?? payload.enemyCount ?? event.enemy_count,
        sort_attempts: payload.sortAttempts || "",
        sort_successes: payload.sortSuccesses ?? event.sort_successes,
        sort_failures: payload.sortFailures || "",
        repair_count: payload.repairCount || "",
        repair_heal_total: payload.repairHealTotal || "",
        slot_damage_taken: payload.slotDamageTaken || "",
        max_combo: payload.maxCombo || event.max_combo,
        piece_damage: sumPieceDamage(payload.damageByPiece),
        system_damage: sumObject(payload.systemDamageBySource),
        alive_slot_count: slot.aliveSlotCount ?? event.alive_slot_count,
        destroyed_slot_count: slot.destroyedSlotCount ?? event.destroyed_slot_count,
        slot_hp_total: slot.slotHpTotal ?? event.slot_hp_total,
        slot_hp_ratio_avg: slot.slotHpRatioAvg ?? event.slot_hp_ratio_avg,
        tower_composition: event.tower_composition || "",
        payload_json: event.payload_json,
      };
    });
  }
  if (!logs.piece_wave_stats?.length) {
    logs.piece_wave_stats = events.filter((event) => event.event_type === "wave_end").flatMap((event) => {
      const payload = safeJson(event.payload_json, {});
      return (payload.pieceStats || []).map((piece) => ({
        received_at: event.received_at, session_id: event.session_id, event_id: event.event_id,
        build_version: event.build_version, balance_snapshot_id: event.balance_snapshot_id || "legacy",
        stage_key: event.stage_key, wave_ordinal: payload.waveOrdinal || event.wave_ordinal,
        ...toSnakePieceStats(piece),
      }));
    });
  }
  if (!logs.perk_options?.length) {
    logs.perk_options = events.filter((event) => event.event_type === "perk_pick").flatMap((event) => {
      const payload = safeJson(event.payload_json, {});
      const picked = String(payload.picked?.id || "");
      return (payload.offered || []).map((perk) => ({
        received_at: event.received_at, session_id: event.session_id, event_id: event.event_id,
        build_version: event.build_version, balance_snapshot_id: event.balance_snapshot_id || "legacy",
        stage_key: event.stage_key, wave_ordinal: event.wave_ordinal, perk_id: perk.id || "",
        perk_title: perk.title || "", rarity: perk.rarity || "", target_type: perk.targetType || "",
        label: perk.label || "", selected: String(perk.id || "") === picked ? "TRUE" : "FALSE",
      }));
    });
  }
  if (!logs.system_stats?.length) {
    logs.system_stats = events.filter((event) => event.event_type === "wave_end").flatMap((event) => {
      const payload = safeJson(event.payload_json, {});
      const activations = payload.systemActivations || {};
      const damage = payload.systemDamageBySource || {};
      return [...new Set([...Object.keys(activations), ...Object.keys(damage)])].map((source) => ({
        received_at: event.received_at, session_id: event.session_id, event_id: event.event_id,
        build_version: event.build_version, balance_snapshot_id: event.balance_snapshot_id || "legacy",
        stage_key: event.stage_key, wave_ordinal: payload.waveOrdinal || event.wave_ordinal, source,
        activation_count: activations[source]?.count || 0, projectiles: activations[source]?.projectiles || 0,
        ammo_spent: activations[source]?.ammoSpent || 0, damage_done: damage[source] || 0,
      }));
    });
  }
  logs.events = events.filter((event) => ["wave_end", "perk_pick", "session_end"].includes(event.event_type));
  return logs;
}

function toSnakePieceStats(piece) {
  return {
    piece_key: piece.pieceKey || "", piece_name: piece.pieceName || "", tower_id: piece.towerId || "",
    tower_type: piece.towerType || "", tower_level: piece.towerLevel || 0, tower_created: piece.towerCreated || 0,
    tower_queued: piece.towerQueued || 0, active_sec: piece.activeSec || 0, attacks_fired: piece.attacksFired || 0,
    projectiles_fired: piece.projectilesFired || 0, hits: piece.hits || 0, damage_done: piece.damageDone || 0,
    healing_done: piece.healingDone || 0, overdrive_damage: piece.overdriveDamage || 0,
  };
}

function sumPieceDamage(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + Number(item.damage || 0), 0);
  return sumObject(value);
}

function sumObject(value) {
  return value && typeof value === "object"
    ? Object.values(value).reduce((sum, item) => sum + Number(item || 0), 0)
    : 0;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node tools/build-balance-dashboard.mjs [--log-sheet <url|id>] [--output <file>] [--offline]");
    return;
  }
  const balance = loadBalanceSnapshot();
  const logs = Object.fromEntries(LOG_TABS.map((name) => [name, []]));
  const warnings = [];
  if (!options.offline) {
    const id = sheetId(options.logSheet);
    for (const tab of LOG_TABS) {
      try {
        logs[tab] = await fetchTab(id, tab);
        console.log(`LOG ${tab}: ${logs[tab].length}`);
      } catch (error) {
        warnings.push(`${tab}: ${error.message}`);
        console.warn(`SKIP ${tab}: ${error.message}`);
      }
    }
  }
  deriveNormalizedLogs(logs);
  const payload = {
    generatedAt: new Date().toISOString(),
    balance,
    logs,
    warnings,
    logSheetId: sheetId(options.logSheet),
  };
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `window.BALANCE_DASHBOARD_DATA = ${JSON.stringify(payload)};\n`, "utf8");
  console.log(`DASHBOARD ${options.output}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
