const EVENT_SHEET_NAME = "events";
const SESSION_SHEET_NAME = "sessions";
const PIECE_DAMAGE_SHEET_NAME = "piece_damage";
const WAVE_STATS_SHEET_NAME = "wave_stats";
const PIECE_WAVE_STATS_SHEET_NAME = "piece_wave_stats";
const PERK_OPTIONS_SHEET_NAME = "perk_options";
const SYSTEM_STATS_SHEET_NAME = "system_stats";

const EVENT_HEADERS = [
  "received_at",
  "session_id",
  "event_id",
  "event_type",
  "event_at",
  "build_version",
  "stage_key",
  "stage_title",
  "wave",
  "wave_ordinal",
  "wave_total",
  "wave_phase",
  "elapsed_sec",
  "level",
  "kills",
  "damage_done",
  "enemy_count",
  "sort_successes",
  "tower_created",
  "tower_queued",
  "rerolls",
  "perk_choices",
  "max_combo",
  "damage_by_piece",
  "system_damage_by_source",
  "tower_composition",
  "alive_slot_count",
  "destroyed_slot_count",
  "slot_hp_total",
  "slot_hp_avg",
  "slot_hp_min",
  "slot_hp_ratio_avg",
  "slot_hp_ratios",
  "payload_json",
  "log_schema_version",
  "balance_contract_version",
  "balance_generated_at",
  "balance_snapshot_id",
  "device_class",
  "viewport_width",
  "viewport_height",
  "sort_attempts",
  "sort_failures",
  "repair_count",
  "repair_heal_total",
  "slot_damage_taken",
  "enemy_spawned",
  "enemy_defeated",
  "active_tower_count",
  "queued_tower_count",
  "data_source",
  "bot_profile",
  "bot_strategy",
  "simulation_version",
  "simulation_seed",
  "simulation_speed",
  "decision_delay_avg",
  "decision_delay_stddev",
  "mistake_count",
  "invalid_sort_attempts",
];

const EVENT_DESCRIPTIONS = [
  "서버가 로그를 받은 시각",
  "한 번의 플레이를 구분하는 고유 ID",
  "이벤트 중복을 구분하는 고유 ID",
  "발생한 행동 종류",
  "사용자 기기에서 이벤트가 발생한 시각",
  "플레이한 전시 빌드 버전",
  "스테이지 내부 식별자",
  "화면에 표시되는 스테이지 이름",
  "게임 내부 웨이브 번호",
  "스테이지 기준 몇 번째 웨이브인지",
  "스테이지 전체 웨이브 수",
  "전투/정비/보스 등 당시 상태",
  "세션 시작 후 경과 초",
  "당시 플레이어 레벨",
  "당시 누적 처치 점수",
  "당시 누적 총 피해량",
  "당시 전장에 남은 몬스터 수",
  "당시 누적 소팅 성공 횟수",
  "당시 누적 포탑 생성 횟수",
  "당시 누적 예약 포탑 횟수",
  "당시 누적 리롤 횟수",
  "당시 누적 특전 선택 횟수",
  "당시까지 달성한 최대 콤보",
  "웨이브/세션 이벤트의 기물별 피해 요약",
  "콤보 관통 등 기물 외 시스템 피해",
  "당시 배치·예약된 기물별 포탑 수",
  "살아 있는 슬롯 수",
  "파괴된 슬롯 수",
  "전체 슬롯 체력 합계",
  "슬롯 평균 체력",
  "가장 낮은 슬롯 체력",
  "슬롯 평균 체력 비율(0~1)",
  "각 슬롯 체력 비율 배열",
  "이벤트의 상세 원본 JSON",
  "로그 형식 버전",
  "밸런스 파서 계약 버전",
  "밸런스 JS 생성 시각",
  "플레이에 사용된 밸런스 스냅샷 ID",
  "기기 분류(mobile/tablet/desktop)",
  "브라우저 화면 너비",
  "브라우저 화면 높이",
  "당시 누적 소팅 시도 횟수",
  "당시 누적 실패한 소팅 시도 횟수",
  "당시 누적 수리 소팅 횟수",
  "당시 누적 수리 회복량",
  "당시 누적 슬롯 피격 피해",
  "당시 누적 생성 몬스터 수",
  "당시 누적 처치 몬스터 수",
  "현재 가동 중인 포탑 수",
  "현재 대기열 포탑 수",
  "실사용자(real) 또는 자동 플레이(simulation) 구분",
  "자동 플레이 숙련도 프로필",
  "자동 플레이 특전 빌드 성향",
  "자동 플레이 로직 버전",
  "동일 결과 재현용 난수 시드",
  "자동 플레이 게임 배속",
  "세션 평균 소팅 판단시간(초)",
  "소팅 판단시간 표준편차(초)",
  "의도적으로 비최적 행동을 한 횟수",
  "실행되지 못한 소팅 명령 횟수",
];

