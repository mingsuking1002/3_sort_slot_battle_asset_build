import fs from "node:fs";
import vm from "node:vm";

const sourcePath = new URL("./exhibition-telemetry-apps-script.gs", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const probes = `
globalThis.__telemetrySchemaProbe = {
  events: [EVENT_HEADERS.length, EVENT_DESCRIPTIONS.length, toEventRow_({}, new Date()).length],
  sessions: [SESSION_HEADERS.length, SESSION_DESCRIPTIONS.length, toSessionRow_({}, new Date()).length],
  pieceDamage: [
    PIECE_DAMAGE_HEADERS.length,
    PIECE_DAMAGE_DESCRIPTIONS.length,
    toPieceDamageRows_({ payload: { loadout: [{ pieceKey: "probe" }] } }, new Date())[0].length,
  ],
  waveStats: [WAVE_STATS_HEADERS.length, WAVE_STATS_DESCRIPTIONS.length, toWaveStatsRow_({ payload: {} }, new Date()).length],
  pieceWaveStats: [
    PIECE_WAVE_STATS_HEADERS.length,
    PIECE_WAVE_STATS_DESCRIPTIONS.length,
    toPieceWaveStatsRows_({ payload: { pieceStats: [{ pieceKey: "probe" }] } }, new Date())[0].length,
  ],
  perkOptions: [
    PERK_OPTIONS_HEADERS.length,
    PERK_OPTIONS_DESCRIPTIONS.length,
    toPerkOptionRows_({ payload: { offered: [{}] } }, new Date())[0].length,
  ],
  systemStats: [
    SYSTEM_STATS_HEADERS.length,
    SYSTEM_STATS_DESCRIPTIONS.length,
    toSystemStatsRows_({ payload: { systemDamageBySource: { probe: 1 } } }, new Date())[0].length,
  ],
};`;

const context = {};
vm.createContext(context);
vm.runInContext(`${source}\n${probes}`, context, { filename: sourcePath.pathname });

let failed = false;
for (const [name, lengths] of Object.entries(context.__telemetrySchemaProbe)) {
  const valid = lengths.every((length) => length === lengths[0]);
  console.log(`${valid ? "PASS" : "FAIL"} ${name}: ${lengths.join(" / ")}`);
  if (!valid) failed = true;
}
if (failed) process.exitCode = 1;
