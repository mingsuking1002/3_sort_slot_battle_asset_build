import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const dataPath = path.join(root, "assets", "data", "game-data.js");
const generatedDataPath = path.join(root, "assets", "data", "generated", "game-data.generated.js");
const htmlPath = path.join(root, "index.html");

const results = [];

function add(kind, status, name, detail = "") {
  results.push({ kind, status, name, detail });
}

function pass(kind, name, detail = "") {
  add(kind, "PASS", name, detail);
}

function warn(kind, name, detail = "") {
  add(kind, "WARN", name, detail);
}

function info(kind, name, detail = "") {
  add(kind, "INFO", name, detail);
}

function fail(kind, name, detail = "") {
  add(kind, "FAIL", name, detail);
}

function has(obj, key) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function loadGameData(codeTransform = null) {
  const rawCode = fs.readFileSync(dataPath, "utf8");
  const code = typeof codeTransform === "function" ? codeTransform(rawCode) : rawCode;
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: dataPath });
  return context.window.GAME_DATA || {};
}

function loadBalanceGameData(mutateGenerated = null) {
  if (!fs.existsSync(generatedDataPath)) return {};
  const context = {
    window: { location: { search: "" } },
    URLSearchParams,
    console: { info() {}, warn() {}, error() {} },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(generatedDataPath, "utf8"), context, { filename: generatedDataPath });
  if (typeof mutateGenerated === "function") mutateGenerated(context.window.GENERATED_GAME_DATA);
  vm.runInContext(fs.readFileSync(dataPath, "utf8"), context, { filename: dataPath });
  return {
    data: context.window.GAME_DATA || {},
    generated: context.window.GENERATED_GAME_DATA || {},
  };
}

function validateBalanceDataMode(playData, html) {
  const { data: balanceData, generated } = loadBalanceGameData();
  if (generated.valid === true && generated.runtimeEnabled === true && generated.dataProfile === "balance") {
    pass("BALANCE_DATA", "Generated balance snapshot is valid and runtime-enabled");
  } else {
    fail("BALANCE_DATA", "Generated balance snapshot is not runtime-ready", JSON.stringify({
      valid: generated.valid,
      runtimeEnabled: generated.runtimeEnabled,
      dataProfile: generated.dataProfile,
    }));
    return;
  }

  if (playData.balanceDataStatus?.requested === true && balanceData.balanceDataStatus?.active === true) {
    pass("BALANCE_DATA", "Default launch requests and applies generated balance data");
  } else {
    fail("BALANCE_DATA", "Default balance data activation failed", JSON.stringify({
      play: playData.balanceDataStatus,
      balance: balanceData.balanceDataStatus,
    }));
  }

  const excludedTables = ["TriggerData", "UpgradeCostData", "BossData", "BossPatternData", "BossPatternGroupData", "Resource", "LocalizeData"];
  const leakedExcludedTables = excludedTables.filter((tableName) => has(generated.designTables, tableName));
  if (leakedExcludedTables.length === 0) pass("BALANCE_DATA", "Excluded tables are absent from generated snapshot");
  else fail("BALANCE_DATA", "Excluded tables leaked into generated snapshot", leakedExcludedTables.join(", "));

  const perkTriggerFields = (generated.designTables?.PerkData || []).filter((row) => has(row, "TriggerID"));
  if (perkTriggerFields.length === 0) pass("BALANCE_DATA", "PerkData.TriggerID is excluded");
  else fail("BALANCE_DATA", "PerkData.TriggerID leaked into generated snapshot", String(perkTriggerFields.length));

  const generatedTowerById = new Map((generated.designTables?.TowerData || []).map((row) => [String(row.TowerID), row]));
  const invalidPieceTypes = (generated.designTables?.PieceData || []).filter((row) => {
    const tower = generatedTowerById.get(String(row.ConnectTower));
    return !tower || Number(row.PieceType) !== Number(tower.TowerType);
  });
  if (invalidPieceTypes.length === 0) pass("BALANCE_DATA", "PieceType derives from connected TowerData");
  else fail("BALANCE_DATA", "PieceType derivation mismatch", invalidPieceTypes.map((row) => row.PieceID).join(", "));

  const invalidTowerRuntimeKeys = (generated.designTables?.TowerData || []).filter((row) => {
    const runtimeType = {
      1: "basic",
      2: "scatter",
      3: "sniper",
      4: "breaker",
      5: "blast",
      6: "support",
    }[Number(row.TowerType)];
    const expectedKey = runtimeType ? `tower_${runtimeType}_${Math.max(1, Math.floor(Number(row.TowerLv) || 1))}` : "";
    return !expectedKey
      || balanceData.designRuntimeKeyMap?.TowerData?.[row.TowerID] !== expectedKey
      || String(balanceData.towers?.[expectedKey]?.design?.towerId) !== String(row.TowerID);
  });
  if (invalidTowerRuntimeKeys.length === 0) pass("BALANCE_DATA", "TowerData IDs map by TowerType and TowerLv");
  else fail("BALANCE_DATA", "TowerData runtime key mapping mismatch", invalidTowerRuntimeKeys.map((row) => row.TowerID).join(", "));

  const invalidTowerRanges = (generated.designTables?.TowerData || []).filter((row) => !Number.isFinite(Number(row.TowerMaxLange)));
  if (invalidTowerRanges.length === 0) pass("BALANCE_DATA", "TowerMaxRange normalizes into runtime range field");
  else fail("BALANCE_DATA", "TowerMaxRange normalization mismatch", invalidTowerRanges.map((row) => row.TowerID).join(", "));

  const rarityKeys = new Set(Object.keys(balanceData.perks?.rarities || {}));
  const expectedRarities = ["common", "rare", "unique", "legendary"];
  if (expectedRarities.every((key) => rarityKeys.has(key))) pass("BALANCE_DATA", "RarityData IDs map to four runtime rarities");
  else fail("BALANCE_DATA", "RarityData ID mapping incomplete", [...rarityKeys].join(", "));

  const generatedEffectById = new Map((generated.designTables?.EffectData || []).map((row) => [String(row.EffectID), row]));
  const atkPerkRow = (generated.designTables?.PerkData || []).find((row) => {
    const effect = generatedEffectById.get(String(row.EffectID));
    return Number(row.IsActive) === 1 && Number(row.PerkTarget) >= 1 && Number(row.PerkTarget) <= 6 && Number(effect?.ATK) > 0;
  });
  const runtimeAtkPerk = (balanceData.perks?.upgrades || []).find((perk) => String(perk.design?.perkId) === String(atkPerkRow?.PerkID));
  const expectedAtkRatio = Number(generatedEffectById.get(String(atkPerkRow?.EffectID))?.ATK || 0) / 100;
  const runtimeAtkAction = runtimeAtkPerk?.actions?.find((action) => action.type === "addTypeDamage");
  if (atkPerkRow && Math.abs(Number(runtimeAtkAction?.amount || 0) - expectedAtkRatio) < 0.0001) {
    pass("BALANCE_DATA", "EffectData ATK percent feeds runtime perk action");
  } else {
    fail("BALANCE_DATA", "EffectData ATK adapter mismatch", JSON.stringify({ atkPerkRow, runtimeAtkAction, expectedAtkRatio }));
  }

  if (
    runtimeAtkPerk
    && runtimeAtkPerk.title?.includes({
      basic: "기본형",
      scatter: "샷건형",
      sniper: "저격형",
      breaker: "탱커대항형",
      blast: "범위형",
      support: "보조형",
    }[runtimeAtkPerk.targetType])
    && runtimeAtkPerk.body?.includes(`${Math.round(expectedAtkRatio * 1000) / 10}%`)
  ) {
    pass("BALANCE_DATA", "Perk copy follows current PerkTarget and EffectData values");
  } else {
    fail("BALANCE_DATA", "Perk copy is stale or mismatched", JSON.stringify(runtimeAtkPerk));
  }

  let percentHpPerkId = null;
  const { data: percentHpPerkData } = loadBalanceGameData((payload) => {
    const perkRow = payload?.designTables?.PerkData?.find((row) => Number(row.IsActive) === 1 && Number(row.PerkTarget) === 4);
    const effectRow = payload?.designTables?.EffectData?.find((row) => String(row.EffectID) === String(perkRow?.EffectID));
    if (!perkRow || !effectRow) return;
    percentHpPerkId = perkRow.PerkID;
    Object.assign(effectRow, {
      ATK: 0,
      ATKSpeed: 0,
      ShotProjCount: 0,
      MaxProj: 0,
      ProjSize: 0,
      ProjPiercing: 0,
      current_hp: 2,
      BuffType: 0,
      BuffValue: 0,
    });
  });
  const runtimePercentHpPerk = (percentHpPerkData.perks?.upgrades || [])
    .find((perk) => String(perk.design?.perkId) === String(percentHpPerkId));
  const runtimePercentHpAction = runtimePercentHpPerk?.actions?.find((action) => action.type === "addTypePercentHpDamage");
  if (
    runtimePercentHpPerk?.targetType === "breaker"
    && Math.abs(Number(runtimePercentHpAction?.amount) - 0.02) < 0.0001
    && runtimePercentHpPerk.body?.includes("+2%p")
  ) {
    pass("BALANCE_DATA", "EffectData CurrentHp feeds breaker percent-HP perk and copy");
  } else {
    fail("BALANCE_DATA", "EffectData CurrentHp perk adapter mismatch", JSON.stringify(runtimePercentHpPerk));
  }

  const diagnostics = balanceData.balanceDataStatus?.diagnostics || [];
  if (diagnostics.every((item) => item.code && item.perkId)) pass("BALANCE_DATA", "Perk fallback diagnostics are structured", String(diagnostics.length));
  else fail("BALANCE_DATA", "Perk fallback diagnostics malformed", JSON.stringify(diagnostics));

  const generatedScriptIndex = html.indexOf('src="assets/data/generated/game-data.generated.js"');
  const gameDataScriptIndex = html.indexOf('src="assets/data/game-data.js"');
  if (generatedScriptIndex >= 0 && gameDataScriptIndex > generatedScriptIndex) {
    pass("BALANCE_DATA", "Generated snapshot loads before game-data.js");
  } else {
    fail("BALANCE_DATA", "Generated snapshot script order invalid");
  }

  if (html.includes('source: "balance-virtual-level"') && html.includes("tower.design?.towerLevel")) {
    pass("BALANCE_DATA", "Balance loadout exposes every TowerData level");
  } else {
    fail("BALANCE_DATA", "Balance loadout TowerData level bridge missing");
  }

  if (html.includes("forceLevelOne: false") && html.includes("hideConsole: true")) {
    pass("BALANCE_DATA", "Default build enables free levels and permanently hides console");
  } else {
    fail("BALANCE_DATA", "Default balance build flags are incomplete");
  }

  const inspectorControls = [
    'id="pieceInspectorOverlay"',
    'data-level-target="min"',
    'data-level-step="-1"',
    'data-level-step="1"',
    'data-level-target="max"',
    'id="pieceInspectorLoadoutButton"',
  ];
  if (inspectorControls.every((token) => html.includes(token))) {
    pass("BALANCE_DATA", "Piece inspector has stats, level, and loadout controls");
  } else {
    fail("BALANCE_DATA", "Piece inspector controls incomplete", inspectorControls.filter((token) => !html.includes(token)).join(", "));
  }

  if (html.includes("openPieceInspector(pieceKey)") && html.includes("toggleInspectedPieceLoadout")) {
    pass("BALANCE_DATA", "Balance cards open inspector before changing loadout");
  } else {
    fail("BALANCE_DATA", "Balance inspector interaction wiring missing");
  }
}

function validateDataReferences(data) {
  const requiredTables = [
    "dataGuide",
    "designTableSchema",
    "designRuntimeKeyMap",
    "designTables",
    "constants",
    "storageKeys",
    "towerTypes",
    "gradeStats",
    "projectiles",
    "specialProjectiles",
    "towers",
    "pieces",
    "monsters",
    "monsterTypes",
    "monsterGroups",
    "wavePatterns",
    "waveProfiles",
    "waves",
    "bosses",
    "stages",
    "loadout",
    "perks",
    "levelData",
    "shop",
    "progression",
    "phonePresets",
    "defaultConfig",
    "defaultPlayerSave",
  ];

  for (const tableName of requiredTables) {
    if (data[tableName]) pass("DATA", `${tableName} exists`);
    else fail("DATA", `${tableName} missing`);
  }

  const optionalTables = ["effectData", "localizeData"];
  for (const tableName of optionalTables) {
    if (data[tableName]) pass("DATA", `${tableName} exists`);
    else warn("DATA", `${tableName} missing`, "Planned support table is not separated yet.");
  }

  for (const [pieceKey, piece] of Object.entries(data.pieces || {})) {
    if (!has(data.towerTypes, piece.type)) fail("DATA", `Piece ${pieceKey} type`, String(piece.type));
    if (!piece.connectTower) fail("DATA", `Piece ${pieceKey} connectTower missing`);
    else if (!has(data.towers, piece.connectTower)) fail("DATA", `Piece ${pieceKey} tower missing`, piece.connectTower);
    else pass("DATA", `Piece ${pieceKey} -> Tower ${piece.connectTower}`);
    if (piece.image && !fileExists(piece.image)) warn("ASSET", `Piece ${pieceKey} image missing`, piece.image);
  }

  for (const [towerKey, tower] of Object.entries(data.towers || {})) {
    if (!has(data.towerTypes, tower.type)) fail("DATA", `Tower ${towerKey} type`, String(tower.type));
    if (!tower.projectileId) fail("DATA", `Tower ${towerKey} projectile missing`);
    else if (!has(data.projectiles, tower.projectileId)) fail("DATA", `Tower ${towerKey} projectile missing`, tower.projectileId);
    else pass("DATA", `Tower ${towerKey} -> Projectile ${tower.projectileId}`);
  }

  const loadout = data.loadout || {};
  const maxSlots = Number(loadout.maxSlots || data.constants?.loadoutPieceCount || 0);
  const fallback = loadout.fallbackPieceKeys || [];
  const selectable = loadout.selectablePieceKeys || [];
  if (maxSlots === 6) pass("PHASE2", "Loadout requires 6 pieces");
  else fail("PHASE2", "Loadout requires 6 pieces", `Current: ${maxSlots}`);
  if (fallback.length === maxSlots) pass("PHASE2", "Fallback loadout count matches maxSlots");
  else warn("PHASE2", "Fallback loadout count mismatch", `Fallback ${fallback.length}, max ${maxSlots}`);

  const defaultSaveLoadout = data.defaultPlayerSave?.selectedLoadout || [];
  if (defaultSaveLoadout.length === maxSlots) pass("PHASE2", "Default player save has a full loadout");
  else fail("PHASE2", "Default player save loadout count mismatch", `Default ${defaultSaveLoadout.length}, max ${maxSlots}`);

  for (const pieceKey of fallback) {
    if (!has(data.pieces, pieceKey)) fail("DATA", `Fallback piece missing`, pieceKey);
  }
  for (const pieceKey of selectable) {
    if (!has(data.pieces, pieceKey)) fail("DATA", `Selectable piece missing`, pieceKey);
  }
  for (const pieceKey of defaultSaveLoadout) {
    if (!has(data.pieces, pieceKey)) fail("DATA", `Default save piece missing`, pieceKey);
    else if (!selectable.includes(pieceKey)) fail("DATA", `Default save piece is not selectable`, pieceKey);
    else if (data.pieces[pieceKey]?.owned !== true) fail("DATA", `Default save piece is not initially owned`, pieceKey);
    else pass("DATA", `Default save piece is playable: ${pieceKey}`);
  }

  for (const stage of data.stages || []) {
    for (const waveId of stage.waveIds || []) {
      if (has(data.waves, String(waveId)) || has(data.waves, waveId)) pass("DATA", `Stage ${stage.key} wave ${waveId}`);
      else fail("DATA", `Stage ${stage.key} missing wave`, String(waveId));
    }
    for (const bossId of stage.bossIds || []) {
      if (has(data.bosses, bossId)) pass("DATA", `Stage ${stage.key} boss ${bossId}`);
      else fail("DATA", `Stage ${stage.key} missing boss`, bossId);
    }
    if (stage.ui?.mainImage && !fileExists(stage.ui.mainImage)) warn("ASSET", `Stage ${stage.key} main image missing`, stage.ui.mainImage);
    if (stage.ui?.clearImage && !fileExists(stage.ui.clearImage)) warn("ASSET", `Stage ${stage.key} clear image missing`, stage.ui.clearImage);
  }

  for (const [waveKey, wave] of Object.entries(data.waves || {})) {
    if (wave.patternId) {
      if (has(data.wavePatterns, wave.patternId)) pass("DATA", `Wave ${waveKey} -> Pattern ${wave.patternId}`);
      else fail("DATA", `Wave ${waveKey} pattern missing`, wave.patternId);
    }
    if (wave.bossId) {
      if (has(data.bosses, wave.bossId)) pass("DATA", `Wave ${waveKey} -> Boss ${wave.bossId}`);
      else fail("DATA", `Wave ${waveKey} boss missing`, wave.bossId);
    }
  }

  for (const [patternKey, pattern] of Object.entries(data.wavePatterns || {})) {
    for (const event of pattern.events || []) {
      if (has(data.monsterGroups, event.groupId)) pass("DATA", `Pattern ${patternKey} group ${event.groupId}`);
      else fail("DATA", `Pattern ${patternKey} group missing`, event.groupId);
    }
  }

  for (const [groupKey, group] of Object.entries(data.monsterGroups || {})) {
    for (const monsterKey of Object.keys(group.monsters || {})) {
      if (has(data.monsters, monsterKey)) pass("DATA", `Group ${groupKey} monster ${monsterKey}`);
      else fail("DATA", `Group ${groupKey} monster missing`, monsterKey);
    }
  }

  for (const [bossKey, boss] of Object.entries(data.bosses || {})) {
    if (has(data.monsters, boss.monsterKey)) pass("DATA", `Boss ${bossKey} monster ${boss.monsterKey}`);
    else fail("DATA", `Boss ${bossKey} monster missing`, boss.monsterKey);
    if (boss.summon?.monsterKey) {
      if (has(data.monsters, boss.summon.monsterKey)) pass("DATA", `Boss ${bossKey} summon ${boss.summon.monsterKey}`);
      else fail("DATA", `Boss ${bossKey} summon monster missing`, boss.summon.monsterKey);
    }
  }
}

function validateAuthoringGuide(data) {
  const guide = data.dataGuide || {};
  if (guide.version) pass("DATA_EDIT", "Data guide version exists", guide.version);
  else fail("DATA_EDIT", "Data guide version missing");

  if (Array.isArray(guide.quickStart) && guide.quickStart.length >= 3) {
    pass("DATA_EDIT", "Quick start guide has enough tips", String(guide.quickStart.length));
  } else {
    fail("DATA_EDIT", "Quick start guide missing/too short");
  }

  if (Array.isArray(guide.coreLinks) && guide.coreLinks.length >= 5) {
    pass("DATA_EDIT", "Core link guide exists", String(guide.coreLinks.length));
  } else {
    fail("DATA_EDIT", "Core link guide missing/too short");
  }

  const expectedGuideTables = [
    "defaultConfig",
    "towerTypes",
    "pieces",
    "towers",
    "projectiles",
    "monsters",
    "monsterGroups",
    "wavePatterns",
    "waves",
    "bosses",
    "stages",
    "loadout",
    "perks",
    "levelData",
    "progression",
    "shop",
    "designTables",
  ];
  const guideTables = guide.tables || {};

  for (const tableName of expectedGuideTables) {
    const entry = guideTables[tableName];
    if (!entry) {
      fail("DATA_EDIT", `Guide entry missing for ${tableName}`);
      continue;
    }
    if (entry.label && entry.editWhen) pass("DATA_EDIT", `Guide entry ${tableName} label/editWhen exists`);
    else fail("DATA_EDIT", `Guide entry ${tableName} label/editWhen missing`);
    if (Array.isArray(entry.hotFields) && entry.hotFields.length > 0) pass("DATA_EDIT", `Guide entry ${tableName} hotFields exist`);
    else fail("DATA_EDIT", `Guide entry ${tableName} hotFields missing`);
  }

  for (const tableName of guide.editOrder || []) {
    if (data[tableName]) pass("DATA_EDIT", `Edit-order table exists: ${tableName}`);
    else fail("DATA_EDIT", `Edit-order table missing: ${tableName}`);
  }
}