const SESSION_HEADERS = [
  "received_at",
  "session_id",
  "result",
  "event_at",
  "build_version",
  "stage_key",
  "stage_title",
  "selected_pieces",
  "selected_piece_keys",
  "reached_wave",
  "wave_total",
  "elapsed_sec",
  "duration_ms",
  "sort_successes",
  "tower_created",
  "tower_queued",
  "rerolls",
  "perk_choices",
  "max_combo",
  "picked_perks",
  "kills",
  "damage_done",
  "damage_by_piece",
  "system_damage_by_source",
  "tower_composition",
  "wave_snapshots",
  "wave_remaining_enemies",
  "alive_slot_count",
  "destroyed_slot_count",
  "slot_hp_total",
  "slot_hp_avg",
  "slot_hp_min",
  "slot_hp_ratio_avg",
  "payload_json",
  "log_schema_version",
  "balance_contract_version",
  "balance_generated_at",
  "balance_snapshot_id",
  "device_class",
  "viewport_width",
  "viewport_height",
  "sort_attempts",
  "sort_failures",
  "repair_count",
  "repair_heal_total",
  "slot_damage_taken",
  "enemy_spawned",
  "enemy_defeated",
  "piece_stats",
  "system_activations",
  "data_source",
  "bot_profile",
  "bot_strategy",
  "simulation_version",
  "simulation_seed",
  "simulation_speed",
  "decision_delay_avg",
  "decision_delay_stddev",
  "mistake_count",
  "invalid_sort_attempts",
];

const SESSION_DESCRIPTIONS = [
  "서버가 세션 종료 로그를 받은 시각",
  "한 번의 플레이를 구분하는 고유 ID",
  "clear/ fail/ abandon/ restart 종료 결과",
  "사용자 기기에서 세션이 끝난 시각",
  "플레이한 전시 빌드 버전",
  "스테이지 내부 식별자",
  "화면에 표시되는 스테이지 이름",
  "해당 스테이지에 편성한 기물 이름",
  "해당 스테이지에 편성한 기물 내부 키",
  "도달한 가장 높은 웨이브",
  "스테이지 전체 웨이브 수",
  "게임 안에서 흐른 시간(초)",
  "실제 세션 지속 시간(밀리초)",
  "세션 전체 소팅 성공 횟수",
  "세션 전체 포탑 생성 횟수",
  "세션 전체 예약 포탑 횟수",
  "세션 전체 리롤 횟수",
  "세션 전체 특전 선택 횟수",
  "세션에서 달성한 최대 콤보",
  "선택한 특전 이름 목록",
  "세션 전체 처치 점수",
  "세션 전체 피해량(기물+시스템)",
  "기물별 누적 피해량",
  "콤보 관통 등 기물 외 시스템 피해",
  "종료 시 배치·예약된 기물별 포탑 수",
  "완료 웨이브별 피해·슬롯 체력 원본",
  "완료 웨이브별 종료 시 남은 몬스터 수",
  "종료 시 살아 있는 슬롯 수",
  "종료 시 파괴된 슬롯 수",
  "종료 시 전체 슬롯 체력 합계",
  "종료 시 슬롯 평균 체력",
  "종료 시 가장 낮은 슬롯 체력",
  "종료 시 슬롯 평균 체력 비율(0~1)",
  "세션 종료 상세 원본 JSON",
  "로그 형식 버전",
  "밸런스 파서 계약 버전",
  "밸런스 JS 생성 시각",
  "플레이에 사용된 밸런스 스냅샷 ID",
  "기기 분류(mobile/tablet/desktop)",
  "브라우저 화면 너비",
  "브라우저 화면 높이",
  "세션 전체 소팅 시도 횟수",
  "세션 전체 실패한 소팅 시도 횟수",
  "세션 전체 수리 소팅 횟수",
  "세션 전체 수리 회복량",
  "세션 전체 슬롯 피격 피해",
  "세션 전체 생성 몬스터 수",
  "세션 전체 처치 몬스터 수",
  "기물별 발사·명중·피해·회복·가동시간 JSON",
  "콤보탄·전체정렬·탄배출 사용량 JSON",
  "실사용자(real) 또는 자동 플레이(simulation) 구분",
  "자동 플레이 숙련도 프로필",
  "자동 플레이 특전 빌드 성향",
  "자동 플레이 로직 버전",
  "동일 결과 재현용 난수 시드",
  "자동 플레이 게임 배속",
  "세션 평균 소팅 판단시간(초)",
  "소팅 판단시간 표준편차(초)",
  "의도적으로 비최적 행동을 한 횟수",
  "실행되지 못한 소팅 명령 횟수",
];

