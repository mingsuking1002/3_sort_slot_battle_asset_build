import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { GAME_DATA_SCHEMA, GAME_DATA_TABLE_ORDER } from "./game-data-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    inputDir: "",
    sheetUrl: "",
    outputPath: path.join(root, "assets", "data", "generated", "game-data.generated.js"),
    reportPath: path.join(root, "docs", "generated", "DATA_TABLE_SYNC_REPORT.md"),
    checkOnly: false,
    strict: false,
    failOnDiff: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") options.inputDir = path.resolve(root, argv[++index] || "");
    else if (arg === "--sheet") options.sheetUrl = String(argv[++index] || "").trim();
    else if (arg === "--output") options.outputPath = path.resolve(root, argv[++index] || "");
    else if (arg === "--report") options.reportPath = path.resolve(root, argv[++index] || "");
    else if (arg === "--check") options.checkOnly = true;
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--fail-on-diff") options.failOnDiff = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`알 수 없는 인자입니다: ${arg}`);
  }

  if (options.inputDir && options.sheetUrl) throw new Error("--input과 --sheet는 동시에 사용할 수 없습니다.");

  return options;
}

function printHelp() {
  console.log(`데이터 테이블 -> JS 읽기 전용 동기화 도구

사용법:
  node tools/sync-game-data.mjs
  node tools/sync-game-data.mjs --input data-tables
  node tools/sync-game-data.mjs --sheet "https://docs.google.com/spreadsheets/d/.../edit"

옵션:
  --input <dir>       CSV 파일 폴더. 없으면 현재 game-data.js를 기준 스냅샷으로 사용
  --sheet <url|id>    Google Sheets 링크 또는 스프레드시트 ID. 탭 이름을 테이블명으로 사용
  --output <file>     생성 JS 경로
  --report <file>     Markdown 차이 보고서 경로
  --check             파일을 쓰지 않고 검사만 실행
  --strict            모든 필수 테이블을 CSV 또는 Google Sheets 탭으로 제공하지 않으면 실패
  --fail-on-diff      현재 designTables와 값 차이가 있으면 실패
`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadCurrentGameData() {
  const dataPath = path.join(root, "assets", "data", "game-data.js");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(dataPath, "utf8"), context, { filename: dataPath });
  return clone(context.window.GAME_DATA || {});
}

function parseCsv(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeCell(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function parseTypedValue(rawValue, definition) {
  const raw = normalizeCell(rawValue);
  if (raw === "") return { value: "" };

  const numericText = raw.replace(/,/g, "");
  if (definition.type === "integer") {
    if (!/^[+-]?\d+(?:\.0+)?$/.test(numericText)) {
      return { value: raw, error: `정수 형식이 아닙니다: ${raw}` };
    }
    return { value: Number(numericText) };
  }

  if (definition.type === "number") {
    const isPercent = numericText.endsWith("%");
    const value = Number(isPercent ? numericText.slice(0, -1) : numericText);
    if (!Number.isFinite(value)) return { value: raw, error: `숫자 형식이 아닙니다: ${raw}` };
    return { value: isPercent ? value / 100 : value };
  }

  if (definition.type === "boolean") {
    const normalized = raw.toLowerCase();
    if (["true", "1", "y", "yes"].includes(normalized)) return { value: true };
    if (["false", "0", "n", "no"].includes(normalized)) return { value: false };
    return { value: raw, error: `불리언 형식이 아닙니다: ${raw}` };
  }

  if (definition.type === "scalar") {
    if (/^[+-]?\d+(?:\.\d+)?$/.test(numericText)) return { value: Number(numericText) };
    return { value: raw };
  }

  if (definition.type === "json-string") {
    try {
      JSON.parse(raw);
      return { value: raw };
    } catch {
      return { value: raw, error: `JSON 형식이 아닙니다: ${raw}` };
    }
  }

  return { value: raw };
}

function findHeaderRow(rows, contract) {
  const expected = new Set(Object.keys(contract.columns));
  const primaryKeyColumns = contract.primaryKeyColumns || [contract.primaryKey];
  const aliases = contract.inputHeaderAliases || {};
  let best = null;
  rows.slice(0, 20).forEach((row, rowIndex) => {
    const sourceHeaders = row.map((value) => {
      const header = normalizeCell(value);
      return aliases[header] || header;
    });
    const commentBoundary = sourceHeaders.indexOf("*");
    const headers = commentBoundary >= 0
      ? sourceHeaders.slice(0, commentBoundary)
      : sourceHeaders;
    if (!primaryKeyColumns.every((columnName) => headers.includes(columnName))) return;
    const score = headers.filter((header) => expected.has(header)).length;
    if (!best || score > best.score) best = { rowIndex, headers, score, commentBoundary };
  });
  return best;
}

function contractRowKey(row, contract) {
  const primaryKeyColumns = contract.primaryKeyColumns || [contract.primaryKey];
  const values = primaryKeyColumns.map((columnName) => row?.[columnName]);
  if (values.every((value) => !isBlank(value))) return values.map(String).join("::");
  if (contract.legacyPrimaryKey && !isBlank(row?.[contract.legacyPrimaryKey])) {
    return `legacy:${row[contract.legacyPrimaryKey]}`;
  }
  return "";
}

function parseCsvTableText(csvText, tableName, contract, options = {}) {
  const rows = parseCsv(csvText);
  const header = findHeaderRow(rows, contract);
  if (!header) {
    return {
      rows: [],
      headers: [],
      headerRow: 0,
      errors: [`${contract.primaryKey}가 있는 헤더 행을 찾지 못했습니다.`],
      unknownHeaders: [],
    };
  }

  const expectedColumns = Object.keys(contract.columns);
  const headerIndexes = new Map();
  header.headers.forEach((name, index) => {
    if (name && !headerIndexes.has(name)) headerIndexes.set(name, index);
  });

  const documentationHeaders = new Set([
    ...GAME_DATA_SCHEMA.documentationHeaders,
    ...(contract.ignoredInputHeaders || []),
  ]);
  const unknownHeaders = header.headers.filter(
    (name) => name && !expectedColumns.includes(name) && !documentationHeaders.has(name)
  );
  const errors = [];
  const parsedRows = [];
  const pkIndex = headerIndexes.get(contract.primaryKey);
  const primaryKeyType = contract.columns[contract.primaryKey]?.type;
  const seenPrimaryKeyFill = new Map();

  for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const sourceRow = rows[rowIndex];
    const rawPrimaryKey = normalizeCell(sourceRow[pkIndex]);
    if (!rawPrimaryKey || rawPrimaryKey === contract.primaryKey) continue;
    const numericPrimaryKey = rawPrimaryKey.replace(/,/g, "");
    const primaryKeyLooksNumeric = /^[+-]?\d+(?:\.0+)?$/.test(numericPrimaryKey);
    if (options.trimAuxiliaryRows && parsedRows.length && ["integer", "number"].includes(primaryKeyType) && !primaryKeyLooksNumeric) break;

    const expectedFillCount = expectedColumns.reduce((count, columnName) => {
      const sourceIndex = headerIndexes.get(columnName);
      return count + (sourceIndex !== undefined && normalizeCell(sourceRow[sourceIndex]) !== "" ? 1 : 0);
    }, 0);
    const previousFillCount = seenPrimaryKeyFill.get(rawPrimaryKey);
    if (options.trimAuxiliaryRows && previousFillCount && expectedFillCount < previousFillCount * 0.75) break;

    const parsedRow = {};
    for (const columnName of expectedColumns) {
      const sourceIndex = headerIndexes.get(columnName);
      const result = sourceIndex === undefined
        ? { value: "" }
        : parseTypedValue(sourceRow[sourceIndex], contract.columns[columnName]);
      parsedRow[columnName] = result.value;
      if (result.error) errors.push(`${tableName} ${rowIndex + 1}행 ${columnName}: ${result.error}`);
    }
    parsedRows.push(parsedRow);
    seenPrimaryKeyFill.set(rawPrimaryKey, expectedFillCount);
  }

  return {
    rows: parsedRows,
    headers: header.headers.filter(Boolean),
    headerRow: header.rowIndex + 1,
    errors,
    unknownHeaders,
  };
}

function parseCsvTable(filePath, tableName, contract) {
  return parseCsvTableText(fs.readFileSync(filePath, "utf8"), tableName, contract);
}

function parseSpreadsheetId(value) {
  const source = String(value || "").trim();
  const urlMatch = source.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const spreadsheetId = urlMatch?.[1] || (/^[a-zA-Z0-9_-]+$/.test(source) ? source : "");
  if (!spreadsheetId) throw new Error(`Google Sheets 링크 또는 ID를 확인할 수 없습니다: ${source}`);
  return spreadsheetId;
}

async function fetchGoogleSheetTables(sheetUrl, issues) {
  const spreadsheetId = parseSpreadsheetId(sheetUrl);
  const sheetSource = Object.values(GAME_DATA_SCHEMA.sources || {}).find(
    (source) => source.spreadsheetId === spreadsheetId && source.tabGids
  );
  if (!sheetSource) {
    throw new Error(`등록되지 않은 Google Sheets입니다. tools/game-data-schema.mjs에 탭 gid 매핑을 추가하세요: ${spreadsheetId}`);
  }
  const entries = await Promise.all(GAME_DATA_TABLE_ORDER.map(async (tableName) => {
    const contract = GAME_DATA_SCHEMA.tables[tableName];
    if (contract.status !== "active") return [tableName, null];
    const gid = sheetSource.tabGids[tableName];
    if (gid === undefined || gid === null) return [tableName, null];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    let response;
    try {
      response = await fetch(exportUrl, { redirect: "follow" });
    } catch (error) {
      throw new Error(`Google Sheets 연결 실패: ${error.message}`);
    }
    if (response.status === 400 || response.status === 404) return [tableName, null];
    if (!response.ok) {
      throw new Error(`Google Sheets ${tableName} 탭 다운로드 실패: HTTP ${response.status}`);
    }
    const csvText = await response.text();
    if (/^\s*<!doctype html/i.test(csvText) || /^\s*<html/i.test(csvText)) {
      throw new Error("Google Sheets가 CSV 대신 로그인/HTML 페이지를 반환했습니다. 링크 공유 권한을 확인하세요.");
    }
    const parsed = parseCsvTableText(csvText, tableName, contract, { trimAuxiliaryRows: true });
    parsed.errors.forEach((message) => issues.push({ severity: "ERROR", table: tableName, message }));
    return [tableName, {
      ...parsed,
      sourceKind: "Google Sheet",
      sourceLabel: `${tableName} 탭 (gid=${gid})`,
      spreadsheetId,
    }];
  }));
  return new Map(entries.filter(([, parsed]) => parsed));
}

function walkCsvFiles(directory) {
  if (!fs.existsSync(directory)) throw new Error(`CSV 입력 폴더가 없습니다: ${directory}`);
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkCsvFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) files.push(fullPath);
  }
  return files;
}

