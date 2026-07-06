(() => {
  "use strict";

  const generated = window.GENERATED_GAME_DATA;
  const generatedBalance = generated?.valid && generated?.designTables
    ? {
      contractVersion: generated.contractVersion,
      generatedAt: generated.generatedAt,
      snapshotId: `${generated.contractVersion || "generated"}@${generated.generatedAt || ""}`,
      spreadsheetId: generated.spreadsheetId,
      tables: generated.designTables,
    }
    : null;

  const embedded = window.BALANCE_DASHBOARD_DATA || {
    generatedAt: "",
    balance: { tables: {} },
    logs: {},
    warnings: ["대시보드 로그 데이터 파일 없음"],
  };

  const data = {
    ...embedded,
    balance: generatedBalance || embedded.balance || { tables: {} },
    warnings: [
      ...(embedded.warnings || []),
      ...(generated && !generated.valid ? ["game-data.generated.js 스냅샷이 유효하지 않음"] : []),
    ],
  };

  const logs = data.logs || {};
  const sessions = logs.sessions || [];
  const dashboard = document.querySelector("#dashboard");

  const TYPE_META = {
    1: { key: "basic", sheet: "Basic", label: "기본형", color: "#276dcc" },
    2: { key: "scatter", sheet: "Shotgun", label: "산탄형", color: "#d96532" },
    3: { key: "sniper", sheet: "SR", label: "원거리형", color: "#7767d6" },
    4: { key: "breaker", sheet: "Mortar", label: "탱커대항형", color: "#d03e60" },
    5: { key: "blast", sheet: "Boomer", label: "범위형", color: "#15946f" },
    6: { key: "support", sheet: "Buffer", label: "보조형", color: "#a97724" },
  };
  const AI_NAMES = { 1: "Basic", 2: "Basic-non", 3: "Shotgun", 4: "Heal" };
  const MONSTER_LABELS = { normal: "기본", speedy: "속도", tanker: "탱커" };
  const MONSTER_COLORS = { normal: "#276dcc", speedy: "#e3a51b", tanker: "#c33d3d" };
  const NEUTRAL = "#8b98a2";
  const PIECE_MAX_LEVEL = 5;
  const SKILL_META = {
    beginner: { label: "초보자", color: "#c73b3b", sortMin: 0, sortMax: 18, targetDelay: 5.8 },
    intermediate: { label: "중급자", color: "#e7a91b", sortMin: 19, sortMax: 60, targetDelay: 3.35 },
    advanced: { label: "상급자", color: "#14845f", sortMin: 61, sortMax: Infinity, targetDelay: 2.35 },
  };
  const SKILL_KEYS = Object.keys(SKILL_META);
  const SCENARIO_LABELS = {
    standard: "기본 랜덤",
    weakStart: "초반 약세",
    highRoll: "특전 운 좋음",
    lowRoll: "특전 운 나쁨",
    mistakeHeavy: "실수 많음",
    pressureAttack: "압박 공격 우선",
    repairFirst: "수리 우선",
    comboFocus: "콤보 중심",
  };
  const LEGACY_TYPE_SPRITES = {
    basic: "../assets/images/ui/PIECE/기본형.png",
    scatter: "../assets/images/ui/PIECE/산탄형.png",
    sniper: "../assets/images/ui/PIECE/원거리저격혐.png",
    blast: "../assets/images/ui/PIECE/범위형.png",
    breaker: "../assets/images/ui/PIECE/탱커대항형.png",
    support: "../assets/images/ui/PIECE/보조형ㄹ.png",
  };

  const state = {
    view: "overview",
    source: "all",
    simVersion: "all",
    build: "all",
    snapshot: "all",
    stage: "all",
    skillProfile: "all",
    loadout: "all",
    pieceTypes: "all",
    result: "all",
    device: "all",
    activePreset: "overview",
    previewType: "basic",
    previewLevel: 1,
    previewSlot: 4,
  };
  const FILTER_KEYS = ["source", "simVersion", "build", "snapshot", "stage", "skillProfile", "loadout", "pieceTypes", "result", "device"];

  const number = (value, fallback = 0) => {
    if (value === null || value === undefined || value === "") return fallback;
    const numeric = Number(String(value).replace(/,/g, "").replace("%", ""));
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const sum = (items, getter) => items.reduce((total, item) => total + number(getter(item)), 0);
  const average = (items, getter) => items.length ? sum(items, getter) / items.length : 0;
  const stddev = (items, getter) => {
    if (items.length < 2) return 0;
    const mean = average(items, getter);
    const variance = average(items, (item) => {
      const delta = number(getter(item)) - mean;
      return delta * delta;
    });
    return Math.sqrt(variance);
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, number(value)));
  const percent = (value, digits = 1) => `${(number(value) * 100).toFixed(digits)}%`;
  const format = (value, digits = 0) => number(value).toLocaleString("ko-KR", { maximumFractionDigits: digits });
  const intervalValue = (value, samples) => samples ? `${format(value, 2)}초` : "-";
  const clip = (value, length = 16) => {
    const text = String(value ?? "");
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  };
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
  const isTrue = (value) => value === true || String(value).toLowerCase() === "true" || String(value) === "1";

  function tableRows(name) {
    return data.balance?.tables?.[name] || [];
  }

  function valueOf(row, names, fallback = "") {
    const list = Array.isArray(names) ? names : [names];
    for (const name of list) {
      if (row && row[name] !== undefined && row[name] !== "") return row[name];
    }
    return fallback;
  }

  function safeJson(value, fallback = {}) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizePercentValue(value) {
    if (value === null || value === undefined || value === "") return 0;
    const raw = number(value);
    return Math.abs(raw) > 1 ? raw / 100 : raw;
  }

  function sessionSnapshot(row) {
    return row.balance_snapshot_id || "legacy";
  }

  function sessionStage(row) {
    return row.bot_stage_key || row.stage_key || "unknown";
  }

  function normalizeTokenList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    return String(value || "")
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function sessionPieceIds(row) {
    const payload = safeJson(row.payload_json, {});
    const fromBot = normalizeTokenList(row.bot_piece_ids || payload.simulation?.botPieceIds);
    if (fromBot.length) return fromBot;
    const fromKeys = normalizeTokenList(row.selected_piece_keys);
    if (fromKeys.length) return fromKeys;
    const loadout = Array.isArray(payload.loadout) ? payload.loadout : [];
    return loadout.map((piece) => piece.pieceKey).filter(Boolean);
  }

  function sessionLoadoutHash(row) {
    const payload = safeJson(row.payload_json, {});
    const explicit = row.bot_loadout_hash || payload.simulation?.botLoadoutHash;
    if (explicit) return explicit;
    const ids = sessionPieceIds(row);
    return ids.length ? ids.slice().sort().join("|") : "unknown";
  }

  function sessionPieceTypes(row) {
    const payload = safeJson(row.payload_json, {});
    const explicit = normalizeTokenList(row.bot_piece_types || payload.simulation?.botPieceTypes);
    if (explicit.length) return explicit;
    const loadout = Array.isArray(payload.loadout) ? payload.loadout : [];
    return loadout.map((piece) => piece.towerType).filter(Boolean);
  }

  function sessionPieceTypeSignature(row) {
    const types = sessionPieceTypes(row);
    if (!types.length) return "unknown";
    const counts = new Map();
    types.forEach((type) => counts.set(type, (counts.get(type) || 0) + 1));
    return [...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), "ko"))
      .map(([type, count]) => `${type}x${count}`)
      .join(" ");
  }

  function sessionLoadoutLabel(row) {
    const ids = sessionPieceIds(row);
    return ids.length ? ids.join(", ") : sessionLoadoutHash(row);
  }

  function sessionDevice(row) {
    return row.device_class || "unknown";
  }

  function sessionBuild(row) {
    return row.build_version || "unknown";
  }

  function sessionSource(row) {
    const payload = safeJson(row.payload_json, {});
    return row.data_source || payload.simulation?.dataSource || "real";
  }

  function sessionSimulationVersion(row) {
    const payload = safeJson(row.payload_json, {});
    return row.simulation_version || payload.simulation?.simulationVersion || "";
  }

  function sessionBotProfile(row) {
    const payload = safeJson(row.payload_json, {});
    return row.bot_profile || payload.simulation?.botProfile || "";
  }

  function sessionSkillProfile(row) {
    if (sessionSource(row) === "simulation") return sessionBotProfile(row) || "unknown";
    return inferSkillProfile(row);
  }

  function sessionBotStrategy(row) {
    const payload = safeJson(row.payload_json, {});
    return row.bot_strategy || payload.simulation?.botStrategy || "";
  }

  function sessionBotScenario(row) {
    const payload = safeJson(row.payload_json, {});
    return row.bot_scenario || payload.simulation?.botScenario || "";
  }

  function sessionSimulationMeta(row) {
    const payload = safeJson(row.payload_json, {});
    return payload.simulation || {};
  }

  function sessionSortInterval(row) {
    const payload = safeJson(row.payload_json, {});
    const value = row.sort_interval_avg
      || row.decision_delay_avg
      || payload.sortIntervalAvg
      || payload.simulation?.decisionDelayAvg;
    return value === "" || value === null || value === undefined ? NaN : number(value, NaN);
  }

  function sessionPlannedSortRatio(row) {
    const meta = sessionSimulationMeta(row);
    const value = row.planned_sort_ratio ?? meta.plannedSortRatio;
    const numeric = number(value, NaN);
    return Number.isFinite(numeric) ? normalizePercentValue(numeric) : NaN;
  }

  function sessionBoardUnlockCount(row) {
    const meta = sessionSimulationMeta(row);
    return number(row.board_unlock_count ?? meta.boardUnlockCount, NaN);
  }

  function unique(items) {
    return [...new Set(items.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ko"));
  }

  function filteredSessions() {
    return sessions.filter((row) =>
      (state.source === "all" || sessionSource(row) === state.source)
      && (state.simVersion === "all" || sessionSimulationVersion(row) === state.simVersion)
      && (state.build === "all" || sessionBuild(row) === state.build)
      && (state.snapshot === "all" || sessionSnapshot(row) === state.snapshot)
      && (state.stage === "all" || sessionStage(row) === state.stage)
      && (state.skillProfile === "all" || sessionSkillProfile(row) === state.skillProfile)
      && (state.loadout === "all" || sessionLoadoutHash(row) === state.loadout)
      && (state.pieceTypes === "all" || sessionPieceTypeSignature(row) === state.pieceTypes)
      && (state.result === "all" || (row.result || "unknown") === state.result)
      && (state.device === "all" || sessionDevice(row) === state.device));
  }

  function filteredRows(rows) {
    const selected = filteredSessions();
    const ids = new Set(selected.map((row) => row.session_id));
    if (!sessions.length) return rows;
    return rows.filter((row) => ids.has(row.session_id));
  }

  function comparisonSessions(source) {
    return sessions.filter((row) =>
      sessionSource(row) === source
      && (state.simVersion === "all" || source !== "simulation" || sessionSimulationVersion(row) === state.simVersion)
      && (state.build === "all" || sessionBuild(row) === state.build)
      && (state.snapshot === "all" || sessionSnapshot(row) === state.snapshot)
      && (state.stage === "all" || sessionStage(row) === state.stage)
      && (state.skillProfile === "all" || sessionSkillProfile(row) === state.skillProfile)
      && (state.loadout === "all" || sessionLoadoutHash(row) === state.loadout)
      && (state.pieceTypes === "all" || sessionPieceTypeSignature(row) === state.pieceTypes)
      && (state.result === "all" || (row.result || "unknown") === state.result)
      && (state.device === "all" || sessionDevice(row) === state.device));
  }

  function sessionDurationSec(row) {
    const fromDuration = number(row.duration_ms, NaN);
    if (Number.isFinite(fromDuration) && fromDuration > 0) return fromDuration / 1000;
    return number(row.elapsed_sec, 0);
  }

  function inferSkillProfile(row) {
    const successes = number(row.sort_successes);
    const attempts = number(row.sort_attempts);
    const interval = sessionSortInterval(row);
    const reached = number(row.reached_wave);
    let score = successes >= SKILL_META.advanced.sortMin ? 2 : successes >= SKILL_META.intermediate.sortMin ? 1 : 0;
    if (Number.isFinite(interval) && interval > 0) score += interval <= 2.85 ? 2 : interval <= 4.45 ? 1 : 0;
    else score += attempts >= 86 ? 2 : attempts >= 32 ? 1 : 0;
    if (row.result === "clear") score += 0.35;
    if (reached >= 9) score += 0.25;
    if (reached <= 4 && row.result !== "clear") score -= 0.25;
    if (score >= 3.05) return "advanced";
    if (score >= 1.25) return "intermediate";
    return "beginner";
  }

  function sessionMetrics(rows) {
    const intervalRows = rows.filter((row) => Number.isFinite(sessionSortInterval(row)) && sessionSortInterval(row) > 0);
    const attempts = sum(rows, (row) => row.sort_attempts);
    const successes = sum(rows, (row) => row.sort_successes);
    return {
      sessions: rows.length,
      clears: rows.filter((row) => row.result === "clear").length,
      clearRate: rows.length ? rows.filter((row) => row.result === "clear").length / rows.length : 0,
      reached: average(rows, (row) => row.reached_wave),
      attempts: average(rows, (row) => row.sort_attempts),
      successes: average(rows, (row) => row.sort_successes),
      conversion: attempts ? successes / attempts : 0,
      interval: average(intervalRows, sessionSortInterval),
      intervalSamples: intervalRows.length,
      combo: average(rows, (row) => row.max_combo),
      slotHp: average(rows, (row) => normalizePercentValue(row.slot_hp_ratio_avg)),
      duration: average(rows, sessionDurationSec),
    };
  }

  function sessionSystemDamage(row) {
    const payload = safeJson(row.payload_json, {});
    return sumObject(payload.systemDamageBySource);
  }

  function sessionTotalDamage(row) {
    const payload = safeJson(row.payload_json, {});
    return number(row.damage_done) || sessionSystemDamage(row) + sumPieceDamage(payload.damageByPiece);
  }

  function sessionTowerCreated(row) {
    const payload = safeJson(row.payload_json, {});
    if (row.tower_created !== undefined && row.tower_created !== "") return number(row.tower_created);
    if (payload.towerCreated !== undefined) return number(payload.towerCreated);
    if (Array.isArray(payload.pieceStats)) return sum(payload.pieceStats, (piece) => piece.towerCreated);
    return 0;
  }

  function getSortFunnelRows(rows = filteredSessions()) {
    const attempts = sum(rows, (row) => row.sort_attempts);
    const successes = sum(rows, (row) => row.sort_successes);
    const towers = sum(rows, sessionTowerCreated);
    return [
      { label: "소팅 시도", value: attempts, detail: "이동 입력", color: "#276dcc" },
      { label: "3-Sort 완성", value: successes, color: successes / Math.max(1, attempts) < .35 ? "#c33d3d" : "#15946f" },
      { label: "포탑 생성", value: towers || successes, color: "#7b67d6" },
    ];
  }

  function getSurvivalFunnelRows(rows = filteredSessions()) {
    const total = rows.length;
    return [
      { label: "세션 시작", value: total, detail: `${format(total)}건`, color: "#276dcc" },
      { label: "W3 도달", value: rows.filter((row) => number(row.reached_wave) >= 3).length, color: "#15946f" },
      { label: "W6 도달", value: rows.filter((row) => number(row.reached_wave) >= 6).length, color: "#e3a51b" },
      { label: "W9 도달", value: rows.filter((row) => number(row.reached_wave) >= 9).length, color: "#d96532" },
      { label: "클리어", value: rows.filter((row) => row.result === "clear").length, color: "#c33d3d" },
    ];
  }

  function sampleReliability(rows = filteredSessions()) {
    const count = rows.length;
    if (count >= 100) return { tone: "good", label: "판단 가능", body: `${count}건 표본. 큰 방향성 판단 가능` };
    if (count >= 40) return { tone: "warn", label: "부분 판단", body: `${count}건 표본. 큰 편차는 보되 확정은 보류` };
    return { tone: "bad", label: "표본 부족", body: `${count}건 표본. 가설 탐색용으로만 사용` };
  }

  function reliabilityGrade(count) {
    if (count >= 100) return { grade: "A", tone: "good", label: "판단 가능", score: 100 };
    if (count >= 60) return { grade: "B", tone: "good", label: "대략 판단", score: 76 };
    if (count >= 30) return { grade: "C", tone: "warn", label: "방향성", score: 54 };
    if (count >= 10) return { grade: "D", tone: "warn", label: "참고용", score: 32 };
    return { grade: "E", tone: "bad", label: "부족", score: 14 };
  }

  function clearRateMargin(rows) {
    if (!rows.length) return 0;
    const rate = rows.filter((row) => row.result === "clear").length / rows.length;
    return clamp(1.96 * Math.sqrt((rate * (1 - rate)) / Math.max(1, rows.length)), 0, 1);
  }

  function metricDelta(after, before, field) {
    return number(after?.[field]) - number(before?.[field]);
  }

  function deltaText(value, formatter = (item) => format(item, 2)) {
    const numeric = number(value);
    return `${numeric >= 0 ? "+" : ""}${formatter(numeric)}`;
  }

  function versionKeyOf(row) {
    return `${sessionBuild(row)}\n${sessionSnapshot(row)}`;
  }

  function sessionsForVersion(versionRow) {
    if (!versionRow) return [];
    return sessions.filter((row) => versionKeyOf(row) === versionRow.key);
  }

  function latestVersionPair() {
    const rows = getVersionRows();
    return {
      before: rows.length >= 2 ? rows[rows.length - 2] : null,
      after: rows[rows.length - 1] || null,
    };
  }

  function getReliabilityRows(rows = filteredSessions()) {
    const sourceGroups = unique(rows.map(sessionSource)).map((source) => ({
      key: `source:${source}`,
      label: source === "simulation" ? "시뮬 표본" : source === "real" ? "REAL 표본" : source,
      rows: rows.filter((row) => sessionSource(row) === source),
    }));
    const skillGroups = SKILL_KEYS.map((key) => ({
      key: `skill:${key}`,
      label: SKILL_META[key].label,
      rows: rows.filter((row) => sessionSkillProfile(row) === key),
    }));
    return [
      { key: "current", label: "현재 필터", rows },
      ...sourceGroups,
      ...skillGroups,
    ].filter((item) => item.rows.length).map((item) => {
      const metrics = sessionMetrics(item.rows);
      const reliability = reliabilityGrade(item.rows.length);
      return {
        key: item.key,
        label: item.label,
        rows: item.rows,
        ...metrics,
        grade: reliability.grade,
        tone: reliability.tone,
        reliabilityLabel: reliability.label,
        score: reliability.score,
        clearMargin: clearRateMargin(item.rows),
        reachedStddev: stddev(item.rows, (row) => row.reached_wave),
      };
    });
  }

  function getVersionCohortRows() {
    const { before, after } = latestVersionPair();
    if (!before || !after) return [];
    const beforeRows = sessionsForVersion(before);
    const afterRows = sessionsForVersion(after);
    const cohorts = [
      { key: "all", label: "전체", filter: () => true },
      ...SKILL_KEYS.map((key) => ({ key, label: SKILL_META[key].label, filter: (row) => sessionSkillProfile(row) === key })),
      { key: "real", label: "REAL", filter: (row) => sessionSource(row) === "real" },
      { key: "simulation", label: "SIM", filter: (row) => sessionSource(row) === "simulation" },
    ];
    return cohorts.map((cohort) => {
      const beforeGroup = beforeRows.filter(cohort.filter);
      const afterGroup = afterRows.filter(cohort.filter);
      const beforeMetrics = sessionMetrics(beforeGroup);
      const afterMetrics = sessionMetrics(afterGroup);
      return {
        key: cohort.key,
        label: cohort.label,
        before: beforeMetrics,
        after: afterMetrics,
        beforeSamples: beforeGroup.length,
        afterSamples: afterGroup.length,
        clearDelta: metricDelta(afterMetrics, beforeMetrics, "clearRate"),
        reachedDelta: metricDelta(afterMetrics, beforeMetrics, "reached"),
        sortDelta: metricDelta(afterMetrics, beforeMetrics, "successes"),
        slotHpDelta: metricDelta(afterMetrics, beforeMetrics, "slotHp"),
        systemDelta: getDamageSourceShareForRows(afterGroup).systemShare - getDamageSourceShareForRows(beforeGroup).systemShare,
      };
    }).filter((row) => row.beforeSamples || row.afterSamples);
  }

  function getCohortPerformanceRows() {
    const rows = filteredSessions();
    const cohorts = [];
    for (const skill of SKILL_KEYS) {
      for (const source of unique(rows.map(sessionSource))) {
        const group = rows.filter((row) => sessionSkillProfile(row) === skill && sessionSource(row) === source);
        if (!group.length) continue;
        const metrics = sessionMetrics(group);
        const reliability = reliabilityGrade(group.length);
        cohorts.push({
          key: `${source}:${skill}`,
          label: `${source === "simulation" ? "SIM" : "REAL"} · ${SKILL_META[skill].label}`,
          source,
          skill,
          color: SKILL_META[skill].color,
          ...metrics,
          grade: reliability.grade,
          tone: reliability.tone,
          reliabilityLabel: reliability.label,
          score: reliability.score,
          clearMargin: clearRateMargin(group),
        });
      }
    }
    return cohorts.sort((a, b) => b.sessions - a.sessions || b.reached - a.reached);
  }

  function getDecisionCards() {
    const current = filteredSessions();
    const metrics = sessionMetrics(current);
    const source = getDamageSourceShare();
    const waveRows = getWaveDashboardRows();
    const dangerWave = waveRows.slice().sort((a, b) => (b.remaining + b.slotDanger / 12 + b.systemShare * 8) - (a.remaining + a.slotDanger / 12 + a.systemShare * 8))[0];
    const reliability = sampleReliability(current);
    const conversion = metrics.conversion;
    return [
      {
        tone: reliability.tone,
        title: reliability.label,
        value: `${format(current.length)}건`,
        body: reliability.body,
        action: "표본 필터 확인",
        view: "sessions",
      },
      {
        tone: metrics.clearRate < .25 ? "bad" : metrics.clearRate < .55 ? "warn" : "good",
        title: "클리어 상태",
        value: percent(metrics.clearRate),
        body: metrics.clearRate < .25 ? "현재 조건은 실패가 지배적입니다." : "현재 조건은 관측 가능한 클리어가 있습니다.",
        action: "웨이브 원인 보기",
        view: "waves",
      },
      {
        tone: conversion < .3 ? "bad" : conversion < .5 ? "warn" : "good",
        title: "소팅 전환",
        value: percent(conversion),
        body: "시도 대비 3-Sort 완성률입니다.",
        action: "세션 보기",
        view: "sessions",
      },
      {
        tone: source.systemShare > .5 ? "bad" : source.systemShare > .35 ? "warn" : "good",
        title: "시스템 의존",
        value: percent(source.systemShare),
        body: "콤보/전체정렬/기타 시스템 피해 비중입니다.",
        action: "진단 보기",
        view: "diagnostics",
      },
      {
        tone: dangerWave?.samples && (dangerWave.remaining > 5 || dangerWave.slotHp < .45) ? "bad" : "warn",
        title: "최우선 웨이브",
        value: dangerWave?.wave ? `W${dangerWave.wave}` : "-",
        body: dangerWave?.samples ? `잔존 ${format(dangerWave.remaining, 1)} / 슬롯 ${percent(dangerWave.slotHp)}` : "웨이브 표본 대기",
        action: "웨이브 보기",
        view: "waves",
      },
    ];
  }

  function getAutoReportCards() {
    const current = filteredSessions();
    const metrics = sessionMetrics(current);
    const reliability = reliabilityGrade(current.length);
    const versionRows = getVersionCohortRows();
    const overallDelta = versionRows.find((row) => row.key === "all");
    const calibrationRows = getSkillCalibrationRows().filter((row) => row.real.sessions && row.sim.sessions);
    const biggestCalibrationGap = calibrationRows.slice().sort((a, b) => b.gapScore - a.gapScore)[0];
    const weakCohort = getCohortPerformanceRows().slice().sort((a, b) => a.clearRate - b.clearRate || a.reached - b.reached)[0];
    const perkImpact = getPerkImpactRows().filter((row) => row.picked.length >= 3 && row.skipped.length >= 3);
    const highImpactPerk = perkImpact.slice().sort((a, b) => Math.abs(b.progressDelta) - Math.abs(a.progressDelta))[0];
    return [
      {
        tone: reliability.tone,
        title: "표본 신뢰도",
        value: `${reliability.grade}등급`,
        detail: `${format(current.length)}건 · 클리어 오차 ${percent(clearRateMargin(current), 0)}`,
        body: reliability.label,
      },
      {
        tone: !overallDelta ? "warn" : overallDelta.reachedDelta >= .4 && overallDelta.clearDelta >= 0 ? "good" : overallDelta.reachedDelta < -.25 || overallDelta.clearDelta < -.08 ? "bad" : "warn",
        title: "최신 변경 영향",
        value: overallDelta ? `${deltaText(overallDelta.reachedDelta, (value) => `${format(value, 2)}W`)}` : "-",
        detail: overallDelta ? `클리어 ${deltaText(overallDelta.clearDelta, (value) => percent(value))}` : "스냅샷 2개부터",
        body: overallDelta ? `이전 ${overallDelta.beforeSamples}건 / 최신 ${overallDelta.afterSamples}건` : "다음 데이터 갱신 후 비교",
      },
      {
        tone: biggestCalibrationGap?.gapScore > 1.1 ? "bad" : biggestCalibrationGap?.gapScore > .55 ? "warn" : "good",
        title: "REAL/SIM 괴리",
        value: biggestCalibrationGap ? biggestCalibrationGap.label : "-",
        detail: biggestCalibrationGap ? `${format(biggestCalibrationGap.gapScore, 2)}점` : "비교 표본 부족",
        body: biggestCalibrationGap ? `도달 ${deltaText(biggestCalibrationGap.reachedDelta, (value) => `${format(value, 1)}W`)}` : "실제/시뮬 로그 필요",
      },
      {
        tone: weakCohort?.clearRate < .2 ? "bad" : weakCohort?.clearRate < .45 ? "warn" : "good",
        title: "취약 코호트",
        value: weakCohort ? weakCohort.label : "-",
        detail: weakCohort ? `클리어 ${percent(weakCohort.clearRate)} / W${format(weakCohort.reached, 1)}` : "표본 대기",
        body: weakCohort ? `${weakCohort.sessions}건 · ${weakCohort.grade}등급` : "코호트 로그 필요",
      },
      {
        tone: highImpactPerk && Math.abs(highImpactPerk.progressDelta) > 1.2 ? "warn" : "good",
        title: "특전 영향",
        value: highImpactPerk ? clip(highImpactPerk.title, 12) : "-",
        detail: highImpactPerk ? `${deltaText(highImpactPerk.progressDelta, (value) => `${format(value, 2)}W`)}` : "표본 부족",
        body: highImpactPerk ? `선택 ${highImpactPerk.picked.length} / 미선택 ${highImpactPerk.skipped.length}` : "특전 제시/선택 로그 필요",
      },
    ];
  }

  function getSessionGroupSummary(keyGetter, labelGetter, rows = filteredSessions()) {
    const groups = new Map();
    for (const row of rows) {
      const key = keyGetter(row) || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.entries()].map(([key, groupRows]) => {
      const metrics = sessionMetrics(groupRows);
      const systemDamage = sum(groupRows, sessionSystemDamage);
      const totalDamage = sum(groupRows, sessionTotalDamage);
      return {
        key,
        label: labelGetter(groupRows[0], key),
        ...metrics,
        systemShare: totalDamage ? systemDamage / totalDamage : 0,
      };
    }).sort((a, b) => b.sessions - a.sessions || b.reached - a.reached);
  }

  function getStageExperimentRows() {
    return getSessionGroupSummary(sessionStage, (row, key) => `${key}${row.stage_title ? ` · ${row.stage_title}` : ""}`);
  }

  function getLoadoutExperimentRows() {
    return getSessionGroupSummary(sessionLoadoutHash, (row) => sessionLoadoutLabel(row));
  }

  function getPieceTypeExperimentRows() {
    return getSessionGroupSummary(sessionPieceTypeSignature, (row, key) => key);
  }

  function getSkillSummaryRows(rows = filteredSessions()) {
    return SKILL_KEYS.map((key) => ({
      key,
      label: SKILL_META[key].label,
      color: SKILL_META[key].color,
      targetDelay: SKILL_META[key].targetDelay,
      ...sessionMetrics(rows.filter((row) => sessionSkillProfile(row) === key)),
    }));
  }

  function getSkillCalibrationRows() {
    const realRows = comparisonSessions("real");
    const simRows = comparisonSessions("simulation");
    return SKILL_KEYS.map((key) => {
      const real = sessionMetrics(realRows.filter((row) => inferSkillProfile(row) === key));
      const sim = sessionMetrics(simRows.filter((row) => sessionBotProfile(row) === key));
      const gapScore = real.sessions && sim.sessions
        ? Math.abs(sim.clearRate - real.clearRate) * 2.2
          + Math.abs(sim.reached - real.reached) / 5
          + Math.abs(sim.successes - real.successes) / 45
          + Math.abs(sim.interval - real.interval) / 5
        : 0;
      return {
        key,
        label: SKILL_META[key].label,
        color: SKILL_META[key].color,
        real,
        sim,
        gapScore,
        clearDelta: sim.clearRate - real.clearRate,
        reachedDelta: sim.reached - real.reached,
        sortDelta: sim.successes - real.successes,
        intervalDelta: sim.interval - real.interval,
      };
    });
  }

  function getScenarioSummary() {
    const groups = new Map();
    for (const row of comparisonSessions("simulation")) {
      const scenario = sessionBotScenario(row) || "standard";
      if (!groups.has(scenario)) groups.set(scenario, []);
      groups.get(scenario).push(row);
    }
    return [...groups.entries()].map(([scenario, rows]) => ({
      scenario,
      label: SCENARIO_LABELS[scenario] || scenario,
      ...sessionMetrics(rows),
    })).sort((a, b) => b.sessions - a.sessions || b.reached - a.reached);
  }

  function sessionSkillDisplay(row) {
    if (sessionSource(row) === "simulation") {
      const profile = sessionBotProfile(row);
      return `${SKILL_META[profile]?.label || profile || "-"} · ${SCENARIO_LABELS[sessionBotScenario(row)] || sessionBotScenario(row) || "기본 랜덤"}`;
    }
    return `${SKILL_META[inferSkillProfile(row)]?.label || "-"} 추정`;
  }

  function fillSelect(id, values, label, labelGetter = (value) => value) {
    const select = document.querySelector(id);
    select.innerHTML = `<option value="all">${escape(label)}</option>${values.map((value) => `<option value="${escape(value)}">${escape(labelGetter(value))}</option>`).join("")}`;
    select.addEventListener("change", () => {
      const stateKey = id.replace("#filter-", "").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      state[stateKey] = select.value;
      state.activePreset = "custom";
      syncPresetButtons();
      render();
    });
  }

  function filterIdForKey(key) {
    return key === "simVersion" ? "sim-version" : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  function latestOption(selector, sourceValues = null) {
    const values = sourceValues || [...document.querySelector(selector)?.querySelectorAll("option") || []]
      .map((option) => option.value)
      .filter((value) => value && value !== "all");
    return values[values.length - 1] || "all";
  }

  function resetFilterState() {
    for (const key of FILTER_KEYS) state[key] = "all";
  }

  function syncFilterControls() {
    for (const key of FILTER_KEYS) {
      const select = document.querySelector(`#filter-${filterIdForKey(key)}`);
      if (select) select.value = [...select.options].some((option) => option.value === state[key]) ? state[key] : "all";
    }
  }

  function setActiveTab(view) {
    state.view = view || "overview";
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === state.view));
  }

  function syncPresetButtons() {
    document.querySelectorAll(".preset").forEach((button) => {
      button.classList.toggle("active", button.dataset.preset === state.activePreset);
    });
  }

  function applyAnalysisPreset(preset) {
    state.activePreset = preset;
    resetFilterState();
    setActiveTab("overview");
    if (preset === "real") state.source = "real";
    else if (preset === "simulation") {
      state.source = "simulation";
      state.simVersion = latestOption("#filter-sim-version", unique(sessions.filter((row) => sessionSource(row) === "simulation").map(sessionSimulationVersion)));
    } else if (["beginner", "intermediate", "advanced"].includes(preset)) {
      state.skillProfile = preset;
    } else if (preset === "failures") {
      state.result = "fail";
    } else if (preset === "danger") {
      setActiveTab("waves");
    } else if (preset === "system") {
      setActiveTab("diagnostics");
    } else if (preset === "calibration") {
      setActiveTab("calibration");
    } else if (preset === "latest") {
      state.snapshot = latestOption("#filter-snapshot");
    }
    syncFilterControls();
    syncPresetButtons();
    render();
  }

  function resetFilters() {
    state.activePreset = "overview";
    resetFilterState();
    setActiveTab("overview");
    syncFilterControls();
    syncPresetButtons();
    render();
  }

  function initControls() {
    fillSelect("#filter-source", unique(sessions.map(sessionSource)), "전체 표본");
    fillSelect("#filter-sim-version", unique(sessions.map(sessionSimulationVersion)), "전체 버전");
    fillSelect("#filter-build", unique(sessions.map(sessionBuild)), "전체 빌드");
    fillSelect("#filter-snapshot", unique(sessions.map(sessionSnapshot)), "전체 스냅샷");
    fillSelect("#filter-stage", unique(sessions.map(sessionStage)), "전체 스테이지");
    fillSelect("#filter-skill-profile", SKILL_KEYS, "전체 숙련도", (value) => SKILL_META[value]?.label || value);
    fillSelect("#filter-loadout", unique(sessions.map(sessionLoadoutHash)), "전체 조합");
    fillSelect("#filter-piece-types", unique(sessions.map(sessionPieceTypeSignature)), "전체 타입");
    fillSelect("#filter-result", unique(sessions.map((row) => row.result || "unknown")), "전체 결과");
    fillSelect("#filter-device", unique(sessions.map(sessionDevice)), "전체 기기");
    document.querySelector("#filter-source").addEventListener("change", (event) => {
      const versionSelect = document.querySelector("#filter-sim-version");
      if (event.target.value === "simulation") {
        const versions = unique(sessions.filter((row) => sessionSource(row) === "simulation").map(sessionSimulationVersion));
        state.simVersion = versions[versions.length - 1] || "all";
      } else state.simVersion = "all";
      versionSelect.value = state.simVersion;
      render();
    });
    document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.activePreset = "custom";
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      syncPresetButtons();
      render();
    }));
    document.querySelectorAll(".preset").forEach((button) => button.addEventListener("click", () => {
      applyAnalysisPreset(button.dataset.preset || "overview");
    }));
    document.querySelector("#reset-filters").addEventListener("click", resetFilters);
    document.querySelector("#toggle-filters").addEventListener("click", (event) => {
      const filters = document.querySelector(".filters");
      const collapsed = filters.classList.toggle("collapsed");
      event.currentTarget.textContent = collapsed ? "필터 열기" : "필터 닫기";
      event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  function typeMeta(value) {
    const raw = String(value ?? "").trim();
    if (TYPE_META[raw]) return TYPE_META[raw];
    const lower = raw.toLowerCase();
    return Object.values(TYPE_META).find((meta) =>
      meta.key === lower
      || meta.sheet.toLowerCase() === lower
      || meta.label.toLowerCase() === lower)
      || { key: lower || "unknown", sheet: raw || "Unknown", label: raw || "미분류", color: NEUTRAL };
  }

  function normalizeTowerTypeKey(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("scatter") || raw.includes("shotgun") || raw.includes("산탄")) return "scatter";
    if (raw.includes("sniper") || raw === "sr" || raw.includes("저격") || raw.includes("원거리")) return "sniper";
    if (raw.includes("blast") || raw.includes("mortar") || raw.includes("범위") || raw.includes("폭발")) return "blast";
    if (raw.includes("breaker") || raw.includes("boomer") || raw.includes("탱커")) return "breaker";
    if (raw.includes("support") || raw.includes("buffer") || raw.includes("보조")) return "support";
    if (raw.includes("basic") || raw.includes("기본")) return "basic";
    const found = Object.values(TYPE_META).find((meta) => meta.key === raw || meta.sheet.toLowerCase() === raw);
    return found?.key || "basic";
  }

  function sectionTitle(title, note = "") {
    return `<div class="section-title"><h2>${escape(title)}</h2><span>${escape(note)}</span></div>`;
  }

  function kpi(label, value, detail = "", tone = "") {
    return `<article class="kpi ${tone}"><div class="label">${escape(label)}</div><div class="value">${escape(value)}</div><div class="detail">${escape(detail)}</div></article>`;
  }

  function notice() {
    const activeWarnings = (data.warnings || []).filter((warning) => {
      if (String(warning).startsWith("system_stats") && (logs.events || []).length) return false;
      return true;
    });
    return activeWarnings.length
      ? `<div class="notice">일부 데이터 확인 필요: ${escape(activeWarnings.join(" / "))}</div>`
      : "";
  }

  function chartPanel(title, note, body, className = "") {
    return `<article class="chart-panel ${className}">
      <div class="chart-head"><h3>${escape(title)}</h3><span>${escape(note)}</span></div>
      ${body}
    </article>`;
  }

  function emptyChart(message = "표시할 데이터가 없습니다") {
    return `<div class="chart-empty">${escape(message)}</div>`;
  }

  function legend(items) {
    return `<div class="legend">${items.map((item) => `<span><i style="background:${escape(item.color)}"></i>${escape(item.label)}</span>`).join("")}</div>`;
  }

  function lineChart(series, options = {}) {
    const clean = series.map((item) => ({
      ...item,
      values: (item.values || []).filter((point) => Number.isFinite(number(point.y, NaN))),
    })).filter((item) => item.values.length);
    if (!clean.length) return emptyChart();

    const labels = options.labels || unique(clean.flatMap((item) => item.values.map((point) => String(point.x))));
    const width = options.width || 760;
    const height = options.height || 260;
    const pad = { left: 52, right: 18, top: 22, bottom: 42 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const values = clean.flatMap((item) => item.values.map((point) => number(point.y)));
    const minY = options.minY ?? Math.min(0, ...values);
    let maxY = options.maxY ?? Math.max(...values);
    if (maxY <= minY) maxY = minY + 1;
    const xFor = (label) => {
      const index = Math.max(0, labels.indexOf(String(label)));
      return labels.length <= 1 ? pad.left + plotW / 2 : pad.left + (index / (labels.length - 1)) * plotW;
    };
    const yFor = (value) => pad.top + ((maxY - number(value)) / (maxY - minY)) * plotH;
    const ticks = Array.from({ length: 5 }, (_, index) => minY + ((maxY - minY) / 4) * index);
    const grid = ticks.map((tick) => {
      const y = yFor(tick);
      return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="grid-line"></line>
        <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" class="axis-label">${escape(options.formatter ? options.formatter(tick) : format(tick))}</text>`;
    }).join("");
    const xStep = Math.max(1, Math.ceil(labels.length / 10));
    const xLabels = labels.map((label, index) => index % xStep === 0 || index === labels.length - 1
      ? `<text x="${xFor(label)}" y="${height - 13}" text-anchor="middle" class="axis-label">${escape(options.xPrefix ? `${options.xPrefix}${label}` : label)}</text>`
      : "").join("");
    const paths = clean.map((item) => {
      const points = item.values.map((point) => `${xFor(point.x)},${yFor(point.y)}`).join(" ");
      const dots = item.values.map((point) => `<circle cx="${xFor(point.x)}" cy="${yFor(point.y)}" r="3.2" fill="${escape(item.color || NEUTRAL)}"><title>${escape(item.name)} ${escape(point.x)}: ${escape(options.formatter ? options.formatter(point.y) : format(point.y, 1))}</title></circle>`).join("");
      return `<polyline fill="none" stroke="${escape(item.color || NEUTRAL)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}"></polyline>${dots}`;
    }).join("");

    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(options.label || "line chart")}">
      ${grid}
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="axis-line"></line>
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="axis-line"></line>
      ${xLabels}
      ${paths}
    </svg>${legend(clean.map((item) => ({ label: item.name, color: item.color || NEUTRAL })))}`;
  }

  function horizontalBarChart(items, options = {}) {
    const rows = (items || []).slice(0, options.limit || 10);
    if (!rows.length) return emptyChart();
    const width = options.width || 760;
    const rowH = options.rowHeight || 30;
    const height = Math.max(96, 34 + rows.length * rowH);
    const pad = { left: options.left || 152, right: 62, top: 16, bottom: 18 };
    const plotW = width - pad.left - pad.right;
    const values = rows.map((item) => number(options.value(item)));
    const max = Math.max(options.max || 0, 1, ...values);
    const colorFor = options.color || (() => "#276dcc");
    const bars = rows.map((item, index) => {
      const y = pad.top + index * rowH;
      const value = number(options.value(item));
      const barW = Math.max(1, (value / max) * plotW);
      const label = options.label(item);
      return `<text x="8" y="${y + 17}" class="bar-label">${escape(clip(label, options.labelLength || 18))}</text>
        <rect x="${pad.left}" y="${y + 5}" width="${plotW}" height="14" rx="2" class="bar-bg"></rect>
        <rect x="${pad.left}" y="${y + 5}" width="${barW}" height="14" rx="2" fill="${escape(colorFor(item, index))}"></rect>
        <text x="${width - 8}" y="${y + 17}" text-anchor="end" class="bar-number">${escape(options.formatter ? options.formatter(value, item) : format(value, 1))}</text>`;
    }).join("");
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(options.labelName || "bar chart")}">${bars}</svg>`;
  }

  function deltaBarChart(items, options = {}) {
    const source = (items || []).filter((item) => Number.isFinite(number(options.value(item), NaN))).slice(0, options.limit || 12);
    if (!source.length) return emptyChart();
    const width = options.width || 760;
    const rowHeight = 36;
    const height = Math.max(150, source.length * rowHeight + 24);
    const left = 190;
    const right = 84;
    const plotWidth = width - left - right;
    const maxAbs = Math.max(.001, ...source.map((item) => Math.abs(number(options.value(item)))));
    const center = left + plotWidth / 2;
    const bars = source.map((item, index) => {
      const value = number(options.value(item));
      const size = Math.abs(value) / maxAbs * plotWidth / 2;
      const x = value >= 0 ? center : center - size;
      const y = 10 + index * rowHeight;
      const color = value >= 0 ? (options.positiveColor || "#15946f") : (options.negativeColor || "#c33d3d");
      return `<text class="bar-label" x="${left - 10}" y="${y + 16}" text-anchor="end">${escape(clip(options.label(item), options.labelLength || 22))}</text>
        <rect class="bar-bg" x="${left}" y="${y + 3}" width="${plotWidth}" height="18" rx="2"></rect>
        <rect x="${x}" y="${y + 3}" width="${Math.max(1, size)}" height="18" rx="2" fill="${color}"><title>${escape(options.label(item))}: ${escape(options.formatter ? options.formatter(value, item) : format(value, 2))}</title></rect>
        <text class="bar-number" x="${width - 6}" y="${y + 16}" text-anchor="end">${escape(options.formatter ? options.formatter(value, item) : format(value, 2))}</text>`;
    }).join("");
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="delta bar chart">
      <line class="axis-line" x1="${center}" y1="4" x2="${center}" y2="${height - 8}"></line>${bars}</svg>`;
  }

  function stackedWaveChart(rows, options = {}) {
    if (!rows.length) return emptyChart();
    const segments = [
      { key: "normalHp", label: MONSTER_LABELS.normal, color: MONSTER_COLORS.normal },
      { key: "speedyHp", label: MONSTER_LABELS.speedy, color: MONSTER_COLORS.speedy },
      { key: "tankerHp", label: MONSTER_LABELS.tanker, color: MONSTER_COLORS.tanker },
    ];
    const width = options.width || 760;
    const rowH = 28;
    const height = Math.max(110, 34 + rows.length * rowH);
    const pad = { left: 58, right: 76, top: 16, bottom: 18 };
    const plotW = width - pad.left - pad.right;
    const max = Math.max(1, ...rows.map((row) => number(row.totalHp)));
    const body = rows.map((row, index) => {
      const y = pad.top + index * rowH;
      let cursor = pad.left;
      const totalW = Math.max(1, (number(row.totalHp) / max) * plotW);
      const total = Math.max(1, number(row.totalHp));
      const rects = segments.map((segment) => {
        const widthPart = Math.max(0, (number(row[segment.key]) / total) * totalW);
        const rect = widthPart > 0.5
          ? `<rect x="${cursor}" y="${y + 5}" width="${widthPart}" height="14" fill="${segment.color}"><title>${escape(segment.label)} ${format(row[segment.key])}</title></rect>`
          : "";
        cursor += widthPart;
        return rect;
      }).join("");
      return `<text x="8" y="${y + 17}" class="bar-label">W${escape(row.wave)}</text>
        <rect x="${pad.left}" y="${y + 5}" width="${plotW}" height="14" rx="2" class="bar-bg"></rect>
        ${rects}
        <text x="${width - 8}" y="${y + 17}" text-anchor="end" class="bar-number">${format(row.totalHp)}</text>`;
    }).join("");
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="wave hp stack">${body}</svg>${legend(segments)}`;
  }

  function scatterPlot(items, options = {}) {
    const rows = (items || []).filter((item) => number(options.x(item)) > 0 && number(options.y(item)) > 0);
    if (!rows.length) return emptyChart("관측 로그가 쌓이면 이론값과 실전값을 비교합니다");
    const width = options.width || 760;
    const height = options.height || 260;
    const pad = { left: 58, right: 22, top: 22, bottom: 46 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const xMax = Math.max(1, ...rows.map((item) => number(options.x(item)))) * 1.12;
    const yMax = Math.max(1, ...rows.map((item) => number(options.y(item)))) * 1.12;
    const xFor = (value) => pad.left + (number(value) / xMax) * plotW;
    const yFor = (value) => pad.top + (1 - number(value) / yMax) * plotH;
    const ticks = [0, .25, .5, .75, 1];
    const grid = ticks.map((tick) => {
      const x = pad.left + tick * plotW;
      const y = pad.top + tick * plotH;
      return `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${height - pad.bottom}" class="grid-line"></line>
        <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="grid-line"></line>`;
    }).join("");
    const dots = rows.map((item) => `<circle cx="${xFor(options.x(item))}" cy="${yFor(options.y(item))}" r="6" fill="${escape(options.color ? options.color(item) : NEUTRAL)}" opacity=".86">
      <title>${escape(options.label(item))}: 이론 ${format(options.x(item), 1)} / 실전 ${format(options.y(item), 1)}</title>
    </circle>`).join("");
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="scatter chart">
      ${grid}
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="axis-line"></line>
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="axis-line"></line>
      <text x="${pad.left}" y="${height - 12}" class="axis-label">이론 1회 소환 기대딜</text>
      <text x="${pad.left - 42}" y="${pad.top + 8}" class="axis-label">실전 피해</text>
      ${dots}
    </svg>`;
  }

  function funnelChart(items, options = {}) {
    const rows = (items || []).filter((item) => number(item.value, NaN) >= 0);
    if (!rows.length) return emptyChart();
    const width = options.width || 760;
    const rowH = options.rowHeight || 44;
    const height = Math.max(124, 24 + rows.length * rowH);
    const left = 142;
    const right = 118;
    const plotW = width - left - right;
    const max = Math.max(1, rows[0]?.value || 0, ...rows.map((row) => number(row.value)));
    const body = rows.map((row, index) => {
      const y = 14 + index * rowH;
      const value = number(row.value);
      const rate = index === 0 ? 1 : value / Math.max(1, number(rows[index - 1]?.value));
      const totalRate = value / Math.max(1, number(rows[0]?.value));
      const barW = Math.max(2, value / max * plotW);
      const color = row.color || (rate < .35 ? "#c33d3d" : rate < .65 ? "#e3a51b" : "#15946f");
      return `<text x="8" y="${y + 18}" class="bar-label">${escape(row.label)}</text>
        <rect x="${left}" y="${y + 5}" width="${plotW}" height="18" rx="3" class="bar-bg"></rect>
        <rect x="${left}" y="${y + 5}" width="${barW}" height="18" rx="3" fill="${escape(color)}"></rect>
        <text x="${left + barW + 8}" y="${y + 18}" class="bar-number">${escape(format(value, 1))}</text>
        <text x="${width - 8}" y="${y + 18}" text-anchor="end" class="axis-label">${index ? `${percent(rate, 0)} / 누적 ${percent(totalRate, 0)}` : escape(row.detail || "기준")}</text>`;
    }).join("");
    return `<svg class="chart-svg funnel-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(options.label || "funnel chart")}">${body}</svg>`;
  }

  function waveDamageStackChart(rows) {
    const source = (rows || []).filter((row) => row.samples);
    if (!source.length) return emptyChart("웨이브 로그가 쌓이면 피해 비중을 표시합니다");
    const width = 760;
    const rowH = 32;
    const height = Math.max(120, 28 + source.length * rowH);
    const left = 58;
    const right = 86;
    const plotW = width - left - right;
    const body = source.map((row, index) => {
      const y = 14 + index * rowH;
      const piece = number(row.observed?.pieceDamage);
      const system = number(row.observed?.systemDamage);
      const total = Math.max(1, piece + system);
      const pieceW = piece / total * plotW;
      const systemW = system / total * plotW;
      return `<text x="8" y="${y + 17}" class="bar-label">W${escape(row.wave)}</text>
        <rect x="${left}" y="${y + 5}" width="${plotW}" height="16" rx="2" class="bar-bg"></rect>
        <rect x="${left}" y="${y + 5}" width="${pieceW}" height="16" fill="#276dcc"><title>기물 피해 ${format(piece)}</title></rect>
        <rect x="${left + pieceW}" y="${y + 5}" width="${systemW}" height="16" fill="${row.systemShare > .5 ? "#c33d3d" : "#7b67d6"}"><title>시스템 피해 ${format(system)}</title></rect>
        <text x="${width - 8}" y="${y + 17}" text-anchor="end" class="bar-number">시스템 ${percent(row.systemShare, 0)}</text>`;
    }).join("");
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="wave damage stack">${body}</svg>${legend([
      { label: "기물 피해", color: "#276dcc" },
      { label: "시스템 피해", color: "#7b67d6" },
    ])}`;
  }

  function heatColor(value) {
    const v = clamp(value, 0, 100);
    if (v >= 72) return "#b83131";
    if (v >= 48) return "#df8e1d";
    if (v >= 26) return "#e4bf36";
    return "#2a9b6f";
  }

  function waveSkillHeatmapChart(rows) {
    if (!rows.length) return emptyChart("숙련도별 웨이브 표본이 부족합니다");
    const waves = [...new Set(rows.map((row) => row.wave))].sort((a, b) => a - b);
    const cellW = 58;
    const cellH = 42;
    const left = 96;
    const top = 34;
    const width = left + waves.length * cellW + 18;
    const height = top + SKILL_KEYS.length * cellH + 34;
    const map = new Map(rows.map((row) => [`${row.skill}:${row.wave}`, row]));
    const xLabels = waves.map((wave, index) => `<text x="${left + index * cellW + cellW / 2}" y="20" text-anchor="middle" class="axis-label">W${wave}</text>`).join("");
    const body = SKILL_KEYS.map((skill, rowIndex) => {
      const meta = SKILL_META[skill];
      const y = top + rowIndex * cellH;
      const label = `<text x="8" y="${y + 25}" class="bar-label" fill="${meta.color}">${escape(meta.label)}</text>`;
      const cells = waves.map((wave, index) => {
        const cell = map.get(`${skill}:${wave}`);
        const x = left + index * cellW;
        if (!cell?.samples) {
          return `<rect x="${x}" y="${y}" width="${cellW - 4}" height="${cellH - 5}" rx="4" class="heat-empty"></rect>
            <text x="${x + cellW / 2 - 2}" y="${y + 24}" text-anchor="middle" class="axis-label">-</text>`;
        }
        const color = heatColor(cell.danger);
        return `<rect x="${x}" y="${y}" width="${cellW - 4}" height="${cellH - 5}" rx="4" fill="${color}"><title>${escape(meta.label)} W${wave}: 위험 ${format(cell.danger, 1)} / n=${cell.samples}</title></rect>
          <text x="${x + cellW / 2 - 2}" y="${y + 17}" text-anchor="middle" class="heat-number">${format(cell.danger, 0)}</text>
          <text x="${x + cellW / 2 - 2}" y="${y + 31}" text-anchor="middle" class="heat-sample">n=${cell.samples}</text>`;
      }).join("");
      return `${label}${cells}`;
    }).join("");
    return `<svg class="chart-svg heatmap-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="skill wave heatmap">
      ${xLabels}${body}
      <text x="${left}" y="${height - 7}" class="axis-label">초록 안정 · 노랑 주의 · 주황/빨강 위험</text>
    </svg>`;
  }

  function getWaveEventRows() {
    return (logs.events || []).filter((event) => event.event_type === "wave_end").map((event) => {
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
        slot_damage_taken: payload.slotDamageTaken || "",
        max_combo: payload.maxCombo || event.max_combo,
        piece_damage: sumPieceDamage(payload.damageByPiece),
        system_damage: sumObject(payload.systemDamageBySource),
        alive_slot_count: slot.aliveSlotCount ?? event.alive_slot_count,
        destroyed_slot_count: slot.destroyedSlotCount ?? event.destroyed_slot_count,
        slot_hp_total: slot.slotHpTotal ?? event.slot_hp_total,
        slot_hp_ratio_avg: slot.slotHpRatioAvg ?? event.slot_hp_ratio_avg,
      };
    });
  }

  function getWaveRows() {
    return (logs.wave_stats || []).length ? logs.wave_stats : getWaveEventRows();
  }

  function getPieceRows() {
    if ((logs.piece_damage || []).length) return logs.piece_damage;
    return (logs.events || []).filter((event) => event.event_type === "session_end").flatMap((event) => {
      const payload = safeJson(event.payload_json, {});
      return (payload.damageByPiece || []).map((piece) => ({
        received_at: event.received_at,
        session_id: event.session_id,
        event_id: event.event_id,
        build_version: event.build_version,
        balance_snapshot_id: event.balance_snapshot_id || "legacy",
        piece_key: piece.pieceKey || "",
        piece_name: piece.pieceName || "",
        tower_id: piece.towerId || "",
        tower_type: piece.towerType || "",
        tower_level: String(piece.pieceKey || "").match(/_(\d+)$/)?.[1] || "",
        damage_done: piece.damage || 0,
      }));
    });
  }

  function getPieceWaveRows() {
    if ((logs.piece_wave_stats || []).length) return logs.piece_wave_stats;
    return (logs.events || []).filter((event) => event.event_type === "wave_end").flatMap((event) => {
      const payload = safeJson(event.payload_json, {});
      return (payload.pieceStats || []).map((piece) => ({
        received_at: event.received_at,
        session_id: event.session_id,
        event_id: event.event_id,
        build_version: event.build_version,
        balance_snapshot_id: event.balance_snapshot_id || "legacy",
        stage_key: event.stage_key,
        wave_ordinal: payload.waveOrdinal || event.wave_ordinal,
        piece_key: piece.pieceKey || "",
        piece_name: piece.pieceName || "",
        tower_id: piece.towerId || "",
        tower_type: piece.towerType || "",
        tower_level: piece.towerLevel || "",
        active_sec: piece.activeSec || 0,
        attacks_fired: piece.attacksFired || 0,
        projectiles_fired: piece.projectilesFired || 0,
        hits: piece.hits || 0,
        damage_done: piece.damageDone || 0,
        healing_done: piece.healingDone || 0,
        overdrive_damage: piece.overdriveDamage || 0,
      }));
    });
  }

  function getPerkRows() {
    if ((logs.perk_options || []).length) return logs.perk_options;
    return (logs.events || []).filter((event) => event.event_type === "perk_pick").flatMap((event) => {
      const payload = safeJson(event.payload_json, {});
      const pickedId = String(payload.picked?.id || "");
      return (payload.offered || []).map((perk) => ({
        received_at: event.received_at,
        session_id: event.session_id,
        event_id: event.event_id,
        build_version: event.build_version,
        balance_snapshot_id: event.balance_snapshot_id || "legacy",
        stage_key: event.stage_key,
        wave_ordinal: event.wave_ordinal,
        perk_id: perk.id || "",
        perk_title: perk.title || "",
        rarity: perk.rarity || "",
        target_type: perk.targetType || "",
        label: perk.label || "",
        selected: String(perk.id || "") === pickedId ? "TRUE" : "FALSE",
      }));
    });
  }

  function getSystemRows() {
    if ((logs.system_stats || []).length) return logs.system_stats;
    return (logs.events || []).filter((event) => event.event_type === "wave_end").flatMap((event) => {
      const payload = safeJson(event.payload_json, {});
      const activations = payload.systemActivations || {};
      const damage = payload.systemDamageBySource || {};
      return [...new Set([...Object.keys(activations), ...Object.keys(damage)])].map((source) => ({
        received_at: event.received_at,
        session_id: event.session_id,
        event_id: event.event_id,
        build_version: event.build_version,
        balance_snapshot_id: event.balance_snapshot_id || "legacy",
        stage_key: event.stage_key,
        wave_ordinal: payload.waveOrdinal || event.wave_ordinal,
        source,
        activation_count: activations[source]?.count || 0,
        projectiles: activations[source]?.projectiles || 0,
        ammo_spent: activations[source]?.ammoSpent || 0,
        damage_done: damage[source] || 0,
      }));
    });
  }

  function sumPieceDamage(value) {
    if (Array.isArray(value)) return sum(value, (item) => item.damage || item.damage_done);
    return sumObject(value);
  }

  function sumObject(value) {
    return value && typeof value === "object" ? sum(Object.values(value), (item) => item) : 0;
  }

  function getWaveGroups() {
    const groups = new Map();
    for (const row of filteredRows(getWaveRows())) {
      const key = number(row.wave_ordinal || row.wave);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([wave, rows]) => ({
      wave,
      samples: rows.length,
      remaining: average(rows, (row) => row.remaining_enemy_count),
      slotHp: average(rows, (row) => row.slot_hp_ratio_avg),
      sorts: average(rows, (row) => row.sort_successes),
      attempts: average(rows, (row) => row.sort_attempts),
      pieceDamage: average(rows, (row) => row.piece_damage),
      systemDamage: average(rows, (row) => row.system_damage),
      defeated: average(rows, (row) => row.enemy_defeated),
      spawned: average(rows, (row) => row.enemy_spawned),
      maxCombo: average(rows, (row) => row.max_combo),
      repairCount: average(rows, (row) => row.repair_count),
      slotDamageTaken: average(rows, (row) => row.slot_damage_taken),
    }));
  }

  function getSystemGroups() {
    const groups = new Map();
    for (const row of filteredRows(getSystemRows())) {
      const key = row.source || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.entries()].map(([source, rows]) => ({
      source,
      damage: sum(rows, (row) => row.damage_done),
      activations: sum(rows, (row) => row.activation_count),
      projectiles: sum(rows, (row) => row.projectiles),
      ammoSpent: sum(rows, (row) => row.ammo_spent),
    })).sort((a, b) => b.damage - a.damage);
  }

  function getGroupMonsters(groupId) {
    const group = tableRows("MonsterGroupData").find((row) => String(row.MonsterGroupID) === String(groupId));
    const monsterMap = new Map(tableRows("MonsterData").map((row) => [String(row.MonsterID), row]));
    return [1, 2, 3].map((index) => {
      const id = group?.[`MonsterID_${index}`];
      return id ? monsterMap.get(String(id)) : null;
    });
  }

  function weightedMonsterBudget(monsters, count, weights) {
    const available = monsters.map((monster, index) => ({ monster, weight: number(weights[index]) })).filter((item) => item.monster);
    if (!count || !available.length) return { count: 0, hp: 0, attack: 0, avgHp: 0 };
    let weightSum = sum(available, (item) => item.weight);
    if (weightSum <= 0) {
      available.forEach((item, index) => { item.weight = index === 0 ? 100 : 0; });
      weightSum = 100;
    }
    const hp = sum(available, (item) => number(count) * (item.weight / weightSum) * number(item.monster.MonsterHp));
    const attack = sum(available, (item) => {
      const attackSpeed = Math.max(.001, number(item.monster.MonsterAtkSpeed, 1));
      return number(count) * (item.weight / weightSum) * number(item.monster.MonsterAtk) / attackSpeed;
    });
    return { count: number(count), hp, attack, avgHp: hp / Math.max(1, number(count)) };
  }

  let cachedWaveTheory = null;
  function getWaveTheoryRows() {
    if (cachedWaveTheory) return cachedWaveTheory;
    const stage = tableRows("StageData")[0] || {};
    const waveData = tableRows("WaveData").find((row) => String(row.WaveID) === String(stage.WaveDataID)) || tableRows("WaveData")[0] || {};
    const patternsById = new Map(tableRows("WavePatternData").map((row) => [String(row.WavePatternID), row]));
    const normalGroup = getGroupMonsters(stage.MonsterGroupID_Normal);
    const speedyGroup = getGroupMonsters(stage.MonsterGroupID_Speedy);
    const tankerGroup = getGroupMonsters(stage.MonsterGroupID_Tanker);
    const patternIds = Object.keys(waveData)
      .filter((key) => /^WavePattern_\d+$/.test(key) && waveData[key])
      .sort((a, b) => number(a.split("_")[1]) - number(b.split("_")[1]))
      .map((key) => ({ wave: number(key.split("_")[1]), id: waveData[key] }));

    cachedWaveTheory = patternIds.map(({ wave, id }) => {
      const pattern = patternsById.get(String(id)) || {};
      const normal = weightedMonsterBudget(normalGroup, pattern.Normal_Count, [pattern.NormalRate_1, pattern.NormalRate_2, pattern.NormalRate_3]);
      const speedy = weightedMonsterBudget(speedyGroup, pattern.Speedy_Count, [100, 0, 0]);
      const tanker = weightedMonsterBudget(tankerGroup, pattern.Tanker_Count, [100, 0, 0]);
      const totalHp = normal.hp + speedy.hp + tanker.hp;
      const totalCount = normal.count + speedy.count + tanker.count;
      const attackPressure = normal.attack + speedy.attack + tanker.attack;
      return {
        wave,
        patternId: id,
        waveType: pattern.WaveType || (isTrue(pattern.isRush) ? "Rush" : ""),
        normalCount: normal.count,
        speedyCount: speedy.count,
        tankerCount: tanker.count,
        normalHp: normal.hp,
        speedyHp: speedy.hp,
        tankerHp: tanker.hp,
        totalHp,
        totalCount,
        avgHp: totalHp / Math.max(1, totalCount),
        attackPressure,
      };
    });
    return cachedWaveTheory;
  }

  function referenceMonsterHp() {
    const waves = getWaveTheoryRows();
    const totalHp = sum(waves, (row) => row.totalHp);
    const totalCount = sum(waves, (row) => row.totalCount);
    return totalCount ? totalHp / totalCount : 100;
  }

  function getWaveDashboardRows() {
    const observed = new Map(getWaveGroups().map((row) => [row.wave, row]));
    const theory = new Map(getWaveTheoryRows().map((row) => [row.wave, row]));
    const waves = [...new Set([...observed.keys(), ...theory.keys()])].sort((a, b) => a - b);
    const maxHp = Math.max(1, ...[...theory.values()].map((row) => row.totalHp));
    const maxRemaining = Math.max(1, ...[...observed.values()].map((row) => row.remaining));
    return waves.map((wave) => {
      const t = theory.get(wave) || {};
      const o = observed.get(wave) || {};
      const totalDamage = number(o.pieceDamage) + number(o.systemDamage);
      return {
        ...t,
        wave,
        observed: o,
        samples: o.samples || 0,
        remaining: number(o.remaining),
        remainingIndex: maxRemaining ? number(o.remaining) / maxRemaining * 100 : 0,
        slotHp: o.slotHp === undefined ? 0 : number(o.slotHp),
        slotDanger: o.slotHp === undefined ? 0 : Math.max(0, (1 - number(o.slotHp)) * 100),
        systemShare: totalDamage ? number(o.systemDamage) / totalDamage : 0,
        pressureIndex: number(t.totalHp) / maxHp * 100,
      };
    });
  }

  function getWaveSkillHeatmapRows() {
    const selected = filteredSessions();
    const sessionMap = new Map(selected.map((row) => [row.session_id, row]));
    const sourceRows = filteredRows(getWaveRows()).map((row) => {
      const session = sessionMap.get(row.session_id);
      const totalDamage = number(row.piece_damage) + number(row.system_damage);
      return {
        skill: session ? sessionSkillProfile(session) : "unknown",
        wave: number(row.wave_ordinal || row.wave),
        remaining: number(row.remaining_enemy_count),
        slotHp: normalizePercentValue(row.slot_hp_ratio_avg),
        systemShare: totalDamage ? number(row.system_damage) / totalDamage : 0,
      };
    }).filter((row) => SKILL_KEYS.includes(row.skill) && row.wave);
    const maxRemaining = Math.max(1, ...sourceRows.map((row) => row.remaining));
    const groups = new Map();
    for (const row of sourceRows) {
      const key = `${row.skill}:${row.wave}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.entries()].map(([key, rows]) => {
      const [skill, waveText] = key.split(":");
      const remainingRatio = average(rows, (row) => row.remaining) / maxRemaining;
      const slotDanger = 1 - average(rows, (row) => row.slotHp);
      const systemShare = average(rows, (row) => row.systemShare);
      return {
        skill,
        wave: number(waveText),
        samples: rows.length,
        remaining: average(rows, (row) => row.remaining),
        slotHp: average(rows, (row) => row.slotHp),
        systemShare,
        danger: clamp(slotDanger * 55 + remainingRatio * 35 + systemShare * 25, 0, 100),
      };
    }).sort((a, b) => SKILL_KEYS.indexOf(a.skill) - SKILL_KEYS.indexOf(b.skill) || a.wave - b.wave);
  }

  function theoryRows() {
    const refHp = referenceMonsterHp();
    return tableRows("TowerData").map((tower) => {
      const meta = typeMeta(tower.TowerType);
      const level = number(valueOf(tower, ["TowerLv", "tower_lv"]), 1);
      const count = Math.max(1, number(valueOf(tower, ["ProjectileCount", "TowerProjectileCount"]), 1));
      const rawInterval = Math.max(.001, number(valueOf(tower, ["TowerAtkSpeed", "AtkSpeed"]), 1));
      const interval = Math.max(.12, rawInterval);
      const ammo = number(valueOf(tower, ["TowerMaxAmmo", "MaxAmmo"]));
      const atk = number(valueOf(tower, ["TowerAtk", "ATK"]));
      const rawRange = number(valueOf(tower, ["TowerMaxLange", "TowerMaxRange", "TowerRange"]));
      const range = rawRange > 0 && rawRange <= 30 ? rawRange * 38 : rawRange;
      const rawProjectileSize = number(tower.ProjectileSize);
      const projectileSize = rawProjectileSize > 0 && rawProjectileSize <= 2 ? rawProjectileSize * 20 : rawProjectileSize;
      const projectileId = valueOf(tower, "TowerProjectile");
      const projectile = tableRows("ProjectileData").find((row) => String(row.ProjectileID) === String(projectileId)) || {};
      const currentHpRate = normalizePercentValue(valueOf(tower, ["current_hp", "CurrentHp"]));
      const percentDamage = currentHpRate * refHp;
      const perVolleyDamage = (atk + percentDamage) * count;
      return {
        pieceKey: `${meta.key}_${level}`,
        towerId: tower.TowerID,
        type: meta.sheet,
        typeKey: meta.key,
        label: meta.label,
        color: meta.color,
        ai: AI_NAMES[tower.TowerAiType] || tower.TowerAiType,
        level,
        atk,
        rawInterval,
        interval,
        count,
        ammo,
        rawRange,
        range,
        projectileId,
        projectileType: valueOf(projectile, "ProjectileType", valueOf(tower, "ProjectileType", "normal")),
        projectilePrefab: valueOf(projectile, "ProjectilePrefab"),
        projectileSize,
        splash: number(tower.SplashRadius),
        piercing: number(tower.PiercingCount),
        bulletSpeed: number(tower.BulletSpeed),
        currentHpRate,
        currentHpDisplay: currentHpRate ? percent(currentHpRate) : "-",
        dpsBase: atk * count / interval,
        dps: perVolleyDamage / interval,
        magazineDamageBase: atk * count * ammo,
        magazineDamage: perVolleyDamage * ammo,
      };
    }).filter((row) => row.level >= 1 && row.level <= PIECE_MAX_LEVEL)
      .sort((a, b) => a.typeKey.localeCompare(b.typeKey) || a.level - b.level);
  }

  function getObservedPieceSummary() {
    const rows = filteredRows(getPieceRows());
    const groups = new Map();
    for (const row of rows) {
      const parsedLevel = String(row.piece_key || "").match(/_(\d+)$/)?.[1];
      const typeKey = normalizeTowerTypeKey(row.tower_type || row.piece_key || row.piece_name);
      const level = number(row.tower_level || parsedLevel || 1);
      const key = row.piece_key || `${typeKey}_${level}`;
      if (!groups.has(key)) {
        const meta = Object.values(TYPE_META).find((item) => item.key === typeKey) || typeMeta(typeKey);
        groups.set(key, {
          key,
          typeKey,
          label: row.piece_name || meta.label,
          typeLabel: meta.label,
          color: meta.color,
          level,
          rows: [],
        });
      }
      groups.get(key).rows.push(row);
    }
    const totalDamage = sum(rows, (row) => row.damage_done || row.damage);
    return [...groups.values()].map((group) => ({
      ...group,
      samples: group.rows.length,
      damage: sum(group.rows, (row) => row.damage_done || row.damage),
      avgDamage: average(group.rows, (row) => row.damage_done || row.damage),
      share: totalDamage ? sum(group.rows, (row) => row.damage_done || row.damage) / totalDamage : average(group.rows, (row) => row.damage_share),
      activeSec: average(group.rows, (row) => row.active_sec),
      hits: sum(group.rows, (row) => row.hits),
      healing: sum(group.rows, (row) => row.healing_done),
    })).sort((a, b) => b.damage - a.damage);
  }

  function observedTowerMap() {
    return new Map(getObservedPieceSummary().map((row) => [row.key, row]));
  }

  function getTowerEfficiencyRows() {
    const detailed = getPieceWaveRows();
    const source = filteredRows(detailed.length ? detailed : getPieceRows());
    const groups = new Map();
    for (const row of source) {
      const parsedLevel = String(row.piece_key || "").match(/_(\d+)$/)?.[1];
      const typeKey = normalizeTowerTypeKey(row.tower_type || row.piece_key || row.piece_name);
      const level = Math.min(PIECE_MAX_LEVEL, Math.max(1, number(row.tower_level || parsedLevel || 1)));
      const key = row.piece_key || `${typeKey}_${level}`;
      if (!groups.has(key)) {
        const meta = Object.values(TYPE_META).find((item) => item.key === typeKey) || typeMeta(typeKey);
        groups.set(key, { key, typeKey, level, label: row.piece_name || meta.label, color: meta.color, rows: [], sessions: new Set() });
      }
      const group = groups.get(key);
      group.rows.push(row);
      if (row.session_id) group.sessions.add(row.session_id);
    }
    return [...groups.values()].map((group) => {
      const damage = sum(group.rows, (row) => row.damage_done || row.damage);
      const healing = sum(group.rows, (row) => row.healing_done);
      const created = sum(group.rows, (row) => row.tower_created || row.created);
      const activeSec = sum(group.rows, (row) => row.active_sec);
      const attacks = sum(group.rows, (row) => row.attacks_fired);
      const projectiles = sum(group.rows, (row) => row.projectiles_fired);
      const hits = sum(group.rows, (row) => row.hits);
      return {
        ...group,
        samples: group.sessions.size || group.rows.length,
        damage,
        healing,
        created,
        activeSec,
        attacks,
        projectiles,
        hits,
        damagePerTower: created ? damage / created : 0,
        damagePerSec: activeSec ? damage / activeSec : 0,
        damagePerAttack: attacks ? damage / attacks : 0,
        damagePerProjectile: projectiles ? damage / projectiles : 0,
        hitRate: projectiles ? hits / projectiles : 0,
      };
    }).sort((a, b) => b.damagePerTower - a.damagePerTower);
  }

  function getPerkSummary() {
    const sessionMap = new Map(filteredSessions().map((row) => [row.session_id, row]));
    const groups = new Map();
    for (const row of filteredRows(getPerkRows())) {
      const key = row.perk_id || row.perk_title || "unknown";
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          title: row.perk_title || key,
          rarity: row.rarity || "-",
          target: row.target_type || row.label || "-",
          offered: 0,
          picked: 0,
          pickedSessions: [],
        });
      }
      const group = groups.get(key);
      group.offered += 1;
      if (isTrue(row.selected)) {
        group.picked += 1;
        const session = sessionMap.get(row.session_id);
        if (session) group.pickedSessions.push(session);
      }
    }
    return [...groups.values()].map((row) => ({
      ...row,
      rate: row.offered ? row.picked / row.offered : 0,
      avgReached: average(row.pickedSessions, (session) => session.reached_wave),
      clearRate: row.pickedSessions.length
        ? row.pickedSessions.filter((session) => session.result === "clear").length / row.pickedSessions.length
        : 0,
    })).sort((a, b) => b.rate - a.rate || b.picked - a.picked || b.offered - a.offered);
  }

  function getPerkImpactRows() {
    const sessionMap = new Map(filteredSessions().map((row) => [row.session_id, row]));
    const groups = new Map();
    for (const row of filteredRows(getPerkRows())) {
      const session = sessionMap.get(row.session_id);
      if (!session) continue;
      const key = row.perk_id || row.perk_title || "unknown";
      if (!groups.has(key)) groups.set(key, { id: key, title: row.perk_title || key, picked: [], skipped: [] });
      const pickWave = number(row.wave_ordinal || row.wave, 0);
      const result = {
        progress: Math.max(0, number(session.reached_wave) - pickWave),
        reached: number(session.reached_wave),
        slotHp: normalizePercentValue(session.slot_hp_ratio_avg),
        clear: session.result === "clear" ? 1 : 0,
      };
      groups.get(key)[isTrue(row.selected) ? "picked" : "skipped"].push(result);
    }
    return [...groups.values()].map((group) => {
      const pickedProgress = average(group.picked, (item) => item.progress);
      const skippedProgress = average(group.skipped, (item) => item.progress);
      return {
        ...group,
        pickedProgress,
        skippedProgress,
        progressDelta: pickedProgress - skippedProgress,
        pickedReached: average(group.picked, (item) => item.reached),
        skippedReached: average(group.skipped, (item) => item.reached),
        pickedSlotHp: average(group.picked, (item) => item.slotHp),
        skippedSlotHp: average(group.skipped, (item) => item.slotHp),
        pickedClear: average(group.picked, (item) => item.clear),
        skippedClear: average(group.skipped, (item) => item.clear),
      };
    }).filter((row) => row.picked.length || row.skipped.length)
      .sort((a, b) => Math.abs(b.progressDelta) - Math.abs(a.progressDelta));
  }

  function getTargetDistribution(perks = getPerkSummary()) {
    const groups = new Map();
    for (const row of perks) {
      const key = row.target || "-";
      if (!groups.has(key)) groups.set(key, { target: key, picked: 0, offered: 0 });
      groups.get(key).picked += row.picked;
      groups.get(key).offered += row.offered;
    }
    return [...groups.values()].sort((a, b) => b.picked - a.picked);
  }

  function getDamageSourceShare() {
    const waves = getWaveGroups();
    const pieceDamage = sum(waves, (row) => row.pieceDamage);
    let systemDamage = sum(waves, (row) => row.systemDamage);
    if (!systemDamage) systemDamage = sum(getSystemGroups(), (row) => row.damage);
    const total = pieceDamage + systemDamage;
    return {
      pieceDamage,
      systemDamage,
      total,
      systemShare: total ? systemDamage / total : 0,
    };
  }

  function getDamageSourceShareForRows(rows) {
    const systemDamage = sum(rows, sessionSystemDamage);
    const total = sum(rows, sessionTotalDamage);
    return {
      pieceDamage: Math.max(0, total - systemDamage),
      systemDamage,
      total,
      systemShare: total ? systemDamage / total : 0,
    };
  }

  function getAlerts() {
    const alerts = [];
    const current = filteredSessions();
    const waves = getWaveDashboardRows();
    const perks = getPerkSummary();
    const pieces = getObservedPieceSummary();
    const source = getDamageSourceShare();
    const theoryLv1 = theoryRows().filter((row) => row.level === 1);

    if (!current.length) {
      alerts.push({ tone: "warn", title: "플레이 로그 없음", body: "로그가 들어오면 실전 지표와 이론값 비교가 활성화됩니다." });
    } else if (current.length < 10) {
      alerts.push({ tone: "warn", title: "표본 부족", body: `현재 필터 기준 세션 ${current.length}건입니다. 방향성은 보되 확정 판단은 조심해야 합니다.` });
    }

    if (source.systemShare > .45) {
      alerts.push({ tone: "bad", title: "필살기 의존도 높음", body: `시스템 공격 피해 비중이 ${percent(source.systemShare)}입니다. 기본 기물 공격력이나 탄창 기대값을 확인하세요.` });
    }

    const dangerWaves = waves.filter((row) => row.samples && (row.remaining >= 5 || row.slotHp < .45));
    for (const row of dangerWaves.slice(0, 3)) {
      alerts.push({
        tone: row.slotHp < .35 ? "bad" : "warn",
        title: `W${row.wave} 위험`,
        body: `평균 잔존 ${format(row.remaining, 1)}마리, 슬롯 체력 ${percent(row.slotHp)}입니다.`,
      });
    }

    const highPerk = perks.find((row) => row.offered >= 10 && row.rate >= .62);
    if (highPerk) {
      alerts.push({ tone: "warn", title: "특전 쏠림", body: `${highPerk.title} 선택률이 ${percent(highPerk.rate)}입니다. 같은 희귀도 대비 과하게 매력적일 수 있습니다.` });
    }
    const lowPerk = perks.find((row) => row.offered >= 10 && row.rate <= .1);
    if (lowPerk) {
      alerts.push({ tone: "warn", title: "죽은 특전 후보", body: `${lowPerk.title} 선택률이 ${percent(lowPerk.rate)}입니다. 표기/밸류/대상 타이밍을 확인하세요.` });
    }

    const topPiece = pieces[0];
    if (topPiece?.share > .42) {
      alerts.push({ tone: "bad", title: "기물 피해 과점", body: `${topPiece.label} 피해 점유율이 ${percent(topPiece.share)}입니다. 특정 기물 의존 플레이가 강할 수 있습니다.` });
    }

    if (theoryLv1.length >= 2) {
      const max = Math.max(...theoryLv1.map((row) => row.magazineDamage));
      const min = Math.min(...theoryLv1.map((row) => row.magazineDamage));
      if (min > 0 && max / min > 2.7) {
        alerts.push({ tone: "warn", title: "초기 기물 기대딜 편차 큼", body: `Lv1 기준 1회 소환 기대딜 편차가 ${format(max / min, 1)}배입니다.` });
      }
    }

    if (!alerts.length) {
      alerts.push({ tone: "good", title: "큰 이상 신호 없음", body: "현재 필터 기준으로 즉시 조정해야 할 강한 경고는 없습니다." });
    }
    return alerts;
  }

  function renderAlertList(alerts = getAlerts()) {
    return `<section class="section">${sectionTitle("자동 경고판", `${alerts.length}건`)}
      <div class="alert-grid">${alerts.map((item) => `<article class="alert-card ${escape(item.tone)}"><h3>${escape(item.title)}</h3><p>${escape(item.body)}</p></article>`).join("")}</div>
    </section>`;
  }

  function renderDecisionBoard() {
    const cards = getDecisionCards();
    return `<section class="decision-grid">
      ${cards.map((card) => `<article class="decision-card ${escape(card.tone)}">
        <div><span>${escape(card.title)}</span><strong>${escape(card.value)}</strong></div>
        <p>${escape(card.body)}</p>
        <button type="button" data-drill-view="${escape(card.view)}">${escape(card.action)}</button>
      </article>`).join("")}
    </section>`;
  }

  function renderOperationsCharts(waves) {
    const current = filteredSessions();
    return `<section class="chart-grid ops-grid">
      ${chartPanel("소팅 품질 퍼널", "이동 입력이 실제 3-Sort와 포탑 생성으로 이어지는 비율", funnelChart(getSortFunnelRows(current), { label: "sort funnel" }), "priority-chart")}
      ${chartPanel("세션 생존 퍼널", "웨이브 도달 기준으로 이탈 구간을 빠르게 확인", funnelChart(getSurvivalFunnelRows(current), { label: "survival funnel" }), "priority-chart")}
      ${chartPanel("웨이브 x 숙련도 위험 히트맵", "표본이 적은 칸은 n 값을 함께 보고 해석", waveSkillHeatmapChart(getWaveSkillHeatmapRows()), "wide-chart")}
      ${chartPanel("웨이브별 피해 비중", "시스템 피해가 빨갛게 커질수록 필살기 의존도가 높음", waveDamageStackChart(waves), "wide-chart")}
    </section>`;
  }

  function renderAutoReport() {
    const reportCards = getAutoReportCards();
    const reliabilityRows = getReliabilityRows();
    const versionRows = getVersionCohortRows();
    const cohortRows = getCohortPerformanceRows();
    const deltaClass = (value, reverse = false) => {
      const signed = reverse ? -number(value) : number(value);
      return signed > 0.001 ? "positive" : signed < -0.001 ? "negative" : "";
    };
    return `<section class="section">${sectionTitle("자동 운영 리포트", "표본 신뢰도 · 변경 영향 · 코호트 위험을 한 번에 확인")}
        <div class="report-grid">
          ${reportCards.map((card) => `<article class="report-card ${escape(card.tone)}">
            <span>${escape(card.title)}</span>
            <strong>${escape(card.value)}</strong>
            <em>${escape(card.detail)}</em>
            <p>${escape(card.body)}</p>
          </article>`).join("")}
        </div>
      </section>
      <section class="chart-grid">
        ${chartPanel("표본 신뢰도 등급", "100건 이상 A, 30건 미만은 참고용. 클리어율 오차폭과 함께 해석", horizontalBarChart(reliabilityRows, {
          value: (item) => item.score,
          label: (item) => `${item.label} · ${item.grade}`,
          color: (item) => item.tone === "good" ? "#14845f" : item.tone === "warn" ? "#e7a91b" : "#c73b3b",
          formatter: (value, item) => `${format(item.sessions)}건 · ±${percent(item.clearMargin, 0)}`,
          max: 100,
          limit: 10,
          labelLength: 24,
        }), "priority-chart")}
        ${chartPanel("최신 전후 도달 변화", "최신 스냅샷/빌드가 직전 대비 어떤 코호트에 영향을 줬는지 확인", deltaBarChart(versionRows, {
          value: (item) => item.reachedDelta,
          label: (item) => item.label,
          formatter: (value, item) => `${deltaText(value, (v) => `${format(v, 2)}W`)} · 클리어 ${deltaText(item.clearDelta, (v) => percent(v))}`,
          limit: 10,
          labelLength: 18,
        }), "priority-chart")}
        ${chartPanel("코호트별 클리어율", "REAL/SIM과 숙련도를 분리해서 평균에 가려지는 실패군 확인", horizontalBarChart(cohortRows, {
          value: (item) => item.clearRate,
          label: (item) => item.label,
          color: (item) => item.clearRate < .25 ? "#c33d3d" : item.clearRate < .55 ? "#e7a91b" : item.color,
          formatter: (value, item) => `${percent(value)} / ${item.sessions}건`,
          max: 1,
          limit: 12,
          labelLength: 24,
        }))}
        ${chartPanel("코호트별 평균 도달", "클리어율이 낮아도 어디에서 무너지는지 빠르게 확인", horizontalBarChart(cohortRows, {
          value: (item) => item.reached,
          label: (item) => item.label,
          color: (item) => item.grade === "E" || item.grade === "D" ? "#8b98a2" : item.color,
          formatter: (value, item) => `W${format(value, 1)} · ${item.grade}등급`,
          limit: 12,
          labelLength: 24,
        }))}
      </section>
      <section class="section">${sectionTitle("표본 신뢰도 상세", "오차폭이 큰 구간은 밸런스 확정 대신 추가 로그 수집 대상으로 본다")}
        <div class="table-wrap"><table><thead><tr><th>구간</th><th>등급</th><th>표본</th><th>클리어율</th><th>오차폭</th><th>평균 도달</th><th>도달 변동</th><th>소팅 전환율</th><th>평균 간격</th><th>판정</th></tr></thead><tbody>
          ${reliabilityRows.map((row) => `<tr><td>${escape(row.label)}</td><td class="${row.tone === "good" ? "positive" : row.tone === "bad" ? "negative" : "warning"}">${escape(row.grade)}</td><td>${format(row.sessions)}</td><td>${percent(row.clearRate)}</td><td>±${percent(row.clearMargin, 0)}</td><td>W${format(row.reached, 1)}</td><td>${format(row.reachedStddev, 2)}</td><td>${percent(row.conversion)}</td><td>${intervalValue(row.interval, row.intervalSamples)}</td><td>${escape(row.reliabilityLabel)}</td></tr>`).join("")}
        </tbody></table></div>
      </section>
      <section class="section">${sectionTitle("최신 변경 전후 코호트 비교", versionRows.length ? "직전 버전 대비 최신 버전 영향" : "스냅샷/빌드 2개부터 활성화")}
        ${versionRows.length ? `<div class="table-wrap"><table><thead><tr><th>코호트</th><th>이전 표본</th><th>최신 표본</th><th>클리어율 Δ</th><th>평균 도달 Δ</th><th>소팅 완성 Δ</th><th>슬롯 체력 Δ</th><th>시스템 의존 Δ</th></tr></thead><tbody>
          ${versionRows.map((row) => `<tr><td>${escape(row.label)}</td><td>${format(row.beforeSamples)}</td><td>${format(row.afterSamples)}</td><td class="${deltaClass(row.clearDelta)}">${deltaText(row.clearDelta, (value) => percent(value))}</td><td class="${deltaClass(row.reachedDelta)}">${deltaText(row.reachedDelta, (value) => `${format(value, 2)}W`)}</td><td class="${deltaClass(row.sortDelta)}">${deltaText(row.sortDelta, (value) => format(value, 1))}</td><td class="${deltaClass(row.slotHpDelta)}">${deltaText(row.slotHpDelta, (value) => percent(value))}</td><td class="${deltaClass(row.systemDelta, true)}">${deltaText(row.systemDelta, (value) => percent(value))}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="notice">현재 로그에서는 직전/최신 스냅샷을 나눌 수 없습니다. 데이터 테이블 갱신 후 로그가 쌓이면 이 표가 자동으로 켜집니다.</div>`}
      </section>`;
  }

  function renderExperimentSummary() {
    const stageRows = getStageExperimentRows();
    const loadoutRows = getLoadoutExperimentRows();
    const typeRows = getPieceTypeExperimentRows();
    if (!stageRows.length && !loadoutRows.length) return "";
    const resultClass = (value) => value >= .65 ? "positive" : value < .25 ? "negative" : "";
    return `<section class="chart-grid">
        ${chartPanel("스테이지별 클리어율", "현재 필터 기준 세션 결과", horizontalBarChart(stageRows, {
          value: (item) => item.clearRate,
          label: (item) => item.label,
          color: (item) => item.clearRate < .25 ? "#c33d3d" : item.clearRate < .55 ? "#e3a51b" : "#15946f",
          formatter: (value, item) => `${percent(value)} / ${item.sessions}건`,
          max: 1,
          limit: 12,
          labelLength: 26,
        }))}
        ${chartPanel("기물 조합별 평균 도달", "같은 조합 hash 기준", horizontalBarChart(loadoutRows.slice(0, 12), {
          value: (item) => item.reached,
          label: (item) => clip(item.label, 34),
          color: (item) => item.clearRate < .25 ? "#c33d3d" : "#276dcc",
          formatter: (value, item) => `W${format(value, 1)} · 클리어 ${percent(item.clearRate)}`,
          limit: 12,
          labelLength: 34,
        }))}
        ${chartPanel("타입 구성별 성과", "가져간 기물 역할 구성을 기준으로 묶음", horizontalBarChart(typeRows.slice(0, 12), {
          value: (item) => item.reached,
          label: (item) => item.label,
          color: (item) => item.systemShare > .5 ? "#c33d3d" : "#14845f",
          formatter: (value, item) => `W${format(value, 1)} · 시스템 ${percent(item.systemShare)}`,
          limit: 12,
          labelLength: 32,
        }))}
      </section>
      <section class="section">${sectionTitle("스테이지별 실험 지표", `${stageRows.length}개 스테이지`)}
        <div class="table-wrap"><table><thead><tr><th>스테이지</th><th>세션</th><th>클리어율</th><th>평균 도달</th><th>평균 소팅</th><th>슬롯 체력</th><th>시스템 피해</th></tr></thead><tbody>
          ${stageRows.map((row) => `<tr><td>${escape(row.label)}</td><td>${format(row.sessions)}</td><td class="${resultClass(row.clearRate)}">${percent(row.clearRate)}</td><td>W${format(row.reached, 1)}</td><td>${format(row.successes, 1)}</td><td>${percent(row.slotHp)}</td><td class="${row.systemShare > .5 ? "negative" : ""}">${percent(row.systemShare)}</td></tr>`).join("")}
        </tbody></table></div></section>
      <section class="section">${sectionTitle("기물 조합별 실험 지표", `${loadoutRows.length}개 조합`)}
        <div class="table-wrap"><table><thead><tr><th>기물 조합</th><th>타입 구성</th><th>세션</th><th>클리어율</th><th>평균 도달</th><th>평균 소팅</th><th>슬롯 체력</th><th>시스템 피해</th></tr></thead><tbody>
          ${loadoutRows.slice(0, 24).map((row) => {
            const sample = filteredSessions().find((session) => sessionLoadoutHash(session) === row.key) || {};
            return `<tr><td>${escape(row.label)}</td><td>${escape(sessionPieceTypeSignature(sample))}</td><td>${format(row.sessions)}</td><td class="${resultClass(row.clearRate)}">${percent(row.clearRate)}</td><td>W${format(row.reached, 1)}</td><td>${format(row.successes, 1)}</td><td>${percent(row.slotHp)}</td><td class="${row.systemShare > .5 ? "negative" : ""}">${percent(row.systemShare)}</td></tr>`;
          }).join("")}
        </tbody></table></div></section>`;
  }

  function renderSkillSummary() {
    const rows = getSkillSummaryRows();
    if (!rows.some((row) => row.sessions)) return "";
    return `<section class="chart-grid">
        ${chartPanel("숙련도별 클리어율", "초급/중급을 밸런스 기준으로 먼저 확인", horizontalBarChart(rows, {
          value: (item) => item.clearRate,
          label: (item) => item.label,
          color: (item) => item.color,
          formatter: (value, item) => `${percent(value)} / ${item.sessions}건`,
          max: 1,
          limit: 3,
          labelLength: 16,
        }))}
        ${chartPanel("숙련도별 평균 도달", "상급자보다 초급/중급 안정 구간을 우선 확인", horizontalBarChart(rows, {
          value: (item) => item.reached,
          label: (item) => item.label,
          color: (item) => item.color,
          formatter: (value, item) => `W${format(value, 1)} · 소팅 ${format(item.successes, 1)}`,
          limit: 3,
          labelLength: 16,
        }))}
      </section>
      <section class="section">${sectionTitle("숙련도별 핵심 지표", "초보자는 초반 이탈, 중급자는 안정 클리어 가능성 확인")}
        <div class="table-wrap"><table><thead><tr><th>숙련도</th><th>표본</th><th>클리어율</th><th>평균 도달</th><th>소팅 완성</th><th>소팅 시도</th><th>전환율</th><th>평균 간격</th><th>목표 간격</th><th>최대 콤보</th><th>슬롯 체력</th></tr></thead><tbody>
          ${rows.map((row) => `<tr><td><span style="color:${row.color};font-weight:800">${escape(row.label)}</span></td><td>${format(row.sessions)}</td><td class="${row.clearRate < .25 ? "negative" : row.clearRate >= .55 ? "positive" : ""}">${percent(row.clearRate)}</td><td>W${format(row.reached, 1)}</td><td>${format(row.successes, 1)}</td><td>${format(row.attempts, 1)}</td><td>${percent(row.conversion)}</td><td>${intervalValue(row.interval, row.intervalSamples)}</td><td>${format(row.targetDelay, 2)}초</td><td>${format(row.combo, 1)}</td><td>${percent(row.slotHp)}</td></tr>`).join("")}
        </tbody></table></div>
      </section>`;
  }

  function renderOverview() {
    const current = filteredSessions();
    const waves = getWaveDashboardRows();
    const source = getDamageSourceShare();
    const pieces = getObservedPieceSummary();
    const perks = getPerkSummary();
    const clears = current.filter((row) => row.result === "clear").length;
    const totalSortAttempts = sum(current, (row) => row.sort_attempts);
    const totalSortSuccesses = sum(current, (row) => row.sort_successes);
    const intervalSessions = current.filter((row) => Number.isFinite(sessionSortInterval(row)) && sessionSortInterval(row) > 0);
    const plannedSessions = current.filter((row) => Number.isFinite(sessionPlannedSortRatio(row)));
    const unlockSessions = current.filter((row) => Number.isFinite(sessionBoardUnlockCount(row)));
    const averageSortInterval = average(intervalSessions, sessionSortInterval);
    const dangerWave = waves.slice().sort((a, b) => (b.remaining + b.slotDanger / 12 + b.systemShare * 8) - (a.remaining + a.slotDanger / 12 + a.systemShare * 8))[0];

    return `${notice()}
      ${renderDecisionBoard()}
      ${renderAutoReport()}
      <section class="kpis">
        ${kpi("세션", format(current.length), `전체 ${sessions.length}건`)}
        ${kpi("클리어율", percent(current.length ? clears / current.length : 0), `${clears}회 클리어`, current.length && clears / current.length < .35 ? "red" : "green")}
        ${kpi("평균 도달 웨이브", format(average(current, (row) => row.reached_wave), 1), "세션 종료 기준", "yellow")}
        ${kpi("평균 소팅 시도", format(average(current, (row) => row.sort_attempts), 1), "세션당 이동")}
        ${kpi("평균 3-Sort 완성", format(average(current, (row) => row.sort_successes), 1), "세션당")}
        ${kpi("소팅 전환율", percent(totalSortAttempts ? totalSortSuccesses / totalSortAttempts : 0), "완성 ÷ 이동", totalSortAttempts && totalSortSuccesses / totalSortAttempts < .3 ? "red" : "green")}
        ${kpi("평균 소팅 간격", intervalSessions.length ? `${format(averageSortInterval, 2)}초` : "-", intervalSessions.length ? `${intervalSessions.length}세션 기준` : "간격 로그 없음")}
        ${kpi("계획형 소팅", plannedSessions.length ? percent(average(plannedSessions, sessionPlannedSortRatio)) : "-", plannedSessions.length ? `${plannedSessions.length}세션 기준` : "신규 시뮬 로그 필요", plannedSessions.length ? "green" : "")}
        ${kpi("보드 해제 이동", unlockSessions.length ? format(average(unlockSessions, sessionBoardUnlockCount), 1) : "-", unlockSessions.length ? "세션당 응급 이동" : "신규 시뮬 로그 필요", unlockSessions.length && average(unlockSessions, sessionBoardUnlockCount) > 8 ? "yellow" : "")}
        ${kpi("평균 최대 콤보", format(average(current, (row) => row.max_combo), 1), "세션당")}
        ${kpi("종료 슬롯 체력", percent(average(current, (row) => row.slot_hp_ratio_avg)), "평균 잔존율", "green")}
        ${kpi("시스템 피해 비중", percent(source.systemShare), "콤보/전체정렬/기타", source.systemShare > .45 ? "red" : "yellow")}
        ${kpi("위험 웨이브", dangerWave?.wave ? `W${dangerWave.wave}` : "-", dangerWave?.samples ? `잔존 ${format(dangerWave.remaining, 1)} / 슬롯 ${percent(dangerWave.slotHp)}` : "관측 대기", "red")}
      </section>

      ${renderOperationsCharts(waves)}

      <section class="chart-grid">
        ${chartPanel("웨이브 압력과 실제 여유", "체력 예산/잔존/슬롯 위험을 0~100 지수로 비교", lineChart([
          { name: "체력 예산", color: "#276dcc", values: waves.map((row) => ({ x: row.wave, y: row.pressureIndex })) },
          { name: "잔존 몬스터", color: "#c33d3d", values: waves.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.remainingIndex })) },
          { name: "슬롯 위험", color: "#e3a51b", values: waves.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.slotDanger })) },
          { name: "시스템 의존", color: "#7b67d6", values: waves.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.systemShare * 100 })) },
        ], { labels: waves.map((row) => String(row.wave)), minY: 0, maxY: 100, formatter: (value) => `${format(value)}점`, xPrefix: "W" }))}
        ${chartPanel("몬스터 체력 구성", "데이터 테이블 기준 스테이지 1 웨이브 체력 예산", stackedWaveChart(getWaveTheoryRows()))}
        ${chartPanel("실전 기물 피해 TOP", "필터 기준 누적 피해", horizontalBarChart(pieces, {
          value: (item) => item.damage,
          label: (item) => `${item.label} Lv${item.level}`,
          color: (item) => item.color,
          formatter: (value, item) => `${format(value)} / ${percent(item.share)}`,
          limit: 8,
        }))}
        ${chartPanel("특전 선택률 TOP", "제시 대비 선택률", horizontalBarChart(perks, {
          value: (item) => item.rate,
          label: (item) => item.title,
          color: () => "#15946f",
          formatter: (value, item) => `${percent(value)} (${item.picked}/${item.offered})`,
          max: 1,
          limit: 8,
          labelLength: 20,
        }))}
      </section>
      ${renderSkillSummary()}
      ${renderExperimentSummary()}
      ${renderAlertList()}
      ${renderTowerTable(true)}`;
  }

  function renderTowerCharts(rows, observed) {
    const byType = Object.values(TYPE_META).map((meta) => {
      const values = rows.filter((row) => row.typeKey === meta.key).sort((a, b) => a.level - b.level);
      return { meta, values };
    }).filter((item) => item.values.length);
    const labels = unique(rows.map((row) => String(row.level))).sort((a, b) => number(a) - number(b));
    const levelOne = rows.filter((row) => row.level === 1);
    const scatterRows = rows.map((row) => ({ ...row, observed: observed.get(row.pieceKey) })).filter((row) => row.observed?.damage);
    const efficiency = getTowerEfficiencyRows();

    return `<section class="chart-grid">
      ${chartPanel("기물 성장곡선: 1회 소환 기대딜", `체력비례 피해는 평균 몬스터 HP ${format(referenceMonsterHp(), 1)} 기준`, lineChart(byType.map(({ meta, values }) => ({
        name: meta.label,
        color: meta.color,
        values: values.map((row) => ({ x: row.level, y: row.magazineDamage })),
      })), { labels, minY: 0, formatter: (value) => format(value), xPrefix: "Lv" }))}
      ${chartPanel("기물 성장곡선: 표면 DPS", "공격력, 투사체 수, 공격 간격, CurrentHp 반영", lineChart(byType.map(({ meta, values }) => ({
        name: meta.label,
        color: meta.color,
        values: values.map((row) => ({ x: row.level, y: row.dps })),
      })), { labels, minY: 0, formatter: (value) => format(value, 1), xPrefix: "Lv" }))}
      ${chartPanel("Lv1 기물 기대딜 비교", "전시/테스트 기본 제공 기물 기준", horizontalBarChart(levelOne.sort((a, b) => b.magazineDamage - a.magazineDamage), {
        value: (item) => item.magazineDamage,
        label: (item) => item.label,
        color: (item) => item.color,
        formatter: (value, item) => `${format(value)} / DPS ${format(item.dps, 1)}`,
        limit: 8,
      }))}
      ${chartPanel("이론값 vs 실전 피해", "로그가 쌓이면 기대딜과 관측 피해의 괴리를 확인", scatterPlot(scatterRows, {
        x: (item) => item.magazineDamage,
        y: (item) => item.observed.damage,
        label: (item) => `${item.label} Lv${item.level}`,
        color: (item) => item.color,
      }))}
      ${chartPanel("소환 1회당 실전 피해", "많이 사용된 기물이 유리한 누적 피해 편향을 제거", horizontalBarChart(efficiency.filter((item) => item.created), {
        value: (item) => item.damagePerTower,
        label: (item) => `${item.label} Lv${item.level}`,
        color: (item) => item.color,
        formatter: (value, item) => `${format(value, 1)} / ${format(item.created)}기`,
        limit: 12,
      }))}
      ${chartPanel("실전 가동 효율", "초당 피해와 명중률로 실제 작동 성능을 비교", horizontalBarChart(efficiency.filter((item) => item.activeSec), {
        value: (item) => item.damagePerSec,
        label: (item) => `${item.label} Lv${item.level}`,
        color: (item) => item.color,
        formatter: (value, item) => `${format(value, 2)}/초 · 명중 ${percent(item.hitRate)}`,
        limit: 12,
      }))}
    </section>`;
  }

  function renderTowerTable(compact = false) {
    const observed = observedTowerMap();
    const efficiency = new Map(getTowerEfficiencyRows().map((row) => [row.key, row]));
    const rows = theoryRows().map((tower) => ({ ...tower, observed: observed.get(tower.pieceKey) || {}, efficiency: efficiency.get(tower.pieceKey) || {} }));
    const displayed = compact ? rows.filter((row) => row.level === 1) : rows;
    const charts = compact ? "" : renderTowerCharts(rows, observed);
    return `${charts}<section class="section">${sectionTitle(compact ? "레벨 1 포탑 요약" : "포탑 이론값과 플레이 관측값", `${displayed.length}개 레코드`)}
      <div class="table-wrap"><table><thead><tr>
        <th>기물</th><th>역할</th><th>Lv</th><th>공격력</th><th>공격 간격</th><th>투사체</th><th>탄창</th><th>사거리</th><th>체력비례</th><th>기대 DPS</th><th>1회 소환 기대딜</th><th>관측 누적 피해</th><th>소환 수</th><th>소환당 피해</th><th>실전 DPS</th><th>발사체당 피해</th><th>명중률</th><th>표본</th>
      </tr></thead><tbody>${displayed.map((row) => `<tr>
        <td>${escape(row.pieceKey)}</td><td>${escape(`${row.label} / ${row.ai}`)}</td><td>${row.level}</td><td>${format(row.atk, 2)}</td><td>${format(row.interval, 3)}초</td><td>${row.count}</td><td>${row.ammo}</td><td>${format(row.range, 1)}</td><td>${escape(row.currentHpDisplay)}</td><td>${format(row.dps, 1)}</td><td>${format(row.magazineDamage)}</td><td>${row.observed.samples ? format(row.observed.damage) : "-"}</td><td>${row.efficiency.created ? format(row.efficiency.created) : "-"}</td><td>${row.efficiency.created ? format(row.efficiency.damagePerTower, 1) : "-"}</td><td>${row.efficiency.activeSec ? format(row.efficiency.damagePerSec, 2) : "-"}</td><td>${row.efficiency.projectiles ? format(row.efficiency.damagePerProjectile, 2) : "-"}</td><td>${row.efficiency.projectiles ? percent(row.efficiency.hitRate) : "-"}</td><td>${row.efficiency.samples || row.observed.samples || 0}</td>
      </tr>`).join("")}</tbody></table></div></section>`;
  }

  function renderWaves() {
    const rows = getWaveDashboardRows();
    if (!rows.length) return empty();
    return `<section class="chart-grid">
      ${chartPanel("웨이브 난이도 곡선", "체력 예산/잔존/슬롯 위험/시스템 의존도", lineChart([
        { name: "체력 예산", color: "#276dcc", values: rows.map((row) => ({ x: row.wave, y: row.pressureIndex })) },
        { name: "잔존 몬스터", color: "#c33d3d", values: rows.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.remainingIndex })) },
        { name: "슬롯 위험", color: "#e3a51b", values: rows.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.slotDanger })) },
        { name: "시스템 의존", color: "#7b67d6", values: rows.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.systemShare * 100 })) },
      ], { labels: rows.map((row) => String(row.wave)), minY: 0, maxY: 100, formatter: (value) => `${format(value)}점`, xPrefix: "W" }))}
      ${chartPanel("몬스터 체력 구성", "NormalRate_1~3은 기본 몬스터 3종 가중치로만 계산", stackedWaveChart(getWaveTheoryRows()))}
    </section>
    <section class="section">${sectionTitle("웨이브 상세", "데이터 테이블 이론값 + 플레이 로그 관측값")}
      <div class="table-wrap"><table><thead><tr><th>웨이브</th><th>패턴</th><th>구성</th><th>총 체력</th><th>평균 HP</th><th>공격 압력</th><th>표본</th><th>잔존</th><th>소팅 성공/시도</th><th>슬롯 체력</th><th>기물 피해</th><th>시스템 피해</th><th>시스템 의존도</th></tr></thead>
      <tbody>${rows.map((row) => { const obs = row.observed || {}; return `<tr>
        <td>W${row.wave}</td><td>${escape(row.patternId || "-")}</td><td>${format(row.normalCount)} / ${format(row.speedyCount)} / ${format(row.tankerCount)}</td><td>${format(row.totalHp)}</td><td>${format(row.avgHp, 1)}</td><td>${format(row.attackPressure, 1)}</td><td>${row.samples || 0}</td><td class="${row.remaining > 5 ? "negative" : ""}">${row.samples ? format(row.remaining, 1) : "-"}</td><td>${row.samples ? `${format(obs.sorts, 1)} / ${format(obs.attempts, 1)}` : "-"}</td><td class="${row.samples && row.slotHp < .35 ? "negative" : row.samples && row.slotHp < .6 ? "warning" : "positive"}">${row.samples ? percent(row.slotHp) : "-"}</td><td>${row.samples ? format(obs.pieceDamage) : "-"}</td><td>${row.samples ? format(obs.systemDamage) : "-"}</td><td class="${row.systemShare > .45 ? "negative" : ""}">${row.samples ? percent(row.systemShare) : "-"}</td>
      </tr>`; }).join("")}</tbody></table></div></section>`;
  }

  function renderPerks() {
    const perks = getPerkSummary();
    const impacts = getPerkImpactRows();
    if (!perks.length) return empty();
    const targetDist = getTargetDistribution(perks);
    return `<section class="chart-grid">
      ${chartPanel("특전 선택률", "제시 대비 선택률. 과도한 쏠림과 죽은 특전을 찾는 그래프", horizontalBarChart(perks, {
        value: (item) => item.rate,
        label: (item) => item.title,
        color: (item) => item.rate > .6 ? "#c33d3d" : item.rate < .12 && item.offered >= 10 ? "#8b98a2" : "#15946f",
        formatter: (value, item) => `${percent(value)} (${item.picked}/${item.offered})`,
        max: 1,
        limit: 14,
        labelLength: 22,
      }))}
      ${chartPanel("대상별 특전 선택량", "TowerType/시스템 대상별 실제 선택 수", horizontalBarChart(targetDist, {
        value: (item) => item.picked,
        label: (item) => item.target,
        color: () => "#276dcc",
        formatter: (value, item) => `${format(value)}회 / 제시 ${format(item.offered)}회`,
        limit: 12,
      }))}
      ${chartPanel("선택 후 평균 도달 웨이브", "선택된 세션 기준. 표본 적은 특전은 참고용", horizontalBarChart(perks.filter((item) => item.pickedSessions.length).sort((a, b) => b.avgReached - a.avgReached), {
        value: (item) => item.avgReached,
        label: (item) => item.title,
        color: () => "#e3a51b",
        formatter: (value, item) => `W${format(value, 1)} / 클리어 ${percent(item.clearRate)}`,
        limit: 12,
        labelLength: 22,
      }))}
      ${chartPanel("선택 vs 미선택 이후 진행 차이", "같은 특전이 제시됐을 때 선택군-미선택군의 이후 생존 웨이브. 인과가 아닌 상관 지표", deltaBarChart(impacts.filter((item) => item.picked.length && item.skipped.length), {
        value: (item) => item.progressDelta,
        label: (item) => item.title,
        formatter: (value, item) => `${value >= 0 ? "+" : ""}${format(value, 2)}W (${item.picked.length}/${item.skipped.length})`,
        limit: 14,
        labelLength: 22,
      }))}
    </section>
    <section class="section">${sectionTitle("특전 선택 효율", "선택 횟수 / 제시 횟수 / 선택 후 결과")}
      <div class="table-wrap"><table><thead><tr><th>특전 ID</th><th>이름</th><th>희귀도</th><th>대상</th><th>제시</th><th>선택</th><th>선택률</th><th>선택 후 평균 도달</th><th>선택 후 클리어율</th></tr></thead><tbody>
      ${perks.map((row) => `<tr><td>${escape(row.id)}</td><td>${escape(row.title)}</td><td>${escape(row.rarity)}</td><td>${escape(row.target)}</td><td>${row.offered}</td><td>${row.picked}</td><td class="${row.rate > .55 ? "positive" : row.rate < .18 && row.offered >= 10 ? "negative" : ""}">${percent(row.rate)}</td><td>${row.pickedSessions.length ? `W${format(row.avgReached, 1)}` : "-"}</td><td>${row.pickedSessions.length ? percent(row.clearRate) : "-"}</td></tr>`).join("")}
      </tbody></table></div></section>
      <section class="section">${sectionTitle("특전 선택 전후 성과 비교", "제시된 세션에서 선택군과 미선택군을 비교")}
        <div class="table-wrap"><table><thead><tr><th>특전</th><th>선택 표본</th><th>미선택 표본</th><th>선택 후 진행</th><th>미선택 후 진행</th><th>진행 차이</th><th>선택군 도달</th><th>미선택군 도달</th><th>슬롯 체력 차이</th><th>클리어율 차이</th></tr></thead><tbody>
        ${impacts.map((row) => `<tr><td>${escape(row.title)}</td><td>${row.picked.length}</td><td>${row.skipped.length}</td><td>${row.picked.length ? format(row.pickedProgress, 2) : "-"}</td><td>${row.skipped.length ? format(row.skippedProgress, 2) : "-"}</td><td class="${row.progressDelta > 0 ? "positive" : row.progressDelta < 0 ? "negative" : ""}">${row.picked.length && row.skipped.length ? `${row.progressDelta >= 0 ? "+" : ""}${format(row.progressDelta, 2)}W` : "-"}</td><td>${row.picked.length ? `W${format(row.pickedReached, 2)}` : "-"}</td><td>${row.skipped.length ? `W${format(row.skippedReached, 2)}` : "-"}</td><td>${row.picked.length && row.skipped.length ? `${percent(row.pickedSlotHp - row.skippedSlotHp)}` : "-"}</td><td>${row.picked.length && row.skipped.length ? `${percent(row.pickedClear - row.skippedClear)}` : "-"}</td></tr>`).join("")}
        </tbody></table></div></section>`;
  }

  function getVersionRows() {
    const groups = new Map();
    for (const row of sessions) {
      const key = `${sessionBuild(row)}\n${sessionSnapshot(row)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const rows = [...groups.entries()].map(([key, items]) => ({
      key,
      build: sessionBuild(items[0]),
      snapshot: sessionSnapshot(items[0]),
      sessions: items.length,
      clearRate: items.filter((row) => row.result === "clear").length / items.length,
      wave: average(items, (row) => row.reached_wave),
      sorts: average(items, (row) => row.sort_successes),
      slotHp: average(items, (row) => row.slot_hp_ratio_avg),
      duration: average(items, (row) => number(row.duration_ms) / 1000),
    })).sort((a, b) => String(a.snapshot).localeCompare(String(b.snapshot)));
    rows.forEach((row, index) => {
      const previous = rows[index - 1];
      row.previous = previous || null;
      row.waveDelta = previous ? row.wave - previous.wave : 0;
      row.clearDelta = previous ? row.clearRate - previous.clearRate : 0;
      row.sortDelta = previous ? row.sorts - previous.sorts : 0;
      row.slotHpDelta = previous ? row.slotHp - previous.slotHp : 0;
    });
    return rows;
  }

  function getBalanceHistory() {
    const snapshots = [...(data.balanceHistory || []), data.balance].filter((item) => item?.snapshotId);
    return [...new Map(snapshots.map((item) => [item.snapshotId, item])).values()]
      .sort((a, b) => String(a.generatedAt || "").localeCompare(String(b.generatedAt || "")));
  }

  function getBalanceChangeRows() {
    const history = getBalanceHistory();
    if (history.length < 2) return { history, before: null, after: history[0] || null, rows: [], summary: [] };
    const before = history[history.length - 2];
    const after = history[history.length - 1];
    const contracts = {
      TowerData: { key: "TowerID", fields: ["TowerAtk", "TowerAtkSpeed", "TowerMaxLange", "TowerMaxAmmo", "ProjectileCount", "ProjectileSize", "PiercingCount", "SplashRadius", "current_hp", "BulletSpeed"] },
      MonsterData: { key: "MonsterID", fields: ["MonsterHp", "MonsterAtk", "MonsterAtkSpeed", "MonsterMoveSpeed"] },
      WavePatternData: { key: "WavePatternID", fields: ["Normal_Count", "Speedy_Count", "Tanker_Count", "NormalRate_1", "NormalRate_2", "NormalRate_3", "isRush"] },
      PerkData: { key: "PerkID", fields: ["Rarity", "EffectID", "IsActive"] },
      EffectData: { key: "EffectID", fields: ["ATK", "ATKSpeed", "ShotProjCount", "MaxProj", "ProjSize", "ProjPiercing", "BuffType", "BuffValue", "Duration"] },
    };
    const rows = [];
    const summary = [];
    for (const [table, contract] of Object.entries(contracts)) {
      const oldMap = new Map((before.tables?.[table] || []).map((row) => [String(row[contract.key]), row]));
      const newMap = new Map((after.tables?.[table] || []).map((row) => [String(row[contract.key]), row]));
      let changed = 0;
      for (const key of new Set([...oldMap.keys(), ...newMap.keys()])) {
        const oldRow = oldMap.get(key);
        const newRow = newMap.get(key);
        if (!oldRow || !newRow) {
          rows.push({ table, key, field: oldRow ? "행 삭제" : "행 추가", before: oldRow ? "있음" : "-", after: newRow ? "있음" : "-", delta: "-" });
          changed += 1;
          continue;
        }
        for (const field of contract.fields) {
          if (String(oldRow[field] ?? "") === String(newRow[field] ?? "")) continue;
          const beforeValue = oldRow[field] ?? "";
          const afterValue = newRow[field] ?? "";
          const numericDelta = Number.isFinite(Number(beforeValue)) && Number.isFinite(Number(afterValue))
            ? Number(afterValue) - Number(beforeValue)
            : null;
          rows.push({ table, key, field, before: beforeValue, after: afterValue, delta: numericDelta });
          changed += 1;
        }
      }
      summary.push({ table, changed });
    }
    return { history, before, after, rows, summary };
  }

  function renderVersions() {
    const rows = getVersionRows();
    const changes = getBalanceChangeRows();
    const cohortRows = getVersionCohortRows();
    if (!rows.length) return empty();
    const displayRows = rows.slice().reverse();
    return `<section class="chart-grid">
      ${chartPanel("버전별 평균 도달 웨이브", "빌드/스냅샷 조합별 비교", horizontalBarChart(displayRows, {
        value: (item) => item.wave,
        label: (item) => item.build,
        color: () => "#276dcc",
        formatter: (value, item) => `W${format(value, 1)} / ${item.sessions}건`,
        limit: 10,
        labelLength: 24,
      }))}
      ${chartPanel("버전별 클리어율", "표본 수와 함께 해석 필요", horizontalBarChart(displayRows, {
        value: (item) => item.clearRate,
        label: (item) => item.build,
        color: (item) => item.clearRate < .3 ? "#c33d3d" : "#15946f",
        formatter: (value, item) => `${percent(value)} / ${item.sessions}건`,
        max: 1,
        limit: 10,
        labelLength: 24,
      }))}
      ${chartPanel("최신 밸런스 변경량", changes.before ? `${clip(changes.before.snapshotId, 24)} → ${clip(changes.after.snapshotId, 24)}` : "다음 데이터 갱신부터 전후 이력을 비교", horizontalBarChart(changes.summary.filter((item) => item.changed), {
        value: (item) => item.changed,
        label: (item) => item.table,
        color: () => "#e3a51b",
        formatter: (value) => `${format(value)}개 필드`,
        limit: 8,
      }))}
      ${chartPanel("버전별 성과 변화", "직전 스냅샷 대비 평균 도달 웨이브 증감", deltaBarChart(displayRows.filter((item) => item.previous), {
        value: (item) => item.waveDelta,
        label: (item) => clip(item.snapshot, 18),
        formatter: (value, item) => `${value >= 0 ? "+" : ""}${format(value, 2)}W / 클리어 ${percent(item.clearDelta)}`,
        limit: 10,
      }))}
      ${chartPanel("최신 전후 코호트 영향", "전체 평균에 가려지는 숙련도/출처별 변화를 따로 표시", deltaBarChart(cohortRows, {
        value: (item) => item.reachedDelta,
        label: (item) => item.label,
        formatter: (value, item) => `${deltaText(value, (v) => `${format(v, 2)}W`)} · 클리어 ${deltaText(item.clearDelta, (v) => percent(v))}`,
        limit: 10,
        labelLength: 18,
      }), "wide-chart")}
    </section>
    <section class="section">${sectionTitle("빌드·밸런스 스냅샷 비교", "필터와 무관한 전체 버전")}
      <div class="table-wrap"><table><thead><tr><th>빌드</th><th>스냅샷</th><th>세션</th><th>클리어율</th><th>Δ 클리어율</th><th>평균 도달</th><th>Δ 도달</th><th>평균 소팅</th><th>Δ 소팅</th><th>종료 슬롯 체력</th><th>Δ 슬롯 체력</th><th>플레이 시간</th></tr></thead><tbody>
      ${displayRows.map((row) => `<tr><td>${escape(row.build)}</td><td>${escape(row.snapshot)}</td><td>${row.sessions}</td><td>${percent(row.clearRate)}</td><td class="${row.clearDelta > 0 ? "positive" : row.clearDelta < 0 ? "negative" : ""}">${row.previous ? percent(row.clearDelta) : "-"}</td><td>${format(row.wave, 1)}</td><td class="${row.waveDelta > 0 ? "positive" : row.waveDelta < 0 ? "negative" : ""}">${row.previous ? `${row.waveDelta >= 0 ? "+" : ""}${format(row.waveDelta, 2)}` : "-"}</td><td>${format(row.sorts, 1)}</td><td>${row.previous ? `${row.sortDelta >= 0 ? "+" : ""}${format(row.sortDelta, 2)}` : "-"}</td><td>${percent(row.slotHp)}</td><td>${row.previous ? percent(row.slotHpDelta) : "-"}</td><td>${format(row.duration, 1)}초</td></tr>`).join("")}
      </tbody></table></div></section>
    <section class="section">${sectionTitle("최신 데이터 테이블 변경 상세", changes.before ? `${changes.rows.length}개 변경 · 최근 ${changes.history.length}개 스냅샷 보관` : "스냅샷 2개부터 자동 표시")}
      ${changes.rows.length ? `<div class="table-wrap"><table><thead><tr><th>테이블</th><th>ID</th><th>컬럼</th><th>변경 전</th><th>변경 후</th><th>차이</th></tr></thead><tbody>${changes.rows.map((row) => `<tr><td>${escape(row.table)}</td><td>${escape(row.key)}</td><td>${escape(row.field)}</td><td>${escape(row.before)}</td><td>${escape(row.after)}</td><td class="${number(row.delta) > 0 ? "positive" : number(row.delta) < 0 ? "negative" : ""}">${row.delta === null || row.delta === "-" ? "-" : `${number(row.delta) >= 0 ? "+" : ""}${format(row.delta, 3)}`}</td></tr>`).join("")}</tbody></table></div>` : `<div class="notice">${changes.before ? "최신 두 스냅샷의 밸런스 수치는 동일합니다." : "현재 저장된 이전 밸런스 스냅샷이 없습니다. 다음 데이터 테이블 갱신부터 변경 전후 수치가 이곳에 누적됩니다."}</div>`}
    </section>`;
  }

  function renderCalibration() {
    const rows = getSkillCalibrationRows();
    const realTotal = sum(rows, (row) => row.real.sessions);
    const simTotal = sum(rows, (row) => row.sim.sessions);
    const realOverall = sessionMetrics(comparisonSessions("real"));
    const simOverall = sessionMetrics(comparisonSessions("simulation"));
    const dominantReal = rows.slice().sort((a, b) => b.real.sessions - a.real.sessions)[0];
    const biggestGap = rows.filter((row) => row.real.sessions && row.sim.sessions).sort((a, b) => b.gapScore - a.gapScore)[0];
    const scenarioRows = getScenarioSummary();
    const labels = rows.map((row) => row.label);
    const deltaClass = (value, reverse = false) => {
      const signed = reverse ? -number(value) : number(value);
      return signed > 0.001 ? "positive" : signed < -0.001 ? "negative" : "";
    };

    return `${notice()}
      <section class="kpis">
        ${kpi("실제 표본", format(realTotal), "추정 숙련도 분류")}
        ${kpi("시뮬 표본", format(simTotal), "botProfile 기준")}
        ${kpi("주요 실제군", dominantReal?.real.sessions ? dominantReal.label : "-", dominantReal?.real.sessions ? `${dominantReal.real.sessions}건` : "실제 로그 대기", "yellow")}
        ${kpi("보정 우선", biggestGap ? biggestGap.label : "-", biggestGap ? `차이 ${format(biggestGap.gapScore, 2)}점` : "비교 표본 부족", biggestGap?.gapScore > 1.1 ? "red" : "green")}
        ${kpi("실제 평균 도달", format(realOverall.reached, 1), "전체 실제 표본")}
        ${kpi("시뮬 평균 도달", format(simOverall.reached, 1), "전체 시뮬 표본")}
        ${kpi("실제 평균 소팅", format(realOverall.successes, 1), "3-Sort 완성")}
        ${kpi("시뮬 평균 소팅", format(simOverall.successes, 1), "3-Sort 완성")}
      </section>

      <section class="chart-grid">
        ${chartPanel("숙련도별 클리어율: 실제 vs 시뮬", "실제는 추정 숙련도, 시뮬은 botProfile 기준", lineChart([
          { name: "실제", color: "#276dcc", values: rows.map((row) => ({ x: row.label, y: row.real.clearRate })) },
          { name: "시뮬", color: "#14845f", values: rows.map((row) => ({ x: row.label, y: row.sim.clearRate })) },
        ], { labels, minY: 0, maxY: 1, formatter: (value) => percent(value) }))}
        ${chartPanel("숙련도별 평균 도달 웨이브", "시뮬이 실제보다 높으면 봇이 과하게 잘하는 상태", lineChart([
          { name: "실제", color: "#276dcc", values: rows.map((row) => ({ x: row.label, y: row.real.reached })) },
          { name: "시뮬", color: "#14845f", values: rows.map((row) => ({ x: row.label, y: row.sim.reached })) },
        ], { labels, minY: 0, maxY: 10, formatter: (value) => `W${format(value, 1)}` }))}
        ${chartPanel("숙련도별 평균 3-Sort 완성", "행동량/판단 적극성 보정용", lineChart([
          { name: "실제", color: "#276dcc", values: rows.map((row) => ({ x: row.label, y: row.real.successes })) },
          { name: "시뮬", color: "#14845f", values: rows.map((row) => ({ x: row.label, y: row.sim.successes })) },
        ], { labels, minY: 0, formatter: (value) => `${format(value, 1)}회` }))}
        ${chartPanel("보정 필요도", "클리어율/도달/소팅/간격 차이를 합친 참고 점수", horizontalBarChart(rows.filter((row) => row.real.sessions && row.sim.sessions).sort((a, b) => b.gapScore - a.gapScore), {
          value: (item) => item.gapScore,
          label: (item) => item.label,
          color: (item) => item.gapScore > 1.1 ? "#c73b3b" : item.gapScore > .55 ? "#e7a91b" : "#14845f",
          formatter: (value, item) => `${format(value, 2)}점 · 도달 ${item.reachedDelta >= 0 ? "+" : ""}${format(item.reachedDelta, 1)}W`,
          max: 2,
        }))}
      </section>

      <section class="section">${sectionTitle("실제 로그 숙련도 추정 기준", "완벽한 판정이 아니라 보정용 가벼운 분류")}
        <div class="table-wrap"><table><thead><tr><th>숙련도</th><th>기준 소팅 완성</th><th>참고 소팅 간격</th><th>해석</th></tr></thead><tbody>
          <tr><td>초보자</td><td>18회 이하 중심</td><td>4.45초 초과 쪽</td><td>느리지만 눈앞의 3매칭은 따라가는 표본</td></tr>
          <tr><td>중급자</td><td>19~60회 중심</td><td>2.85~4.45초</td><td>정렬 루프를 이해하고 압박 대응이 가능한 표본</td></tr>
          <tr><td>상급자</td><td>61회 이상 중심</td><td>2.85초 이하 쪽</td><td>콤보/위기 대응까지 적극적으로 가져가는 표본</td></tr>
        </tbody></table></div></section>

      <section class="section">${sectionTitle("실제 vs 시뮬 보정표", "양수 Δ는 시뮬이 실제보다 높은 값")}
        <div class="table-wrap"><table><thead><tr><th>숙련도</th><th>실제 표본</th><th>시뮬 표본</th><th>클리어율 실제/시뮬</th><th>Δ 클리어</th><th>도달 실제/시뮬</th><th>Δ 도달</th><th>소팅 실제/시뮬</th><th>Δ 소팅</th><th>간격 실제/시뮬</th><th>Δ 간격</th><th>슬롯 체력 실제/시뮬</th></tr></thead><tbody>
          ${rows.map((row) => `<tr><td>${escape(row.label)}</td><td>${format(row.real.sessions)}</td><td>${format(row.sim.sessions)}</td><td>${percent(row.real.clearRate)} / ${percent(row.sim.clearRate)}</td><td class="${deltaClass(row.clearDelta)}">${row.sim.sessions && row.real.sessions ? percent(row.clearDelta) : "-"}</td><td>${format(row.real.reached, 1)} / ${format(row.sim.reached, 1)}</td><td class="${deltaClass(row.reachedDelta)}">${row.sim.sessions && row.real.sessions ? `${row.reachedDelta >= 0 ? "+" : ""}${format(row.reachedDelta, 2)}` : "-"}</td><td>${format(row.real.successes, 1)} / ${format(row.sim.successes, 1)}</td><td class="${deltaClass(row.sortDelta)}">${row.sim.sessions && row.real.sessions ? `${row.sortDelta >= 0 ? "+" : ""}${format(row.sortDelta, 1)}` : "-"}</td><td>${intervalValue(row.real.interval, row.real.intervalSamples)} / ${intervalValue(row.sim.interval, row.sim.intervalSamples)}</td><td class="${deltaClass(row.intervalDelta, true)}">${row.sim.intervalSamples && row.real.intervalSamples ? `${row.intervalDelta >= 0 ? "+" : ""}${format(row.intervalDelta, 2)}초` : "-"}</td><td>${percent(row.real.slotHp)} / ${percent(row.sim.slotHp)}</td></tr>`).join("")}
        </tbody></table></div></section>

      <section class="section">${sectionTitle("시뮬 시나리오 프리셋 결과", `${scenarioRows.length}개 시나리오`)}
        <div class="table-wrap"><table><thead><tr><th>시나리오</th><th>표본</th><th>클리어율</th><th>평균 도달</th><th>평균 소팅</th><th>소팅 간격</th><th>최대 콤보</th><th>슬롯 체력</th><th>플레이 시간</th></tr></thead><tbody>
          ${scenarioRows.map((row) => `<tr><td>${escape(row.label)}</td><td>${format(row.sessions)}</td><td>${percent(row.clearRate)}</td><td>${format(row.reached, 1)}</td><td>${format(row.successes, 1)}</td><td>${intervalValue(row.interval, row.intervalSamples)}</td><td>${format(row.combo, 1)}</td><td>${percent(row.slotHp)}</td><td>${format(row.duration, 1)}초</td></tr>`).join("")}
        </tbody></table></div></section>`;
  }

  function renderSessions() {
    const rows = filteredSessions().slice().sort((a, b) => String(b.event_at || b.received_at).localeCompare(String(a.event_at || a.received_at)));
    if (!rows.length) return empty();
    const timeline = rows.slice().reverse().map((row, index) => ({ ...row, index: index + 1 }));
    return `<section class="chart-grid">
      ${chartPanel("세션별 도달 웨이브", "시간순 플레이 결과 흐름", lineChart([
        { name: "도달 웨이브", color: "#276dcc", values: timeline.map((row) => ({ x: row.index, y: number(row.reached_wave) })) },
        { name: "최대 콤보", color: "#e3a51b", values: timeline.map((row) => ({ x: row.index, y: number(row.max_combo) })) },
      ], { labels: timeline.map((row) => String(row.index)), minY: 0, formatter: (value) => format(value, 1), xPrefix: "#" }))}
      ${chartPanel("세션별 소팅 성공", "플레이어 숙련도/피로도 확인", horizontalBarChart(rows.slice(0, 12), {
        value: (item) => item.sort_successes,
        label: (item) => `${String(item.session_id || "").slice(0, 8)} ${item.result || ""}`,
        color: (item) => item.result === "clear" ? "#15946f" : "#8b98a2",
        formatter: (value, item) => `${format(value)}회 / W${format(item.reached_wave)}`,
        limit: 12,
      }))}
    </section>
    <section class="section">${sectionTitle("플레이 세션", `${rows.length}건`)}
      <div class="table-wrap"><table><thead><tr><th>종료 시각</th><th>세션 ID</th><th>표본</th><th>숙련/시나리오</th><th>스테이지</th><th>조합</th><th>결과</th><th>빌드</th><th>도달</th><th>소팅</th><th>최대 콤보</th><th>피해량</th><th>슬롯 체력</th><th>기물</th><th>특전</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${escape(row.event_at || row.received_at)}</td><td>${escape(String(row.session_id || "").slice(0, 12))}</td><td>${escape(sessionSource(row))}</td><td>${escape(sessionSkillDisplay(row))}</td><td>${escape(sessionStage(row))}</td><td>${escape(clip(sessionLoadoutLabel(row), 42))}</td><td>${escape(row.result)}</td><td>${escape(row.build_version)}</td><td>${format(row.reached_wave)}</td><td>${format(row.sort_successes)} / ${format(row.sort_attempts)}${Number.isFinite(sessionSortInterval(row)) ? ` · ${format(sessionSortInterval(row), 2)}초` : ""}</td><td>${format(row.max_combo)}</td><td>${format(row.damage_done)}</td><td>${percent(row.slot_hp_ratio_avg)}</td><td>${escape(row.selected_pieces)}</td><td>${escape(row.picked_perks)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
  }

  function dashboardAssetPath(value) {
    const raw = String(value || "").trim().replace(/\\/g, "/");
    if (!raw) return "";
    if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
    if (raw.startsWith("../") || raw.startsWith("/")) return raw;
    if (raw.includes("/")) return raw.startsWith("assets/") ? `../${raw}` : raw;
    return `../assets/images/towers/${/\.png$/i.test(raw) ? raw : `${raw}.png`}`;
  }

  function getPreviewTower(typeKey, requestedLevel) {
    const candidates = theoryRows().filter((row) => row.typeKey === typeKey);
    if (!candidates.length) return null;
    const level = Math.min(PIECE_MAX_LEVEL, Math.max(1, number(requestedLevel, 1)));
    return candidates.reduce((closest, row) => (
      Math.abs(row.level - level) < Math.abs(closest.level - level) ? row : closest
    ), candidates[0]);
  }

  function getPreviewPiece(tower) {
    if (!tower) return { name: "?", sprite: "", fallback: "?" };
    const piece = tableRows("PieceData").find((row) => String(row.ConnectTower) === String(tower.towerId))
      || tableRows("PieceData").find((row) => normalizeTowerTypeKey(row.PieceType) === tower.typeKey && number(row.PieceLv, 1) === tower.level)
      || {};
    const rawName = String(piece.PieceName || tower.label || tower.typeKey);
    const name = /^PieceName_/i.test(rawName) ? tower.label : rawName;
    const sprite = dashboardAssetPath(piece.PieceSprite);
    const legacySprite = !piece.PieceName && !piece.PieceSprite ? LEGACY_TYPE_SPRITES[tower.typeKey] || "" : "";
    return { name, sprite: sprite || legacySprite, fallback: Array.from(name.trim())[0] || "?" };
  }

  function renderPreviewTowerArt(piece) {
    return `<span class="preview-tower-letter">${escape(piece.fallback)}</span>${piece.sprite ? `<img src="${escape(piece.sprite)}" alt="${escape(piece.name)}" onerror="this.remove()">` : ""}`;
  }

  function normalizePreviewProjectileType(value) {
    const raw = String(value || "normal").trim().toLowerCase();
    return ({ "1": "normal", basic: "normal", "2": "pierce", snipe: "pierce", "3": "tank", "4": "explode", "5": "heal" })[raw] || raw;
  }

  function previewProjectileAsset(value) {
    const raw = String(value || "").trim().replace(/\\/g, "/");
    if (!raw || raw === "0") return "";
    if (/^(?:https?:|data:|blob:|\/|\.\.?\/)/i.test(raw) || raw.includes("/")) return raw.startsWith("assets/") ? `../${raw}` : raw;
    return `../assets/images/Projectile/${/\.(?:png|webp|jpe?g|gif)$/i.test(raw) ? raw : `${raw}.png`}`;
  }

  const PREVIEW_MONSTERS = [
    { type: "basic", x: 18, y: 14 },
    { type: "speed", x: 49, y: 10 },
    { type: "tank", x: 81, y: 18 },
    { type: "speed", x: 13, y: 84 },
    { type: "basic", x: 36, y: 91 },
    { type: "tank", x: 64, y: 87 },
    { type: "basic", x: 86, y: 78 },
  ];

  let stopPreviewSimulation = () => {};

  function renderPreviewArena(tower) {
    if (!tower) return emptyChart("표시할 포탑 데이터가 없습니다");
    const piece = getPreviewPiece(tower);
    const projectileType = normalizePreviewProjectileType(tower.projectileType);
    const slots = Array.from({ length: 9 }, (_, index) => {
      const selected = index === state.previewSlot;
      return `<button class="sim-slot${selected ? " selected" : ""}" type="button" data-sim-slot="${index}" aria-label="전투 슬롯 ${index + 1}">
        <img class="sim-slot-frame" src="../assets/images/ui/Slot_Component_01.png" alt="">
        ${selected ? `<span class="sim-tower-art">${renderPreviewTowerArt(piece)}</span>` : ""}
      </button>`;
    }).join("");
    const monsters = PREVIEW_MONSTERS.map((monster, index) => `<span class="sim-monster" data-sim-monster="${index}" style="--x:${monster.x}%;--y:${monster.y}%" aria-label="${monster.type} 몬스터">
      <b><em>${monster.type === "tank" ? "T" : monster.type === "speed" ? "S" : "M"}</em></b><i></i>
    </span>`).join("");
    return `<section class="preview-workbench" style="--tower-color:${escape(tower.color)}">
      <div class="sim-phone" data-sim-arena>
        <div class="sim-hud">
          <span><small>ATK</small><b>${format(tower.atk, 1)}</b></span>
          <strong>RANGE ${format(tower.range)}</strong>
          <span><small>RATE</small><b>${format(1 / tower.interval, 2)}/s</b></span>
        </div>
        <div class="sim-range" data-sim-range><span>R ${format(tower.range)}</span></div>
        <div class="sim-monsters">${monsters}</div>
        <div class="sim-projectile-layer" data-sim-projectiles></div>
        <div class="sim-slots">${slots}</div>
        <div class="sim-cadence" style="--attack-interval:${tower.interval}s"><i></i><span>${format(tower.interval, 2)}s</span></div>
      </div>
      <aside class="sim-inspector">
        <header><span class="sim-inspector-art">${renderPreviewTowerArt(piece)}</span><div><strong>${escape(piece.name)}</strong><span>${escape(tower.label)} · Lv${tower.level} · ${escape(tower.ai)}</span></div></header>
        <div class="sim-coverage"><span>타격 가능</span><strong data-sim-coverage>0 / ${PREVIEW_MONSTERS.length}</strong></div>
        <dl class="sim-stats">
          <div><dt>공격력</dt><dd>${format(tower.atk, 2)}</dd></div>
          <div><dt>공격 간격</dt><dd>${format(tower.interval, 2)}초</dd></div>
          <div><dt>초당 공격</dt><dd>${format(1 / tower.interval, 2)}회</dd></div>
          <div><dt>실제 사거리</dt><dd>${format(tower.range)}px</dd></div>
          <div><dt>발사체</dt><dd>${tower.count}개</dd></div>
          <div><dt>탄속 배율</dt><dd>${format(tower.bulletSpeed, 2)}</dd></div>
          <div><dt>탄창</dt><dd>${tower.ammo}</dd></div>
          <div><dt>기대 DPS</dt><dd>${format(tower.dps, 1)}</dd></div>
          <div><dt>관통</dt><dd>${tower.piercing || "-"}</dd></div>
          <div><dt>폭발 범위</dt><dd>${tower.splash || "-"}</dd></div>
          <div><dt>체력 비례</dt><dd>${escape(tower.currentHpDisplay)}</dd></div>
          <div><dt>투사체 타입</dt><dd>${escape(projectileType)}</dd></div>
        </dl>
      </aside>
    </section>`;
  }

  function renderPreviewControls(typeKeys) {
    const typeOptions = typeKeys.map((key) => `<option value="${escape(key)}">${escape(typeMeta(key).label)}</option>`).join("");
    const levelOptions = Array.from({ length: PIECE_MAX_LEVEL }, (_, index) => `<option value="${index + 1}">Lv${index + 1}</option>`).join("");
    return `<section class="preview-controls" aria-label="사격 비교 설정">
      <label>포탑<select data-preview-type>${typeOptions}</select></label>
      <label>레벨<select data-preview-level>${levelOptions}</select></label>
    </section>`;
  }

  function renderPreview() {
    const typeKeys = unique(theoryRows().map((row) => row.typeKey));
    if (!typeKeys.length) return empty();
    if (!typeKeys.includes(state.previewType)) state.previewType = typeKeys[0];
    state.previewSlot = Math.max(0, Math.min(8, number(state.previewSlot, 4)));
    const tower = getPreviewTower(state.previewType, state.previewLevel);
    return `${renderPreviewControls(typeKeys)}
      <section class="preview-intro">${sectionTitle("인게임형 사격·사거리 시뮬레이터", `${escape(tower?.label || "포탑")} Lv${tower?.level || 1}`)}</section>
      ${renderPreviewArena(tower)}`;
  }

  function startPreviewSimulation(tower) {
    stopPreviewSimulation();
    const arena = document.querySelector("[data-sim-arena]");
    const layer = document.querySelector("[data-sim-projectiles]");
    const rangeEl = document.querySelector("[data-sim-range]");
    const coverageEl = document.querySelector("[data-sim-coverage]");
    if (!tower || !arena || !layer || !rangeEl) return;
    let disposed = false;
    const timers = new Set();
    const projectileSource = previewProjectileAsset(tower.projectilePrefab);
    let projectileImageAvailable = false;
    if (projectileSource) {
      const projectileProbe = new Image();
      projectileProbe.addEventListener("load", () => { projectileImageAvailable = true; }, { once: true });
      projectileProbe.src = projectileSource;
    }
    const projectileType = normalizePreviewProjectileType(tower.projectileType);
    const isShotgun = String(tower.ai).toLowerCase().includes("shotgun") || tower.typeKey === "scatter";

    const geometry = () => {
      const selected = arena.querySelector(".sim-slot.selected");
      if (!selected) return null;
      const arenaRect = arena.getBoundingClientRect();
      const slotRect = selected.getBoundingClientRect();
      const scale = arenaRect.width / 360;
      const origin = { x: slotRect.left - arenaRect.left + slotRect.width / 2, y: slotRect.top - arenaRect.top + slotRect.height * .42 };
      const radius = Math.max(1, tower.range * scale);
      rangeEl.style.left = `${origin.x}px`;
      rangeEl.style.top = `${origin.y}px`;
      rangeEl.style.width = `${radius * 2}px`;
      rangeEl.style.height = `${radius * 2}px`;
      const targets = [...arena.querySelectorAll("[data-sim-monster]")].map((element) => {
        const rect = element.getBoundingClientRect();
        const point = { x: rect.left - arenaRect.left + rect.width / 2, y: rect.top - arenaRect.top + rect.height / 2 };
        const distance = Math.hypot(point.x - origin.x, point.y - origin.y);
        element.classList.toggle("in-range", distance <= radius);
        return { element, point, distance };
      }).filter((target) => target.distance <= radius).sort((a, b) => a.distance - b.distance);
      if (coverageEl) coverageEl.textContent = `${targets.length} / ${PREVIEW_MONSTERS.length}`;
      return { arenaRect, origin, radius, scale, targets };
    };

    const impact = (target) => {
      target.element.classList.remove("hit");
      requestAnimationFrame(() => target.element.classList.add("hit"));
      const timer = setTimeout(() => target.element.classList.remove("hit"), 180);
      timers.add(timer);
      if (projectileType !== "explode") return;
      const fx = document.createElement("img");
      fx.className = "sim-impact";
      fx.src = "../assets/images/Projectile/EXP.gif";
      fx.style.left = `${target.point.x}px`;
      fx.style.top = `${target.point.y}px`;
      const size = Math.max(42, tower.splash * 2);
      fx.style.width = `${size}px`;
      fx.style.height = `${size}px`;
      layer.appendChild(fx);
      const removeTimer = setTimeout(() => fx.remove(), 520);
      timers.add(removeTimer);
    };

    const fireProjectile = (target, spread = 0) => {
      const current = geometry();
      if (!current || !target || disposed) return;
      const dx = target.point.x - current.origin.x + spread;
      const dy = target.point.y - current.origin.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 180;
      const projectile = document.createElement(projectileImageAvailable ? "img" : "i");
      projectile.className = `sim-projectile ${escape(projectileType)} ${escape(tower.typeKey)}`;
      if (projectileImageAvailable) projectile.src = projectileSource;
      projectile.style.left = `${current.origin.x}px`;
      projectile.style.top = `${current.origin.y}px`;
      const size = Math.max(10, Math.min(34, number(tower.projectileSize, 8) * 2.2));
      projectile.style.width = `${size}px`;
      projectile.style.height = `${size * 1.35}px`;
      layer.appendChild(projectile);
      const speed = 720 * Math.max(.1, tower.bulletSpeed || 1) * current.scale;
      const duration = Math.max(110, Math.hypot(dx, dy) / speed * 1000);
      const animation = projectile.animate([
        { transform: `translate(-50%, -50%) rotate(${angle}deg)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${angle}deg)`, opacity: 1 },
      ], { duration, easing: "linear" });
      animation.onfinish = () => { projectile.remove(); impact(target); };
      animation.oncancel = () => projectile.remove();
    };

    const fire = () => {
      const current = geometry();
      if (!current?.targets.length || disposed) return;
      arena.classList.remove("firing");
      requestAnimationFrame(() => arena.classList.add("firing"));
      const pulseTimer = setTimeout(() => arena.classList.remove("firing"), 90);
      timers.add(pulseTimer);
      const visualCount = Math.max(1, Math.min(7, Math.floor(tower.count || 1)));
      for (let index = 0; index < visualCount; index += 1) {
        const target = current.targets[index % current.targets.length];
        const spread = isShotgun ? (index - (visualCount - 1) / 2) * 18 : 0;
        const delay = isShotgun ? 0 : index * 70;
        const timer = setTimeout(() => fireProjectile(target, spread), delay);
        timers.add(timer);
      }
    };

    geometry();
    fire();
    const interval = setInterval(fire, Math.max(120, tower.interval * 1000));
    window.addEventListener("resize", geometry);
    stopPreviewSimulation = () => {
      disposed = true;
      clearInterval(interval);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", geometry);
      layer.replaceChildren();
      stopPreviewSimulation = () => {};
    };
  }

  function bindViewInteractions() {
    document.querySelectorAll("[data-drill-view]").forEach((button) => button.addEventListener("click", () => {
      state.activePreset = "custom";
      setActiveTab(button.dataset.drillView || "overview");
      syncPresetButtons();
      render();
    }));
    if (state.view !== "preview") return;
    const typeSelect = document.querySelector("[data-preview-type]");
    const levelSelect = document.querySelector("[data-preview-level]");
    const tower = getPreviewTower(state.previewType, state.previewLevel);
    if (typeSelect) {
      typeSelect.value = state.previewType;
      typeSelect.addEventListener("change", () => { state.previewType = typeSelect.value; render(); });
    }
    if (levelSelect) {
      levelSelect.value = String(state.previewLevel);
      levelSelect.addEventListener("change", () => { state.previewLevel = number(levelSelect.value, 1); render(); });
    }
    document.querySelectorAll("[data-sim-slot]").forEach((slot) => slot.addEventListener("click", () => {
      state.previewSlot = number(slot.dataset.simSlot, 4);
      render();
    }));
    startPreviewSimulation(tower);
  }

  function renderDiagnostics() {
    const source = getDamageSourceShare();
    const pieces = getObservedPieceSummary();
    const waves = getWaveDashboardRows();
    const diagnosticBars = [
      { label: "시스템 피해 의존", value: source.systemShare, color: source.systemShare > .45 ? "#c33d3d" : "#e3a51b" },
      { label: "최고 기물 점유율", value: pieces[0]?.share || 0, color: pieces[0]?.share > .42 ? "#c33d3d" : "#15946f" },
      { label: "평균 슬롯 위험", value: average(waves.filter((row) => row.samples), (row) => 1 - row.slotHp), color: "#e3a51b" },
      { label: "평균 잔존 압력", value: average(waves.filter((row) => row.samples), (row) => row.remainingIndex / 100), color: "#c33d3d" },
    ];
    return `${renderAlertList()}
      <section class="chart-grid">
        ${chartPanel("위험 지표", "0%에 가까울수록 안정, 50% 이상이면 우선 확인", horizontalBarChart(diagnosticBars, {
          value: (item) => item.value,
          label: (item) => item.label,
          color: (item) => item.color,
          formatter: (value) => percent(value),
          max: 1,
        }))}
        ${chartPanel("웨이브별 위험 분포", "잔존 몬스터와 슬롯 위험을 같이 표시", lineChart([
          { name: "잔존 몬스터", color: "#c33d3d", values: waves.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.remainingIndex })) },
          { name: "슬롯 위험", color: "#e3a51b", values: waves.filter((row) => row.samples).map((row) => ({ x: row.wave, y: row.slotDanger })) },
        ], { labels: waves.map((row) => String(row.wave)), minY: 0, maxY: 100, formatter: (value) => `${format(value)}점`, xPrefix: "W" }))}
      </section>`;
  }

  function empty() {
    return document.querySelector("#empty-template").innerHTML;
  }

  function render() {
    stopPreviewSimulation();
    const renderers = {
      overview: renderOverview,
      towers: () => renderTowerTable(false),
      waves: renderWaves,
      perks: renderPerks,
      preview: renderPreview,
      calibration: renderCalibration,
      diagnostics: renderDiagnostics,
      versions: renderVersions,
      sessions: renderSessions,
    };
    dashboard.innerHTML = (renderers[state.view] || renderOverview)();
    bindViewInteractions();
    document.querySelector("#data-status").textContent =
      `밸런스 ${data.balance?.contractVersion || "-"} | 생성 ${data.balance?.generatedAt || data.generatedAt || "-"} | 세션 ${sessions.length}건`;
  }

  initControls();
  render();
})();