const PIECE_DAMAGE_HEADERS = [
  "received_at",
  "session_id",
  "result",
  "stage_key",
  "stage_title",
  "piece_key",
  "piece_name",
  "tower_type",
  "selected",
  "damage_done",
  "damage_share",
  "reached_wave",
  "max_combo",
  "build_version",
  "balance_snapshot_id",
  "tower_id",
  "tower_level",
  "tower_created",
  "tower_queued",
  "active_sec",
  "attacks_fired",
  "projectiles_fired",
  "hits",
  "healing_done",
  "overdrive_damage",
];

const PIECE_DAMAGE_DESCRIPTIONS = [
  "서버가 세션 종료 로그를 받은 시각",
  "한 번의 플레이를 구분하는 고유 ID",
  "세션 종료 결과",
  "스테이지 내부 식별자",
  "화면에 표시되는 스테이지 이름",
  "기물 내부 식별 키",
  "기물 표시 이름",
  "기물의 TowerType",
  "해당 스테이지 편성 여부",
  "이 기물이 세션에서 준 누적 피해",
  "전체 기물 피해 중 이 기물의 비율(0~1)",
  "세션이 도달한 가장 높은 웨이브",
  "세션에서 달성한 최대 콤보",
  "플레이한 빌드 버전",
  "플레이에 사용된 밸런스 스냅샷 ID",
  "TowerData 식별자",
  "플레이 당시 타워 레벨",
  "이 기물로 생성한 포탑 수",
  "이 기물로 대기열에 넣은 포탑 수",
  "이 기물 포탑의 누적 가동 초",
  "이 기물의 공격 실행 횟수",
  "이 기물의 생성 투사체 수",
  "이 기물의 명중 횟수",
  "이 기물의 실제 회복량",
  "탄배출로 준 피해량",
];

const WAVE_STATS_HEADERS = [
  "received_at", "session_id", "event_id", "build_version", "balance_snapshot_id",
  "stage_key", "wave", "wave_ordinal", "reason", "elapsed_sec", "enemy_spawned",
  "enemy_defeated", "remaining_enemy_count", "sort_attempts", "sort_successes",
  "sort_failures", "repair_count", "repair_heal_total", "slot_damage_taken", "max_combo",
  "piece_damage", "system_damage", "alive_slot_count", "destroyed_slot_count",
  "slot_hp_total", "slot_hp_ratio_avg", "tower_composition", "payload_json",
];
const WAVE_STATS_DESCRIPTIONS = [
  "서버 수신 시각", "플레이 세션 ID", "원본 웨이브 종료 이벤트 ID", "빌드 버전", "밸런스 스냅샷 ID",
  "스테이지 키", "게임 내부 웨이브", "스테이지 기준 웨이브 순서", "웨이브 종료 사유", "세션 경과 초",
  "해당 웨이브 생성 몬스터 수", "해당 웨이브 처치 몬스터 수", "웨이브 종료 시 남은 몬스터 수",
  "해당 웨이브 소팅 시도", "해당 웨이브 소팅 성공", "해당 웨이브 소팅 실패", "해당 웨이브 수리 소팅",
  "해당 웨이브 수리 회복량", "해당 웨이브 슬롯 피격 피해", "당시 세션 최대 콤보", "기물 피해 합계",
  "시스템 피해 합계", "생존 슬롯 수", "파괴 슬롯 수", "슬롯 체력 합", "슬롯 평균 체력 비율",
  "웨이브 종료 시 포탑 구성", "웨이브 상세 원본 JSON",
];