function resolveTableName(filePath) {
  const stem = path.basename(filePath, path.extname(filePath)).trim().toLowerCase();
  const names = [...GAME_DATA_TABLE_ORDER].sort((left, right) => right.length - left.length);
  return names.find((name) => {
    const target = name.toLowerCase();
    return stem === target
      || stem.endsWith(` - ${target}`)
      || stem.endsWith(`_${target}`)
      || stem.endsWith(` ${target}`);
  }) || "";
}

function currentHeadersForTable(gameData, tableName, rows) {
  const declared = gameData.designTableSchema?.tables?.[tableName]?.columns;
  if (Array.isArray(declared)) return [...declared];
  return [...new Set((rows || []).flatMap((row) => Object.keys(row || {})))];
}

async function buildCandidate(gameData, options, issues) {
  const currentTables = gameData.designTables || {};
  const candidate = { schemaVersion: GAME_DATA_SCHEMA.version };
  const sourceInfo = {};
  const parsedByTable = new Map();

  if (options.inputDir) {
    const tableFiles = new Map();
    for (const filePath of walkCsvFiles(options.inputDir)) {
      const tableName = resolveTableName(filePath);
      if (!tableName) {
        issues.push({ severity: "INFO", table: "-", message: `인식하지 않은 CSV: ${path.basename(filePath)}` });
        continue;
      }
      if (tableFiles.has(tableName)) {
        issues.push({
          severity: "ERROR",
          table: tableName,
          message: `같은 테이블로 인식된 CSV가 2개 이상입니다: ${path.basename(tableFiles.get(tableName))}, ${path.basename(filePath)}`,
        });
        continue;
      }
      tableFiles.set(tableName, filePath);
    }

    for (const [tableName, filePath] of tableFiles) {
      const parsed = parseCsvTable(filePath, tableName, GAME_DATA_SCHEMA.tables[tableName]);
      parsedByTable.set(tableName, {
        ...parsed,
        sourceKind: "CSV",
        sourceLabel: path.basename(filePath),
      });
      parsed.errors.forEach((message) => issues.push({ severity: "ERROR", table: tableName, message }));
    }
  }

  if (options.sheetUrl) {
    const sheetTables = await fetchGoogleSheetTables(options.sheetUrl, issues);
    for (const [tableName, parsed] of sheetTables) parsedByTable.set(tableName, parsed);
  }

  for (const tableName of GAME_DATA_TABLE_ORDER) {
    const parsed = parsedByTable.get(tableName);
    if (parsed) {
      candidate[tableName] = parsed.rows;
      sourceInfo[tableName] = {
        kind: parsed.sourceKind || "CSV",
        label: parsed.sourceLabel || tableName,
        headers: parsed.headers,
        headerRow: parsed.headerRow,
        unknownHeaders: parsed.unknownHeaders,
        spreadsheetId: parsed.spreadsheetId || "",
      };
      continue;
    }

    const contract = GAME_DATA_SCHEMA.tables[tableName];
    if ((options.inputDir || options.sheetUrl) && contract.status === "excluded") {
      candidate[tableName] = [];
      sourceInfo[tableName] = {
        kind: "미제공",
        label: "파싱 범위 제외",
        headers: [],
        headerRow: 0,
        unknownHeaders: [],
      };
      continue;
    }

    const currentRows = Array.isArray(currentTables[tableName]) ? clone(currentTables[tableName]) : [];
    candidate[tableName] = currentRows;
    sourceInfo[tableName] = {
      kind: currentTables[tableName] ? "내장 fallback" : "미제공",
      label: currentTables[tableName] ? "assets/data/game-data.js" : "-",
      headers: currentHeadersForTable(gameData, tableName, currentRows),
      headerRow: 0,
      unknownHeaders: [],
    };
  }

  return { candidate, sourceInfo };
}