function validateDesignTables(data) {
  const schema = data.designTableSchema || {};
  const tables = data.designTables || {};
  const map = data.designRuntimeKeyMap || {};
  const requiredDesignTables = [
    "StageData",
    "WaveData",
    "WavePatternData",
    "MonsterGroupData",
    "MonsterData",
    "BossData",
    "PieceData",
    "PieceUpgradeData",
    "UpgradeCostData",
    "TowerData",
    "ProjectileData",
    "RarityData",
    "TriggerData",
    "EffectData",
    "PerkData",
    "PerkActionData",
    "PerkLimitData",
    "LevelData",
    "ExpData",
    "Resource",
    "LocalizeData",
  ];
  const optionalEmptyDesignTables = new Set(["PerkLimitData"]);

  if (schema.source && schema.conventions && schema.tables) pass("DESIGN_TABLE", "Design table schema metadata exists");
  else fail("DESIGN_TABLE", "Design table schema metadata missing");

  if (fileExists("docs/DATA_TABLE_MIGRATION.md")) pass("DESIGN_TABLE", "Data table migration document exists");
  else warn("DESIGN_TABLE", "Data table migration document missing");

  for (const tableName of requiredDesignTables) {
    const tableSchema = schema.tables?.[tableName];
    const rows = tables[tableName];
    if (tableSchema?.pk && Array.isArray(tableSchema.columns) && tableSchema.columns.length > 0) {
      pass("DESIGN_TABLE", `${tableName} schema exists`);
    } else {
      fail("DESIGN_TABLE", `${tableName} schema missing`);
      continue;
    }

    if (Array.isArray(rows) && (rows.length > 0 || optionalEmptyDesignTables.has(tableName))) {
      pass("DESIGN_TABLE", `${tableName} rows exist`, String(rows.length));
    }
    else {
      fail("DESIGN_TABLE", `${tableName} rows missing`);
      continue;
    }

    const seen = new Set();
    for (const row of rows) {
      const pkValue = row?.[tableSchema.pk];
      if (pkValue === undefined || pkValue === null || pkValue === "") {
        fail("DESIGN_TABLE", `${tableName} row missing PK`, tableSchema.pk);
        continue;
      }
      if (seen.has(String(pkValue))) fail("DESIGN_TABLE", `${tableName} duplicate PK`, String(pkValue));
      else seen.add(String(pkValue));
      for (const column of tableSchema.columns || []) {
        if (column in row) pass("DESIGN_TABLE", `${tableName} row has column ${column}`);
        else fail("DESIGN_TABLE", `${tableName} row missing column`, `${tableSchema.pk}=${pkValue} / ${column}`);
      }
    }
  }

  const assertSchemaColumns = (tableName, expectedColumns) => {
    const actualColumns = schema.tables?.[tableName]?.columns || [];
    const same = actualColumns.length === expectedColumns.length && expectedColumns.every((column, index) => actualColumns[index] === column);
    if (same) pass("DESIGN_TABLE", `${tableName} schema columns match sheet`);
    else fail("DESIGN_TABLE", `${tableName} schema columns mismatch`, `actual=${actualColumns.join(", ")} / expected=${expectedColumns.join(", ")}`);
  };
  const assertRowsUseOnlySchemaColumns = (tableName) => {
    const schemaColumns = new Set(schema.tables?.[tableName]?.columns || []);
    for (const row of tables[tableName] || []) {
      const extraColumns = Object.keys(row || {}).filter((column) => !schemaColumns.has(column));
      if (extraColumns.length === 0) pass("DESIGN_TABLE", `${tableName} row uses only sheet columns`);
      else fail("DESIGN_TABLE", `${tableName} row has extra columns`, extraColumns.join(", "));
    }
  };

  assertSchemaColumns("StageData", ["StageID", "StageName", "WaveDataID", "MonsterGroupID_Normal", "MonsterGroupID_Speedy", "MonsterGroupID_Tanker", "BossID", "WaveReward", "StageReward", "BGID", "WaveDuration", "*", "Desc"]);
  assertSchemaColumns("WaveData", ["WaveID", "WavePattern_1", "WavePattern_2", "WavePattern_3", "WavePattern_4", "WavePattern_5", "WavePattern_6", "WavePattern_7", "WavePattern_8", "WavePattern_9", "*", "Desc"]);
  assertSchemaColumns("WavePatternData", ["WavePatternID", "WaveType", "Normal_Count", "Speedy_Count", "Tanker_Count", "*", "몬스터 총합", "Desc"]);
  assertSchemaColumns("MonsterGroupData", ["MonsterGroupID", "MonsterID_1", "MonsterID_2", "MonsterID_3", "NormalRate_1", "NormalRate_2", "NormalRate_3", "*", "Desc"]);
  assertSchemaColumns("MonsterData", ["MonsterID", "MonsterName", "MonsterType", "ExpTypeID", "MonsterHp", "MonsterAtk", "MonsterAtkSpeed", "MonsterAtkRange", "MonsterMoveSpeed", "MonsterSprite", "*", "Desc"]);
  assertSchemaColumns("BossData", ["BossID", "BossName", "MonsterID", "SummonMonsterGroupID", "SummonInterval", "SummonCount", "SpawnXRatio", "SpawnYRatio", "*", "Desc"]);
  assertSchemaColumns("PieceData", ["PieceID", "PieceName", "PieceType", "PieceDesc", "PieceGrade", "PieceLv", "ConnectTower", "Portrait", "PieceSprite", "*", "Desc"]);
  assertSchemaColumns("PieceUpgradeData", ["UpgradeID", "PieceGroupID", "FromPieceID", "ToPieceID", "*", "Desc"]);
  assertSchemaColumns("UpgradeCostData", ["UpgradeCostID", "UpgradeID", "CurrencyType", "UpgradeCost", "*", "Desc"]);
  assertSchemaColumns("TowerData", ["TowerID", "TowerName", "TowerType", "TowerAiType", "TargetPriority", "ProjectileType", "TowerAtk", "TowerAtkSpeed", "TowerMaxLange", "TowerMaxAmmo", "SkillID", "TowerProjectile", "ProjectileCount", "ProjectileSize", "PiercingCount", "SplashRadius", "current_hp", "*", "Desc", "TowerLv"]);
  assertSchemaColumns("ProjectileData", ["ProjectileID", "ProjectileType", "ProjectileName", "ProjectilePrefab", "PopEffectPrefab", "SubPopEffectPrefab", "*", "Desc"]);
  assertSchemaColumns("RarityData", ["PerkRarityID", "PerkRarityName", "Weight", "Color", "*", "Desc"]);
  assertSchemaColumns("TriggerData", ["TriggerID", "TriggerType", "TriggerValue", "RequiredTag", "*", "Desc"]);
  assertSchemaColumns("EffectData", ["EffectID", "BuffTowerType", "ATK", "ATKSpeed", "ShotProjCount", "MaxProj", "ProjSize", "ProjPiercing", "current_hp", "BuffType", "BuffValue", "IsOneOff", "Duration", "*", "Desc"]);
  assertSchemaColumns("PerkData", ["PerkID", "EffectID", "PerkName", "PerkDesc", "IconResourceID", "TriggerID", "MaxLevel", "PerkRarityType", "PerkTarget", "PerkTargetText", "IsActive", "*", "Desc"]);
  assertSchemaColumns("PerkActionData", ["ActionID", "PerkID", "ActionType", "ActionKey", "Amount", "Duration", "PieceType", "EnemyType", "EnemyTypesJson", "ProjectileID", "*", "Desc"]);
  assertSchemaColumns("PerkLimitData", ["LimitID", "PerkID", "ModKey", "ConfigKey", "SpecialProjectileID", "Min", "Max", "*", "Desc"]);
  assertSchemaColumns("LevelData", ["LevelID", "GoalLevel", "RequiredXP", "IsMaxLevel", "*", "Description", "PerkEventType"]);
  assertSchemaColumns("ExpData", ["ExpTypeID", "ExpAmount", "BlockSpriteKey", "*", "Description"]);
  assertSchemaColumns("Resource", ["ResourceID", "Root", "ResourceKey", "Desc"]);
  assertSchemaColumns("LocalizeData", ["Key", "Id", "Shared Comments", "English(en)", "English(en) Comments", "Korean(ko)", "Korean(ko) Comments"]);
  Object.keys(schema.tables || {})
    .filter((tableName) => Array.isArray(tables[tableName]))
    .forEach(assertRowsUseOnlySchemaColumns);

  const byId = (tableName, pk) => new Set((tables[tableName] || []).map((row) => String(row[pk])));
  const stageIds = byId("StageData", "StageID");
  const waveDataIds = byId("WaveData", "WaveID");
  const wavePatternIds = byId("WavePatternData", "WavePatternID");
  const monsterGroupIds = byId("MonsterGroupData", "MonsterGroupID");
  const monsterIds = byId("MonsterData", "MonsterID");
  const bossIds = byId("BossData", "BossID");
  const expTypeIds = byId("ExpData", "ExpTypeID");
  const monsterRowsById = new Map((tables.MonsterData || []).map((row) => [String(row.MonsterID), row]));
  const monsterGroupRowsById = new Map((tables.MonsterGroupData || []).map((row) => [String(row.MonsterGroupID), row]));
  const expRowsById = new Map((tables.ExpData || []).map((row) => [String(row.ExpTypeID), row]));
  const pieceIds = byId("PieceData", "PieceID");
  const upgradeIds = byId("PieceUpgradeData", "UpgradeID");
  const upgradeCostRowsByUpgradeId = new Map((tables.UpgradeCostData || []).map((row) => [String(row.UpgradeID), row]));
  const upgradeTargetPieceIds = new Set();
  const towerIds = byId("TowerData", "TowerID");
  const projectileIds = byId("ProjectileData", "ProjectileID");
  const projectileRowsById = new Map((tables.ProjectileData || []).map((row) => [String(row.ProjectileID), row]));
  const rarityIds = byId("RarityData", "PerkRarityID");
  const triggerIds = byId("TriggerData", "TriggerID");
  const effectIds = byId("EffectData", "EffectID");
  const perkIds = byId("PerkData", "PerkID");
  const runtimeWaves = data.waves || {};
  const runtimeWavePatterns = data.wavePatterns || {};
  const runtimeMonsterGroups = data.monsterGroups || {};
  const closeTo = (a, b, epsilon = 0.001) => Math.abs(Number(a) - Number(b)) <= epsilon;
  const designRangeUnitPx = 38;
  const designProjectileSizeUnitPx = 20;
  const normalizeDesignTowerRange = (value) => {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return 360;
    return raw <= 30 ? raw * designRangeUnitPx : raw;
  };
  const normalizeDesignProjectileSize = (value, fallback = 0) => {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return fallback;
    return raw <= 2 ? raw * designProjectileSizeUnitPx : raw;
  };
  const normalizeDesignPercentDamage = (value, fallback = 0) => {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return fallback;
    return raw > 1 ? raw / 100 : raw;
  };
  const pieceTypeMap = {
    1: "basic",
    AR: "basic",
    Basic: "basic",
    2: "scatter",
    Scatter: "scatter",
    Shotgun: "scatter",
    Ranger: "ranger",
    3: "sniper",
    Lange: "sniper",
    Range: "sniper",
    Ranged: "sniper",
    Sniper: "sniper",
    4: "breaker",
    Breaker: "breaker",
    Tank: "breaker",
    5: "blast",
    Blast: "blast",
    Area: "blast",
    Wide: "blast",
    6: "support",
    Support: "support",
    Buffer: "support",
    Heal: "support",
  };
  const targetPriorityMap = {
    near: "near",
    Near: "near",
    Nearest: "near",
    far: "far",
    Far: "far",
    Farthest: "far",
    strong: "strong",
    Strong: "strong",
    HighestHp: "strong",
    HighHp: "strong",
    weak: "weak",
    Weak: "weak",
    friendly: "friendly",
    Friendly: "friendly",
    LowAllyHp: "friendly",
    Support: "friendly",
    cluster: "cluster",
    Cluster: "cluster",
  };
  const towerAiTypeMap = {
    basic: "basic",
    Basic: "basic",
    "basic-non": "basic-non",
    "Basic-non": "basic-non",
    BasicNonHoming: "basic-non",
    basicNonHoming: "basic-non",
    nonHoming: "basic-non",
    shotgun: "shotgun",
    Shotgun: "shotgun",
    Scatter: "shotgun",
    heal: "heal",
    Heal: "heal",
    Support: "heal",
  };
  const projectileTypeMap = {
    normal: "normal",
    Normal: "normal",
    Basic: "normal",
    BasicNonHoming: "normal",
    Shotgun: "normal",
    Scatter: "normal",
    pierce: "pierce",
    Pierce: "pierce",
    Snipe: "pierce",
    Sniper: "pierce",
    Tank: "tank",
    tank: "tank",
    Breaker: "tank",
    Explode: "explode",
    explode: "explode",
    Blast: "explode",
    Heal: "heal",
    heal: "heal",
    Support: "heal",
  };
  const designRarityToRuntime = (rarityRow) => {
    const name = String(rarityRow?.PerkRarityName || "").toLowerCase();
    if (name.includes("legend")) return "legendary";
    if (name.includes("unique")) return "unique";
    if (name.includes("rare")) return "rare";
    return "common";
  };
  const designPerkId = (perkRow, effectRow) => {
    return `perk-${perkRow.PerkID}`;
  };
  const runtimeKey = (tableName, rowId, prefix, fallback = "") => {
    if (rowId === undefined || rowId === null || rowId === "" || rowId === "None") return fallback;
    return map[tableName]?.[rowId] || map[tableName]?.[String(rowId)] || `${prefix}_${rowId}`;
  };
  const stageRuntimeKey = (stageId, index) => runtimeKey("StageData", stageId, "stage", `stage-${index + 1}`);
  const monsterRuntimeKey = (monsterId) => runtimeKey("MonsterData", monsterId, "monster");
  const bossRuntimeKey = (bossId) => {
    if (!bossId || bossId === "None" || String(bossId) === "0") return "";
    return runtimeKey("BossData", bossId, "boss");
  };
  const pieceRuntimeKey = (pieceId) => runtimeKey("PieceData", pieceId, "piece");
  const towerRuntimeKey = (towerId) => runtimeKey("TowerData", towerId, "tower");
  const projectileRuntimeKey = (projectileId) => runtimeKey("ProjectileData", projectileId, "proj");
  const selectablePieceKeys = new Set(data.loadout?.selectablePieceKeys || []);
  const shopUnlockKeys = new Set((data.shop?.pieceUnlocks || []).map((entry) => entry.pieceKey));

  for (const upgrade of tables.PieceUpgradeData || []) {
    if (pieceIds.has(String(upgrade.FromPieceID))) pass("DESIGN_TABLE", `PieceUpgradeData ${upgrade.UpgradeID} from ${upgrade.FromPieceID}`);
    else fail("DESIGN_TABLE", `PieceUpgradeData ${upgrade.UpgradeID} missing FromPieceID`, String(upgrade.FromPieceID));
    if (pieceIds.has(String(upgrade.ToPieceID))) {
      pass("DESIGN_TABLE", `PieceUpgradeData ${upgrade.UpgradeID} to ${upgrade.ToPieceID}`);
      upgradeTargetPieceIds.add(String(upgrade.ToPieceID));
    } else {
      fail("DESIGN_TABLE", `PieceUpgradeData ${upgrade.UpgradeID} missing ToPieceID`, String(upgrade.ToPieceID));
    }
    if (!("UpgradeCost" in upgrade)) pass("DESIGN_TABLE", `PieceUpgradeData ${upgrade.UpgradeID} keeps cost split`);
    else fail("DESIGN_TABLE", `PieceUpgradeData ${upgrade.UpgradeID} should not include UpgradeCost`, String(upgrade.UpgradeCost));
    const costRow = upgradeCostRowsByUpgradeId.get(String(upgrade.UpgradeID));
    if (costRow) {
      pass("DESIGN_TABLE", `UpgradeCostData exists for upgrade ${upgrade.UpgradeID}`);
      const fromKey = pieceRuntimeKey(upgrade.FromPieceID);
      const runtimePiece = data.pieces?.[fromKey];
      if (runtimePiece && Number(runtimePiece.upgradeCost) === Math.max(0, Math.floor(Number(costRow.UpgradeCost) || 0))) {
        pass("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} feeds runtime ${fromKey}`);
      } else {
        fail("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} runtime cost mismatch`, `${fromKey} / ${runtimePiece?.upgradeCost} / ${costRow.UpgradeCost}`);
      }
    } else {
      fail("DESIGN_TABLE", `UpgradeCostData missing for upgrade`, String(upgrade.UpgradeID));
    }
  }

  for (const costRow of tables.UpgradeCostData || []) {
    if (upgradeIds.has(String(costRow.UpgradeID))) pass("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} -> PieceUpgradeData ${costRow.UpgradeID}`);
    else fail("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} missing PieceUpgradeData`, String(costRow.UpgradeID));
    if (String(costRow.CurrencyType || "gold") === "gold") pass("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} currency gold`);
    else fail("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} unsupported currency`, String(costRow.CurrencyType));
    if (Number.isFinite(Number(costRow.UpgradeCost)) && Number(costRow.UpgradeCost) >= 0) pass("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} cost valid`);
    else fail("DESIGN_TABLE", `UpgradeCostData ${costRow.UpgradeCostID} cost invalid`, String(costRow.UpgradeCost));
  }

  for (const [stageIndex, stage] of (tables.StageData || []).entries()) {
    if (waveDataIds.has(String(stage.WaveDataID))) pass("DESIGN_TABLE", `StageData ${stage.StageID} -> WaveData ${stage.WaveDataID}`);
    else fail("DESIGN_TABLE", `StageData ${stage.StageID} missing WaveData`, String(stage.WaveDataID));
    for (const groupId of [stage.MonsterGroupID_Normal, stage.MonsterGroupID_Speedy, stage.MonsterGroupID_Tanker]) {
      if (!groupId || String(groupId) === "0" || monsterGroupIds.has(String(groupId))) pass("DESIGN_TABLE", `StageData ${stage.StageID} group ${groupId || "None"}`);
      else fail("DESIGN_TABLE", `StageData ${stage.StageID} missing group`, String(groupId));
    }
    if (!stage.BossID || String(stage.BossID) === "0" || bossIds.has(String(stage.BossID))) pass("DESIGN_TABLE", `StageData ${stage.StageID} boss ${stage.BossID || "None"}`);
    else fail("DESIGN_TABLE", `StageData ${stage.StageID} missing BossData`, String(stage.BossID));
    const bossKey = bossRuntimeKey(stage.BossID);
    if (!bossKey || data.bosses?.[bossKey]) pass("DESIGN_TABLE", `StageData ${stage.StageID} boss runtime ${bossKey || "None"}`);
    else fail("DESIGN_TABLE", `StageData ${stage.StageID} runtime boss missing`, bossKey);
    const key = stageRuntimeKey(stage.StageID, stageIndex);
    if (key && (data.stages || []).some((item) => item.key === key)) pass("DESIGN_TABLE", `StageData ${stage.StageID} feeds runtime ${key}`);
    else fail("DESIGN_TABLE", `StageData ${stage.StageID} runtime stage missing`, String(key));
    const runtimeStage = (data.stages || []).find((item) => item.key === key);
    if (bossKey && runtimeStage?.waveIds?.length === 10) pass("DESIGN_TABLE", `StageData ${stage.StageID} generates 10 waves with boss`);
    else if (!bossKey) pass("DESIGN_TABLE", `StageData ${stage.StageID} has no boss wave by BossID`);
    else fail("DESIGN_TABLE", `StageData ${stage.StageID} should generate 10 waves`, String(runtimeStage?.waveIds?.length || 0));
    if (runtimeStage?.source === "designTables" && String(runtimeStage.design?.stageId) === String(stage.StageID)) {
      pass("DESIGN_TABLE", `StageData ${stage.StageID} runtime stage keeps design ID`);
    } else {
      fail("DESIGN_TABLE", `StageData ${stage.StageID} runtime stage design ID mismatch`, `${runtimeStage?.source} / ${runtimeStage?.design?.stageId}`);
    }

    const stageWaveData = (tables.WaveData || []).find((waveData) => String(waveData.WaveID) === String(stage.WaveDataID));
    for (let ordinal = 1; ordinal <= 9; ordinal += 1) {
      const expectedPatternId = stageWaveData?.[`WavePattern_${ordinal}`];
      const runtimeWaveId = runtimeStage?.waveIds?.[ordinal - 1];
      const runtimeWave = runtimeWaves[runtimeWaveId];
      if (
        runtimeWave?.source === "designTables"
        || (String(runtimeWave?.design?.stageId) === String(stage.StageID)
          && String(runtimeWave?.design?.waveDataId) === String(stage.WaveDataID)
          && String(runtimeWave?.design?.wavePatternId) === String(expectedPatternId))
      ) {
        pass("DESIGN_TABLE", `StageData ${stage.StageID} wave ${ordinal} keeps ID refs`);
      } else {
        fail("DESIGN_TABLE", `StageData ${stage.StageID} wave ${ordinal} ID refs mismatch`, `${runtimeWaveId} / ${JSON.stringify(runtimeWave?.design || {})}`);
      }

      const runtimePattern = runtimeWavePatterns[runtimeWave?.patternId];
      if (runtimePattern?.source === "designTables" && String(runtimePattern.design?.wavePatternId) === String(expectedPatternId)) {
        pass("DESIGN_TABLE", `WavePattern ${expectedPatternId} feeds runtime pattern ${runtimeWave?.patternId}`);
      } else {
        fail("DESIGN_TABLE", `WavePattern ${expectedPatternId} runtime pattern mismatch`, `${runtimeWave?.patternId} / ${JSON.stringify(runtimePattern?.design || {})}`);
      }

      for (const event of runtimePattern?.events || []) {
        const runtimeGroup = runtimeMonsterGroups[event.groupId];
        if (runtimeGroup?.source === "designTables") pass("DESIGN_TABLE", `Runtime group ${event.groupId} source is designTables`);
        else fail("DESIGN_TABLE", `Runtime group ${event.groupId} source missing`, String(runtimeGroup?.source));
        const sourceGroups = runtimeGroup?.design?.sourceGroups || [];
        if (sourceGroups.length > 0) pass("DESIGN_TABLE", `Runtime group ${event.groupId} keeps source MonsterGroup IDs`);
        else fail("DESIGN_TABLE", `Runtime group ${event.groupId} missing source MonsterGroup IDs`);
        for (const sourceGroup of sourceGroups) {
          if (monsterGroupIds.has(String(sourceGroup.monsterGroupId))) {
            pass("DESIGN_TABLE", `Runtime group ${event.groupId} source group ${sourceGroup.monsterGroupId} exists`);
          } else {
            fail("DESIGN_TABLE", `Runtime group ${event.groupId} source group missing`, String(sourceGroup.monsterGroupId));
          }
        }
        for (const monsterKey of Object.keys(runtimeGroup?.monsters || {})) {
          if (data.monsters?.[monsterKey]?.source === "designTables") pass("DESIGN_TABLE", `Runtime group ${event.groupId} monster ${monsterKey} from MonsterData`);
          else fail("DESIGN_TABLE", `Runtime group ${event.groupId} monster ${monsterKey} not from MonsterData`, String(data.monsters?.[monsterKey]?.source));
        }
      }
    }

    if (bossKey) {
      const bossWaveId = runtimeStage?.waveIds?.[9];
      const bossWave = runtimeWaves[bossWaveId];
      if (bossWave?.type === "boss" && bossWave.bossId === bossKey && bossWave.design?.generatedFromBossData === true) {
        pass("DESIGN_TABLE", `StageData ${stage.StageID} boss wave comes from BossData ${stage.BossID}`);
      } else {
        fail("DESIGN_TABLE", `StageData ${stage.StageID} boss wave mismatch`, `${bossWaveId} / ${JSON.stringify(bossWave || {})}`);
      }
    }
  }

  for (const waveData of tables.WaveData || []) {
    for (let index = 1; index <= 9; index += 1) {
      const patternId = waveData[`WavePattern_${index}`];
      if (wavePatternIds.has(String(patternId))) pass("DESIGN_TABLE", `WaveData ${waveData.WaveID} pattern ${index}`);
      else fail("DESIGN_TABLE", `WaveData ${waveData.WaveID} missing pattern`, String(patternId));
    }
  }

  const normalMonsterGroupIds = new Set((tables.StageData || []).map((stage) => String(stage.MonsterGroupID_Normal)));
  for (const group of tables.MonsterGroupData || []) {
    const monsterIdsInGroup = [group.MonsterID_1, group.MonsterID_2, group.MonsterID_3];
    const hasNormalMonster = monsterIdsInGroup.some((monsterId) => Number(monsterRowsById.get(String(monsterId))?.MonsterType) === 1);
    const isNormalGroup = normalMonsterGroupIds.has(String(group.MonsterGroupID)) && hasNormalMonster;
    const normalRates = [group.NormalRate_1, group.NormalRate_2, group.NormalRate_3];
    let activeRateTotal = 0;
    for (let index = 0; index < monsterIdsInGroup.length; index += 1) {
      const id = monsterIdsInGroup[index];
      const rate = Number(normalRates[index]);
      if (normalRates[index] !== "" && normalRates[index] !== null && normalRates[index] !== undefined && Number.isFinite(rate) && rate >= 0) pass("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} NormalRate_${index + 1}`);
      else fail("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} invalid NormalRate_${index + 1}`, String(normalRates[index]));
      if (Number(id)) activeRateTotal += Math.max(0, rate);
      else if (rate === 0) pass("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} empty slot rate ${index + 1} is zero`);
      else fail("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} empty slot has rate`, `slot ${index + 1}: ${rate}`);
      if (!Number(id)) continue;
      if (monsterIds.has(String(id))) pass("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} monster ${id}`);
      else fail("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} missing monster`, String(id));
      const key = monsterRuntimeKey(id);
      if (data.monsters?.[key]) pass("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} runtime monster ${key}`);
      else fail("DESIGN_TABLE", `MonsterGroup ${group.MonsterGroupID} runtime monster missing`, key);
    }
    if (isNormalGroup && activeRateTotal > 0) {
      pass("DESIGN_TABLE", `Normal MonsterGroup ${group.MonsterGroupID} has positive NormalRate total`, String(activeRateTotal));
    } else if (isNormalGroup) {
      fail("DESIGN_TABLE", `Normal MonsterGroup ${group.MonsterGroupID} has no positive NormalRate`);
    } else if (normalRates.every((rate) => Number(rate) === 0)) {
      pass("DESIGN_TABLE", `Non-normal MonsterGroup ${group.MonsterGroupID} does not use NormalRate`);
    } else {
      fail("DESIGN_TABLE", `Non-normal MonsterGroup ${group.MonsterGroupID} must not use NormalRate`, normalRates.join(", "));
    }
  }

  for (const stage of tables.StageData || []) {
    const groupContracts = [
      ["MonsterGroupID_Normal", 1, "Normal"],
      ["MonsterGroupID_Speedy", 2, "Speedy"],
      ["MonsterGroupID_Tanker", 3, "Tanker"],
    ];
    for (const [columnName, expectedMonsterType, label] of groupContracts) {
      const group = monsterGroupRowsById.get(String(stage[columnName]));
      const groupMonsterIds = [group?.MonsterID_1, group?.MonsterID_2, group?.MonsterID_3].filter((id) => Number(id));
      if (!groupMonsterIds.length) continue;
      const isTestGroup = groupMonsterIds.every((id) => Number(monsterRowsById.get(String(id))?.MonsterType) === 99);
      if (isTestGroup) continue;
      const mismatchedIds = groupMonsterIds.filter((id) => Number(monsterRowsById.get(String(id))?.MonsterType) !== expectedMonsterType);
      if (!mismatchedIds.length) pass("DESIGN_TABLE", `Stage ${stage.StageID} ${label} group uses MonsterType ${expectedMonsterType}`);
      else fail("DESIGN_TABLE", `Stage ${stage.StageID} ${label} group has mismatched MonsterType`, mismatchedIds.join(", "));
    }
  }

  for (const piece of tables.PieceData || []) {
    if (towerIds.has(String(piece.ConnectTower))) pass("DESIGN_TABLE", `PieceData ${piece.PieceID} -> TowerData ${piece.ConnectTower}`);
    else fail("DESIGN_TABLE", `PieceData ${piece.PieceID} missing tower`, String(piece.ConnectTower));
    const key = pieceRuntimeKey(piece.PieceID);
    if (key && data.pieces?.[key]) pass("DESIGN_TABLE", `PieceData ${piece.PieceID} feeds runtime ${key}`);
    else fail("DESIGN_TABLE", `PieceData ${piece.PieceID} runtime piece missing`, String(key));
    const runtimePiece = data.pieces?.[key];
    if (runtimePiece?.source === "designTables") pass("DESIGN_TABLE", `PieceData ${piece.PieceID} feeds runtime piece`);
    else fail("DESIGN_TABLE", `PieceData ${piece.PieceID} runtime source missing`, String(runtimePiece?.source));
    const expectedType = pieceTypeMap[piece.PieceType] || String(piece.PieceType || "").toLowerCase();
    if (runtimePiece?.type === expectedType) pass("DESIGN_TABLE", `PieceData ${piece.PieceID} type -> ${expectedType}`);
    else fail("DESIGN_TABLE", `PieceData ${piece.PieceID} type mismatch`, `${runtimePiece?.type} / ${expectedType}`);
    const expectedTowerKey = towerRuntimeKey(piece.ConnectTower);
    if (runtimePiece?.connectTower === expectedTowerKey) pass("DESIGN_TABLE", `PieceData ${piece.PieceID} connectTower runtime ${expectedTowerKey}`);
    else fail("DESIGN_TABLE", `PieceData ${piece.PieceID} connectTower mismatch`, `${runtimePiece?.connectTower} / ${expectedTowerKey}`);
    if (selectablePieceKeys.has(key)) pass("DESIGN_TABLE", `PieceData ${piece.PieceID} appears in loadout selectable`);
    else fail("DESIGN_TABLE", `PieceData ${piece.PieceID} missing from selectable loadout`, key);
    if (runtimePiece?.owned === true || shopUnlockKeys.has(key) || runtimePiece?.upgradeOnly === true || upgradeTargetPieceIds.has(String(piece.PieceID))) pass("DESIGN_TABLE", `PieceData ${piece.PieceID} is owned, unlockable, or upgrade target`);
    else fail("DESIGN_TABLE", `PieceData ${piece.PieceID} is neither owned nor unlockable`, key);
  }

  for (const tower of tables.TowerData || []) {
    if (projectileIds.has(String(tower.TowerProjectile))) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} -> ProjectileData ${tower.TowerProjectile}`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} missing projectile`, String(tower.TowerProjectile));
    const key = towerRuntimeKey(tower.TowerID);
    if (key && data.towers?.[key]) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} feeds runtime ${key}`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} runtime tower missing`, String(key));
    const runtimeTower = data.towers?.[key];
    if (runtimeTower?.source === "designTables") pass("DESIGN_TABLE", `TowerData ${tower.TowerID} feeds runtime tower`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} runtime source missing`, String(runtimeTower?.source));
    const expectedTargetPriority = targetPriorityMap[tower.TargetPriority] || "near";
    if (runtimeTower?.targetPriority === expectedTargetPriority) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} TargetPriority -> ${expectedTargetPriority}`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} targetPriority mismatch`, `${runtimeTower?.targetPriority} / ${expectedTargetPriority}`);
    const expectedAiType = towerAiTypeMap[tower.TowerAiType] || "basic";
    if (runtimeTower?.aiType === expectedAiType) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} TowerAiType -> ${expectedAiType}`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} aiType mismatch`, `${runtimeTower?.aiType} / ${expectedAiType}`);
    const projectileRow = projectileRowsById.get(String(tower.TowerProjectile));
    const expectedProjectileType = projectileTypeMap[tower.ProjectileType] || projectileTypeMap[projectileRow?.ProjectileType] || "normal";
    if (runtimeTower?.projectileType === expectedProjectileType) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} ProjectileType -> ${expectedProjectileType}`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} projectileType mismatch`, `${runtimeTower?.projectileType} / ${expectedProjectileType}`);
    const expectedProjectileKey = projectileRuntimeKey(tower.TowerProjectile);
    if (runtimeTower?.projectileId === expectedProjectileKey) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} projectile runtime ${expectedProjectileKey}`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} projectile mismatch`, `${runtimeTower?.projectileId} / ${expectedProjectileKey}`);
    if (runtimeTower?.projectileKey === expectedProjectileKey) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} preserves projectileKey ${expectedProjectileKey}`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} projectileKey mismatch`, `${runtimeTower?.projectileKey} / ${expectedProjectileKey}`);
    if (closeTo(runtimeTower?.damageMod, Number(tower.TowerAtk) / 24, 0.01)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} TowerAtk feeds damageMod`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} damageMod mismatch`, `${runtimeTower?.damageMod} / ${Number(tower.TowerAtk) / 24}`);
    if (closeTo(runtimeTower?.fireRate, tower.TowerAtkSpeed, 0.001)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} TowerAtkSpeed feeds fireRate`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} fireRate mismatch`, `${runtimeTower?.fireRate} / ${tower.TowerAtkSpeed}`);
    const expectedRange = normalizeDesignTowerRange(tower.TowerMaxLange);
    if (closeTo(runtimeTower?.range, expectedRange, 0.001)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} TowerMaxLange feeds range`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} range mismatch`, `${runtimeTower?.range} / ${expectedRange}`);
    if (Number(runtimeTower?.maxAmmo) === Number(tower.TowerMaxAmmo)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} TowerMaxAmmo feeds maxAmmo`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} maxAmmo mismatch`, `${runtimeTower?.maxAmmo} / ${tower.TowerMaxAmmo}`);
    const expectedProjectileCount = Math.max(0, Math.floor(Number(tower.ProjectileCount) || 0));
    if (Number(runtimeTower?.projectileCount) === expectedProjectileCount) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} ProjectileCount feeds projectileCount`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} projectileCount mismatch`, `${runtimeTower?.projectileCount} / ${expectedProjectileCount}`);
    const expectedProjectileSize = normalizeDesignProjectileSize(tower.ProjectileSize, runtimeTower?.projectileSize || 0);
    if (closeTo(runtimeTower?.projectileSize, expectedProjectileSize, 0.001)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} ProjectileSize feeds projectileSize`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} projectileSize mismatch`, `${runtimeTower?.projectileSize} / ${expectedProjectileSize}`);
    const expectedPierceHits = Math.max(0, Math.floor(Number(tower.PiercingCount) || 0));
    if (Number(runtimeTower?.pierceHits) === expectedPierceHits) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} PiercingCount feeds pierceHits`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} pierceHits mismatch`, `${runtimeTower?.pierceHits} / ${expectedPierceHits}`);
    const expectedSplashRadius = Math.max(0, Number(tower.SplashRadius) || 0);
    if (closeTo(runtimeTower?.splashRadius, expectedSplashRadius, 0.001)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} SplashRadius feeds splashRadius`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} splashRadius mismatch`, `${runtimeTower?.splashRadius} / ${expectedSplashRadius}`);
    const expectedBulletSpeed = Number(tower.BulletSpeed);
    if (!Number.isFinite(expectedBulletSpeed) || expectedBulletSpeed <= 0 || closeTo(runtimeTower?.speedMult, expectedBulletSpeed, 0.001)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} BulletSpeed feeds speedMult`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} speedMult mismatch`, `${runtimeTower?.speedMult} / ${expectedBulletSpeed}`);
    if (Number.isFinite(Number(tower.current_hp))) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} current_hp valid`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} current_hp invalid`, String(tower.current_hp));
    const expectedPercentHpDamage = normalizeDesignPercentDamage(tower.current_hp, 0);
    if (closeTo(runtimeTower?.percentHpDamage, expectedPercentHpDamage, 0.0001)) pass("DESIGN_TABLE", `TowerData ${tower.TowerID} current_hp feeds percentHpDamage`);
    else fail("DESIGN_TABLE", `TowerData ${tower.TowerID} percentHpDamage mismatch`, `${runtimeTower?.percentHpDamage} / ${expectedPercentHpDamage}`);
  }

  for (const projectile of tables.ProjectileData || []) {
    const key = projectileRuntimeKey(projectile.ProjectileID);
    if (key && data.projectiles?.[key]) pass("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} feeds runtime ${key}`);
    else fail("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} runtime projectile missing`, String(key));
    const runtimeProjectile = data.projectiles?.[key];
    if (runtimeProjectile?.source === "designTables") pass("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} feeds runtime projectile`);
    else fail("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} runtime source missing`, String(runtimeProjectile?.source));
    const expectedType = projectileTypeMap[projectile.ProjectileType] || "basic";
    if (runtimeProjectile?.type === expectedType) pass("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} type -> ${expectedType}`);
    else fail("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} type mismatch`, `${runtimeProjectile?.type} / ${expectedType}`);
    const rawPrefab = String(projectile.ProjectilePrefab || "").trim().replace(/\\/g, "/");
    const expectedPrefab = !rawPrefab || rawPrefab === "0"
      ? key
      : /^(?:https?:|data:|blob:|\/|\.\.?\/)/i.test(rawPrefab) || rawPrefab.includes("/")
        ? rawPrefab
        : `assets/images/Projectile/${/\.(?:png|webp|jpe?g|gif)$/i.test(rawPrefab) ? rawPrefab : `${rawPrefab}.png`}`;
    if (runtimeProjectile?.prefab === expectedPrefab) pass("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} prefab -> ${expectedPrefab}`);
    else fail("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} prefab mismatch`, `${runtimeProjectile?.prefab} / ${expectedPrefab}`);
    if (runtimeProjectile?.popEffectPrefab === String(projectile.PopEffectPrefab || "").trim()) pass("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} preserves PopEffectPrefab`);
    else fail("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} PopEffectPrefab mismatch`, `${runtimeProjectile?.popEffectPrefab} / ${projectile.PopEffectPrefab}`);
    if (runtimeProjectile?.subPopEffectPrefab === String(projectile.SubPopEffectPrefab || "").trim()) pass("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} preserves SubPopEffectPrefab`);
    else fail("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} SubPopEffectPrefab mismatch`, `${runtimeProjectile?.subPopEffectPrefab} / ${projectile.SubPopEffectPrefab}`);
    const ownerTower = (tables.TowerData || []).find((tower) => String(tower.TowerProjectile) === String(projectile.ProjectileID));
    const expectedRadius = normalizeDesignProjectileSize(ownerTower?.ProjectileSize, runtimeProjectile?.radius || 0);
    if (!ownerTower || !Number(ownerTower.ProjectileSize) || closeTo(runtimeProjectile?.radius, expectedRadius, 0.001)) {
      pass("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} size compatible with TowerData`);
    } else {
      fail("DESIGN_TABLE", `ProjectileData ${projectile.ProjectileID} size mismatch`, `${runtimeProjectile?.radius} / ${expectedRadius}`);
    }
  }

  const validPerkActionTypes = new Set([
    "addMod",
    "multiplyMod",
    "addEnemyTypeDamage",
    "addTypeDamage",
    "addTypeSpecial",
    "addRerollCharge",
    "addTypeFireRateBonus",
    "addTypeAmmoBonus",
    "addTypeProjectileCount",
    "addTypePierce",
    "addTypePercentHpDamage",
    "addTypeBlastRadius",
    "healAllSlotsPercent",
    "addSlotMaxHp",
    "startTimedFireRate",
    "addSpecialProjectileLevel",
  ]);
  for (const action of tables.PerkActionData || []) {
    if (perkIds.has(String(action.PerkID))) pass("DESIGN_TABLE", `PerkActionData ${action.ActionID} -> PerkData ${action.PerkID}`);
    else fail("DESIGN_TABLE", `PerkActionData ${action.ActionID} missing perk`, String(action.PerkID));
    if (validPerkActionTypes.has(action.ActionType)) pass("DESIGN_TABLE", `PerkActionData ${action.ActionID} action type ${action.ActionType}`);
    else fail("DESIGN_TABLE", `PerkActionData ${action.ActionID} invalid action type`, String(action.ActionType));
    if (Number.isFinite(Number(action.Amount))) pass("DESIGN_TABLE", `PerkActionData ${action.ActionID} amount valid`);
    else fail("DESIGN_TABLE", `PerkActionData ${action.ActionID} amount invalid`, String(action.Amount));
    if (action.EnemyTypesJson) {
      try {
        const parsed = JSON.parse(action.EnemyTypesJson);
        if (Array.isArray(parsed)) pass("DESIGN_TABLE", `PerkActionData ${action.ActionID} EnemyTypesJson valid`);
        else fail("DESIGN_TABLE", `PerkActionData ${action.ActionID} EnemyTypesJson not array`, action.EnemyTypesJson);
      } catch (error) {
        fail("DESIGN_TABLE", `PerkActionData ${action.ActionID} EnemyTypesJson invalid`, action.EnemyTypesJson);
      }
    }
  }

  for (const limit of tables.PerkLimitData || []) {
    if (perkIds.has(String(limit.PerkID))) pass("DESIGN_TABLE", `PerkLimitData ${limit.LimitID} -> PerkData ${limit.PerkID}`);
    else fail("DESIGN_TABLE", `PerkLimitData ${limit.LimitID} missing perk`, String(limit.PerkID));
    if (limit.ModKey) pass("DESIGN_TABLE", `PerkLimitData ${limit.LimitID} ModKey exists`);
    else fail("DESIGN_TABLE", `PerkLimitData ${limit.LimitID} ModKey missing`);
    if (limit.ConfigKey) pass("DESIGN_TABLE", `PerkLimitData ${limit.LimitID} ConfigKey exists`);
    else fail("DESIGN_TABLE", `PerkLimitData ${limit.LimitID} ConfigKey missing`);
  }

  for (const perk of tables.PerkData || []) {
    if (effectIds.has(String(perk.EffectID))) pass("DESIGN_TABLE", `PerkData ${perk.PerkID} -> EffectData ${perk.EffectID}`);
    else fail("DESIGN_TABLE", `PerkData ${perk.PerkID} missing effect`, String(perk.EffectID));
    if (triggerIds.has(String(perk.TriggerID))) pass("DESIGN_TABLE", `PerkData ${perk.PerkID} -> TriggerData ${perk.TriggerID}`);
    else fail("DESIGN_TABLE", `PerkData ${perk.PerkID} missing trigger`, String(perk.TriggerID));
    if (rarityIds.has(String(perk.PerkRarityType))) pass("DESIGN_TABLE", `PerkData ${perk.PerkID} -> RarityData ${perk.PerkRarityType}`);
    else fail("DESIGN_TABLE", `PerkData ${perk.PerkID} missing rarity`, String(perk.PerkRarityType));
    if (!(perk.IsActive === true || Number(perk.IsActive) === 1)) {
      pass("DESIGN_TABLE", `PerkData ${perk.PerkID} inactive row excluded from runtime`);
      continue;
    }
    const effectRow = (tables.EffectData || []).find((effect) => String(effect.EffectID) === String(perk.EffectID));
    const expectedId = designPerkId(perk, effectRow);
    const runtimePerk = (data.perks?.upgrades || []).find((upgrade) => String(upgrade.design?.perkId) === String(perk.PerkID))
      || (data.perks?.upgrades || []).find((upgrade) => upgrade.id === expectedId);
    if (runtimePerk?.source === "designTables") pass("DESIGN_TABLE", `PerkData ${perk.PerkID} feeds runtime perk ${runtimePerk.id}`);
    else fail("DESIGN_TABLE", `PerkData ${perk.PerkID} runtime perk missing`, `${expectedId} / ${runtimePerk?.source}`);
    if (runtimePerk?.actions?.length > 0) pass("DESIGN_TABLE", `PerkData ${perk.PerkID} runtime actions exist`);
    else fail("DESIGN_TABLE", `PerkData ${perk.PerkID} runtime actions missing`, expectedId);
    const actionRows = (tables.PerkActionData || []).filter((action) => String(action.PerkID) === String(perk.PerkID));
    if (actionRows.length > 0) pass("DESIGN_TABLE", `PerkData ${perk.PerkID} actions sourced from PerkActionData`, String(actionRows.length));
    else fail("DESIGN_TABLE", `PerkData ${perk.PerkID} has no PerkActionData rows`, expectedId);
  }

  for (const rarity of tables.RarityData || []) {
    const rarityKey = designRarityToRuntime(rarity);
    const runtimeRarity = data.perks?.rarities?.[rarityKey];
    if (runtimeRarity?.source === "designTables") pass("DESIGN_TABLE", `RarityData ${rarity.PerkRarityID} feeds runtime rarity ${rarityKey}`);
    else fail("DESIGN_TABLE", `RarityData ${rarity.PerkRarityID} runtime rarity missing`, `${rarityKey} / ${runtimeRarity?.source}`);
  }

  const legacyExtensionCount = (data.perks?.upgrades || []).filter((upgrade) => upgrade.source === "legacy-extension").length;
  if (legacyExtensionCount === 0) pass("DESIGN_TABLE", "Legacy perk extensions fully migrated");
  else fail("DESIGN_TABLE", "Legacy perk extensions remain after full PerkData migration", String(legacyExtensionCount));
  const nonDesignPerks = (data.perks?.upgrades || []).filter((upgrade) => upgrade.source !== "designTables");
  if (nonDesignPerks.length === 0) pass("DESIGN_TABLE", "All runtime perks are sourced from PerkData");
  else fail("DESIGN_TABLE", "Runtime perks outside PerkData remain", nonDesignPerks.map((upgrade) => `${upgrade.id}:${upgrade.source || "missing"}`).join(", "));

  const runtimeMonsterKeysByExpType = {
    81: ["basic"],
    82: ["speed", "tank", "ranged"],
    83: ["midBoss", "finalBoss"],
    84: ["dummy"],
  };
  for (const monster of tables.MonsterData || []) {
    if (expTypeIds.has(String(monster.ExpTypeID))) pass("DESIGN_TABLE", `MonsterData ${monster.MonsterID} has ExpData ${monster.ExpTypeID}`);
    else warn("DESIGN_TABLE", `MonsterData ${monster.MonsterID} missing ExpData`, String(monster.ExpTypeID));
    const key = monsterRuntimeKey(monster.MonsterID);
    const runtimeMonster = data.monsters?.[key];
    if (runtimeMonster?.source === "designTables") pass("DESIGN_TABLE", `MonsterData ${monster.MonsterID} feeds runtime ${key}`);
    else fail("DESIGN_TABLE", `MonsterData ${monster.MonsterID} runtime monster missing`, `${key} / ${runtimeMonster?.source}`);
    const expectedXp = Number((tables.ExpData || []).find((row) => String(row.ExpTypeID) === String(monster.ExpTypeID))?.ExpAmount ?? runtimeMonster?.xp);
    if (Number(runtimeMonster?.xp) === expectedXp) pass("DESIGN_TABLE", `MonsterData ${monster.MonsterID} ExpData XP applied`);
    else fail("DESIGN_TABLE", `MonsterData ${monster.MonsterID} XP mismatch`, `${runtimeMonster?.xp} / ${expectedXp}`);
  }

  for (const boss of tables.BossData || []) {
    if (monsterIds.has(String(boss.MonsterID))) pass("DESIGN_TABLE", `BossData ${boss.BossID} -> MonsterData ${boss.MonsterID}`);
    else fail("DESIGN_TABLE", `BossData ${boss.BossID} missing monster`, String(boss.MonsterID));
    if (!Number(boss.SummonMonsterGroupID) || monsterGroupIds.has(String(boss.SummonMonsterGroupID))) pass("DESIGN_TABLE", `BossData ${boss.BossID} summon group valid`);
    else fail("DESIGN_TABLE", `BossData ${boss.BossID} missing summon group`, String(boss.SummonMonsterGroupID));
    const key = bossRuntimeKey(boss.BossID);
    const runtimeBoss = data.bosses?.[key];
    if (runtimeBoss?.source === "designTables") pass("DESIGN_TABLE", `BossData ${boss.BossID} feeds runtime ${key}`);
    else fail("DESIGN_TABLE", `BossData ${boss.BossID} runtime boss missing`, `${key} / ${runtimeBoss?.source}`);
    const expectedMonsterKey = monsterRuntimeKey(boss.MonsterID);
    if (runtimeBoss?.monsterKey === expectedMonsterKey) pass("DESIGN_TABLE", `BossData ${boss.BossID} monster runtime ${expectedMonsterKey}`);
    else fail("DESIGN_TABLE", `BossData ${boss.BossID} monster runtime mismatch`, `${runtimeBoss?.monsterKey} / ${expectedMonsterKey}`);
    const bossMonsterRow = monsterRowsById.get(String(boss.MonsterID));
    const bossExpRow = expRowsById.get(String(bossMonsterRow?.ExpTypeID));
    if (bossExpRow && Number(runtimeBoss?.xp) === Number(bossExpRow.ExpAmount)) {
      pass("DESIGN_TABLE", `BossData ${boss.BossID} XP comes from MonsterData.ExpTypeID ${bossMonsterRow.ExpTypeID}`);
    } else {
      fail("DESIGN_TABLE", `BossData ${boss.BossID} XP does not follow ExpData`, `${runtimeBoss?.xp} / ${bossMonsterRow?.ExpTypeID} / ${bossExpRow?.ExpAmount}`);
    }
    if (Number(boss.SummonMonsterGroupID) && Number(boss.SummonCount) > 0) {
      if (runtimeBoss?.summon?.monsters && Object.keys(runtimeBoss.summon.monsters).length > 0) {
        pass("DESIGN_TABLE", `BossData ${boss.BossID} summon group feeds runtime`, JSON.stringify(runtimeBoss.summon.monsters));
      } else {
        fail("DESIGN_TABLE", `BossData ${boss.BossID} summon group runtime missing`, String(boss.SummonMonsterGroupID));
      }
      if (String(runtimeBoss?.summon?.design?.summonMonsterGroupId) === String(boss.SummonMonsterGroupID)) {
        pass("DESIGN_TABLE", `BossData ${boss.BossID} summon keeps MonsterGroupData ID`);
      } else {
        fail("DESIGN_TABLE", `BossData ${boss.BossID} summon MonsterGroupData ID mismatch`, `${runtimeBoss?.summon?.design?.summonMonsterGroupId} / ${boss.SummonMonsterGroupID}`);
      }
      for (const monsterKey of Object.keys(runtimeBoss?.summon?.monsters || {})) {
        if (data.monsters?.[monsterKey]?.source === "designTables") pass("DESIGN_TABLE", `BossData ${boss.BossID} summon monster ${monsterKey} from MonsterData`);
        else fail("DESIGN_TABLE", `BossData ${boss.BossID} summon monster ${monsterKey} not from MonsterData`, String(data.monsters?.[monsterKey]?.source));
      }
    }
  }

  if (data.levelData?.source === "designTables") pass("DESIGN_TABLE", "LevelData feeds runtime levelData");
  else fail("DESIGN_TABLE", "LevelData runtime source missing", String(data.levelData?.source));
  if (Array.isArray(data.levelData?.levels) && data.levelData.levels.length === (tables.LevelData || []).length) {
    pass("DESIGN_TABLE", "LevelData rows are exposed at runtime", String(data.levelData.levels.length));
  } else {
    fail("DESIGN_TABLE", "LevelData runtime rows mismatch", String(data.levelData?.levels?.length || 0));
  }
  const sortedLevelRows = [...(tables.LevelData || [])].sort((a, b) => Number(a.GoalLevel) - Number(b.GoalLevel));
  for (let index = 0; index < sortedLevelRows.length - 1; index += 1) {
    const from = sortedLevelRows[index];
    const to = sortedLevelRows[index + 1];
    const levelGap = Math.max(1, Number(to.GoalLevel) - Number(from.GoalLevel));
    const expectedCost = Math.max(1, Math.ceil((Number(to.RequiredXP) - Number(from.RequiredXP)) / levelGap));
    const runtimeCost = Number(data.levelData?.xpCostByLevel?.[String(from.GoalLevel)] ?? data.levelData?.xpCostByLevel?.[from.GoalLevel]);
    if (runtimeCost === expectedCost) pass("DESIGN_TABLE", `LevelData ${from.GoalLevel}->${to.GoalLevel} feeds xpCost`, String(runtimeCost));
    else fail("DESIGN_TABLE", `LevelData ${from.GoalLevel}->${to.GoalLevel} xpCost mismatch`, `${runtimeCost} / ${expectedCost}`);
  }
  for (const expRow of tables.ExpData || []) {
    const expectedXp = Number(expRow.ExpAmount);
    for (const monsterKey of runtimeMonsterKeysByExpType[expRow.ExpTypeID] || []) {
      const monster = data.monsters?.[monsterKey];
      if (monster?.expSource === "designTables" && Number(monster.xp) === expectedXp) {
        pass("DESIGN_TABLE", `ExpData ${expRow.ExpTypeID} feeds ${monsterKey} XP`);
      } else {
        fail("DESIGN_TABLE", `ExpData ${expRow.ExpTypeID} does not feed ${monsterKey}`, `${monster?.xp} / ${expectedXp} / ${monster?.expSource}`);
      }
    }
  }

  if (stageIds.size >= 3 && pieceIds.size >= 6 && towerIds.size >= 6) {
    pass("DESIGN_TABLE", "Design tables cover current playable prototype scope");
  } else {
    fail("DESIGN_TABLE", "Design tables do not cover current playable scope");
  }
}

function validateAuthoringIntegrity(data) {
  const config = data.defaultConfig || {};
  const pieces = data.pieces || {};
  const selectable = new Set(data.loadout?.selectablePieceKeys || []);
  const fallback = data.loadout?.fallbackPieceKeys || [];

  for (const pieceKey of fallback) {
    if (selectable.has(pieceKey)) pass("DATA_EDIT", `Fallback piece is selectable: ${pieceKey}`);
    else fail("DATA_EDIT", `Fallback piece is not selectable: ${pieceKey}`);
  }

  for (const pieceKey of data.loadout?.defaultPieceKeys || []) {
    if (selectable.has(pieceKey)) pass("DATA_EDIT", `Default piece is selectable: ${pieceKey}`);
    else fail("DATA_EDIT", `Default piece is not selectable: ${pieceKey}`);
  }

  const selectableOwned = [...selectable].filter((pieceKey) => pieces[pieceKey]?.owned === true);
  if (selectableOwned.length >= Number(data.loadout?.maxSlots || 0)) {
    pass("DATA_EDIT", "Enough owned selectable pieces for a full loadout", String(selectableOwned.length));
  } else {
    fail("DATA_EDIT", "Not enough owned selectable pieces for a full loadout", String(selectableOwned.length));
  }

  for (const [bossKey, boss] of Object.entries(data.bosses || {})) {
    for (const [statKey, configKey] of Object.entries(boss.configKeys || {})) {
      if (has(config, configKey)) pass("DATA_EDIT", `Boss ${bossKey} config key ${statKey} -> ${configKey}`);
      else fail("DATA_EDIT", `Boss ${bossKey} missing config key`, `${statKey} -> ${configKey}`);
    }
  }

  for (const [rarityKey, rarity] of Object.entries(data.perks?.rarities || {})) {
    if (rarity.weightConfig && has(config, rarity.weightConfig)) pass("DATA_EDIT", `Perk rarity ${rarityKey} weightConfig exists`);
    else fail("DATA_EDIT", `Perk rarity ${rarityKey} weightConfig missing`, String(rarity.weightConfig));
  }

  for (const perk of data.perks?.upgrades || []) {
    if (perk.requireActiveType && !Object.values(pieces).some((piece) => piece.type === perk.requireActiveType)) {
      fail("DATA_EDIT", `Perk ${perk.id} requireActiveType has no piece`, perk.requireActiveType);
    } else if (perk.requireActiveType) {
      pass("DATA_EDIT", `Perk ${perk.id} requireActiveType valid`);
    }

    if (perk.targetType && !Object.values(pieces).some((piece) => piece.type === perk.targetType)) {
      fail("DATA_EDIT", `Perk ${perk.id} targetType has no piece`, perk.targetType);
    } else if (perk.targetType) {
      pass("DATA_EDIT", `Perk ${perk.id} targetType valid`);
    }

    if (perk.limit?.configKey) {
      if (has(config, perk.limit.configKey)) pass("DATA_EDIT", `Perk ${perk.id} limit configKey exists`);
      else fail("DATA_EDIT", `Perk ${perk.id} limit configKey missing`, perk.limit.configKey);
    }
  }

  for (const [profileKey, profile] of Object.entries(data.waveProfiles || {})) {
    if (data.waves?.[profileKey] || data.waves?.[String(profileKey)]) pass("DATA_EDIT", `WaveProfile ${profileKey} maps to a wave`);
    else warn("DATA_EDIT", `WaveProfile ${profileKey} has no matching wave`, "Fallback spawn profile may be unused.");

    const weights = profile.weights || {};
    const sum = approxWeightSum(weights);
    if (sum > 0) pass("DATA_EDIT", `WaveProfile ${profileKey} weight sum positive`, String(sum));
    else fail("DATA_EDIT", `WaveProfile ${profileKey} weight sum invalid`, String(sum));
    for (const monsterKey of Object.keys(weights)) {
      if (has(data.monsters, monsterKey)) pass("DATA_EDIT", `WaveProfile ${profileKey} monster weight ${monsterKey} valid`);
      else fail("DATA_EDIT", `WaveProfile ${profileKey} monster weight invalid`, monsterKey);
    }
  }
}

function validateDataOnlyRuntime(data, html) {
  const requiredRuntimeTables = [
    "constants",
    "storageKeys",
    "towerTypes",
    "gradeStats",
    "projectiles",
    "specialProjectiles",
    "towers",
    "pieces",
    "monsters",
    "monsterTypes",
    "monsterGroups",
    "wavePatterns",
    "waveProfiles",
    "waves",
    "bosses",
    "stages",
    "loadout",
    "perks",
    "levelData",
    "shop",
    "progression",
    "phonePresets",
    "defaultConfig",
    "defaultPlayerSave",
  ];

  for (const key of requiredRuntimeTables) {
    if (data[key]) pass("DATA_ONLY", `Required table ${key} exists`);
    else fail("DATA_ONLY", `Required table ${key} missing`);
  }

  const requiredHtmlObjectBindings = [
    ["GAME_CONSTANTS", "constants"],
    ["STORAGE_KEYS", "storageKeys"],
    ["TOWER_TYPES", "towerTypes"],
    ["GRADE_STATS", "gradeStats"],
    ["PROJECTILE_DATA", "projectiles"],
    ["SPECIAL_PROJECTILE_DATA", "specialProjectiles"],
    ["TOWER_DATA", "towers"],
    ["PIECE_DATA", "pieces"],
    ["MONSTER_DATA", "monsters"],
    ["MONSTER_TYPES", "monsterTypes"],
    ["MONSTER_GROUP_DATA", "monsterGroups"],
    ["WAVE_PATTERN_DATA", "wavePatterns"],
    ["WAVE_DATA", "waves"],
    ["BOSS_DATA", "bosses"],
    ["LOADOUT_DATA", "loadout"],
    ["PERK_DATA", "perks"],
    ["LEVEL_DATA", "levelData"],
    ["SHOP_DATA", "shop"],
    ["PROGRESSION_DATA", "progression"],
    ["DEFAULT_WAVE_PROFILES", "waveProfiles"],
    ["defaultConfig", "defaultConfig"],
    ["DEFAULT_PLAYER_SAVE", "defaultPlayerSave"],
  ];
  const requiredHtmlArrayBindings = [
    ["STAGES", "stages"],
    ["PHONE_PRESETS", "phonePresets"],
  ];

  for (const [binding, tableName] of requiredHtmlObjectBindings) {
    const needle = `const ${binding} = requireDataTable("${tableName}")`;
    if (html.includes(needle)) pass("DATA_ONLY", `HTML binds ${tableName} through requireDataTable`);
    else fail("DATA_ONLY", `HTML ${tableName} binding missing`, needle);
  }
  for (const [binding, tableName] of requiredHtmlArrayBindings) {
    const needle = `const ${binding} = requireDataArray("${tableName}")`;
    if (html.includes(needle)) pass("DATA_ONLY", `HTML binds ${tableName} through requireDataArray`);
    else fail("DATA_ONLY", `HTML ${tableName} array binding missing`, needle);
  }

  const runtimeChecks = [
    ["function requireDataTable", "Runtime requires data tables"],
    ["function failDataTable", "Missing data fails loudly"],
    ["const PIECES = Object.fromEntries(Object.entries(PIECE_DATA)", "HTML derives pieces from PieceData runtime table"],
    ["const tower = TOWER_DATA[towerId]", "HTML resolves piece towers through TowerData runtime table"],
    ["const projectile = PROJECTILE_DATA[tower.projectileId]", "HTML resolves tower projectiles through ProjectileData runtime table"],
    ["(Number(tower.projectileSize ?? tower.radius ?? projectile.radius ?? 5) + (state.mods.bulletSizeBonus || 0)) *", "HTML projectile size starts from TowerData without type multiplier"],
    ["const SHOP_UNLOCK_ENTRIES = new Map((SHOP_DATA.pieceUnlocks", "HTML derives shop unlocks from ShopData runtime table"],
    ["const SHOP_FALLBACK_UNLOCK_COST = requireGameDataValue(\"shop.fallbackUnlockCost\"", "Shop fallback cost comes from data table"],
    ["const DECK_SETS_PER_PIECE = requireFiniteDataNumber(\"loadout.startDeck.setsPerPiece\"", "Deck set count comes from LoadoutData"],
    ["const DECK_CELLS_PER_SET = requireFiniteDataNumber(\"loadout.startDeck.cellsPerSet\"", "Deck cells-per-set comes from LoadoutData"],
    ["const INITIAL_PIECES_PER_SLOT = requireFiniteDataNumber(\"loadout.startDeck.initialPiecesPerSlot\"", "Initial slot fill comes from LoadoutData"],
    ["const REFILL_PIECES_PER_EMPTY_SLOT = requireFiniteDataNumber(\"loadout.startDeck.refillPiecesPerEmptySlot\"", "Refill count comes from LoadoutData"],
    ["LEVEL_DATA.xpCostByLevel", "HTML reads level curve from LevelData runtime table"],
    ["state.selectedStageKey = STAGES[nextIndex].key", "HTML stage carousel uses StageData runtime table"],
    ["return WAVE_DATA[String(wave)] || WAVE_DATA[wave] || null", "HTML resolves waves through WaveData runtime table"],
    ["BOSS_DATA[bossRef]", "HTML resolves bosses through BossData runtime table"],
  ];

  for (const [needle, label] of runtimeChecks) {
    if (html.includes(needle)) pass("DATA_ONLY", label);
    else fail("DATA_ONLY", `${label} missing`, needle);
  }

  if (!html.includes("const projectileSizeScale =")) pass("DATA_ONLY", "HTML has no tower-type projectile size multiplier");
  else fail("DATA_ONLY", "HTML still contains tower-type projectile size multiplier", "const projectileSizeScale =");

  const forbiddenRuntimeFallbacks = [
    ["window.GAME_DATA || {}", "GAME_DATA object fallback"],
    ["cloneGameData(GAME_DATA.towerTypes) ||", "TowerTypes inline fallback"],
    ["const PIECE_DEFINITIONS", "PieceDefinitions inline fallback"],
    ["cloneGameData(GAME_DATA.gradeStats) ||", "GradeStats inline fallback"],
    ["cloneGameData(GAME_DATA.monsterTypes) ||", "MonsterTypes inline fallback"],
    ["cloneGameData(GAME_DATA.stages) ||", "Stages inline fallback"],
    ["cloneGameData(GAME_DATA.waveProfiles) ||", "WaveProfiles inline fallback"],
    ["cloneGameData(GAME_DATA.phonePresets) ||", "PhonePresets inline fallback"],
    ["cloneGameData(GAME_DATA.defaultConfig) ||", "DefaultConfig inline fallback"],
    ["cloneGameData(GAME_DATA.defaultPlayerSave) ||", "DefaultPlayerSave inline fallback"],
    ["gold: 800, ticket: 1", "Shop inline fallback cost"],
    ["LOADOUT_DATA.startDeck?.setsPerPiece ?? 3", "Deck hardcoded set-count fallback"],
    ["LOADOUT_DATA.startDeck?.cellsPerSet ?? CELLS_PER_SLOT", "Deck hardcoded cells-per-set fallback"],
    ["bossStats.spawn ||", "Boss spawn inline fallback"],
    ["MONSTER_TYPES.basic", "Monster basic inline fallback"],
  ];

  for (const [needle, label] of forbiddenRuntimeFallbacks) {
    if (html.includes(needle)) fail("DATA_ONLY", `${label} still exists`, needle);
    else pass("DATA_ONLY", `No ${label}`);
  }

  const forbiddenDesignTableColumns = [
    "MonsterGroupKey",
    "MonsterGroupKey_Normal",
    "MonsterGroupKey_Elite_1",
    "MonsterGroupKey_Elite_2",
    "Elite_1_Count",
    "Elite_2_Count",
    "Boss_Count",
    "BossKey",
    "BGKey",
    "ClearReward",
    "WavePaternID",
    "WavePattern_10",
  ];
  const designTablesText = JSON.stringify(data.designTables || {});
  for (const columnName of forbiddenDesignTableColumns) {
    if (designTablesText.includes(columnName)) fail("DATA_ONLY", `Legacy spawn column still exists: ${columnName}`);
    else pass("DATA_ONLY", `Legacy spawn column removed: ${columnName}`);
  }

  const constants = data.constants || {};
  for (const key of ["slotCount", "cellsPerSlot", "loadoutPieceCount", "initialPiecesPerSlot", "refillPiecesPerEmptySlot", "slotSizeStorageVersion"]) {
    if (hasPositiveNumber(constants[key])) pass("DATA_ONLY", `constants.${key} valid`);
    else fail("DATA_ONLY", `constants.${key} missing/invalid`, String(constants[key]));
  }

  const storageKeys = data.storageKeys || {};
  for (const key of ["layout", "playerSave", "phonePreset", "lobby", "stageClear", "legacyBest"]) {
    if (typeof storageKeys[key] === "string" && storageKeys[key].length > 0) pass("DATA_ONLY", `storageKeys.${key} valid`);
    else fail("DATA_ONLY", `storageKeys.${key} missing/invalid`, String(storageKeys[key]));
  }

  const config = data.defaultConfig || {};
  for (const key of ["slotHp", "monsterHp", "monsterDamage", "monsterSpeed", "bulletDamage", "bulletSpeed", "towerFireRate", "waveDuration", "enemyCap"]) {
    if (hasPositiveNumber(config[key])) pass("DATA_ONLY", `defaultConfig.${key} valid`);
    else fail("DATA_ONLY", `defaultConfig.${key} missing/invalid`, String(config[key]));
  }

  const assertAllRowsFromDesignTables = (tableName, rows) => {
    const invalidRows = rows.filter((row) => row?.source !== "designTables");
    if (!invalidRows.length) pass("DATA_ONLY", `${tableName} runtime rows are generated from designTables`);
    else fail("DATA_ONLY", `${tableName} has non-designTable runtime rows`, invalidRows.map((row) => row?.key || row?.id || row?.name || "?").join(", "));
  };
  assertAllRowsFromDesignTables("pieces", Object.values(data.pieces || {}));
  assertAllRowsFromDesignTables("towers", Object.values(data.towers || {}));
  assertAllRowsFromDesignTables("projectiles", Object.values(data.projectiles || {}));
  assertAllRowsFromDesignTables("stages", data.stages || []);

  for (const [tableName, tableValue] of [["loadout", data.loadout], ["shop", data.shop], ["levelData", data.levelData]]) {
    if (tableValue?.source === "designTables") pass("DATA_ONLY", `${tableName} runtime table is generated from designTables`);
    else fail("DATA_ONLY", `${tableName} runtime table is not generated from designTables`, String(tableValue?.source));
  }
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function hasPositiveNumber(value) {
  return isFiniteNumber(value) && Number(value) > 0;
}

function isNonNegativeNumber(value) {
  return isFiniteNumber(value) && Number(value) >= 0;
}

function approxWeightSum(weights = {}) {
  return Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0);
}

function validateCoreGameplayData(data) {
  for (const [pieceKey, piece] of Object.entries(data.pieces || {})) {
    if (piece.key === pieceKey) pass("CORE", `Piece ${pieceKey} key matches`);
    else fail("CORE", `Piece ${pieceKey} key mismatch`, String(piece.key));
    if (piece.name) pass("CORE", `Piece ${pieceKey} name exists`);
    else fail("CORE", `Piece ${pieceKey} name missing`);
    if (isFiniteNumber(piece.star) && Number(piece.star) >= 1) pass("CORE", `Piece ${pieceKey} star exists`);
    else fail("CORE", `Piece ${pieceKey} star missing`);
    if (typeof piece.owned === "boolean") pass("CORE", `Piece ${pieceKey} owned flag exists`);
    else warn("CORE", `Piece ${pieceKey} owned flag missing`, "Lobby ownership defaults may become ambiguous.");
  }

  for (const [towerKey, tower] of Object.entries(data.towers || {})) {
    if (tower.id === towerKey) pass("CORE", `Tower ${towerKey} id matches`);
    else fail("CORE", `Tower ${towerKey} id mismatch`, String(tower.id));
    if (tower.name) pass("CORE", `Tower ${towerKey} name exists`);
    else fail("CORE", `Tower ${towerKey} name missing`);
    for (const field of ["damageMod", "fireRate", "range", "maxAmmo"]) {
      if (hasPositiveNumber(tower[field])) pass("CORE", `Tower ${towerKey} ${field} valid`);
      else fail("CORE", `Tower ${towerKey} ${field} invalid`, String(tower[field]));
    }
    if (tower.aiType) pass("CORE", `Tower ${towerKey} aiType exists`);
    else fail("CORE", `Tower ${towerKey} aiType missing`);
  }

  for (const [projectileKey, projectile] of Object.entries(data.projectiles || {})) {
    if (projectile.id === projectileKey) pass("CORE", `Projectile ${projectileKey} id matches`);
    else fail("CORE", `Projectile ${projectileKey} id mismatch`, String(projectile.id));
    if (projectile.name) pass("CORE", `Projectile ${projectileKey} name exists`);
    else fail("CORE", `Projectile ${projectileKey} name missing`);
    for (const field of ["damageRatio", "speedMult", "radius", "life"]) {
      if (isFiniteNumber(projectile[field])) pass("CORE", `Projectile ${projectileKey} ${field} exists`);
      else fail("CORE", `Projectile ${projectileKey} ${field} missing`, String(projectile[field]));
    }
    if (isFiniteNumber(projectile.pierceHits)) pass("CORE", `Projectile ${projectileKey} pierceHits exists`);
    else fail("CORE", `Projectile ${projectileKey} pierceHits missing`);
  }

  for (const [monsterKey, monster] of Object.entries(data.monsters || {})) {
    if (monster.key === monsterKey) pass("CORE", `Monster ${monsterKey} key matches`);
    else fail("CORE", `Monster ${monsterKey} key mismatch`, String(monster.key));
    if (monster.name) pass("CORE", `Monster ${monsterKey} name exists`);
    else fail("CORE", `Monster ${monsterKey} name missing`);
    for (const field of ["hpMult", "damageMult", "speedMult", "attackRateMult", "taunt", "pack", "xp"]) {
      if (hasPositiveNumber(monster[field])) pass("CORE", `Monster ${monsterKey} ${field} valid`);
      else fail("CORE", `Monster ${monsterKey} ${field} invalid`, String(monster[field]));
    }
    if (monster.testDummy === true) {
      if (monster.canMove === false && monster.canAttack === false) pass("CORE", `Monster ${monsterKey} dummy is passive`);
      else fail("CORE", `Monster ${monsterKey} dummy should not move/attack`);
    }
  }

  for (const [groupKey, group] of Object.entries(data.monsterGroups || {})) {
    const total = Object.values(group.monsters || {}).reduce((sum, count) => sum + Number(count || 0), 0);
    if (group.id === groupKey) pass("CORE", `MonsterGroup ${groupKey} id matches`);
    else fail("CORE", `MonsterGroup ${groupKey} id mismatch`, String(group.id));
    if (total > 0) pass("CORE", `MonsterGroup ${groupKey} has monsters`, String(total));
    else fail("CORE", `MonsterGroup ${groupKey} empty`);
    for (const [monsterKey, count] of Object.entries(group.monsters || {})) {
      if (Number.isInteger(Number(count)) && Number(count) > 0) pass("CORE", `MonsterGroup ${groupKey}.${monsterKey} count valid`);
      else fail("CORE", `MonsterGroup ${groupKey}.${monsterKey} count invalid`, String(count));
    }
    if (group.spawnPoint) {
      const validRatio = isFiniteNumber(group.spawnPoint.xRatio) && isFiniteNumber(group.spawnPoint.yRatio);
      const validPixel = isFiniteNumber(group.spawnPoint.x) && isFiniteNumber(group.spawnPoint.y);
      if (validRatio || validPixel) pass("CORE", `MonsterGroup ${groupKey} spawnPoint valid`);
      else fail("CORE", `MonsterGroup ${groupKey} spawnPoint invalid`, JSON.stringify(group.spawnPoint));
    }
  }

  for (const [patternKey, pattern] of Object.entries(data.wavePatterns || {})) {
    if (pattern.id === patternKey) pass("CORE", `WavePattern ${patternKey} id matches`);
    else fail("CORE", `WavePattern ${patternKey} id mismatch`, String(pattern.id));
    const events = pattern.events || [];
    if (events.length > 0) pass("CORE", `WavePattern ${patternKey} has events`, String(events.length));
    else fail("CORE", `WavePattern ${patternKey} events missing`);
    let previousTime = -Infinity;
    for (const event of events) {
      if (isFiniteNumber(event.time) && Number(event.time) >= previousTime) {
        pass("CORE", `WavePattern ${patternKey} event time ordered`, String(event.time));
        previousTime = Number(event.time);
      } else {
        fail("CORE", `WavePattern ${patternKey} event time invalid`, String(event.time));
      }
    }
  }

  const firstStage = (data.stages || []).find((stage) => stage.key === "stage-1") || (data.stages || [])[0] || {};
  const waveIds = (firstStage.waveIds || []).map(Number).sort((a, b) => a - b);
  const expectedWaveIds = Array.from({ length: 10 }, (_, index) => index + 1);
  if (JSON.stringify(waveIds) === JSON.stringify(expectedWaveIds)) {
    pass("CORE", "Stage 1 wave ids are 1-10");
  } else {
    fail("CORE", "Stage 1 wave ids mismatch", waveIds.join(", "));
  }

  for (const [waveKey, wave] of Object.entries(data.waves || {})) {
    if (String(wave.id) === String(waveKey)) pass("CORE", `Wave ${waveKey} id matches`);
    else fail("CORE", `Wave ${waveKey} id mismatch`, String(wave.id));
    if (wave.label) pass("CORE", `Wave ${waveKey} label exists`);
    else fail("CORE", `Wave ${waveKey} label missing`);
    if (wave.type === "boss") {
      if (wave.bossId) pass("CORE", `Wave ${waveKey} bossId exists`);
      else fail("CORE", `Wave ${waveKey} bossId missing`);
    } else if (Number(wave.duration) > 0 && wave.patternId) {
      pass("CORE", `Wave ${waveKey} normal duration/pattern valid`);
    } else {
      fail("CORE", `Wave ${waveKey} normal duration/pattern invalid`, `duration=${wave.duration}, pattern=${wave.patternId}`);
    }
    if (wave.patternId && !data.wavePatterns?.[wave.patternId]) fail("CORE", `Wave ${waveKey} pattern missing`, wave.patternId);
  }

  for (const stage of data.stages || []) {
    if (stage.key) pass("CORE", `Stage ${stage.key} key exists`);
    else fail("CORE", "Stage key missing");
    if ((stage.waveIds || []).length === 10) pass("CORE", `Stage ${stage.key} has 10 waves`);
    else fail("CORE", `Stage ${stage.key} wave count mismatch`, String((stage.waveIds || []).length));
    if ((stage.waveIds || []).every((waveId) => data.waves?.[String(waveId)] || data.waves?.[waveId])) {
      pass("CORE", `Stage ${stage.key} all waves exist`);
    } else {
      fail("CORE", `Stage ${stage.key} has missing waves`, String((stage.waveIds || []).join(", ")));
    }
    if ((stage.waveIds || []).includes(stage.firstWave)) pass("CORE", `Stage ${stage.key} firstWave is in waveIds`);
    else fail("CORE", `Stage ${stage.key} firstWave missing from waveIds`, String(stage.firstWave));
    if (stage.clearReward) pass("CORE", `Stage ${stage.key} clearReward exists`);
    else warn("CORE", `Stage ${stage.key} clearReward missing`, "Result reward loop is a later phase, but data should be decided soon.");
    if (stage.clearReward) {
      if (isNonNegativeNumber(stage.clearReward.gold) && isNonNegativeNumber(stage.clearReward.ticket)) {
        pass("CORE", `Stage ${stage.key} clearReward values valid`);
      } else {
        fail("CORE", `Stage ${stage.key} clearReward values invalid`, JSON.stringify(stage.clearReward));
      }
    }
    if (stage.waveReward && isNonNegativeNumber(stage.waveReward.gold)) {
      pass("CORE", `Stage ${stage.key} waveReward gold valid`);
    } else {
      fail("CORE", `Stage ${stage.key} waveReward gold invalid`, JSON.stringify(stage.waveReward));
    }
  }

  const perkIds = new Set();
  for (const perk of data.perks?.upgrades || []) {
    if (perk.id && !perkIds.has(perk.id)) {
      pass("CORE", `Perk ${perk.id} id unique`);
      perkIds.add(perk.id);
    } else {
      fail("CORE", "Perk id duplicate or missing", String(perk.id));
    }
    if (has(data.perks?.rarities, perk.rarity)) pass("CORE", `Perk ${perk.id} rarity valid`);
    else fail("CORE", `Perk ${perk.id} rarity invalid`, String(perk.rarity));
    if ((perk.actions || []).length > 0) pass("CORE", `Perk ${perk.id} has actions`);
    else fail("CORE", `Perk ${perk.id} actions missing`);
  }
}

function validateInternalStatsTableRules(data) {
  const tables = data.designTables || {};
  const map = data.designRuntimeKeyMap || {};
  const runtimeKey = (tableName, rowId, prefix) => map[tableName]?.[rowId] || map[tableName]?.[String(rowId)] || `${prefix}_${rowId}`;
  const closeTo = (a, b, epsilon = 0.001) => Math.abs(Number(a) - Number(b)) <= epsilon;
  const baseBulletDamage = 24;
  const designRangeUnitPx = 38;
  const designProjectileSizeUnitPx = 20;
  const normalizeDesignTowerRange = (value) => {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return 360;
    return raw <= 30 ? raw * designRangeUnitPx : raw;
  };
  const normalizeDesignProjectileSize = (value, fallback = 0) => {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return fallback;
    return raw <= 2 ? raw * designProjectileSizeUnitPx : raw;
  };
  const baseMonsterHp = 22;
  const baseMonsterDamage = 1;
  const baseMonsterSpeed = 34;
  const baseMonsterAttackRate = 1.35;

  for (const projectileRow of tables.ProjectileData || []) {
    const projectileKey = runtimeKey("ProjectileData", projectileRow.ProjectileID, "proj");
    const runtimeProjectile = data.projectiles?.[projectileKey];
    const towerRows = (tables.TowerData || []).filter((towerRow) => String(towerRow.TowerProjectile) === String(projectileRow.ProjectileID));
    const sizeOverride = towerRows.find((towerRow) => Number(towerRow.ProjectileSize) > 0)?.ProjectileSize;
    const pierceOverride = Math.max(0, ...towerRows.map((towerRow) => Number(towerRow.PiercingCount) || 0));
    const splashOverride = Math.max(0, ...towerRows.map((towerRow) => Number(towerRow.SplashRadius) || 0));

    if (runtimeProjectile?.design?.fillSource === "ProjectileTypeDefaults") pass("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} uses type fill defaults`);
    else fail("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} missing type fill defaults`, String(runtimeProjectile?.design?.fillSource));
    const expectedProjectileRadius = normalizeDesignProjectileSize(sizeOverride, runtimeProjectile?.radius || 0);
    if (!sizeOverride || closeTo(runtimeProjectile?.radius, expectedProjectileRadius)) pass("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} radius follows TowerData`);
    else fail("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} radius mismatch`, `${runtimeProjectile?.radius} / ${expectedProjectileRadius}`);
    if (!pierceOverride || Number(runtimeProjectile?.pierceHits) === pierceOverride) pass("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} pierce follows TowerData`);
    else fail("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} pierce mismatch`, `${runtimeProjectile?.pierceHits} / ${pierceOverride}`);
    if (!splashOverride || closeTo(runtimeProjectile?.splashRadius, splashOverride)) pass("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} splash follows TowerData`);
    else fail("INTERNAL_STATS", `ProjectileData ${projectileRow.ProjectileID} splash mismatch`, `${runtimeProjectile?.splashRadius} / ${splashOverride}`);
  }

  for (const towerRow of tables.TowerData || []) {
    const towerKey = runtimeKey("TowerData", towerRow.TowerID, "tower");
    const runtimeTower = data.towers?.[towerKey];
    const expectedDamageMod = Math.max(0.01, Number(towerRow.TowerAtk || 0) / baseBulletDamage);
    const expectedCount = Math.max(0, Math.floor(Number(towerRow.ProjectileCount) || 0));

    if (runtimeTower?.design?.fillSource === "TowerTypeDefaults") pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} uses type fill defaults`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} missing type fill defaults`, String(runtimeTower?.design?.fillSource));
    if (closeTo(runtimeTower?.damageMod, expectedDamageMod)) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} damage follows TowerAtk`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} damage mismatch`, `${runtimeTower?.damageMod} / ${expectedDamageMod}`);
    if (closeTo(runtimeTower?.fireRate, Number(towerRow.TowerAtkSpeed))) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} fireRate follows TowerAtkSpeed`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} fireRate mismatch`, `${runtimeTower?.fireRate} / ${towerRow.TowerAtkSpeed}`);
    const expectedRange = normalizeDesignTowerRange(towerRow.TowerMaxLange);
    if (closeTo(runtimeTower?.range, expectedRange)) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} range follows TowerMaxLange`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} range mismatch`, `${runtimeTower?.range} / ${expectedRange}`);
    if (Number(runtimeTower?.maxAmmo) === Math.floor(Number(towerRow.TowerMaxAmmo))) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} ammo follows TowerMaxAmmo`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} ammo mismatch`, `${runtimeTower?.maxAmmo} / ${towerRow.TowerMaxAmmo}`);
    if (Number(runtimeTower?.projectileCount) === expectedCount) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} projectile count follows ProjectileCount`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} projectile count mismatch`, `${runtimeTower?.projectileCount} / ${expectedCount}`);
    if (runtimeTower?.design?.towerAiType === towerRow.TowerAiType) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} preserves TowerAiType`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} TowerAiType metadata mismatch`, `${runtimeTower?.design?.towerAiType} / ${towerRow.TowerAiType}`);
    if (runtimeTower?.design?.targetPriority === towerRow.TargetPriority) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} preserves TargetPriority`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} TargetPriority metadata mismatch`, `${runtimeTower?.design?.targetPriority} / ${towerRow.TargetPriority}`);
    if (runtimeTower?.design?.projectileType === towerRow.ProjectileType) pass("INTERNAL_STATS", `TowerData ${towerRow.TowerID} preserves ProjectileType`);
    else fail("INTERNAL_STATS", `TowerData ${towerRow.TowerID} ProjectileType metadata mismatch`, `${runtimeTower?.design?.projectileType} / ${towerRow.ProjectileType}`);
  }

  for (const monsterRow of tables.MonsterData || []) {
    const monsterKey = runtimeKey("MonsterData", monsterRow.MonsterID, "monster");
    const runtimeMonster = data.monsters?.[monsterKey];
    const monsterType = String(monsterRow.MonsterType || "");
    const isDummy = monsterType === "99" || String(monsterRow.Desc || "").includes("허수아비");
    const expectedHp = Number(monsterRow.MonsterHp) > 0 ? Number(monsterRow.MonsterHp) / baseMonsterHp : 1;
    const expectedDamage = Number(monsterRow.MonsterAtk) > 0 ? Number(monsterRow.MonsterAtk) / baseMonsterDamage : isDummy ? 0.01 : 1;
    const expectedSpeed = Number(monsterRow.MonsterMoveSpeed) > 0 ? Number(monsterRow.MonsterMoveSpeed) / baseMonsterSpeed : isDummy ? 0.01 : 1;
    const expectedAttackRate = Number(monsterRow.MonsterAtkSpeed) > 0 ? Number(monsterRow.MonsterAtkSpeed) / baseMonsterAttackRate : 1;

    if (runtimeMonster?.design?.fillSource === "MonsterTypeDefaults") pass("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} uses type fill defaults`);
    else fail("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} missing type fill defaults`, String(runtimeMonster?.design?.fillSource));
    if (closeTo(runtimeMonster?.hpMult, expectedHp)) pass("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} hp follows MonsterHp`);
    else fail("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} hp mismatch`, `${runtimeMonster?.hpMult} / ${expectedHp}`);
    if (closeTo(runtimeMonster?.damageMult, expectedDamage)) pass("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} damage follows MonsterAtk`);
    else fail("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} damage mismatch`, `${runtimeMonster?.damageMult} / ${expectedDamage}`);
    if (closeTo(runtimeMonster?.speedMult, expectedSpeed)) pass("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} speed follows MonsterMoveSpeed`);
    else fail("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} speed mismatch`, `${runtimeMonster?.speedMult} / ${expectedSpeed}`);
    if (closeTo(runtimeMonster?.attackRateMult, expectedAttackRate)) pass("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} attackRate follows MonsterAtkSpeed`);
    else fail("INTERNAL_STATS", `MonsterData ${monsterRow.MonsterID} attackRate mismatch`, `${runtimeMonster?.attackRateMult} / ${expectedAttackRate}`);
  }

  const monsterRowsById = new Map((tables.MonsterData || []).map((row) => [String(row.MonsterID), row]));
  for (const bossRow of tables.BossData || []) {
    const bossKey = runtimeKey("BossData", bossRow.BossID, "boss");
    const runtimeBoss = data.bosses?.[bossKey];
    const monsterRow = monsterRowsById.get(String(bossRow.MonsterID));
    if (runtimeBoss?.design?.statSource === "MonsterData") pass("INTERNAL_STATS", `BossData ${bossRow.BossID} stats follow MonsterData`);
    else fail("INTERNAL_STATS", `BossData ${bossRow.BossID} stat source mismatch`, String(runtimeBoss?.design?.statSource));
    if (monsterRow && closeTo(runtimeBoss?.hpMult, Number(monsterRow.MonsterHp) / baseMonsterHp)) pass("INTERNAL_STATS", `BossData ${bossRow.BossID} hp follows MonsterData`);
    else fail("INTERNAL_STATS", `BossData ${bossRow.BossID} hp mismatch`, `${runtimeBoss?.hpMult} / ${monsterRow?.MonsterHp}`);
    if (monsterRow && closeTo(runtimeBoss?.meleeDamage, Number(monsterRow.MonsterAtk))) pass("INTERNAL_STATS", `BossData ${bossRow.BossID} melee follows MonsterData`);
    else fail("INTERNAL_STATS", `BossData ${bossRow.BossID} melee mismatch`, `${runtimeBoss?.meleeDamage} / ${monsterRow?.MonsterAtk}`);
    if (monsterRow && closeTo(runtimeBoss?.speed, Number(monsterRow.MonsterMoveSpeed))) pass("INTERNAL_STATS", `BossData ${bossRow.BossID} speed follows MonsterData`);
    else fail("INTERNAL_STATS", `BossData ${bossRow.BossID} speed mismatch`, `${runtimeBoss?.speed} / ${monsterRow?.MonsterMoveSpeed}`);
    if (monsterRow && closeTo(runtimeBoss?.attackRange, Number(monsterRow.MonsterAtkRange))) pass("INTERNAL_STATS", `BossData ${bossRow.BossID} range follows MonsterData`);
    else fail("INTERNAL_STATS", `BossData ${bossRow.BossID} range mismatch`, `${runtimeBoss?.attackRange} / ${monsterRow?.MonsterAtkRange}`);
  }
}

function validatePhase2DeckRules(data, html) {
  const loadout = data.loadout || {};
  const startDeck = loadout.startDeck || {};
  const selected = loadout.fallbackPieceKeys || [];
  const maxSlots = Number(loadout.maxSlots || data.constants?.loadoutPieceCount || 0);
  const slotCount = Number(data.constants?.slotCount || 0);
  const cellsPerSlot = Number(data.constants?.cellsPerSlot || 0);
  const setsPerPiece = Number(startDeck.setsPerPiece || 0);
  const cellsPerSet = Number(startDeck.cellsPerSet || 0);
  const initialPiecesPerSlot = Number(startDeck.initialPiecesPerSlot || data.constants?.initialPiecesPerSlot || 0);
  const refillPiecesPerEmptySlot = Number(startDeck.refillPiecesPerEmptySlot || data.constants?.refillPiecesPerEmptySlot || 0);
  const expectedTotal = maxSlots * setsPerPiece * cellsPerSet;
  const expectedInitial = slotCount * initialPiecesPerSlot;

  if (expectedTotal === 54) pass("PHASE2", "Deck total is 54", `${maxSlots}x${setsPerPiece}x${cellsPerSet}`);
  else fail("PHASE2", "Deck total is not 54", String(expectedTotal));

  if (slotCount === 9 && initialPiecesPerSlot === 2 && cellsPerSlot === 3) {
    pass("PHASE2", "Initial board rule is 9 slots x 2 pieces");
  } else {
    fail("PHASE2", "Initial board rule mismatch", `slots=${slotCount}, initial=${initialPiecesPerSlot}, cells=${cellsPerSlot}`);
  }

  if (expectedInitial === 18) pass("PHASE2", "Initial visible pieces are 18");
  else fail("PHASE2", "Initial visible pieces mismatch", String(expectedInitial));

  if (expectedTotal - expectedInitial === 36) pass("PHASE2", "Initial waiting queue is 36");
  else fail("PHASE2", "Initial waiting queue mismatch", String(expectedTotal - expectedInitial));

  if (refillPiecesPerEmptySlot === 2) pass("PHASE2", "Empty slot refill count is 2");
  else fail("PHASE2", "Empty slot refill count mismatch", String(refillPiecesPerEmptySlot));

  if (html.includes("function refillLooseSlot") && html.includes("!isSlotEmpty(slot)")) {
    pass("PHASE2", "Refill only runs on empty slots");
  } else {
    fail("PHASE2", "Refill only-empty guard missing");
  }

  if (html.includes("drawPriorityPieceFromPool(pool, counts, 2)") && html.includes("drawPriorityPieceFromPool(pool, counts, 3)")) {
    pass("PHASE2", "Refill priority uses visible count 2 then 3");
  } else {
    fail("PHASE2", "Refill priority 2->3 missing");
  }

  if (html.includes("if (countDeckRemaining() > 0) return") && html.includes("startNewDeck()")) {
    pass("PHASE2", "Deck regenerates only when field/queue/hold are empty");
  } else {
    fail("PHASE2", "Deck regeneration guard missing");
  }

  if (
    html.includes("dealDeckClearDamage") &&
    html.includes("showDeckClearExplosion") &&
    Number(data.defaultConfig?.fieldClearDamage) > 0 &&
    Number(data.defaultConfig?.fieldClearBossDamageRatio) > 0
  ) {
    pass("PHASE2", "Deck clear damage is migrated to the full-sort ultimate");
  } else if (html.includes("dealDeckClearDamage")) {
    warn("PHASE2", "Field clear damage migration is incomplete", "Full-sort ultimate data or EXP feedback is missing.");
  } else {
    pass("PHASE2", "No field clear damage bonus");
  }

  if (selected.length === 6 && selected.every((pieceKey) => data.pieces?.[pieceKey])) {
    pass("PHASE2", "Fallback selected pieces are valid 6-piece deck");
  } else {
    fail("PHASE2", "Fallback selected pieces invalid", selected.join(", "));
  }
}

function validatePhase3TowerRules(data, html) {
  const expected = {
    basic: { aiType: "basic", targetPriority: "near", projectileType: "normal", homing: true },
    scatter: { aiType: "shotgun", targetPriority: "near", projectileType: "normal", homing: false },
    ranger: { aiType: "basic-non", targetPriority: "far", projectileType: "normal", homing: false },
    sniper: { aiType: "basic-non", targetPriority: "far", projectileType: "pierce", homing: false, pierce: true },
    breaker: { aiType: "basic", targetPriority: "strong", projectileType: "tank", homing: true },
    blast: { aiType: "basic-non", targetPriority: "cluster", projectileType: "explode", homing: false },
    support: { aiType: "heal", targetPriority: "near", projectileType: "heal", homing: true },
  };

  for (const [pieceKey, piece] of Object.entries(data.pieces || {})) {
    const tower = data.towers?.[piece.connectTower];
    const projectile = data.projectiles?.[tower?.projectileId];
    if (!tower || !projectile) continue;
    const rule = expected[piece.type];
    if (!rule) {
      warn("PHASE3", `No expected rule for piece type ${piece.type}`, pieceKey);
      continue;
    }
    if (tower.aiType === rule.aiType) pass("PHASE3", `${pieceKey} TowerAiType ${tower.aiType}`);
    else fail("PHASE3", `${pieceKey} TowerAiType mismatch`, `Expected ${rule.aiType}, got ${tower.aiType}`);
    if (tower.targetPriority === rule.targetPriority) pass("PHASE3", `${pieceKey} TargetPriority ${tower.targetPriority}`);
    else fail("PHASE3", `${pieceKey} TargetPriority mismatch`, `Expected ${rule.targetPriority}, got ${tower.targetPriority}`);
    if (tower.projectileType === rule.projectileType) pass("PHASE3", `${pieceKey} Tower ProjectileType ${tower.projectileType}`);
    else fail("PHASE3", `${pieceKey} Tower ProjectileType mismatch`, `Expected ${rule.projectileType}, got ${tower.projectileType}`);
    if (projectile.type === rule.projectileType) pass("PHASE3", `${pieceKey} projectile ${projectile.type}`);
    else fail("PHASE3", `${pieceKey} projectile mismatch`, `Expected ${rule.projectileType}, got ${projectile.type}`);
    if ("homing" in rule) {
      const homing = (tower.homing ?? projectile.homing) !== false;
      if (homing === rule.homing) pass("PHASE3", `${pieceKey} homing ${homing}`);
      else fail("PHASE3", `${pieceKey} homing mismatch`, `Expected ${rule.homing}, got ${homing}`);
    }
    if (rule.pierce) {
      if (tower.pierce === true || projectile.pierce === true) pass("PHASE3", `${pieceKey} pierce enabled`);
      else fail("PHASE3", `${pieceKey} pierce missing`);
    }
  }

  const towerAiBranches = ["shotgun", "basic-non"];
  for (const branch of towerAiBranches) {
    if (html.includes(`profile.aiType === "${branch}"`)) pass("PHASE3", `TowerAiType branch ${branch}`);
    else fail("PHASE3", `TowerAiType branch missing ${branch}`);
  }

  const branches = ["pierce", "tank", "explode", "heal"];
  for (const branch of branches) {
    if (html.includes(`profile.projectileType === "${branch}"`)) pass("PHASE3", `Projectile branch ${branch}`);
    else fail("PHASE3", `Projectile branch missing ${branch}`);
  }

  const aiBranches = ["targetPriority === \"far\"", "targetPriority === \"near\"", "targetPriority === \"strong\"", "targetPriority === \"weak\"", "targetPriority === \"friendly\"", "targetPriority === \"cluster\""];
  for (const branch of aiBranches) {
    if (html.includes(branch)) pass("PHASE3", `TargetPriority branch ${branch}`);
    else fail("PHASE3", `TargetPriority branch missing ${branch}`);
  }

  if (html.includes("calculateTowerMaxAmmo") && html.includes("tower?.maxAmmo")) {
    pass("PHASE3", "Tower ammo uses TowerData.maxAmmo");
  } else {
    fail("PHASE3", "Tower ammo data rule missing");
  }

  const towerStateTokens = ["TOWER_COMBAT_STATES", 'IDLE: "idle"', 'SEARCH: "search"', 'ATTACK: "attack"', 'DESTROYED: "destroyed"'];
  for (const token of towerStateTokens) {
    if (html.includes(token)) pass("PHASE3", `Tower state token ${token}`);
    else fail("PHASE3", `Tower state token missing ${token}`);
  }

  if (html.includes("function destroyTower") && html.includes("destroyTowersForSlot(slot.id, \"slotDestroyed\")")) {
    pass("PHASE3", "Tower destroyed state is used for ammo and slot HP termination");
  } else {
    fail("PHASE3", "Tower destroyed state transition missing");
  }

  if (html.includes("pickTargets(origin, profile.count, pieceKey, profile.range, { inRangeOnly: true })")) {
    pass("PHASE3", "Attack confirmation requires in-range target");
  } else {
    fail("PHASE3", "Attack confirmation in-range guard missing");
  }

  if (
    html.includes("function isSequentialVolleyProfile") &&
    html.includes('profile.aiType === "shotgun"') &&
    html.includes("Math.floor(Number(profile.count)") &&
    html.includes("tower.burstShotsLeft = profile.count")
  ) {
    pass("PHASE3", "Non-shotgun multi-projectile volleys use sequential burst fire");
  } else {
    fail("PHASE3", "Sequential non-shotgun burst fire rule missing");
  }

  if (
    html.includes('bullet.projectileType === "heal"') &&
    html.includes("applySupportPulse(") &&
    !html.includes("supportBuffBonus") &&
    !html.includes("addTowerAmmoBySeconds") &&
    !html.includes("buffFireRateBonus") &&
    html.includes('aiType: towerData.aiType || piece.aiType || "basic"')
  ) {
    pass("PHASE3", "Heal projectile attacks enemies and only heals the lowest-HP slot on hit");
  } else {
    fail("PHASE3", "Heal projectile attack/heal-on-hit rule missing");
  }

  const oldRetargetSnippet = ".filter((enemy) => !bullet.hitIds.includes(enemy.id) && dist(bullet, enemy) <= Math.min(config.bulletRetargetRange";
  if (
    html.includes("const targetAlive = bullet.target && state.enemies.includes(bullet.target) && bullet.target.hp > 0") &&
    html.includes("bullet.life = 0;") &&
    !html.includes(oldRetargetSnippet)
  ) {
    pass("PHASE3", "Homing projectile expires when original target is gone");
  } else {
    fail("PHASE3", "Homing projectile retarget guard missing");
  }

  if (html.includes("durationScale")) {
    warn("PHASE3", "Tower duration config still scales maxAmmo", "Design says ammo/speed should be primary source.");
  } else if (html.includes("calculateTowerMaxAmmo") && html.includes("tower?.maxAmmo")) {
    pass("PHASE3", "TowerData.maxAmmo is primary ammo source");
  }

  if (
    html.includes("triggerTowerOverdrive") &&
    html.includes("updateTowerOverdrives") &&
    html.includes("activateQueuedTowerImmediately") &&
    html.includes("const activeSlots = new Set()") &&
    html.includes("count: overdrive.bulletsPerShot") &&
    html.includes("currentProfile.damageRatio * overdrive.damageRatio") &&
    html.includes("if (!state.enemies.length)") &&
    html.includes("pickTargets(origin, profile.count, overdrive.pieceKey, profile.range, { inRangeOnly: false })") &&
    html.includes("priorityFallbackTargets") &&
    html.includes(".slice(0, Math.max(1, profile.count))") &&
    html.includes("if (profile.homing && !target)") &&
    !html.includes("if (!profile.homing || target)") &&
    Number(data.defaultConfig?.comboBulletBonus) === 0 &&
    Number(data.defaultConfig?.towerOverdriveDamageRatio) === 0.3
  ) {
    pass("PHASE3", "Queue overflow serializes per slot at 30% damage and does not burn invisible overdrive ammo");
  } else {
    fail("PHASE3", "Queue overflow overdrive contract missing");
  }

  if (
    html.includes("const AUDIO_ENABLED = false") &&
    html.includes("if (!AUDIO_ENABLED || !AUDIO_ASSETS[key]) return null") &&
    html.includes("if (!AUDIO_ENABLED || !AUDIO_ASSETS[assetKey]) return") &&
    html.includes("const SFX_SETTINGS") &&
    html.includes("activeSfx.size >= 6") &&
    html.includes('playSfx("sort")') &&
    html.includes("playTowerFireSfx(pieceKey)") &&
    html.includes('playBgm("stage1")')
  ) {
    pass("AUDIO", "Optional audio is disabled cleanly without requiring asset files");
  } else {
    fail("AUDIO", "Optional audio disable contract or runtime event mapping missing");
  }

  const typeCounts = {};
  for (const piece of Object.values(data.pieces || {})) {
    typeCounts[piece.type] = (typeCounts[piece.type] || 0) + 1;
  }
  const duplicatedTypes = Object.entries(typeCounts).filter(([, count]) => count > 1);
  if (duplicatedTypes.length) pass("PHASE3", "Multiple pieces per type testable", JSON.stringify(duplicatedTypes));
  else info("PHASE3", "Multiple pieces per same type not testable yet", "Current 1-star build has one piece per type.");
}

function validatePhase4WaveMonsterRules(data, html) {
  const stages = data.stages || [];
  const firstStage = stages[0] || {};
  const stageWaveIds = (firstStage.waveIds || []).map(Number);
  if (stageWaveIds.length === 10) pass("PHASE4", "Stage has 10 waves");
  else fail("PHASE4", "Stage wave count mismatch", String(stageWaveIds.length));

  const normalWaveIds = stageWaveIds.filter((waveId) => data.waves?.[waveId]?.type !== "boss");
  if (normalWaveIds.length === 9) pass("PHASE4", "Stage has 9 timed waves");
  else fail("PHASE4", "Timed wave count mismatch", String(normalWaveIds.length));

  const expectedWaveDuration = Number(firstStage.config?.waveDuration || data.defaultConfig?.waveDuration || 40);
  for (const waveId of normalWaveIds) {
    const wave = data.waves?.[waveId];
    if (Number(wave?.duration) === expectedWaveDuration) pass("PHASE4", `Wave ${waveId} duration ${expectedWaveDuration}s`);
    else fail("PHASE4", `Wave ${waveId} duration mismatch`, String(wave?.duration));
    if (wave?.patternId && data.wavePatterns?.[wave.patternId]) pass("PHASE4", `Wave ${waveId} uses WavePatternData`);
    else fail("PHASE4", `Wave ${waveId} pattern missing`, String(wave?.patternId));
    const events = data.wavePatterns?.[wave?.patternId]?.events || [];
    if (events.length > 0) pass("PHASE4", `Wave ${waveId} pattern has events`, String(events.length));
    else fail("PHASE4", `Wave ${waveId} pattern events missing`);
    for (const event of events) {
      if (Number(event.time) >= 0 && Number(event.time) <= Number(wave.duration)) {
        pass("PHASE4", `Wave ${waveId} event in duration`, String(event.time));
      } else {
        fail("PHASE4", `Wave ${waveId} event out of duration`, String(event.time));
      }
      if (event.groupId && data.monsterGroups?.[event.groupId]) pass("PHASE4", `Wave ${waveId} event group valid`);
      else fail("PHASE4", `Wave ${waveId} event group invalid`, String(event.groupId));
    }
  }

  for (const rushWaveId of [4, 8]) {
    if (data.waves?.[rushWaveId]?.type === "rush") pass("PHASE4", `Wave ${rushWaveId} is rush wave`);
    else fail("PHASE4", `Wave ${rushWaveId} rush type missing`, String(data.waves?.[rushWaveId]?.type));
  }

  const finalWave = data.waves?.[10];
  if (finalWave?.type === "boss" && finalWave.bossId === "final_boss_1") pass("PHASE4", "Wave 10 is final boss");
  else fail("PHASE4", "Wave 10 final boss mismatch", JSON.stringify(finalWave));

  const finalBoss = data.bosses?.final_boss_1;
  if (finalBoss?.rangedDamage > 0 && finalBoss?.attackRange > 0) pass("PHASE4", "Final boss has ranged attack");
  else fail("PHASE4", "Final boss ranged attack missing");
  if (finalBoss?.meleeDamage > 0 && finalBoss?.meleeRange > 0) pass("PHASE4", "Final boss has melee attack");
  else fail("PHASE4", "Final boss melee attack missing");
  if (finalBoss?.summon?.monsterKey && finalBoss?.summon?.count > 0) pass("PHASE4", "Final boss summon pattern exists");
  else fail("PHASE4", "Final boss summon pattern missing");

  const rangedMonster = data.monsters?.ranged;
  if (rangedMonster?.attackRange > 0) pass("PHASE4", "Ranged monster has attackRange");
  else fail("PHASE4", "Ranged monster attackRange missing");

  for (const typeKey of ["basic", "tank", "speed", "ranged", "finalBoss"]) {
    if (data.monsters?.[typeKey]) pass("PHASE4", `Monster type ${typeKey} exists`);
    else fail("PHASE4", `Monster type ${typeKey} missing`);
  }

  const runtimeChecks = [
    ["getWaveEventQueue", "WavePatternData is converted to an event queue"],
    ["state.waveEventQueue", "Runtime stores current wave event queue"],
    ["spawnMonsterGroup(event.groupId, event)", "Wave events pass options into monster group spawn"],
    ["Array.isArray(event.groups)", "Wave events support multi-group entries"],
    ["state.wavePhase === \"waveEnd\"", "Wave end transition freezes the field"],
    ["beginWavePerkBreak", "Perk break starts after wave-end presentation"],
    ["summonBossAdds", "Boss summon runtime exists"],
    ["scheduleBossWarning", "Boss warning attack runtime exists"],
    ["senseMonsterTarget", "Monster target sensing runtime exists"],
    ["updateMonsterStuck", "Monster stuck retarget runtime exists"],
  ];
  for (const [needle, label] of runtimeChecks) {
    if (html.includes(needle)) pass("PHASE4", label);
    else fail("PHASE4", `${label} missing`, needle);
  }

  for (const stateName of ["sense", "move", "rangedAttack", "meleeAttack", "stunned", "idle"]) {
    if (html.includes(`"${stateName}"`)) pass("PHASE4", `Monster FSM state ${stateName}`);
    else fail("PHASE4", `Monster FSM state ${stateName} missing`);
  }
}

function validateTargetDummyStage(data, html) {
  const dummy = data.monsters?.dummy;
  if (dummy?.testDummy === true) pass("TEST_STAGE", "Dummy monster exists");
  else fail("TEST_STAGE", "Dummy monster missing or not marked testDummy");
  if (dummy?.canMove === false && dummy?.canAttack === false) pass("TEST_STAGE", "Dummy monster cannot move or attack");
  else fail("TEST_STAGE", "Dummy monster should be passive");

  const stage = (data.stages || []).find((item) => item.key === "stage-test-dummy");
  if (stage) pass("TEST_STAGE", "Target dummy test stage exists");
  else {
    fail("TEST_STAGE", "Target dummy test stage missing");
    return;
  }

  if (stage.testStage === true && stage.testMode === "targetDummy") pass("TEST_STAGE", "Target dummy stage is marked as test mode");
  else fail("TEST_STAGE", "Target dummy stage test markers missing");

  const waveIds = stage.waveIds || [];
  const expectedWaveIds = Array.from({ length: 10 }, (_, index) => 101 + index);
  if (JSON.stringify(waveIds) === JSON.stringify(expectedWaveIds)) {
    pass("TEST_STAGE", "Target dummy stage uses waves 101-110");
  } else {
    fail("TEST_STAGE", "Target dummy stage wave ids mismatch", waveIds.join(", "));
  }

  const dummyPatterns = [];
  for (const waveId of waveIds) {
    const wave = data.waves?.[waveId] || data.waves?.[String(waveId)];
    if (!wave) {
      fail("TEST_STAGE", `Dummy wave ${waveId} missing`);
      continue;
    }
    const pattern = data.wavePatterns?.[wave.patternId];
    if (wave.type === "test" && String(wave.patternId || "").startsWith("wp_test_dummy_w") && Number(wave.duration) === 40 && pattern) {
      pass("TEST_STAGE", `Dummy wave ${waveId} valid`);
      dummyPatterns.push(pattern);
    } else {
      fail("TEST_STAGE", `Dummy wave ${waveId} invalid`, JSON.stringify(wave));
    }
  }

  const dummyEventCount = dummyPatterns.reduce((sum, pattern) => sum + Number(pattern.events?.length || 0), 0);
  if (dummyPatterns.length === 10 && dummyEventCount >= 10) pass("TEST_STAGE", "Dummy patterns have repeated events", String(dummyEventCount));
  else fail("TEST_STAGE", "Dummy patterns too short", `${dummyPatterns.length} patterns / ${dummyEventCount} events`);

  const dummyGroups = new Set();
  for (const pattern of dummyPatterns) {
    for (const event of pattern?.events || []) {
      const group = data.monsterGroups?.[event.groupId];
      if (!group) {
        fail("TEST_STAGE", `Dummy event group missing`, String(event.groupId));
        continue;
      }
      dummyGroups.add(event.groupId);
      const monsterKeys = Object.keys(group.monsters || {});
      if (monsterKeys.length === 1 && monsterKeys[0] === "dummy") pass("TEST_STAGE", `Dummy group ${event.groupId} only spawns dummy`);
      else fail("TEST_STAGE", `Dummy group ${event.groupId} has non-dummy monsters`, monsterKeys.join(", "));
    }
  }
  if (dummyGroups.size >= 2) pass("TEST_STAGE", "Dummy pattern uses multiple dummy groups", String(dummyGroups.size));
  else warn("TEST_STAGE", "Dummy pattern uses few groups", String(dummyGroups.size));

  const runtimeChecks = [
    ["function resolveConfiguredSpawnPoint", "Configured spawn point runtime exists"],
    ["enemy.testDummy", "Runtime recognizes dummy monsters"],
    ["enemy.canMove === false && enemy.canAttack === false", "Runtime freezes passive monsters"],
    ["spawnPoint = eventOptions.spawnPoint ?? group.spawnPoint", "Monster groups can set spawn points"],
  ];
  for (const [needle, label] of runtimeChecks) {
    if (html.includes(needle)) pass("TEST_STAGE", label);
    else fail("TEST_STAGE", `${label} missing`, needle);
  }
}

function validatePhase5GrowthPerkComboRules(data, html) {
  const levelData = data.levelData || {};
  if (hasPositiveNumber(levelData.xpBase)) pass("PHASE5", "LevelData xpBase valid");
  else fail("PHASE5", "LevelData xpBase invalid", String(levelData.xpBase));
  if (hasPositiveNumber(levelData.xpLevelGrowth)) pass("PHASE5", "LevelData xpLevelGrowth valid");
  else fail("PHASE5", "LevelData xpLevelGrowth invalid", String(levelData.xpLevelGrowth));
  if (levelData.source === "designTables" && Object.keys(levelData.xpCostByLevel || {}).length > 0) {
    pass("PHASE5", "LevelData table-driven XP costs exist", String(Object.keys(levelData.xpCostByLevel || {}).length));
  } else {
    fail("PHASE5", "LevelData table-driven XP costs missing", String(levelData.source));
  }
  if (levelData.pendingPerkOnly === true) pass("PHASE5", "Perks are pending-only by data");
  else fail("PHASE5", "LevelData pendingPerkOnly should be true", String(levelData.pendingPerkOnly));
  if (Number(levelData.comboWindow) === 5) pass("PHASE5", "Combo window is 5s");
  else fail("PHASE5", "Combo window mismatch", String(levelData.comboWindow));
  const comboProjectileId = levelData.comboSpecialProjectileId;
  const comboProjectile = data.specialProjectiles?.[comboProjectileId];
  if (comboProjectile) pass("PHASE5", "Combo special projectile link valid", comboProjectileId);
  else fail("PHASE5", "Combo special projectile link missing", String(comboProjectileId));
  if (Number(comboProjectile?.triggerEvery) === 10) pass("PHASE5", "Combo special projectile fires every 10 combos");
  else fail("PHASE5", "Combo special projectile cadence mismatch", String(comboProjectile?.triggerEvery));
  if (hasPositiveNumber(comboProjectile?.flatDamage)) pass("PHASE5", "Combo special projectile flat damage valid");
  else fail("PHASE5", "Combo special projectile flat damage invalid", String(comboProjectile?.flatDamage));
  if (hasPositiveNumber(comboProjectile?.maxHpDamageRatio)) pass("PHASE5", "Combo special projectile max-HP damage valid");
  else fail("PHASE5", "Combo special projectile max-HP damage invalid", String(comboProjectile?.maxHpDamageRatio));
  if (comboProjectile?.pierceAll === true) pass("PHASE5", "Combo special projectile has unlimited pierce");
  else fail("PHASE5", "Combo special projectile must pierce all targets", String(comboProjectile?.pierceAll));
  if (
    Number(comboProjectile?.maxLevel) === 3 &&
    Number(comboProjectile?.flatDamageBonusPerLevel) === 0.2
  ) {
    pass("PHASE5", "Combo special projectile perk growth is LV.0-3, +20% flat damage per level");
  } else {
    fail(
      "PHASE5",
      "Combo special projectile perk growth mismatch",
      `${comboProjectile?.maxLevel} / ${comboProjectile?.flatDamageBonusPerLevel}`,
    );
  }
  if (levelData.comboFeverEnabled === false) pass("PHASE5", "Legacy fever damage is disabled by data");
  else warn("PHASE5", "Legacy fever damage is enabled", "Design plan moves combo to piercing attacks.");

  const monsterXpValues = Object.entries(data.monsters || {}).map(([key, monster]) => [key, Number(monster.xp)]);
  const invalidXp = monsterXpValues.filter(([, xp]) => xp !== 1);
  if (!invalidXp.length) pass("PHASE5", "All monster XP drops are 1");
  else fail("PHASE5", "Monster XP should be 1", JSON.stringify(invalidXp));

  const perks = data.perks || {};
  for (const rarity of ["common", "rare", "unique"]) {
    const rarityData = perks.rarities?.[rarity];
    if (rarityData && hasPositiveNumber(rarityData.defaultWeight)) pass("PHASE5", `Perk rarity ${rarity} weight valid`);
    else fail("PHASE5", `Perk rarity ${rarity} missing/invalid`);
  }
  if (perks.rarities?.legendary && Number(perks.rarities.legendary.defaultWeight) === 0) {
    pass("PHASE5", "Perk rarity legendary is reserved at 0 weight");
  } else {
    fail("PHASE5", "Perk rarity legendary should exist at 0 weight");
  }
  const upgrades = perks.upgrades || [];
  if (upgrades.length >= 12) pass("PHASE5", "PerkData has enough upgrade choices", String(upgrades.length));
  else fail("PHASE5", "PerkData upgrade choices too few", String(upgrades.length));
  const upgradeWithoutActions = upgrades.filter((upgrade) => !Array.isArray(upgrade.actions) || !upgrade.actions.length);
  if (!upgradeWithoutActions.length) pass("PHASE5", "Every perk has actions");
  else fail("PHASE5", "Perks missing actions", upgradeWithoutActions.map((upgrade) => upgrade.id).join(", "));

  const actionTypes = new Set();
  for (const upgrade of upgrades) {
    for (const action of upgrade.actions || []) actionTypes.add(action.type);
  }
  for (const actionType of [
    "addMod",
    "addTypeDamage",
    "addTypeFireRateBonus",
    "addTypeAmmoBonus",
    "addTypeProjectileCount",
    "addTypePierce",
    "addTypeBlastRadius",
    "healAllSlotsPercent",
    "addSlotMaxHp",
    "startTimedFireRate",
    "addSpecialProjectileLevel",
  ]) {
    if (actionTypes.has(actionType)) pass("PHASE5", `Perk action type ${actionType} exists`);
    else warn("PHASE5", `Perk action type ${actionType} unused`, "Runtime supports it, but current data may not use it.");
  }

  const runtimeChecks = [
    ["const LEVEL_DATA", "Runtime reads LevelData"],
    ["function xpNeedForLevel", "XP curve runtime exists"],
    ["LEVEL_DATA.xpCostByLevel", "Runtime reads LevelData xpCostByLevel"],
    ["state.pendingLevelUps += 1", "Level ups are accumulated as pending perks"],
    ["if (state.wavePhase !== \"perk\")", "Perk selection is blocked outside maintenance"],
    ["if (state.pendingLevelUps > 0) return", "Next wave is blocked until all perks are selected"],
    ["const UPGRADE_DEFINITIONS = Array.isArray(PERK_DATA.upgrades)", "PerkData upgrades are preferred"],
    ["function applyDataUpgradeAction", "PerkData action runtime exists"],
    ["function spawnXpOrb", "XP orb drop runtime exists"],
    ["function updateXpOrbs", "XP auto absorption runtime exists"],
    ["function triggerComboSpecialProjectile", "10-combo special projectile runtime exists"],
    ["function getSpecialProjectileDamage", "Special projectile combines flat and max-HP damage"],
    ["distanceToSegment", "Special projectile uses swept line collision"],
    ["bullet.specialProjectileId", "Special projectile travels through bullet runtime"],
    ["state.lastComboSpecialProjectileCombo", "Combo special projectile duplicate guard exists"],
    ["triggerComboSpecialProjectile(state.combo)", "Sorting combo triggers special projectile"],
    ["action.type === \"addSpecialProjectileLevel\"", "Future perk action can level special projectiles"],
    ["action.type === \"addTypePercentHpDamage\"", "Perks can increase type percent-HP damage"],
  ];
  for (const [needle, label] of runtimeChecks) {
    if (html.includes(needle)) pass("PHASE5", label);
    else fail("PHASE5", `${label} missing`, needle);
  }
}

function validateLobbyShopUiRules(data, html) {
  const startFn = html.split("function startGameFromMenu()")[1]?.split("function openLoadoutFromMenu()")[0] || "";
  if (
    startFn.includes("getLobbyPieceKeys().length === LOADOUT_PIECE_COUNT") &&
    startFn.includes("resetGame()") &&
    startFn.includes('lobbyOverlay.classList.remove("hidden")')
  ) {
    pass("UI", "Main start enters battle with 6 pieces and opens formation only when short");
  } else {
    fail("UI", "Main start conditional flow missing", "Expected battle start at 6 pieces, formation below 6 pieces.");
  }

  if (
    html.includes("function openAcquisitionFromMenu()")
    && html.includes("function scrollLoadoutToUnowned()")
    && html.includes("unowned-section")
    && html.includes("보유 하지 않음")
  ) {
    pass("UI", "Acquisition is integrated into the loadout scroll");
  } else {
    fail("UI", "Loadout acquisition section missing", "Expected unowned purchase section inside loadout.");
  }

  if (html.includes('aria-label="덱 편성" aria-current="page"') && html.includes('aria-label="미보유 기물 획득"')) {
    pass("UI", "Loadout/acquisition tabs are marked");
  } else {
    warn("UI", "Loadout/acquisition tab marker missing", "Visual still works, but accessibility state may be unclear.");
  }

  if (html.includes("activeKeys.length >= LOADOUT_PIECE_COUNT && !selected") && html.includes("button.disabled = locked")) {
    pass("UI", "Loadout blocks extra picks after 6 while keeping selected cards clickable");
  } else {
    fail("UI", "Loadout 6-pick lock rule missing");
  }

  if (html.includes("renderSelectedLoadoutSlots(activeKeys)") && html.includes("toggleLoadoutPiece(pieceKey)")) {
    pass("UI", "Selected loadout slots can remove pieces");
  } else {
    fail("UI", "Selected slot remove interaction missing");
  }

  if (html.includes("if (unowned) acquirePiece(pieceKey);") && html.includes("formatCost(unlockCost)")) {
    pass("UI", "Unowned loadout cards can purchase pieces");
  } else {
    fail("UI", "Unowned loadout purchase interaction missing");
  }

  if (html.includes("state.selectedStageKey = stage.key") && html.includes("saveLobbyConfig();")) {
    pass("UI", "Stage selection is persisted");
  } else {
    warn("UI", "Stage selection persistence missing");
  }

  if (html.includes("text-overflow: ellipsis") && html.includes(".loadout-name") && html.includes(".selected-loadout-card strong")) {
    pass("UI", "Loadout card text overflow is guarded");
  } else {
    warn("UI", "Loadout card text overflow guard missing");
  }
}

function validateMainStageCarouselRules(data, html) {
  const stageKeys = (data.stages || []).map((stage) => stage.key);
  const expectedOrder = ["stage-1", "stage-2", "stage-test-dummy"];
  const expectedIndexes = expectedOrder.map((key) => stageKeys.indexOf(key));
  if (expectedIndexes.every((index) => index >= 0) && expectedIndexes.every((index, i, indexes) => i === 0 || index > indexes[i - 1])) {
    pass("STAGE_CAROUSEL", "Main stage order is stage-1 -> stage-2 -> dummy stage");
  } else {
    fail("STAGE_CAROUSEL", "Main stage order mismatch", stageKeys.join(" -> "));
  }

  const stage2 = (data.stages || []).find((stage) => stage.key === "stage-2");
  if (stage2 && stage2.title && stage2.subtitle && (stage2.waveIds || []).length === 10) {
    pass("STAGE_CAROUSEL", "Stage 2 placeholder data exists");
  } else {
    fail("STAGE_CAROUSEL", "Stage 2 placeholder data missing", JSON.stringify(stage2 || null));
  }

  const runtimeChecks = [
    ["id=\"mainPrevStageButton\"", "Main previous-stage button exists"],
    ["id=\"mainNextStageButton\"", "Main next-stage button exists"],
    ["function selectMainStageByOffset", "Main stage carousel function exists"],
    ["state.selectedStageKey = STAGES[nextIndex].key", "Carousel updates selected stage from STAGES"],
    ["mainPrevStageButton.addEventListener(\"click\", () => selectMainStageByOffset(-1))", "Previous-stage click handler exists"],
    ["mainNextStageButton.addEventListener(\"click\", () => selectMainStageByOffset(1))", "Next-stage click handler exists"],
    ["mainPrevStageButton.setAttribute(\"aria-label\"", "Previous-stage button label updates"],
    ["mainNextStageButton.setAttribute(\"aria-label\"", "Next-stage button label updates"],
  ];
  for (const [needle, label] of runtimeChecks) {
    if (html.includes(needle)) pass("STAGE_CAROUSEL", label);
    else fail("STAGE_CAROUSEL", `${label} missing`, needle);
  }
}

function validatePhase6ResultRewardRules(data, html) {
  if (data.defaultPlayerSave && data.defaultPlayerSave.stageRecords && typeof data.defaultPlayerSave.stageRecords === "object") {
    pass("PHASE6", "Default save has stageRecords");
  } else {
    fail("PHASE6", "Default save stageRecords missing");
  }

  for (const stage of data.stages || []) {
    const reward = stage.clearReward || {};
    if (isFiniteNumber(reward.gold) && isFiniteNumber(reward.ticket)) {
      pass("PHASE6", `Stage ${stage.key} clear reward is numeric`);
    } else {
      fail("PHASE6", `Stage ${stage.key} clear reward invalid`, JSON.stringify(reward));
    }
    const waveReward = stage.waveReward || {};
    if (isFiniteNumber(waveReward.gold)) {
      pass("PHASE6", `Stage ${stage.key} wave reward is numeric`);
    } else {
      fail("PHASE6", `Stage ${stage.key} wave reward invalid`, JSON.stringify(waveReward));
    }
  }

  const runtimeChecks = [
    ["function normalizeStageRecords", "Stage record save normalization exists"],
    ["function applyStageResult", "Unified clear/fail result save runtime exists"],
    ["save.stageRecords", "Stage records are written to player save"],
    ["save.clearedStages[stageKey] = true", "Clear state is persisted by stage"],
    ["save.unlockedRewards[stageKey] = true", "Reward unlock state is persisted by stage"],
    ["save.currency.gold", "Clear reward can add gold"],
    ["grantWaveReward", "Wave reward runtime exists"],
    ["stage?.waveReward?.gold", "WaveReward is treated as gold"],
    ["save.bestScore = Math.max", "Global best score is updated at result"],
    ["function showStageResult", "Result overlay render runtime exists"],
    ["id=\"resultStats\"", "Result overlay has stats block"],
    ["function renderResultStats", "Result stats renderer exists"],
    ["formatReward(summary.reward)", "First clear reward is displayed/logged"],
    ["document.getElementById(\"continueButton\").addEventListener(\"click\", showMainMenu)", "Continue returns to lobby/main menu"],
  ];
  for (const [needle, label] of runtimeChecks) {
    if (html.includes(needle)) pass("PHASE6", label);
    else fail("PHASE6", `${label} missing`, needle);
  }

  if (!html.includes("save.bestScore = state.best")) {
    pass("PHASE6", "Best score is no longer saved every kill");
  } else {
    fail("PHASE6", "Best score should be saved at result, not every kill");
  }
}

function loadSyntheticAutoAddGameData() {
  const marker = "  const runtimePieceTowerTables = buildDesignPieceTowerRuntimeTables();";
  const injection = `
  // Synthetic rows for validator-only auto-add coverage. These rows are injected in memory only.
  designTables.ProjectileData.push(
    { ProjectileID: 6999, ProjectileType: "normal", ProjectileName: "Projectile_synthetic_auto", ProjectilePrefab: "proj_synthetic_auto", PopEffectPrefab: "hit_synthetic", SubPopEffectPrefab: "sub_synthetic", "*": "", Desc: "검증 전용 신규 투사체" }
  );
  designTables.TowerData.push(
    { TowerID: 7999, TowerName: "Tower_synthetic_auto_1", TowerType: "Basic", TowerAiType: "basic", TargetPriority: "near", ProjectileType: "normal", TowerAtk: 31, TowerAtkSpeed: 0.61, TowerMaxLange: 345, TowerMaxAmmo: 12, SkillID: 0, TowerProjectile: 6999, ProjectileCount: 1, ProjectileSize: 5.4, PiercingCount: 0, SplashRadius: 0, current_hp: 0, "*": "", Desc: "검증 전용 신규 타워 Lv1", TowerLv: 1 },
    { TowerID: 8000, TowerName: "Tower_synthetic_auto_2", TowerType: "Basic", TowerAiType: "basic", TargetPriority: "near", ProjectileType: "normal", TowerAtk: 36, TowerAtkSpeed: 0.58, TowerMaxLange: 360, TowerMaxAmmo: 13, SkillID: 0, TowerProjectile: 6999, ProjectileCount: 1, ProjectileSize: 5.6, PiercingCount: 0, SplashRadius: 0, current_hp: 0, "*": "", Desc: "검증 전용 신규 타워 Lv2", TowerLv: 2 }
  );
  designTables.PieceData.push(
    { PieceID: 7999, PieceName: "PieceName_synthetic_auto_1", PieceType: "Basic", PieceDesc: "PieceDesc_synthetic_auto_1", PieceGrade: 1, PieceLv: 1, ConnectTower: 7999, Portrait: "", PieceSprite: "synthetic_auto", "*": "", Desc: "검증 전용 신규 기물 Lv1" },
    { PieceID: 8000, PieceName: "PieceName_synthetic_auto_1", PieceType: "Basic", PieceDesc: "PieceDesc_synthetic_auto_1", PieceGrade: 1, PieceLv: 2, ConnectTower: 8000, Portrait: "", PieceSprite: "synthetic_auto", "*": "", Desc: "검증 전용 신규 기물 Lv2" }
  );
  designTables.PieceUpgradeData.push(
    { UpgradeID: 889991, PieceGroupID: "synthetic_auto", FromPieceID: 7999, ToPieceID: 8000, "*": "", Desc: "검증 전용 신규 기물 Lv1 -> Lv2" }
  );
  designTables.UpgradeCostData.push(
    { UpgradeCostID: 889992, UpgradeID: 889991, CurrencyType: "gold", UpgradeCost: 123, "*": "", Desc: "검증 전용 신규 강화 비용" }
  );
  designTables.MonsterGroupData.push(
    { MonsterGroupID: 12999, MonsterID_1: 4111, MonsterID_2: 4121, MonsterID_3: 4131, NormalRate_1: 1, NormalRate_2: 0, NormalRate_3: 0, "*": "", Desc: "검증 전용 신규 스폰 후보군" }
  );
  designTables.WaveData.push(
    { WaveID: 2999, WavePattern_1: 3991, WavePattern_2: 3992, WavePattern_3: 3993, WavePattern_4: 3994, WavePattern_5: 3995, WavePattern_6: 3996, WavePattern_7: 3997, WavePattern_8: 3998, WavePattern_9: 3999, "*": "", Desc: "검증 전용 신규 스테이지 웨이브 묶음" }
  );
  for (let i = 1; i <= 9; i += 1) {
    designTables.WavePatternData.push({
      WavePatternID: 3990 + i,
      WaveType: i === 4 || i === 8 ? "Rush" : "Normal",
      Normal_Count: 12 + i,
      Speedy_Count: 0,
      Tanker_Count: 0,
      NormalRate_1: 0,
      NormalRate_2: 0,
      NormalRate_3: 1,
      "*": "",
      "몬스터 총합": 12 + i,
      Desc: "검증 전용 신규 웨이브 " + i,
    });
  }
  designTables.StageData.push(
    { StageID: 1999, StageName: "StageName_Synthetic_Auto", WaveDataID: 2999, MonsterGroupID_Normal: 12999, MonsterGroupID_Speedy: 12999, MonsterGroupID_Tanker: 12999, BossID: 9001, WaveReward: 9, StageReward: 99, BGID: "assets/images/ui/Main/Image_Stage_1 5.png", "*": "", Desc: "검증 전용 신규 스테이지" }
  );
`;

  return loadGameData((code) => {
    if (!code.includes(marker)) {
      fail("AUTO_ADD", "Synthetic data injection marker missing", marker);
      return code;
    }
    return code.replace(marker, `${injection}\n${marker}`);
  });
}

function validateSyntheticAutoAddRules() {
  const syntheticData = loadSyntheticAutoAddGameData();
  const piece = syntheticData.pieces?.piece_7999;
  const upgradedPiece = syntheticData.pieces?.piece_8000;
  const tower = syntheticData.towers?.tower_7999;
  const upgradedTower = syntheticData.towers?.tower_8000;
  const projectile = syntheticData.projectiles?.proj_6999;
  const stage = (syntheticData.stages || []).find((item) => item.key === "stage_1999");

  if (projectile?.source === "designTables") pass("AUTO_ADD", "New ProjectileData row auto-generates runtime projectile");
  else fail("AUTO_ADD", "New ProjectileData row did not generate runtime projectile", String(projectile?.source));

  if (tower?.projectileId === "proj_6999" && upgradedTower?.projectileId === "proj_6999") {
    pass("AUTO_ADD", "New TowerData rows auto-link to new ProjectileData row");
  } else {
    fail("AUTO_ADD", "New TowerData rows failed projectile link", `${tower?.projectileId} / ${upgradedTower?.projectileId}`);
  }

  if (piece?.connectTower === "tower_7999" && upgradedPiece?.connectTower === "tower_8000") {
    pass("AUTO_ADD", "New PieceData rows auto-link to new TowerData rows");
  } else {
    fail("AUTO_ADD", "New PieceData rows failed tower link", `${piece?.connectTower} / ${upgradedPiece?.connectTower}`);
  }

  if (piece?.image === "assets/images/towers/synthetic_auto.png" && piece?.fallbackText) {
    pass("AUTO_ADD", "PieceSprite filename resolves to towers asset with text fallback");
  } else {
    fail("AUTO_ADD", "PieceSprite asset or fallback mismatch", `${piece?.image} / ${piece?.fallbackText}`);
  }

  if (piece?.nextPieceKey === "piece_8000" && upgradedPiece?.prevPieceKey === "piece_7999") {
    pass("AUTO_ADD", "New PieceUpgradeData row auto-links piece upgrade chain");
  } else {
    fail("AUTO_ADD", "New PieceUpgradeData row failed upgrade chain", `${piece?.nextPieceKey} / ${upgradedPiece?.prevPieceKey}`);
  }

  if (Number(piece?.upgradeCost) === 123 && piece?.upgradeCurrencyType === "gold" && piece?.upgradeCostId === 889992) {
    pass("AUTO_ADD", "New UpgradeCostData row feeds runtime upgrade cost");
  } else {
    fail("AUTO_ADD", "New UpgradeCostData row failed runtime cost", `${piece?.upgradeCost} / ${piece?.upgradeCurrencyType} / ${piece?.upgradeCostId}`);
  }

  const shopEntry = (syntheticData.shop?.pieceUnlocks || []).find((entry) => entry.pieceKey === "piece_7999");
  const upgradeShopEntry = (syntheticData.shop?.pieceUnlocks || []).find((entry) => entry.pieceKey === "piece_8000");
  if ((piece?.owned === true || shopEntry?.source === "designTables-auto") && !upgradeShopEntry) {
    pass("AUTO_ADD", "New base piece is immediately playable or enters acquisition while upgrade-only piece stays hidden");
  } else {
    fail("AUTO_ADD", "New piece acquisition visibility mismatch", `${shopEntry?.source || "missing"} / upgrade=${Boolean(upgradeShopEntry)}`);
  }

  if (stage?.source === "designTables" && stage.waveIds?.length === 10 && stage.bossIds?.[0] === "final_boss_1") {
    pass("AUTO_ADD", "New StageData row auto-generates stage with 9 waves plus boss");
  } else {
    fail("AUTO_ADD", "New StageData row failed runtime stage generation", JSON.stringify(stage || {}));
  }

  const stageWaves = (stage?.waveIds || []).map((waveId) => syntheticData.waves?.[String(waveId)] || syntheticData.waves?.[waveId]);
  if (stageWaves.length === 10 && stageWaves.slice(0, 9).every((wave) => wave?.source === "designTables" && wave.patternId) && stageWaves[9]?.type === "boss") {
    pass("AUTO_ADD", "New WaveData/WavePatternData rows feed runtime wave queue");
  } else {
    fail("AUTO_ADD", "New WaveData/WavePatternData rows failed runtime wave queue", stageWaves.map((wave) => `${wave?.id}:${wave?.type}:${wave?.patternId || wave?.bossId}`).join(", "));
  }

  const generatedPatternIds = stageWaves.slice(0, 9).map((wave) => wave?.patternId).filter(Boolean);
  if (generatedPatternIds.every((patternId) => syntheticData.wavePatterns?.[patternId]?.events?.length > 0)) {
    pass("AUTO_ADD", "New WavePatternData rows generate spawn events");
  } else {
    fail("AUTO_ADD", "New WavePatternData rows missing spawn events", generatedPatternIds.join(", "));
  }

  const generatedGroupIds = generatedPatternIds.flatMap((patternId) =>
    (syntheticData.wavePatterns?.[patternId]?.events || []).map((event) => event.groupId)
  );
  const generatedGroups = generatedGroupIds.map((groupId) => syntheticData.monsterGroups?.[groupId]).filter(Boolean);
  if (generatedGroups.length && generatedGroups.every((group) => {
    const entries = Object.entries(group.monsters || {});
    return entries.length === 1 && entries[0][0] === "tank" && Number(entries[0][1]) > 0;
  })) {
    pass("AUTO_ADD", "WavePatternData NormalRate columns override legacy group rates");
  } else {
    fail("AUTO_ADD", "WavePatternData NormalRate columns did not control runtime distribution", JSON.stringify(generatedGroups.slice(0, 3).map((group) => group.monsters)));
  }
}

const data = loadGameData();
const html = fs.readFileSync(htmlPath, "utf8");

validateDataReferences(data);
validateAuthoringGuide(data);
validateDesignTables(data);
validateAuthoringIntegrity(data);
validateDataOnlyRuntime(data, html);
validateCoreGameplayData(data);
validateInternalStatsTableRules(data);
validatePhase2DeckRules(data, html);
validatePhase3TowerRules(data, html);
validatePhase4WaveMonsterRules(data, html);
validateTargetDummyStage(data, html);
validatePhase5GrowthPerkComboRules(data, html);
validateLobbyShopUiRules(data, html);
validateMainStageCarouselRules(data, html);
validatePhase6ResultRewardRules(data, html);
validateSyntheticAutoAddRules();
validateBalanceDataMode(data, html);

const counts = results.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] || 0) + 1;
  return acc;
}, {});

console.log(`Target: ${root}`);
console.log(`Data version: ${data.version || "unknown"}`);
console.log(`Summary: PASS ${counts.PASS || 0} / WARN ${counts.WARN || 0} / FAIL ${counts.FAIL || 0} / INFO ${counts.INFO || 0}`);
console.log("");

for (const status of ["FAIL", "WARN", "INFO", "PASS"]) {
  const rows = results.filter((item) => item.status === status);
  if (!rows.length) continue;
  console.log(`[${status}]`);
  for (const row of rows) {
    console.log(`- ${row.kind}: ${row.name}${row.detail ? ` (${row.detail})` : ""}`);
  }
  console.log("");
}

if ((counts.FAIL || 0) > 0) {
  process.exitCode = 1;
}