const PIECE_WAVE_STATS_HEADERS = [
  "received_at", "session_id", "event_id", "build_version", "balance_snapshot_id", "stage_key",
  "wave_ordinal", "piece_key", "piece_name", "tower_id", "tower_type", "tower_level",
  "tower_created", "tower_queued", "active_sec", "attacks_fired", "projectiles_fired",
  "hits", "damage_done", "healing_done", "overdrive_damage",
];
const PIECE_WAVE_STATS_DESCRIPTIONS = [
  "서버 수신 시각", "플레이 세션 ID", "원본 웨이브 종료 이벤트 ID", "빌드 버전", "밸런스 스냅샷 ID",
  "스테이지 키", "스테이지 기준 웨이브 순서", "기물 키", "기물 이름", "TowerData ID", "TowerType",
  "플레이 당시 레벨", "웨이브 포탑 생성", "웨이브 포탑 대기열 등록", "웨이브 가동 초", "웨이브 공격 횟수",
  "웨이브 투사체 수", "웨이브 명중 수", "웨이브 피해", "웨이브 회복", "웨이브 탄배출 피해",
];

const PERK_OPTIONS_HEADERS = [
  "received_at", "session_id", "event_id", "build_version", "balance_snapshot_id", "stage_key",
  "wave_ordinal", "perk_id", "perk_title", "rarity", "target_type", "label", "selected",
];
const PERK_OPTIONS_DESCRIPTIONS = [
  "서버 수신 시각", "플레이 세션 ID", "특전 선택 이벤트 ID", "빌드 버전", "밸런스 스냅샷 ID",
  "스테이지 키", "제시 당시 웨이브", "특전 ID", "특전 이름", "희귀도", "적용 대상", "효과 요약",
  "이 선택지의 실제 선택 여부",
];

const SYSTEM_STATS_HEADERS = [
  "received_at", "session_id", "event_id", "build_version", "balance_snapshot_id", "stage_key",
  "wave_ordinal", "source", "activation_count", "projectiles", "ammo_spent", "damage_done",
];
const SYSTEM_STATS_DESCRIPTIONS = [
  "서버 수신 시각", "플레이 세션 ID", "원본 웨이브 종료 이벤트 ID", "빌드 버전", "밸런스 스냅샷 ID",
  "스테이지 키", "스테이지 기준 웨이브 순서", "시스템 공격 종류", "사용 횟수", "생성 투사체 수",
  "소모 탄약", "해당 웨이브 시스템 피해",
];