function applyBalanceProfileAdapters(candidate, sourceInfo, issues) {
  if (isImportedSource(sourceInfo.WaveData) && isImportedSource(sourceInfo.WavePatternData)) {
    const patternRows = candidate.WavePatternData || [];
    const rushRows = patternRows.filter((row) => {
      const waveType = String(row.WaveType || "").trim().toLowerCase();
      const rushFlag = String(row.isRush || "").trim().toLowerCase();
      return waveType === "rush" || waveType === "4" || (rushFlag !== "" && !["0", "false", "n", "no"].includes(rushFlag));
    });
    rushRows.forEach((row) => {
      row.WaveType = "Rush";
    });

    const validPatternIds = new Set(patternRows.map((row) => String(row.WavePatternID)));
    const missingPatternIds = [];
    for (const waveRow of candidate.WaveData || []) {
      for (let index = 1; index <= 9; index += 1) {
        const value = waveRow[`WavePattern_${index}`];
        if (isBlank(value) || validPatternIds.has(String(value)) || missingPatternIds.includes(String(value))) continue;
        missingPatternIds.push(String(value));
      }
    }

    if (missingPatternIds.length > 0 && missingPatternIds.length === rushRows.length) {
      const rushIdByAlias = new Map(missingPatternIds.map((aliasId, index) => [aliasId, rushRows[index].WavePatternID]));
      let remappedCount = 0;
      for (const waveRow of candidate.WaveData || []) {
        for (let index = 1; index <= 9; index += 1) {
          const columnName = `WavePattern_${index}`;
          const mappedId = rushIdByAlias.get(String(waveRow[columnName]));
          if (mappedId === undefined) continue;
          waveRow[columnName] = mappedId;
          remappedCount += 1;
        }
      }
      issues.push({
        severity: "INFO",
        table: "WaveData",
        message: `러시 패턴 별칭 ${missingPatternIds.join(", ")}을 isRush 행 ${rushRows.map((row) => row.WavePatternID).join(", ")}에 연결했습니다 (${remappedCount}곳).`,
      });
    }
  }

  if (isImportedSource(sourceInfo.TowerData)) {
    const sourceRows = Array.isArray(candidate.TowerData) ? candidate.TowerData : [];
    let derivedLevelCount = 0;
    for (const row of sourceRows) {
      if (Number(row.TowerLv) > 0 || !Number.isInteger(Number(row.TowerID))) continue;
      const derivedLevel = Math.abs(Number(row.TowerID)) % 100;
      if (derivedLevel <= 0) continue;
      row.TowerLv = derivedLevel;
      derivedLevelCount += 1;
    }
    if (derivedLevelCount > 0) {
      issues.push({
        severity: "INFO",
        table: "TowerData",
        message: `TowerLv가 없는 ${derivedLevelCount}개 행을 TowerID 마지막 두 자리에서 파생했습니다.`,
      });
    }
    const completeRows = sourceRows.filter((row) => (
      Number(row.TowerLv) > 0
      && Number(row.TowerID) > 0
      && Number(row.TowerType) > 0
      && Number(row.TowerAtk) > 0
      && Number(row.TowerAtkSpeed) > 0
      && Number(row.TowerMaxAmmo) > 0
      && Number(row.TowerProjectile) > 0
    ));
    const filteredCount = sourceRows.length - completeRows.length;
    candidate.TowerData = completeRows;
    if (filteredCount > 0) {
      issues.push({
        severity: "INFO",
        table: "TowerData",
        message: `TowerLv 또는 핵심 전투값이 비어 있는 예약 행 ${filteredCount}개를 제외했습니다.`,
      });
    }
  }

  if (!isImportedSource(sourceInfo.PieceData) || !isImportedSource(sourceInfo.TowerData)) return;

  const towerById = new Map((candidate.TowerData || []).map((row) => [String(row.TowerID), row]));
  let derivedPieceTypeCount = 0;
  for (const pieceRow of candidate.PieceData || []) {
    if (!isBlank(pieceRow.PieceType)) continue;
    const towerRow = towerById.get(String(pieceRow.ConnectTower));
    if (!towerRow || isBlank(towerRow.TowerType)) continue;
    pieceRow.PieceType = towerRow.TowerType;
    derivedPieceTypeCount += 1;
  }
  if (derivedPieceTypeCount > 0) {
    issues.push({
      severity: "INFO",
      table: "PieceData",
      message: `PieceType이 없는 ${derivedPieceTypeCount}개 행을 ConnectTower의 TowerData.TowerType에서 파생했습니다.`,
    });
  }

  const validTowerIds = new Set((candidate.TowerData || []).map((row) => String(row.TowerID)));
  const towerByTypeAndLevel = new Map();
  for (const towerRow of candidate.TowerData || []) {
    const key = `${towerRow.TowerType}:${towerRow.TowerLv}`;
    const matches = towerByTypeAndLevel.get(key) || [];
    matches.push(towerRow);
    towerByTypeAndLevel.set(key, matches);
  }

  let remappedCount = 0;
  for (const pieceRow of candidate.PieceData || []) {
    if (validTowerIds.has(String(pieceRow.ConnectTower))) continue;
    const key = `${pieceRow.PieceType}:${pieceRow.PieceLv}`;
    const matches = towerByTypeAndLevel.get(key) || [];
    if (matches.length === 1) {
      pieceRow.ConnectTower = matches[0].TowerID;
      remappedCount += 1;
      continue;
    }
    if (matches.length > 1) {
      issues.push({
        severity: "ERROR",
        table: "PieceData",
        message: `PieceID=${pieceRow.PieceID}의 PieceType=${pieceRow.PieceType}, PieceLv=${pieceRow.PieceLv}에 해당하는 포탑이 ${matches.length}개라 자동 연결할 수 없습니다.`,
      });
    }
  }

  if (remappedCount > 0) {
    issues.push({
      severity: "INFO",
      table: "PieceData",
      message: `구형 ConnectTower ID ${remappedCount}개를 PieceType + PieceLv 기준 현재 TowerID로 연결했습니다.`,
    });
  }
}

