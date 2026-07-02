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
    4: { key: "blast", sheet: "Mortar", label: "범위형", color: "#d03e60" },
    5: { key: "breaker", sheet: "Boomer", label: "탱커대항형", color: "#15946f" },
    6: { key: "support", sheet: "Buffer", label: "보조형", color: "#a97724" },
  };
  const AI_NAMES = { 1: "Basic", 2: "Basic-non", 3: "Shotgun", 4: "Heal" };
  const MONSTER_LABELS = { normal: "기본", speedy: "속도", tanker: "탱커" };
  const MONSTER_COLORS = { normal: "#276dcc", speedy: "#e3a51b", tanker: "#c33d3d" };
  const NEUTRAL = "#8b98a2";

  const state = { view: "overview", build: "all", snapshot: "all", result: "all", device: "all" };

  const number = (value, fallback = 0) => {
    if (value === null || value === undefined || value === "") return fallback;
    const numeric = Number(String(value).replace(/,/g, "").replace("%", ""));
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const sum = (items, getter) => items.reduce((total, item) => total + number(getter(item)), 0);
  const average = (items, getter) => items.length ? sum(items, getter) / items.length : 0;
  const percent = (value, digits = 1) => `${(number(value) * 100).toFixed(digits)}%`;
  const format = (value, digits = 0) => number(value).toLocaleString("ko-KR", { maximumFractionDigits: digits });
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

  function sessionDevice(row) {
    return row.device_class || "unknown";
  }

  function sessionBuild(row) {
    return row.build_version || "unknown";
  }

  function unique(items) {
    return [...new Set(items.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "ko"));
  }

  function filteredSessions() {
    return sessions.filter((row) =>
      (state.build === "all" || sessionBuild(row) === state.build)
      && (state.snapshot === "all" || sessionSnapshot(row) === state.snapshot)
      && (state.result === "all" || (row.result || "unknown") === state.result)
      && (state.device === "all" || sessionDevice(row) === state.device));
  }

  function filteredRows(rows) {
    const selected = filteredSessions();
    const ids = new Set(selected.map((row) => row.session_id));
    if (!sessions.length) return rows;
    return rows.filter((row) => ids.has(row.session_id));
  }

  function fillSelect(id, values, label) {
    const select = document.querySelector(id);
    select.innerHTML = `<option value="all">${escape(label)}</option>${values.map((value) => `<option value="${escape(value)}">${escape(value)}</option>`).join("")}`;
    select.addEventListener("change", () => {
      state[id.replace("#filter-", "")] = select.value;
      render();
    });
  }

  function initControls() {
    fillSelect("#filter-build", unique(sessions.map(sessionBuild)), "전체 빌드");
    fillSelect("#filter-snapshot", unique(sessions.map(sessionSnapshot)), "전체 스냅샷");
    fillSelect("#filter-result", unique(sessions.map((row) => row.result || "unknown")), "전체 결과");
    fillSelect("#filter-device", unique(sessions.map(sessionDevice)), "전체 기기");
    document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      render();
    }));
    document.querySelector("#reset-filters").addEventListener("click", () => {
      for (const key of ["build", "snapshot", "result", "device"]) {
        state[key] = "all";
        document.querySelector(`#filter-${key}`).value = "all";
      }
      render();
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

  function theoryRows() {
    const refHp = referenceMonsterHp();
    return tableRows("TowerData").map((tower) => {
      const meta = typeMeta(tower.TowerType);
      const level = number(valueOf(tower, ["TowerLv", "tower_lv"]), 1);
      const count = Math.max(1, number(valueOf(tower, ["ProjectileCount", "TowerProjectileCount"]), 1));
      const interval = Math.max(.001, number(valueOf(tower, ["TowerAtkSpeed", "AtkSpeed"]), 1));
      const ammo = number(valueOf(tower, ["TowerMaxAmmo", "MaxAmmo"]));
      const atk = number(valueOf(tower, ["TowerAtk", "ATK"]));
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
        interval,
        count,
        ammo,
        range: number(valueOf(tower, ["TowerMaxLange", "TowerMaxRange", "TowerRange"])),
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
    }).sort((a, b) => a.typeKey.localeCompare(b.typeKey) || a.level - b.level);
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

  function renderOverview() {
    const current = filteredSessions();
    const waves = getWaveDashboardRows();
    const source = getDamageSourceShare();
    const pieces = getObservedPieceSummary();
    const perks = getPerkSummary();
    const clears = current.filter((row) => row.result === "clear").length;
    const dangerWave = waves.slice().sort((a, b) => (b.remaining + b.slotDanger / 12 + b.systemShare * 8) - (a.remaining + a.slotDanger / 12 + a.systemShare * 8))[0];

    return `${notice()}
      <section class="kpis">
        ${kpi("세션", format(current.length), `전체 ${sessions.length}건`)}
        ${kpi("클리어율", percent(current.length ? clears / current.length : 0), `${clears}회 클리어`, current.length && clears / current.length < .35 ? "red" : "green")}
        ${kpi("평균 도달 웨이브", format(average(current, (row) => row.reached_wave), 1), "세션 종료 기준", "yellow")}
        ${kpi("평균 소팅 성공", format(average(current, (row) => row.sort_successes), 1), "세션당")}
        ${kpi("평균 최대 콤보", format(average(current, (row) => row.max_combo), 1), "세션당")}
        ${kpi("종료 슬롯 체력", percent(average(current, (row) => row.slot_hp_ratio_avg)), "평균 잔존율", "green")}
        ${kpi("시스템 피해 비중", percent(source.systemShare), "콤보/전체정렬/기타", source.systemShare > .45 ? "red" : "yellow")}
        ${kpi("위험 웨이브", dangerWave?.wave ? `W${dangerWave.wave}` : "-", dangerWave?.samples ? `잔존 ${format(dangerWave.remaining, 1)} / 슬롯 ${percent(dangerWave.slotHp)}` : "관측 대기", "red")}
      </section>

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
    </section>`;
  }

  function renderTowerTable(compact = false) {
    const observed = observedTowerMap();
    const rows = theoryRows().map((tower) => ({ ...tower, observed: observed.get(tower.pieceKey) || {} }));
    const displayed = compact ? rows.filter((row) => row.level === 1) : rows;
    const charts = compact ? "" : renderTowerCharts(rows, observed);
    return `${charts}<section class="section">${sectionTitle(compact ? "레벨 1 포탑 요약" : "포탑 이론값과 플레이 관측값", `${displayed.length}개 레코드`)}
      <div class="table-wrap"><table><thead><tr>
        <th>기물</th><th>역할</th><th>Lv</th><th>공격력</th><th>공격 간격</th><th>투사체</th><th>탄창</th><th>사거리</th><th>체력비례</th><th>기대 DPS</th><th>1회 소환 기대딜</th><th>관측 누적 피해</th><th>실전 점유율</th><th>표본</th>
      </tr></thead><tbody>${displayed.map((row) => `<tr>
        <td>${escape(row.pieceKey)}</td><td>${escape(`${row.label} / ${row.ai}`)}</td><td>${row.level}</td><td>${format(row.atk, 2)}</td><td>${format(row.interval, 3)}초</td><td>${row.count}</td><td>${row.ammo}</td><td>${format(row.range, 1)}</td><td>${escape(row.currentHpDisplay)}</td><td>${format(row.dps, 1)}</td><td>${format(row.magazineDamage)}</td><td>${row.observed.samples ? format(row.observed.damage) : "-"}</td><td>${row.observed.samples ? percent(row.observed.share) : "-"}</td><td>${row.observed.samples || 0}</td>
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
      <div class="table-wrap"><table><thead><tr><th>웨이브</th><th>패턴</th><th>구성</th><th>총 체력</th><th>평균 HP</th><th>공격 압력</th><th>표본</th><th>잔존</th><th>소팅 성공</th><th>슬롯 체력</th><th>기물 피해</th><th>시스템 피해</th><th>시스템 의존도</th></tr></thead>
      <tbody>${rows.map((row) => { const obs = row.observed || {}; return `<tr>
        <td>W${row.wave}</td><td>${escape(row.patternId || "-")}</td><td>${format(row.normalCount)} / ${format(row.speedyCount)} / ${format(row.tankerCount)}</td><td>${format(row.totalHp)}</td><td>${format(row.avgHp, 1)}</td><td>${format(row.attackPressure, 1)}</td><td>${row.samples || 0}</td><td class="${row.remaining > 5 ? "negative" : ""}">${row.samples ? format(row.remaining, 1) : "-"}</td><td>${row.samples ? format(obs.sorts, 1) : "-"}</td><td class="${row.samples && row.slotHp < .35 ? "negative" : row.samples && row.slotHp < .6 ? "warning" : "positive"}">${row.samples ? percent(row.slotHp) : "-"}</td><td>${row.samples ? format(obs.pieceDamage) : "-"}</td><td>${row.samples ? format(obs.systemDamage) : "-"}</td><td class="${row.systemShare > .45 ? "negative" : ""}">${row.samples ? percent(row.systemShare) : "-"}</td>
      </tr>`; }).join("")}</tbody></table></div></section>`;
  }

  function renderPerks() {
    const perks = getPerkSummary();
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
    </section>
    <section class="section">${sectionTitle("특전 선택 효율", "선택 횟수 / 제시 횟수 / 선택 후 결과")}
      <div class="table-wrap"><table><thead><tr><th>특전 ID</th><th>이름</th><th>희귀도</th><th>대상</th><th>제시</th><th>선택</th><th>선택률</th><th>선택 후 평균 도달</th><th>선택 후 클리어율</th></tr></thead><tbody>
      ${perks.map((row) => `<tr><td>${escape(row.id)}</td><td>${escape(row.title)}</td><td>${escape(row.rarity)}</td><td>${escape(row.target)}</td><td>${row.offered}</td><td>${row.picked}</td><td class="${row.rate > .55 ? "positive" : row.rate < .18 && row.offered >= 10 ? "negative" : ""}">${percent(row.rate)}</td><td>${row.pickedSessions.length ? `W${format(row.avgReached, 1)}` : "-"}</td><td>${row.pickedSessions.length ? percent(row.clearRate) : "-"}</td></tr>`).join("")}
      </tbody></table></div></section>`;
  }

  function renderVersions() {
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
    })).sort((a, b) => b.key.localeCompare(a.key));
    if (!rows.length) return empty();
    return `<section class="chart-grid">
      ${chartPanel("버전별 평균 도달 웨이브", "빌드/스냅샷 조합별 비교", horizontalBarChart(rows, {
        value: (item) => item.wave,
        label: (item) => item.build,
        color: () => "#276dcc",
        formatter: (value, item) => `W${format(value, 1)} / ${item.sessions}건`,
        limit: 10,
        labelLength: 24,
      }))}
      ${chartPanel("버전별 클리어율", "표본 수와 함께 해석 필요", horizontalBarChart(rows, {
        value: (item) => item.clearRate,
        label: (item) => item.build,
        color: (item) => item.clearRate < .3 ? "#c33d3d" : "#15946f",
        formatter: (value, item) => `${percent(value)} / ${item.sessions}건`,
        max: 1,
        limit: 10,
        labelLength: 24,
      }))}
    </section>
    <section class="section">${sectionTitle("빌드·밸런스 스냅샷 비교", "필터와 무관한 전체 버전")}
      <div class="table-wrap"><table><thead><tr><th>빌드</th><th>스냅샷</th><th>세션</th><th>클리어율</th><th>평균 도달</th><th>평균 소팅</th><th>종료 슬롯 체력</th><th>플레이 시간</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${escape(row.build)}</td><td>${escape(row.snapshot)}</td><td>${row.sessions}</td><td>${percent(row.clearRate)}</td><td>${format(row.wave, 1)}</td><td>${format(row.sorts, 1)}</td><td>${percent(row.slotHp)}</td><td>${format(row.duration, 1)}초</td></tr>`).join("")}
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
      <div class="table-wrap"><table><thead><tr><th>종료 시각</th><th>세션 ID</th><th>결과</th><th>빌드</th><th>도달</th><th>소팅</th><th>최대 콤보</th><th>피해량</th><th>슬롯 체력</th><th>기물</th><th>특전</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${escape(row.event_at || row.received_at)}</td><td>${escape(String(row.session_id || "").slice(0, 12))}</td><td>${escape(row.result)}</td><td>${escape(row.build_version)}</td><td>${format(row.reached_wave)}</td><td>${format(row.sort_successes)}</td><td>${format(row.max_combo)}</td><td>${format(row.damage_done)}</td><td>${percent(row.slot_hp_ratio_avg)}</td><td>${escape(row.selected_pieces)}</td><td>${escape(row.picked_perks)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
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
    const renderers = {
      overview: renderOverview,
      towers: () => renderTowerTable(false),
      waves: renderWaves,
      perks: renderPerks,
      diagnostics: renderDiagnostics,
      versions: renderVersions,
      sessions: renderSessions,
    };
    dashboard.innerHTML = (renderers[state.view] || renderOverview)();
    document.querySelector("#data-status").textContent =
      `밸런스 ${data.balance?.contractVersion || "-"} | 생성 ${data.balance?.generatedAt || data.generatedAt || "-"} | 세션 ${sessions.length}건`;
  }

  initControls();
  render();
})();