function doGet() {
  return jsonOutput_({ ok: true, message: "3-Sort exhibition telemetry receiver is alive." });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    lock.waitLock(10000);
    locked = true;
    const payload = parseRequestPayload_(e);
    const events = normalizeEvents_(payload);
    if (!events.length) return jsonOutput_({ ok: false, error: "no_events" });

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error("No active spreadsheet. Create this script from Extensions > Apps Script inside the telemetry Sheet.");
    const receivedAt = new Date();
    const eventSheet = ensureSheet_(spreadsheet, EVENT_SHEET_NAME, EVENT_HEADERS, EVENT_DESCRIPTIONS);
    appendRows_(eventSheet, events.map((event) => toEventRow_(event, receivedAt)));

    const sessionEvents = events.filter((event) => event.eventType === "session_end");
    const sessionRows = sessionEvents.map((event) => toSessionRow_(event, receivedAt));
    if (sessionRows.length) {
      const sessionSheet = ensureSheet_(spreadsheet, SESSION_SHEET_NAME, SESSION_HEADERS, SESSION_DESCRIPTIONS);
      appendRows_(sessionSheet, sessionRows);
    }

    const pieceDamageRows = sessionEvents.flatMap((event) => toPieceDamageRows_(event, receivedAt));
    if (pieceDamageRows.length) {
      const pieceDamageSheet = ensureSheet_(
        spreadsheet,
        PIECE_DAMAGE_SHEET_NAME,
        PIECE_DAMAGE_HEADERS,
        PIECE_DAMAGE_DESCRIPTIONS,
      );
      appendRows_(pieceDamageSheet, pieceDamageRows);
    }

    const waveEvents = events.filter((event) => event.eventType === "wave_end");
    const waveRows = waveEvents.map((event) => toWaveStatsRow_(event, receivedAt));
    if (waveRows.length) {
      appendRows_(ensureSheet_(spreadsheet, WAVE_STATS_SHEET_NAME, WAVE_STATS_HEADERS, WAVE_STATS_DESCRIPTIONS), waveRows);
    }

    const pieceWaveRows = waveEvents.flatMap((event) => toPieceWaveStatsRows_(event, receivedAt));
    if (pieceWaveRows.length) {
      appendRows_(ensureSheet_(
        spreadsheet,
        PIECE_WAVE_STATS_SHEET_NAME,
        PIECE_WAVE_STATS_HEADERS,
        PIECE_WAVE_STATS_DESCRIPTIONS,
      ), pieceWaveRows);
    }

    const perkOptionRows = events
      .filter((event) => event.eventType === "perk_pick")
      .flatMap((event) => toPerkOptionRows_(event, receivedAt));
    if (perkOptionRows.length) {
      appendRows_(ensureSheet_(
        spreadsheet,
        PERK_OPTIONS_SHEET_NAME,
        PERK_OPTIONS_HEADERS,
        PERK_OPTIONS_DESCRIPTIONS,
      ), perkOptionRows);
    }

    const systemRows = waveEvents.flatMap((event) => toSystemStatsRows_(event, receivedAt));
    if (systemRows.length) {
      appendRows_(ensureSheet_(
        spreadsheet,
        SYSTEM_STATS_SHEET_NAME,
        SYSTEM_STATS_HEADERS,
        SYSTEM_STATS_DESCRIPTIONS,
      ), systemRows);
    }

    return jsonOutput_({
      ok: true,
      events: events.length,
      sessions: sessionRows.length,
      pieceDamageRows: pieceDamageRows.length,
      waveRows: waveRows.length,
      pieceWaveRows: pieceWaveRows.length,
      perkOptionRows: perkOptionRows.length,
      systemRows: systemRows.length,
    });
  } catch (error) {
    return jsonOutput_({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function parseRequestPayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  return JSON.parse(raw);
}

function normalizeEvents_(payload) {
  if (Array.isArray(payload && payload.events)) return payload.events.filter(Boolean);
  if (payload && payload.eventType) return [payload];
  return [];
}

function ensureSheet_(spreadsheet, name, headers, descriptions) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  ensureColumnCapacity_(sheet, headers.length);
  if (sheet.getLastRow() > 0 && text_(sheet.getRange(1, 1).getValue()) === "received_at") {
    sheet.insertRowBefore(1);
  }
  sheet.getRange(1, 1, 1, descriptions.length).setValues([descriptions]);
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(2);
  sheet.getRange(1, 1, 1, descriptions.length)
    .setBackground("#fff2cc")
    .setFontWeight("bold")
    .setWrap(true)
    .setVerticalAlignment("middle");
  sheet.getRange(2, 1, 1, headers.length)
    .setBackground("#d9eaf7")
    .setFontWeight("bold")
    .setWrap(false);
  sheet.setRowHeight(1, 48);
  return sheet;
}

function ensureColumnCapacity_(sheet, requiredColumns) {
  const missing = requiredColumns - sheet.getMaxColumns();
  if (missing > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), missing);
}