function isBlank(value) {
  return value === "" || value === null || value === undefined;
}

function isImportedSource(info) {
  return info?.kind === "CSV" || info?.kind === "Google Sheet";
}

function projectCandidateToBalanceColumns(candidate) {
  for (const tableName of GAME_DATA_TABLE_ORDER) {
    const allowedColumns = Object.keys(GAME_DATA_SCHEMA.tables[tableName].columns);
    candidate[tableName] = (candidate[tableName] || []).map((row) => Object.fromEntries(
      allowedColumns
        .filter((columnName) => Object.prototype.hasOwnProperty.call(row, columnName))
        .map((columnName) => [columnName, row[columnName]])
    ));
  }
}

function valueMatchesType(value, type) {
  if (isBlank(value)) return true;
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "string" || type === "json-string") return typeof value === "string";
  return ["string", "number", "boolean"].includes(typeof value);
}

function validateBalanceSemantics(candidate, sourceInfo, issues) {
  if (isImportedSource(sourceInfo.TowerData)) {
    const towerRows = candidate.TowerData || [];
    const suspiciousRanges = towerRows
      .filter((row) => Number(row.TowerMaxLange) > 0 && Number(row.TowerMaxLange) < 0.5)
      .slice(0, 8)
      .map((row) => `${row.TowerID}:${row.TowerMaxLange}`);
    if (suspiciousRanges.length) {
      issues.push({
        severity: "WARN",
        table: "TowerData",
        message: `TowerMaxLange는 Unity unit 원본값으로 파싱합니다. 0.5u 미만 사거리 ${suspiciousRanges.join(", ")}는 px/128로 이미 줄인 값일 수 있습니다.`,
      });
    }

    const suspiciousSplash = towerRows
      .filter((row) => Number(row.SplashRadius) > 20)
      .slice(0, 8)
      .map((row) => `${row.TowerID}:${row.SplashRadius}`);
    if (suspiciousSplash.length) {
      issues.push({
        severity: "WARN",
        table: "TowerData",
        message: `SplashRadius는 Unity unit 원본값으로 파싱합니다. 20u 초과 폭발 반지름 ${suspiciousSplash.join(", ")}는 px 값이 그대로 들어온 것일 수 있습니다.`,
      });
    }
  }

  if (isImportedSource(sourceInfo.MonsterData)) {
    const monsterRows = candidate.MonsterData || [];
    const tinyAttackRanges = monsterRows
      .filter((row) => Number(row.MonsterAtkRange) > 0 && Number(row.MonsterAtkRange) < 0.2)
      .slice(0, 8)
      .map((row) => `${row.MonsterID}:${row.MonsterAtkRange}`);
    if (tinyAttackRanges.length) {
      issues.push({
        severity: "WARN",
        table: "MonsterData",
        message: `MonsterAtkRange는 Unity unit 원본값으로 파싱합니다. 0.2u 미만 양수 사거리 ${tinyAttackRanges.join(", ")}는 근접 0 또는 px/128 변환값인지 확인하세요.`,
      });
    }
  }

  if (!isImportedSource(sourceInfo.PerkData) || !isImportedSource(sourceInfo.EffectData)) return;
  const effectById = new Map((candidate.EffectData || []).map((row) => [String(row.EffectID), row]));
  const effectValueColumns = [
    "ATK",
    "ATKSpeed",
    "ShotProjCount",
    "MaxProj",
    "ProjSize",
    "ProjPiercing",
    "BuffType",
    "BuffValue",
    "Duration",
  ];
  for (const perkRow of candidate.PerkData || []) {
    if (!(perkRow.IsActive === true || Number(perkRow.IsActive) === 1)) continue;
    const effectRow = effectById.get(String(perkRow.EffectID));
    if (!effectRow) continue;
    const hasEffectValue = effectValueColumns.some((columnName) => Number(effectRow[columnName]) !== 0);
    if (!hasEffectValue) {
      issues.push({
        severity: "WARN",
        table: "EffectData",
        message: `활성 PerkID=${perkRow.PerkID}의 EffectID=${perkRow.EffectID}에 실행 가능한 수치가 없어 런타임 fallback이 필요합니다.`,
      });
    }
  }
}