function appendRows_(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function getEventContext_(event) {
  return [
    text_(event.sessionId),
    text_(event.eventId),
    text_(event.buildVersion),
    text_(event.balanceSnapshotId),
    text_(event.stageKey),
  ];
}

function toEventRow_(event, receivedAt) {
  const payload = event.payload || {};
  return [
    receivedAt,
    text_(event.sessionId),
    text_(event.eventId),
    text_(event.eventType),
    text_(event.eventAt),
    text_(event.buildVersion),
    text_(event.stageKey),
    text_(event.stageTitle),
    number_(event.wave),
    number_(event.waveOrdinal),
    number_(event.waveTotal),
    text_(event.wavePhase),
    number_(event.elapsedSec),
    number_(event.level),
    number_(event.kills),
    number_(event.damageDone),
    number_(event.enemyCount),
    number_(event.sortSuccesses),
    number_(event.towerCreated),
    number_(event.towerQueued),
    number_(event.rerolls),
    number_(event.perkChoices),
    number_(event.maxCombo || payload.maxCombo),
    formatDamageByPiece_(payload.damageByPiece),
    formatSourceDamage_(payload.systemDamageBySource),
    formatTowerComposition_(payload.towerComposition),
    number_(event.aliveSlotCount),
    number_(event.destroyedSlotCount),
    number_(event.slotHpTotal),
    number_(event.slotHpAvg),
    number_(event.slotHpMin),
    number_(event.slotHpRatioAvg),
    json_(event.slotHpRatios || []),
    json_(event.payload || {}),
    text_(event.logSchemaVersion),
    text_(event.balanceContractVersion),
    text_(event.balanceGeneratedAt),
    text_(event.balanceSnapshotId),
    text_(event.deviceClass),
    number_(event.viewportWidth),
    number_(event.viewportHeight),
    number_(event.sortAttempts),
    number_(event.sortFailures),
    number_(event.repairCount),
    number_(event.repairHealTotal),
    number_(event.slotDamageTaken),
    number_(event.enemySpawned),
    number_(event.enemyDefeated),
    number_(event.activeTowerCount),
    number_(event.queuedTowerCount),
    text_(event.dataSource || "real"),
    text_(event.botProfile),
    text_(event.botStrategy),
    text_(event.simulationVersion),
    number_(event.simulationSeed),
    number_(event.simulationSpeed),
    number_(event.decisionDelayAvg),
    number_(event.decisionDelayStddev),
    number_(event.mistakeCount),
    number_(event.invalidSortAttempts),
  ];
}

function toSessionRow_(event, receivedAt) {
  const payload = event.payload || {};
  const loadout = Array.isArray(payload.loadout) ? payload.loadout : [];
  const pickedPerks = Array.isArray(payload.pickedPerks)
    ? payload.pickedPerks.map((perk) => perk.title || perk.id || "").filter(Boolean).join(", ")
    : "";
  return [
    receivedAt,
    text_(event.sessionId),
    text_(payload.result),
    text_(event.eventAt),
    text_(event.buildVersion),
    text_(event.stageKey),
    text_(event.stageTitle),
    loadout.map((piece) => piece.name || piece.pieceKey || "").filter(Boolean).join(", "),
    loadout.map((piece) => piece.pieceKey || "").filter(Boolean).join(", "),
    number_(event.reachedWave || event.waveOrdinal),
    number_(event.waveTotal),
    number_(event.elapsedSec),
    number_(payload.durationMs),
    number_(event.sortSuccesses),
    number_(event.towerCreated),
    number_(event.towerQueued),
    number_(event.rerolls),
    number_(event.perkChoices),
    number_(payload.maxCombo || event.maxCombo),
    pickedPerks,
    number_(event.kills),
    number_(event.damageDone),
    formatDamageByPiece_(payload.damageByPiece),
    formatSourceDamage_(payload.systemDamageBySource),
    formatTowerComposition_(payload.towerComposition),
    json_(payload.waveSnapshots || []),
    formatWaveRemainingEnemies_(payload.waveRemainingEnemies || payload.waveSnapshots),
    number_(event.aliveSlotCount),
    number_(event.destroyedSlotCount),
    number_(event.slotHpTotal),
    number_(event.slotHpAvg),
    number_(event.slotHpMin),
    number_(event.slotHpRatioAvg),
    json_(payload),
    text_(event.logSchemaVersion),
    text_(event.balanceContractVersion),
    text_(event.balanceGeneratedAt),
    text_(event.balanceSnapshotId),
    text_(event.deviceClass),
    number_(event.viewportWidth),
    number_(event.viewportHeight),
    number_(event.sortAttempts),
    number_(event.sortFailures),
    number_(event.repairCount),
    number_(event.repairHealTotal),
    number_(event.slotDamageTaken),
    number_(event.enemySpawned),
    number_(event.enemyDefeated),
    json_(payload.pieceStats || []),
    json_(payload.systemActivations || {}),
    text_(event.dataSource || "real"),
    text_(event.botProfile),
    text_(event.botStrategy),
    text_(event.simulationVersion),
    number_(event.simulationSeed),
    number_(event.simulationSpeed),
    number_(event.decisionDelayAvg),
    number_(event.decisionDelayStddev),
    number_(event.mistakeCount),
    number_(event.invalidSortAttempts),
  ];
}

function toPieceDamageRows_(event, receivedAt) {
  const payload = event.payload || {};
  const loadout = Array.isArray(payload.loadout) ? payload.loadout : [];
  const selectedByKey = Object.fromEntries(
    loadout.filter((piece) => piece && piece.pieceKey).map((piece) => [piece.pieceKey, piece]),
  );
  const damageItems = normalizeDamageByPiece_(payload.damageByPiece);
  const damageByKey = Object.fromEntries(damageItems.map((piece) => [piece.pieceKey, piece]));
  const statsByKey = Object.fromEntries(
    (Array.isArray(payload.pieceStats) ? payload.pieceStats : [])
      .filter((piece) => piece && piece.pieceKey)
      .map((piece) => [piece.pieceKey, piece]),
  );
  const pieceKeys = [...new Set([...Object.keys(selectedByKey), ...Object.keys(damageByKey)])];
  const totalPieceDamage = damageItems.reduce((sum, piece) => sum + number_(piece.damage), 0);
  return pieceKeys.map((pieceKey) => {
    const selectedPiece = selectedByKey[pieceKey] || {};
    const damagePiece = damageByKey[pieceKey] || {};
    const pieceStats = statsByKey[pieceKey] || {};
    const damage = number_(damagePiece.damage);
    return [
      receivedAt,
      text_(event.sessionId),
      text_(payload.result),
      text_(event.stageKey),
      text_(event.stageTitle),
      text_(pieceKey),
      text_(damagePiece.pieceName || selectedPiece.name || pieceKey),
      text_(damagePiece.towerType || selectedPiece.towerType),
      Boolean(selectedByKey[pieceKey]),
      damage,
      totalPieceDamage > 0 ? damage / totalPieceDamage : 0,
      number_(event.reachedWave || event.waveOrdinal),
      number_(payload.maxCombo || event.maxCombo),
      text_(event.buildVersion),
      text_(event.balanceSnapshotId),
      text_(pieceStats.towerId || damagePiece.towerId || selectedPiece.towerId),
      number_(pieceStats.towerLevel || selectedPiece.towerLevel),
      number_(pieceStats.towerCreated),
      number_(pieceStats.towerQueued),
      number_(pieceStats.activeSec),
      number_(pieceStats.attacksFired),
      number_(pieceStats.projectilesFired),
      number_(pieceStats.hits),
      number_(pieceStats.healingDone),
      number_(pieceStats.overdriveDamage),
    ];
  });
}

function toWaveStatsRow_(event, receivedAt) {
  const payload = event.payload || {};
  const slotHp = payload.slotHp || {};
  return [
    receivedAt,
    ...getEventContext_(event),
    number_(payload.wave || event.wave),
    number_(payload.waveOrdinal || event.waveOrdinal),
    text_(payload.reason),
    number_(payload.elapsedSec || event.elapsedSec),
    number_(payload.enemySpawned),
    number_(payload.enemyDefeated),
    number_(payload.remainingEnemyCount != null ? payload.remainingEnemyCount : payload.enemyCount),
    number_(payload.sortAttempts),
    number_(payload.sortSuccesses),
    number_(payload.sortFailures),
    number_(payload.repairCount),
    number_(payload.repairHealTotal),
    number_(payload.slotDamageTaken),
    number_(payload.maxCombo || event.maxCombo),
    sumDamageByPiece_(payload.damageByPiece),
    sumSourceDamage_(payload.systemDamageBySource),
    number_(slotHp.aliveSlotCount),
    number_(slotHp.destroyedSlotCount),
    number_(slotHp.slotHpTotal),
    number_(slotHp.slotHpRatioAvg),
    formatTowerComposition_(payload.towerComposition),
    json_(payload),
  ];
}

function toPieceWaveStatsRows_(event, receivedAt) {
  const pieces = Array.isArray(event.payload && event.payload.pieceStats) ? event.payload.pieceStats : [];
  return pieces.map((piece) => [
    receivedAt,
    ...getEventContext_(event),
    number_(event.payload.waveOrdinal || event.waveOrdinal),
    text_(piece.pieceKey),
    text_(piece.pieceName),
    text_(piece.towerId),
    text_(piece.towerType),
    number_(piece.towerLevel),
    number_(piece.towerCreated),
    number_(piece.towerQueued),
    number_(piece.activeSec),
    number_(piece.attacksFired),
    number_(piece.projectilesFired),
    number_(piece.hits),
    number_(piece.damageDone),
    number_(piece.healingDone),
    number_(piece.overdriveDamage),
  ]);
}

function toPerkOptionRows_(event, receivedAt) {
  const payload = event.payload || {};
  const pickedId = text_(payload.picked && payload.picked.id);
  const offered = Array.isArray(payload.offered) ? payload.offered : [];
  return offered.map((perk) => [
    receivedAt,
    ...getEventContext_(event),
    number_(event.waveOrdinal),
    text_(perk.id),
    text_(perk.title),
    text_(perk.rarity),
    text_(perk.targetType),
    text_(perk.label),
    text_(perk.id) === pickedId,
  ]);
}

function toSystemStatsRows_(event, receivedAt) {
  const payload = event.payload || {};
  const activations = payload.systemActivations && typeof payload.systemActivations === "object"
    ? payload.systemActivations
    : {};
  const damage = payload.systemDamageBySource && typeof payload.systemDamageBySource === "object"
    ? payload.systemDamageBySource
    : {};
  const sources = [...new Set([...Object.keys(activations), ...Object.keys(damage)])];
  return sources.map((source) => [
    receivedAt,
    ...getEventContext_(event),
    number_(payload.waveOrdinal || event.waveOrdinal),
    text_(source),
    number_(activations[source] && activations[source].count),
    number_(activations[source] && activations[source].projectiles),
    number_(activations[source] && activations[source].ammoSpent),
    number_(damage[source]),
  ]);
}

function normalizeDamageByPiece_(value) {
  if (Array.isArray(value)) return value.filter((item) => item && item.pieceKey);
  if (!value || typeof value !== "object") return [];
  return Object.keys(value).map((pieceKey) => ({ pieceKey, damage: number_(value[pieceKey]) }));
}

function formatDamageByPiece_(value) {
  return normalizeDamageByPiece_(value)
    .map((piece) => `${piece.pieceName || piece.pieceKey}: ${number_(piece.damage).toFixed(2)}`)
    .join(" | ");
}

function sumDamageByPiece_(value) {
  return normalizeDamageByPiece_(value).reduce((sum, piece) => sum + number_(piece.damage), 0);
}

function formatSourceDamage_(value) {
  if (!value || typeof value !== "object") return "";
  return Object.keys(value)
    .map((source) => `${source}: ${number_(value[source]).toFixed(2)}`)
    .join(" | ");
}

function sumSourceDamage_(value) {
  if (!value || typeof value !== "object") return 0;
  return Object.keys(value).reduce((sum, source) => sum + number_(value[source]), 0);
}

function formatTowerComposition_(value) {
  if (!Array.isArray(value)) return "";
  return value
    .map((piece) => `${piece.pieceName || piece.pieceKey}: ${number_(piece.count)}`)
    .join(" | ");
}

function formatWaveRemainingEnemies_(value) {
  if (!Array.isArray(value)) return "";
  return value
    .map((snapshot) => {
      const waveOrdinal = number_(snapshot.waveOrdinal || snapshot.wave);
      const remaining = snapshot.remainingEnemyCount != null
        ? number_(snapshot.remainingEnemyCount)
        : number_(snapshot.enemyCount);
      const label = waveOrdinal > 0 ? `W${waveOrdinal}` : text_(snapshot.wave || "");
      return label ? `${label}: ${remaining}` : `${remaining}`;
    })
    .filter(Boolean)
    .join(" | ");
}

function jsonOutput_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function number_(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text_(value) {
  return value == null ? "" : String(value);
}

function json_(value) {
  try {
    return JSON.stringify(value == null ? null : value);
  } catch (error) {
    return "";
  }
}