function validateContract(candidate, sourceInfo, options, issues) {
  const tableSummaries = {};

  for (const tableName of GAME_DATA_TABLE_ORDER) {
    const contract = GAME_DATA_SCHEMA.tables[tableName];
    const rows = candidate[tableName] || [];
    const info = sourceInfo[tableName];
    const headers = new Set(info.headers || []);
    const expectedColumns = Object.keys(contract.columns);
    const missingHeaders = contract.requiredHeaders.filter((columnName) => !headers.has(columnName));
    const unknownHeaders = (info.unknownHeaders || []).filter(Boolean);

    if (info.kind === "미제공") {
      const severity = contract.status === "planned" || contract.status === "excluded"
        ? "INFO"
        : options.strict && contract.requiredForFullImport ? "ERROR" : "WARN";
      issues.push({ severity, table: tableName, message: "테이블 데이터가 아직 제공되지 않았습니다." });
    }

    if (missingHeaders.length && !(info.kind === "미제공" && (contract.status === "planned" || contract.status === "excluded"))) {
      const severity = isImportedSource(info) || (options.strict && contract.requiredForFullImport) ? "ERROR" : "WARN";
      issues.push({
        severity,
        table: tableName,
        message: `계약 컬럼 누락: ${missingHeaders.join(", ")}`,
      });
    }

    if (unknownHeaders.length) {
      issues.push({
        severity: "WARN",
        table: tableName,
        message: `계약에 없는 CSV 헤더: ${unknownHeaders.join(", ")}`,
      });
    }

    const primaryKeys = new Map();
    const missingProperties = new Map();
    const invalidTypes = new Map();
    const invalidEnums = new Map();

    rows.forEach((row, rowIndex) => {
      const primaryKey = contractRowKey(row, contract);
      if (isBlank(primaryKey)) {
        const primaryKeyLabel = (contract.primaryKeyColumns || [contract.primaryKey]).join(" + ");
        issues.push({ severity: "ERROR", table: tableName, message: `${rowIndex + 1}번째 데이터 행의 PK ${primaryKeyLabel}가 비어 있습니다.` });
      } else {
        const key = String(primaryKey);
        if (primaryKeys.has(key)) {
          issues.push({ severity: "ERROR", table: tableName, message: `PK 중복 ${contract.primaryKey}=${key}` });
        }
        primaryKeys.set(key, rowIndex);
      }

      for (const columnName of expectedColumns) {
        const definition = contract.columns[columnName];
        if (!Object.prototype.hasOwnProperty.call(row, columnName)) {
          if (!headers.has(columnName)) continue;
          missingProperties.set(columnName, (missingProperties.get(columnName) || 0) + 1);
          continue;
        }
        const value = row[columnName];
        if (!valueMatchesType(value, definition.type)) {
          const item = invalidTypes.get(columnName) || { count: 0, examples: [] };
          item.count += 1;
          if (item.examples.length < 3) item.examples.push(`${contract.primaryKey}=${primaryKey}: ${JSON.stringify(value)}`);
          invalidTypes.set(columnName, item);
        }
        if (definition.enum && !isBlank(value) && !definition.enum.some((allowed) => String(allowed) === String(value))) {
          const item = invalidEnums.get(columnName) || { count: 0, examples: [] };
          item.count += 1;
          if (item.examples.length < 3) item.examples.push(`${contract.primaryKey}=${primaryKey}: ${JSON.stringify(value)}`);
          invalidEnums.set(columnName, item);
        }
        if (definition.type === "json-string" && !isBlank(value)) {
          try {
            JSON.parse(value);
          } catch {
            const item = invalidTypes.get(columnName) || { count: 0, examples: [] };
            item.count += 1;
            if (item.examples.length < 3) item.examples.push(`${contract.primaryKey}=${primaryKey}: JSON 파싱 실패`);
            invalidTypes.set(columnName, item);
          }
        }
      }
    });

    for (const [columnName, count] of missingProperties) {
      issues.push({ severity: "WARN", table: tableName, message: `${columnName} 속성이 ${count}개 행에서 빠져 있습니다.` });
    }
    for (const [columnName, item] of invalidTypes) {
      issues.push({ severity: "ERROR", table: tableName, message: `${columnName} 자료형 오류 ${item.count}건 (${item.examples.join(" / ")})` });
    }
    for (const [columnName, item] of invalidEnums) {
      issues.push({ severity: "ERROR", table: tableName, message: `${columnName} enum 오류 ${item.count}건 (${item.examples.join(" / ")})` });
    }

    tableSummaries[tableName] = {
      rows: rows.length,
      source: info.kind,
      missingHeaders: missingHeaders.length,
    };
  }

  for (const tableName of GAME_DATA_TABLE_ORDER) {
    const contract = GAME_DATA_SCHEMA.tables[tableName];
    const rows = candidate[tableName] || [];
    for (const foreignKey of contract.foreignKeys || []) {
      const targetContract = GAME_DATA_SCHEMA.tables[foreignKey.table];
      if (sourceInfo[foreignKey.table]?.kind === "미제공" && ["planned", "excluded"].includes(targetContract?.status)) continue;
      const targetRows = candidate[foreignKey.table] || [];
      const targetValues = new Set(targetRows.map((row) => String(row[foreignKey.target])));
      const allowed = new Set((foreignKey.allow || []).map(String));
      const invalid = [];
      rows.forEach((row) => {
        const value = row[foreignKey.column];
        if (isBlank(value) || allowed.has(String(value))) return;
        if (!targetValues.has(String(value)) && invalid.length < 5) invalid.push(String(value));
      });
      if (invalid.length) {
        issues.push({
          severity: "ERROR",
          table: tableName,
          message: `${foreignKey.column} -> ${foreignKey.table}.${foreignKey.target} FK 실패: ${invalid.join(", ")}`,
        });
      }
    }
  }

  if (options.strict) {
    for (const tableName of GAME_DATA_TABLE_ORDER) {
      const contract = GAME_DATA_SCHEMA.tables[tableName];
      if (contract.requiredForFullImport && !isImportedSource(sourceInfo[tableName])) {
        issues.push({ severity: "ERROR", table: tableName, message: "--strict 모드에서는 이 테이블의 CSV 또는 Google Sheets 탭이 필요합니다." });
      }
    }
  }

  return tableSummaries;
}

function compareTables(currentTables, candidate) {
  const tableDiffs = [];
  let changedRowCount = 0;
  let changedFieldCount = 0;

  for (const tableName of GAME_DATA_TABLE_ORDER) {
    const contract = GAME_DATA_SCHEMA.tables[tableName];
    const currentRows = Array.isArray(currentTables[tableName]) ? currentTables[tableName] : [];
    const candidateRows = Array.isArray(candidate[tableName]) ? candidate[tableName] : [];
    const currentById = new Map(currentRows.map((row) => [contractRowKey(row, contract), row]).filter(([key]) => key));
    const candidateById = new Map(candidateRows.map((row) => [contractRowKey(row, contract), row]).filter(([key]) => key));
    const added = [...candidateById.keys()].filter((key) => !currentById.has(key));
    const removed = [...currentById.keys()].filter((key) => !candidateById.has(key));
    const changed = [];

    for (const key of candidateById.keys()) {
      if (!currentById.has(key)) continue;
      const before = currentById.get(key);
      const after = candidateById.get(key);
      const fields = [];
      for (const columnName of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (JSON.stringify(before[columnName]) !== JSON.stringify(after[columnName])) {
          fields.push({ column: columnName, before: before[columnName], after: after[columnName] });
        }
      }
      if (fields.length) changed.push({ key, fields });
    }

    const rowChanges = added.length + removed.length + changed.length;
    changedRowCount += rowChanges;
    changedFieldCount += changed.reduce((sum, row) => sum + row.fields.length, 0);
    tableDiffs.push({ tableName, added, removed, changed, rowChanges });
  }

  return { tableDiffs, changedRowCount, changedFieldCount };
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderReport({ options, candidate, sourceInfo, issues, tableSummaries, diff }) {
  const counts = issues.reduce((result, issue) => {
    result[issue.severity] = (result[issue.severity] || 0) + 1;
    return result;
  }, {});
  const importedCount = Object.values(sourceInfo).filter(isImportedSource).length;
  const fallbackCount = Object.values(sourceInfo).filter((info) => info.kind === "내장 fallback").length;
  const modeLabel = options.sheetUrl
    ? "Google Sheets 링크 동기화"
    : options.inputDir ? "CSV 부분 동기화" : "현재 내장 데이터 기준 스냅샷";
  const lines = [
    "# 데이터 테이블 동기화 점검 보고서",
    "",
    `- 계약 버전: \`${GAME_DATA_SCHEMA.version}\``,
    `- 데이터 프로필: \`${GAME_DATA_SCHEMA.profile}\` (밸런스 허용 목록)`,
    `- 데이터 버전: \`${candidate.schemaVersion}\``,
    `- 실행 모드: \`${modeLabel}\``,
    "- 런타임 연결: **기본 실행 모드** (유효한 생성 스냅샷을 항상 적용)",
    "- 거리/반지름 단위: **데이터 테이블은 Unity unit 원본값으로 파싱**하고, 런타임/대시보드에서만 `u * 128px`로 환산합니다.",
    `- 외부 적용: **${importedCount}개**, 내장 fallback: **${fallbackCount}개**`,
    `- 검사 결과: ERROR ${counts.ERROR || 0} / WARN ${counts.WARN || 0} / INFO ${counts.INFO || 0}`,
    `- 현재 데이터 대비 변경: ${diff.changedRowCount}개 행 / ${diff.changedFieldCount}개 필드`,
    "",
    "## 테이블 공급 현황",
    "",
    "| 테이블 | 상태 | 공급원 | 행 수 | 누락 계약 헤더 |",
    "|---|---|---|---:|---:|",
  ];

  for (const tableName of GAME_DATA_TABLE_ORDER) {
    const contract = GAME_DATA_SCHEMA.tables[tableName];
    const summary = tableSummaries[tableName];
    lines.push(`| ${tableName} | ${contract.status} | ${sourceInfo[tableName].kind} | ${summary.rows} | ${summary.missingHeaders} |`);
  }

  lines.push("", "## 계약 검사", "");
  if (!issues.length) {
    lines.push("계약 위반이나 마이그레이션 경고가 없습니다.");
  } else {
    lines.push("| 등급 | 테이블 | 내용 |", "|---|---|---|");
    for (const issue of issues) {
      lines.push(`| ${issue.severity} | ${markdownCell(issue.table)} | ${markdownCell(issue.message)} |`);
    }
  }

  lines.push("", "## 현재 designTables 대비 데이터 차이", "");
  const changedTables = diff.tableDiffs.filter((item) => item.rowChanges > 0);
  if (!changedTables.length) {
    lines.push("데이터 행 값 차이가 없습니다. 현재 실행은 파이프라인 기준 스냅샷만 생성했습니다.");
  } else {
    lines.push("| 테이블 | 추가 | 삭제 | 수정 |", "|---|---:|---:|---:|");
    changedTables.forEach((item) => {
      lines.push(`| ${item.tableName} | ${item.added.length} | ${item.removed.length} | ${item.changed.length} |`);
    });

    lines.push("", "### 필드 변경 상세", "");
    let detailCount = 0;
    for (const item of changedTables) {
      for (const row of item.changed) {
        for (const field of row.fields) {
          if (detailCount >= 200) break;
          lines.push(`- \`${item.tableName}.${row.key}.${field.column}\`: \`${markdownCell(JSON.stringify(field.before))}\` -> \`${markdownCell(JSON.stringify(field.after))}\``);
          detailCount += 1;
        }
      }
    }
    if (detailCount >= 200) lines.push("- 변경 상세는 200건까지만 표시했습니다.");
  }

  lines.push("", "## 계약 메모", "");
  for (const tableName of GAME_DATA_TABLE_ORDER) {
    const notes = GAME_DATA_SCHEMA.tables[tableName].notes;
    if (notes) lines.push(`- **${tableName}**: ${notes}`);
  }

  lines.push("", "## 다음 사용 순서", "",
    "1. `node tools/sync-game-data.mjs --sheet \"Google Sheets 링크\"`를 실행하거나 각 탭 CSV를 `data-tables/`에 둡니다.",
    "2. CSV를 쓸 때는 `node tools/sync-game-data.mjs --input data-tables`를 실행합니다.",
    "3. 이 보고서의 ERROR/WARN과 데이터 차이를 검토합니다.",
    "4. `index.html`을 열고 HUD의 `SHEET` 상태와 실제 전투 수치를 확인합니다.",
    ""
  );
  return lines.join("\n");
}

function getGeneratedSourceMetadata(sourceInfo) {
  const csvTables = GAME_DATA_TABLE_ORDER.filter((tableName) => sourceInfo[tableName].kind === "CSV");
  const sheetTables = GAME_DATA_TABLE_ORDER.filter((tableName) => sourceInfo[tableName].kind === "Google Sheet");
  const importedTables = [...csvTables, ...sheetTables];
  const spreadsheetId = GAME_DATA_TABLE_ORDER
    .map((tableName) => sourceInfo[tableName]?.spreadsheetId)
    .find(Boolean) || "";
  return {
    sourceMode: sheetTables.length ? "google-sheet-overrides" : csvTables.length ? "csv-overrides" : "embedded-baseline",
    spreadsheetId,
    csvTables,
    sheetTables,
    importedTables,
  };
}

function getGeneratedBalanceTables(candidate) {
  const output = { schemaVersion: candidate.schemaVersion };
  for (const tableName of GAME_DATA_TABLE_ORDER) {
    if (GAME_DATA_SCHEMA.tables[tableName].status === "excluded") continue;
    output[tableName] = candidate[tableName] || [];
  }
  return output;
}

function renderGeneratedJs(candidate, sourceInfo) {
  const source = getGeneratedSourceMetadata(sourceInfo);
  const payload = {
    contractVersion: GAME_DATA_SCHEMA.version,
    dataProfile: GAME_DATA_SCHEMA.profile,
    valid: true,
    runtimeEnabled: true,
    generatedAt: new Date().toISOString(),
    ...source,
    designTables: getGeneratedBalanceTables(candidate),
  };
  return `(function (global) {\n  "use strict";\n  // AUTO-GENERATED by tools/sync-game-data.mjs. Do not edit by hand.\n  // Loaded by index.html and applied whenever the generated snapshot is valid.\n  global.GENERATED_GAME_DATA = ${JSON.stringify(payload, null, 2)};\n})(typeof window !== "undefined" ? window : globalThis);\n`;
}

function renderInvalidGeneratedJs(sourceInfo, issues) {
  const source = getGeneratedSourceMetadata(sourceInfo);
  const payload = {
    contractVersion: GAME_DATA_SCHEMA.version,
    dataProfile: GAME_DATA_SCHEMA.profile,
    valid: false,
    runtimeEnabled: false,
    generatedAt: new Date().toISOString(),
    ...source,
    errorCount: issues.filter((issue) => issue.severity === "ERROR").length,
    errors: issues
      .filter((issue) => issue.severity === "ERROR")
      .slice(0, 50)
      .map(({ table, message }) => ({ table, message })),
    designTables: {},
  };
  return `(function (global) {\n  "use strict";\n  // INVALID AUTO-GENERATED SNAPSHOT. Fix the sync errors before use.\n  global.GENERATED_GAME_DATA = ${JSON.stringify(payload, null, 2)};\n})(typeof window !== "undefined" ? window : globalThis);\n`;
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const issues = [];
const gameData = loadCurrentGameData();
const currentTables = gameData.designTables || {};
const { candidate, sourceInfo } = await buildCandidate(gameData, options, issues);
projectCandidateToBalanceColumns(candidate);
applyBalanceProfileAdapters(candidate, sourceInfo, issues);
validateBalanceSemantics(candidate, sourceInfo, issues);
const tableSummaries = validateContract(candidate, sourceInfo, options, issues);
const diff = compareTables(currentTables, candidate);
const report = renderReport({ options, candidate, sourceInfo, issues, tableSummaries, diff });

if (!options.checkOnly) {
  ensureParent(options.reportPath);
  fs.writeFileSync(options.reportPath, report, "utf8");

  ensureParent(options.outputPath);
  const generatedOutput = issues.some((issue) => issue.severity === "ERROR")
    ? renderInvalidGeneratedJs(sourceInfo, issues)
    : renderGeneratedJs(candidate, sourceInfo);
  fs.writeFileSync(options.outputPath, generatedOutput, "utf8");
}

const errorCount = issues.filter((issue) => issue.severity === "ERROR").length;
const warningCount = issues.filter((issue) => issue.severity === "WARN").length;
console.log(`Contract: ${GAME_DATA_SCHEMA.version}`);
console.log(`Mode: ${options.sheetUrl ? "Google Sheets sync" : options.inputDir ? "CSV partial sync" : "embedded baseline"}`);
console.log(`Summary: ERROR ${errorCount} / WARN ${warningCount} / DIFF ROWS ${diff.changedRowCount}`);
if (!options.checkOnly) {
  console.log(`Report: ${path.relative(root, options.reportPath)}`);
  if (!errorCount) console.log(`Generated: ${path.relative(root, options.outputPath)}`);
  else console.log(`Generated: invalid snapshot written to ${path.relative(root, options.outputPath)}`);
}

if (errorCount > 0 || (options.failOnDiff && diff.changedRowCount > 0)) process.exitCode = 1;
