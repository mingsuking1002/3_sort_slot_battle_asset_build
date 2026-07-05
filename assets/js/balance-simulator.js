(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.get("simulation") !== "1") return;

  const sessionCount = Math.max(1, Math.min(2000, Math.floor(Number(params.get("sessions")) || 9)));
  const speed = Math.max(1, Math.min(50, Number(params.get("speed")) || 50));
  const baseSeed = Math.max(1, Math.floor(Number(params.get("seed")) || 20260702));
  const runId = params.get("runId") || `sim-${Date.now()}`;
  const coverageMode = params.get("coverage") === "1";
  const experimentStage = String(params.get("stage") || "").trim();
  const experimentPieces = String(params.get("pieces") || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const STRATEGIES = ["balanced", "tower-focus", "combo", "survival", "firepower", "experimental"];
  const SCENARIOS = {
    standard: {
      label: "기본 랜덤", delay: 1, success: 0, planning: 0, perkNoise: 0,
      reroll: 0, attackBias: 0, repairBias: 0, perkQuality: 0,
    },
    highRoll: {
      label: "특전 운 좋음", delay: 0.98, success: 0.02, planning: 0.03, perkNoise: 0,
      reroll: 0.08, attackBias: 0.04, repairBias: 0, perkQuality: 0,
    },
    lowRoll: {
      label: "특전 운 나쁨", delay: 1.02, success: -0.02, planning: -0.02, perkNoise: 0,
      reroll: -0.06, attackBias: 0, repairBias: 0.02, perkQuality: 0,
    },
    pressureAttack: {
      label: "압박 공격 우선", delay: 0.92, success: 0.01, planning: 0.04, perkNoise: 0,
      reroll: 0.02, attackBias: 0.22, repairBias: -0.1, perkQuality: 0,
    },
    comboFocus: {
      label: "콤보 중심", delay: 0.96, success: 0.04, planning: 0.08, perkNoise: 0,
      reroll: 0.05, attackBias: 0.08, repairBias: -0.04, perkQuality: 0,
    },
  };
  const SCENARIO_KEYS = Object.keys(SCENARIOS);
  const COVERAGE_PLAN = [
    { profile: "beginner", strategy: "balanced", scenario: "standard" },
    { profile: "intermediate", strategy: "firepower", scenario: "pressureAttack" },
    { profile: "advanced", strategy: "combo", scenario: "comboFocus" },
    { profile: "intermediate", strategy: "survival", scenario: "lowRoll" },
    { profile: "intermediate", strategy: "tower-focus", scenario: "highRoll" },
    { profile: "beginner", strategy: "firepower", scenario: "pressureAttack" },
    { profile: "intermediate", strategy: "combo", scenario: "comboFocus" },
    { profile: "advanced", strategy: "balanced", scenario: "highRoll" },
    { profile: "intermediate", strategy: "experimental", scenario: "standard" },
  ];
  const PROFILES = {
    beginner: {
      label: "초보자", delayMean: 5.8, delayCv: 0.42, perkDelayMean: 6.2,
      successRate: 0.78, planningRate: 0.72, perkNoise: 1.25, rerollRate: 0.12,
      mistakeRate: 0, obviousMatchBonus: 0.12, setupBias: 0.74, planDepth: 1, preplanRate: 0.58,
    },
    intermediate: {
      label: "중급자", delayMean: 3.35, delayCv: 0.29, perkDelayMean: 3.1,
      successRate: 0.95, planningRate: 0.96, perkNoise: 0.58, rerollRate: 0.34,
      mistakeRate: 0, obviousMatchBonus: 0.03, setupBias: 0.9, planDepth: 2, preplanRate: 0.78,
    },
    advanced: {
      label: "상급자", delayMean: 2.35, delayCv: 0.22, perkDelayMean: 1.8,
      successRate: 0.995, planningRate: 0.995, perkNoise: 0.24, rerollRate: 0.58,
      mistakeRate: 0, obviousMatchBonus: 0, setupBias: 1, planDepth: 4, preplanRate: 0.92,
    },
  };
  const PIECE_TACTICAL_WEIGHTS = {
    basic: 0.75,
    scatter: 1.15,
    sniper: 1.2,
    breaker: 0.85,
    blast: 1.45,
    support: 0.55,
  };

  function hashSeed(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 1;
  }

  function makeRandom(seed) {
    let state = seed >>> 0 || 1;
    return () => {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = makeRandom(hashSeed(`${baseSeed}:human-planning-bot`));
  const pick = (items) => items[Math.floor(random() * items.length)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));

  function normal() {
    const u = Math.max(Number.EPSILON, random());
    const v = Math.max(Number.EPSILON, random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function logNormalWithMean(mean, cv) {
    const sigma = Math.sqrt(Math.log(1 + cv * cv));
    const mu = Math.log(Math.max(0.05, mean)) - sigma * sigma / 2;
    return Math.exp(mu + sigma * normal());
  }

  function parseMix(value) {
    const weights = { beginner: 2, intermediate: 5, advanced: 2 };
    if (value) {
      for (const token of value.split(",")) {
        const [key, raw] = token.split(":");
        if (PROFILES[key] && Number(raw) >= 0) weights[key] = Number(raw);
      }
    }
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, entry) => sum + entry[1], 0) || 1;
    return entries.map(([key, weight]) => [key, weight / total]);
  }

  function sampleProfile(mix) {
    const forced = params.get("profile");
    if (PROFILES[forced]) return forced;
    let roll = random();
    for (const [key, weight] of mix) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return mix[mix.length - 1][0];
  }

  function resolveScenario(raw) {
    return SCENARIOS[raw] ? raw : "";
  }

  function buildSessionProfile(profileKey, scenarioKey) {
    const resolvedProfileKey = PROFILES[profileKey] ? profileKey : "intermediate";
    const resolvedScenarioKey = SCENARIOS[scenarioKey] ? scenarioKey : "standard";
    const base = PROFILES[resolvedProfileKey];
    const scenario = SCENARIOS[resolvedScenarioKey];
    return {
      ...base,
      profileKey: resolvedProfileKey,
      scenarioKey: resolvedScenarioKey,
      scenarioLabel: scenario.label,
      delayMean: Math.max(0.65, base.delayMean * scenario.delay),
      perkDelayMean: Math.max(0.5, base.perkDelayMean * scenario.delay),
      successRate: clamp(base.successRate + scenario.success, 0.28, 0.99),
      planningRate: clamp(base.planningRate + scenario.planning, 0.25, 0.99),
      perkNoise: Math.max(0.08, base.perkNoise * scenario.perkNoise),
      rerollRate: clamp(base.rerollRate + scenario.reroll, 0, 0.85),
      attackBias: scenario.attackBias || 0,
      repairBias: scenario.repairBias || 0,
      perkQuality: scenario.perkQuality || 0,
    };
  }

  function coverageAssignment(index) {
    const forced = params.get("profile");
    const forcedScenario = resolveScenario(params.get("scenario"));
    if (PROFILES[forced]) {
      return {
        profile: forced,
        strategy: STRATEGIES[index % STRATEGIES.length],
        scenario: forcedScenario || SCENARIO_KEYS[index % SCENARIO_KEYS.length],
      };
    }
    const base = COVERAGE_PLAN[index % COVERAGE_PLAN.length];
    const cycle = Math.floor(index / COVERAGE_PLAN.length);
    const strategyIndex = (STRATEGIES.indexOf(base.strategy) + cycle * 2) % STRATEGIES.length;
    const scenarioIndex = (SCENARIO_KEYS.indexOf(base.scenario) + cycle) % SCENARIO_KEYS.length;
    return { profile: base.profile, strategy: STRATEGIES[strategyIndex], scenario: forcedScenario || SCENARIO_KEYS[scenarioIndex] };
  }

  function combinations(snapshot) {
    const sources = [];
    const emptyTargets = [];
    for (const slot of snapshot.slots) {
      slot.cells.forEach((pieceKey, cellIndex) => {
        if (pieceKey) sources.push({ slot: slot.id, cell: cellIndex, pieceKey });
        else emptyTargets.push({ slot: slot.id, cell: cellIndex });
      });
    }
    const successful = { attack: [], repair: [] };
    const pairSetups = { attack: [], repair: [] };
    for (const targetSlot of snapshot.slots) {
      const pieces = targetSlot.cells.filter(Boolean);
      const emptyCell = targetSlot.cells.findIndex((piece) => !piece);
      if (pieces.length !== 2 || pieces[0] !== pieces[1] || emptyCell < 0) continue;
      for (const source of sources) {
        if (source.slot === targetSlot.id || source.pieceKey !== pieces[0]) continue;
        const kind = targetSlot.destroyed ? "repair" : "attack";
        successful[kind].push({ ...source, toSlot: targetSlot.id, toCell: emptyCell, kind });
      }
    }
    for (const targetSlot of snapshot.slots) {
      const pieces = targetSlot.cells.filter(Boolean);
      const emptyCells = targetSlot.cells.map((piece, index) => piece ? -1 : index).filter((index) => index >= 0);
      if (pieces.length !== 1 || emptyCells.length !== 2) continue;
      for (const source of sources) {
        if (source.slot === targetSlot.id || source.pieceKey !== pieces[0]) continue;
        const kind = targetSlot.destroyed ? "repair" : "attack";
        pairSetups[kind].push({ ...source, toSlot: targetSlot.id, toCell: emptyCells[0], kind });
      }
    }
    const general = { attack: [], repair: [] };
    for (const source of sources) {
      for (const target of emptyTargets) {
        if (source.slot === target.slot) continue;
        const targetSlot = snapshot.slots[target.slot];
        const targetPieces = (targetSlot?.cells || []).filter(Boolean);
        if (targetPieces.length >= 2 && targetPieces.some((pieceKey) => pieceKey !== source.pieceKey)) continue;
        const kind = snapshot.slots[target.slot]?.destroyed ? "repair" : "attack";
        general[kind].push({ ...source, toSlot: target.slot, toCell: target.cell, kind });
      }
    }
    return { successful, pairSetups, general };
  }

  function getSlot(snapshot, slotId) {
    return (snapshot.slots || []).find((slot) => slot.id === slotId) || null;
  }

  function slotHpRatioOf(slot) {
    if (!slot) return 1;
    return Math.max(0, Number(slot.hp || 0)) / Math.max(1, Number(slot.maxHp || 1));
  }

  function getSourceStructureScore(snapshot, move) {
    const source = getSlot(snapshot, move.slot);
    if (!source) return 0;
    const beforeSame = source.cells.filter((pieceKey) => pieceKey === move.pieceKey).length;
    const afterPieces = source.cells.filter((pieceKey, index) => index !== move.cell && pieceKey);
    const afterSame = afterPieces.filter((pieceKey) => pieceKey === move.pieceKey).length;
    let score = 0;
    if (beforeSame === 2 && afterSame === 1) score -= 1.35;
    if (afterPieces.length === 2 && afterPieces[0] === afterPieces[1]) score += 1.25;
    if (!afterPieces.length) score -= 0.2;
    return score;
  }

  function getTargetStructureScore(snapshot, move, intendedSuccess, setupMove) {
    const target = getSlot(snapshot, move.toSlot);
    if (!target) return 0;
    const pieces = target.cells.filter(Boolean);
    let score = 0;
    if (intendedSuccess) score += 6.5;
    else if (setupMove) score += 3.2;
    if (!intendedSuccess && !setupMove && pieces.length === 0) score += 0.8;
    if (!intendedSuccess && !setupMove && pieces.length === 1 && pieces[0] === move.pieceKey) score += 1.4;
    if (target.destroyed) score += intendedSuccess ? 2.4 : 0.75;
    else score += 0.35;
    score += (1 - slotHpRatioOf(target)) * (target.destroyed ? 0.4 : 0.9);
    return score;
  }

  function getPieceTacticalScore(snapshot, move, kind) {
    const type = normalizePieceType(move.pieceKey);
    const threat = snapshot.threat || {};
    const enemies = Number(snapshot.enemies || 0);
    const pressure = Number(threat.pressureScore || 0);
    const hpRatio = slotHpRatio(snapshot);
    let score = PIECE_TACTICAL_WEIGHTS[type] || 0.55;
    if (enemies > 60 || pressure > 0.45) {
      if (type === "blast" || type === "scatter") score += 0.95;
      if (type === "sniper") score += 0.55;
      if (type === "breaker") score += 0.45;
    }
    if (hpRatio < 0.68 || Number(threat.destroyedSlotCount || 0) > 0) {
      if (type === "support") score += 1.25;
      if (kind === "repair") score += 0.6;
    }
    return score;
  }

  function getComboUrgencyScore(snapshot, intendedSuccess) {
    if (!intendedSuccess) return 0;
    const combo = Number(snapshot.combo || 0);
    if (combo > 0 && (combo + 1) % 10 === 0) return 4.4;
    if (combo >= 7) return 2.1;
    if (combo >= 4) return 0.9;
    return 0.25;
  }

  function scoreMove(snapshot, move, kind, intendedSuccess = false, setupMove = false) {
    const threat = snapshot.threat || {};
    const target = getSlot(snapshot, move.toSlot);
    let score =
      getTargetStructureScore(snapshot, move, intendedSuccess, setupMove)
      + getSourceStructureScore(snapshot, move)
      + getPieceTacticalScore(snapshot, move, kind)
      + getComboUrgencyScore(snapshot, intendedSuccess);
    if (target && (threat.pressuredSlotIds || []).includes(target.id)) score += kind === "attack" ? 1.45 : 0.35;
    if (kind === "attack" && Number(threat.attackingEnemyCount || 0) > 0) score += 0.8;
    if (kind === "repair" && Number(threat.destroyedSlotCount || 0) > 0) score += 0.75;
    return score;
  }

  function pickScoredMove(pool, snapshot, profile, kind, intendedSuccess = false, setupMove = false) {
    if (!pool.length) return null;
    const temperature = profile.profileKey === "advanced" ? 0.16 : profile.profileKey === "intermediate" ? 0.42 : 0.9;
    const scored = pool.map((move) => ({ move, score: scoreMove(snapshot, move, kind, intendedSuccess, setupMove) }));
    const max = Math.max(...scored.map((item) => item.score));
    const weights = scored.map((item) => Math.exp((item.score - max) / temperature));
    let roll = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < scored.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return scored[index].move;
    }
    return scored[scored.length - 1].move;
  }

  function moveSignature(move) {
    return `${move.slot}:${move.cell}>${move.toSlot}:${move.toCell}:${move.pieceKey}`;
  }

  function isMeaningfulFallbackMove(snapshot, move) {
    const target = getSlot(snapshot, move.toSlot);
    if (!target) return false;
    const pieces = target.cells.filter(Boolean);
    if (target.destroyed) return true;
    if (pieces.includes(move.pieceKey)) return true;
    if (getSourceStructureScore(snapshot, move) >= 0.85) return true;
    return false;
  }

  function createPlanState(profile) {
    return {
      queue: [],
      maxDepth: Math.max(0, Math.floor(Number(profile.planDepth || 0))),
      stats: {
        decisions: 0,
        queueDepthTotal: 0,
        maxQueueDepth: 0,
        plannedSorts: 0,
        planFollowups: 0,
        planSetups: 0,
        planBreaks: 0,
        reactiveSorts: 0,
        immediateMatches: 0,
        usefulFallbacks: 0,
      },
    };
  }

  function notePlanDepth(planState) {
    if (!planState) return;
    planState.stats.decisions += 1;
    planState.stats.queueDepthTotal += planState.queue.length;
    planState.stats.maxQueueDepth = Math.max(planState.stats.maxQueueDepth, planState.queue.length);
  }

  function chooseQueuedPlanMove(planState, options, snapshot, profile, pressureMode) {
    if (!planState?.queue.length) return null;
    notePlanDepth(planState);
    while (planState.queue.length) {
      const plan = planState.queue[0];
      if (pressureMode && plan.kind === "repair" && Number(snapshot.threat?.attackingEnemyCount || 0) > 0) {
        planState.queue.shift();
        planState.stats.planBreaks += 1;
        continue;
      }
      const pool = (options.successful[plan.kind] || []).filter((move) => (
        move.toSlot === plan.toSlot && move.pieceKey === plan.pieceKey
      ));
      if (pool.length) {
        planState.queue.shift();
        return {
          move: pickScoredMove(pool, snapshot, profile, plan.kind, true, false),
          intendedSuccess: true,
          setupMove: false,
          mistake: false,
          kind: plan.kind,
          planAction: "plan-followup",
        };
      }
      planState.queue.shift();
      planState.stats.planBreaks += 1;
    }
    return null;
  }

  function rememberFollowupPlan(planState, selected, profile) {
    if (!planState || !selected?.setupMove || planState.maxDepth <= 0) return;
    if (random() > Number(profile.preplanRate || 0.7)) return;
    const move = selected.move;
    const plan = { pieceKey: move.pieceKey, toSlot: move.toSlot, kind: selected.kind };
    if (planState.queue.some((item) => item.pieceKey === plan.pieceKey && item.toSlot === plan.toSlot && item.kind === plan.kind)) return;
    planState.queue.push(plan);
    while (planState.queue.length > planState.maxDepth) planState.queue.shift();
  }

  function recordMovePlanStats(planState, selected, pressureMode) {
    if (!planState || !selected) return;
    if (selected.planAction === "plan-followup") {
      planState.stats.plannedSorts += 1;
      planState.stats.planFollowups += 1;
    } else if (selected.setupMove) {
      planState.stats.plannedSorts += 1;
      planState.stats.planSetups += 1;
    } else if (selected.intendedSuccess) {
      planState.stats.immediateMatches += 1;
    } else {
      planState.stats.usefulFallbacks += 1;
    }
    if (pressureMode && selected.kind === "attack") planState.stats.reactiveSorts += 1;
  }

  function chooseMoveForKind(options, kind, profile, snapshot) {
    const successful = options.successful[kind];
    const pairSetups = options.pairSetups[kind];
    const general = options.general[kind];
    const matchChance = clamp(Number(profile.successRate || 0.8) + (successful.length > 1 ? Number(profile.obviousMatchBonus || 0) : 0), 0, 0.999);
    if (successful.length && random() < matchChance) {
      return { move: pickScoredMove(successful, snapshot, profile, kind, true, false), intendedSuccess: true, setupMove: false, mistake: false, kind, planAction: "immediate-match" };
    }
    if (!successful.length && pairSetups.length && random() < profile.planningRate) {
      return { move: pickScoredMove(pairSetups, snapshot, profile, kind, false, true), intendedSuccess: false, setupMove: true, mistake: false, kind, planAction: "plan-setup" };
    }
    if (successful.length && profile.profileKey === "advanced") {
      return { move: pickScoredMove(successful, snapshot, profile, kind, true, false), intendedSuccess: true, setupMove: false, mistake: false, kind, planAction: "immediate-match" };
    }
    if (pairSetups.length && random() < profile.planningRate * Number(profile.setupBias || 0.65)) {
      return { move: pickScoredMove(pairSetups, snapshot, profile, kind, false, true), intendedSuccess: false, setupMove: true, mistake: false, kind, planAction: "plan-setup" };
    }
    const plannedKeys = new Set([...successful, ...pairSetups].map(moveSignature));
    const useful = general.filter((move) => !plannedKeys.has(moveSignature(move)) && isMeaningfulFallbackMove(snapshot, move));
    const pool = useful.length ? useful : general.filter((move) => isMeaningfulFallbackMove(snapshot, move));
    if (!pool.length) return null;
    return { move: pickScoredMove(pool, snapshot, profile, kind, false, false), intendedSuccess: false, setupMove: false, mistake: false, kind, planAction: "useful-fallback" };
  }

  function chooseMove(snapshot, profile, profileKey, pressureMode, planState) {
    const options = combinations(snapshot);
    const planned = chooseQueuedPlanMove(planState, options, snapshot, profile, pressureMode);
    if (planned) return planned;
    notePlanDepth(planState);
    const hasRepair = options.successful.repair.length || options.pairSetups.repair.length || options.general.repair.length;
    let selected = null;
    if (profileKey !== "advanced") {
      if (pressureMode) {
        selected = chooseMoveForKind(options, "attack", profile, snapshot) || chooseMoveForKind(options, "repair", profile, snapshot);
        rememberFollowupPlan(planState, selected, profile);
        return selected;
      }
      const preferRepair = hasRepair && random() < clamp(0.58 + profile.repairBias - profile.attackBias, 0.08, 0.88);
      const primary = preferRepair ? "repair" : "attack";
      const secondary = preferRepair ? "attack" : "repair";
      selected = chooseMoveForKind(options, primary, profile, snapshot) || chooseMoveForKind(options, secondary, profile, snapshot);
      rememberFollowupPlan(planState, selected, profile);
      return selected;
    }
    const threat = snapshot.threat || {};
    const destroyed = Number(threat.destroyedSlotCount || 0);
    const repairChance = destroyed
      ? clamp(0.16 + destroyed * 0.15 + (Number(threat.aliveSlotCount || 9) <= 4 ? 0.22 : 0) - Number(threat.pressureScore || 0) * 0.3 + profile.repairBias - profile.attackBias, 0.08, 0.78)
      : 0;
    const preferRepair = hasRepair && random() < repairChance;
    const primary = preferRepair ? "repair" : "attack";
    const secondary = preferRepair ? "attack" : "repair";
    selected = chooseMoveForKind(options, primary, profile, snapshot) || chooseMoveForKind(options, secondary, profile, snapshot);
    rememberFollowupPlan(planState, selected, profile);
    return selected;
  }

  function updatePressureMode(current, snapshot, profileKey) {
    const threat = snapshot.threat || {};
    const score = Number(threat.pressureScore || 0);
    const attacking = Number(threat.attackingEnemyCount || 0);
    const near = Number(threat.nearSlotEnemyCount || 0);
    const enter = profileKey === "beginner" ? 0.48 : profileKey === "intermediate" ? 0.38 : 0.38;
    const exit = profileKey === "beginner" ? 0.24 : profileKey === "intermediate" ? 0.2 : 0.18;
    if (attacking > 0 || score >= enter) return true;
    if (score <= exit && attacking === 0 && near <= 1) return false;
    return current;
  }

  function getPressureDelayMultiplier(snapshot, profileKey, pressureMode) {
    const threat = snapshot.threat || {};
    let multiplier = pressureMode ? (profileKey === "advanced" ? 0.56 : profileKey === "intermediate" ? 0.58 : 0.68) : 1;
    if (Number(threat.attackingEnemyCount || 0) > 0) multiplier *= profileKey === "advanced" ? 0.58 : profileKey === "intermediate" ? 0.62 : 0.72;
    else if (Number(threat.nearSlotEnemyCount || 0) > 0) multiplier *= profileKey === "advanced" ? 0.76 : profileKey === "intermediate" ? 0.78 : 0.84;
    return Math.max(profileKey === "advanced" ? 0.28 : profileKey === "intermediate" ? 0.34 : 0.46, multiplier);
  }

  function slotHpRatio(snapshot) {
    if (!snapshot.slots.length) return 1;
    return snapshot.slots.reduce((sum, slot) => sum + Math.max(0, slot.hp) / Math.max(1, slot.maxHp), 0) / snapshot.slots.length;
  }

  function normalizePieceType(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("scatter") || raw.includes("shotgun")) return "scatter";
    if (raw.includes("sniper") || raw.includes("sr")) return "sniper";
    if (raw.includes("breaker") || raw.includes("mortar")) return "breaker";
    if (raw.includes("blast") || raw.includes("boomer")) return "blast";
    if (raw.includes("support") || raw.includes("buffer")) return "support";
    if (raw.includes("basic")) return "basic";
    return raw.split("_")[0] || "";
  }

  function boardTypeCounts(snapshot) {
    const counts = {};
    for (const slot of snapshot.slots || []) {
      for (const pieceKey of slot.cells || []) {
        const type = normalizePieceType(pieceKey);
        if (type) counts[type] = (counts[type] || 0) + 1;
      }
    }
    return counts;
  }

  function actionTags(choice) {
    const actions = choice.actions || [];
    const id = String(choice.id || "").toLowerCase();
    const title = String(choice.title || "").toLowerCase();
    const body = String(choice.body || "").toLowerCase();
    const actionTypes = actions.map((action) => String(action.type || ""));
    const haystack = `${id} ${title} ${body} ${actionTypes.join(" ")}`;
    return {
      actionTypes,
      offense: /damage|atk|firerate|projectilecount|percenthp|attack|공격|발사|관통|폭발|탄창/i.test(haystack),
      survival: /heal|slot|maxhp|regen|repair|회복|체력|수리/i.test(haystack),
      combo: /combo|specialprojectile|콤보|전체|필살/i.test(haystack) || Number(choice.design?.perkTarget) === 8,
      area: /blast|splash|explode|projectilecount|범위|폭발|산탄/i.test(haystack),
      fireRate: /firerate|speed|공격 속도|공속|가속/i.test(haystack),
      ammo: /ammo|magazine|탄창|탄약/i.test(haystack),
    };
  }

  function perkScore(choice, snapshot, profile, strategy) {
    const rarity = { common: 0.2, rare: 0.75, unique: 1.05, legendary: 1.4 }[choice.rarity] || 0;
    const id = String(choice.id || "").toLowerCase();
    const tags = actionTags(choice);
    const actionTypes = tags.actionTypes;
    const threat = snapshot.threat || {};
    const hpRatio = slotHpRatio(snapshot);
    const pressure = Number(threat.pressureScore || 0);
    const destroyed = Number(threat.destroyedSlotCount || 0);
    const enemies = Number(snapshot.enemies || 0);
    const typeCounts = boardTypeCounts(snapshot);
    let score = 1 + rarity + (choice.perkLevel < choice.maxLevel ? 0.25 : -2);

    const targetType = normalizePieceType(choice.targetType);
    if (targetType) {
      const owned = Number(typeCounts[targetType] || 0);
      score += 0.1 + Math.min(1.25, owned * 0.16);
    }

    if (pressure > 0.5 || enemies > 35) {
      if (tags.offense) score += 0.9 + Math.min(1.15, pressure * 0.95);
      if (tags.area || tags.combo) score += enemies > 35 ? 0.95 : 0.38;
      if (tags.survival && destroyed <= 0 && hpRatio > 0.7) score -= 0.28;
    }
    if (destroyed > 0 || hpRatio < 0.62) {
      if (tags.survival) score += 1.35 + destroyed * 0.35 + (0.65 - hpRatio);
      if (tags.offense && hpRatio < 0.38) score -= 0.25;
    }

    if (snapshot.combo >= 7 && tags.combo) score += 0.85;
    if (tags.fireRate && (pressure > 0.25 || enemies > 20)) score += 0.65;
    if (tags.ammo && hpRatio > 0.45) score += enemies > 45 ? 0.45 : 0.22;

    if (strategy === "combo" && tags.combo) score += 2.4;
    if (strategy === "survival" && (hpRatio < 0.72 || tags.survival)) score += 2.1;
    if (strategy === "firepower" && tags.offense) score += 1.8;
    if (strategy === "tower-focus" && choice.targetType) score += 1.35;
    if (strategy === "experimental" && choice.perkLevel === 0) score += 1.1;
    if (strategy === "balanced" && !choice.targetType) score += 0.8;
    if (profile.scenarioKey === "comboFocus" && tags.combo) score += 0.9;
    if (profile.scenarioKey === "pressureAttack" && tags.offense) score += 0.55;
    if (enemies > 35 && actionTypes.some((type) => /Blast|ProjectileCount|SpecialProjectile/i.test(type))) score += 0.6;
    return score;
  }

  function weightedPerkIndex(choices, scores, profile) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < choices.length; index += 1) {
      if (scores[index] > bestScore) {
        bestScore = scores[index];
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  function createStatus() {
    const element = document.createElement("aside");
    element.style.cssText = "position:fixed;z-index:99999;left:8px;top:8px;max-width:calc(100vw - 16px);padding:8px 10px;background:#111;color:#fff;font:700 12px/1.4 Arial,sans-serif;border:1px solid #fff";
    element.textContent = "밸런스 시뮬레이터 준비 중";
    document.body.appendChild(element);
    return element;
  }

  async function waitForApi() {
    if (window.BALANCE_SIMULATION) return window.BALANCE_SIMULATION;
    await new Promise((resolve) => window.addEventListener("balance-simulation-ready", resolve, { once: true }));
    return window.BALANCE_SIMULATION;
  }

  function summarizeDelays(delays) {
    if (!delays.length) return { average: 0, stddev: 0 };
    const average = delays.reduce((sum, value) => sum + value, 0) / delays.length;
    const variance = delays.reduce((sum, value) => sum + (value - average) ** 2, 0) / delays.length;
    return { average, stddev: Math.sqrt(variance) };
  }

  function runSession(api, profileKey, strategy, scenarioKey, sessionIndex, status) {
    const profile = buildSessionProfile(profileKey, scenarioKey);
    const sessionSeed = hashSeed(`${baseSeed}:${sessionIndex}:${profile.profileKey}:${strategy}:${profile.scenarioKey}`);
    const decisionDelays = [];
    const perkDelays = [];
    let attempts = 0;
    let mistakes = 0;
    let invalidSortAttempts = 0;
    let rerolls = 0;
    let perkPicks = 0;
    let pressureMode = false;
    let clock = 0;
    let nextSortAt = logNormalWithMean(profile.delayMean, profile.delayCv);
    let perkDecision = null;
    const planState = createPlanState(profile);
    let previousFrame = performance.now();
    const wallStarted = performance.now();
    const eventStart = api.getEvents().length;

    api.startSession({
      botProfile: profile.profileKey,
      botStrategy: strategy,
      botScenario: profile.scenarioKey,
      stageKey: experimentStage,
      pieceKeys: experimentPieces,
      simulationSeed: sessionSeed,
    });

    return new Promise((resolve) => {
      function updateMeta() {
        const stats = summarizeDelays(decisionDelays);
        const planStats = planState.stats;
        const plannedSortRatio = attempts ? planStats.plannedSorts / attempts : 0;
        const reactiveSortRatio = attempts ? planStats.reactiveSorts / attempts : 0;
        const averagePlanDepth = planStats.decisions ? planStats.queueDepthTotal / planStats.decisions : 0;
        api.setMeta({
          decisionDelayAvg: Number(stats.average.toFixed(3)),
          decisionDelayStddev: Number(stats.stddev.toFixed(3)),
          mistakeCount: mistakes,
          invalidSortAttempts,
          perkDecisionDelayTotal: Number(perkDelays.reduce((sum, value) => sum + value, 0).toFixed(3)),
          plannedSortCount: planStats.plannedSorts,
          plannedSortRatio: Number(plannedSortRatio.toFixed(3)),
          planFollowupCount: planStats.planFollowups,
          planSetupCount: planStats.planSetups,
          planBreakCount: planStats.planBreaks,
          reactiveSortCount: planStats.reactiveSorts,
          reactiveSortRatio: Number(reactiveSortRatio.toFixed(3)),
          immediateMatchCount: planStats.immediateMatches,
          usefulFallbackCount: planStats.usefulFallbacks,
          averagePlanDepth: Number(averagePlanDepth.toFixed(3)),
          maxPlanDepth: planStats.maxQueueDepth,
        });
      }

      function finish(snapshot, timedOut = false) {
        updateMeta();
        if (timedOut && !snapshot.ended) api.abortSession("simulation_timeout");
        const events = api.getEvents().slice(eventStart);
        const endEvent = [...events].reverse().find((event) => event.eventType === "session_end");
        resolve({
          sessionIndex,
          sessionId: endEvent?.sessionId || snapshot.sessionId,
          profile: profile.profileKey,
          strategy,
          scenario: profile.scenarioKey,
          seed: sessionSeed,
          actualAttempts: endEvent?.sortAttempts ?? snapshot.telemetry?.sortAttempts ?? attempts,
          result: endEvent?.payload?.result || (snapshot.wavePhase === "clear" ? "clear" : timedOut ? "timeout" : "fail"),
          reachedWave: endEvent?.reachedWave ?? snapshot.waveOrdinal,
          decisionDelayAvg: summarizeDelays(decisionDelays).average,
          decisionDelayStddev: summarizeDelays(decisionDelays).stddev,
          mistakes,
          invalidSortAttempts,
          perkPicks,
          rerolls,
          eventCount: events.length,
          plannedSortRatio: attempts ? planState.stats.plannedSorts / attempts : 0,
          planBreaks: planState.stats.planBreaks,
          reactiveSorts: planState.stats.reactiveSorts,
        });
      }

      function frame(now) {
        const realDt = Math.min(0.1, Math.max(0, (now - previousFrame) / 1000));
        previousFrame = now;
        clock += realDt * speed;
        let snapshot = api.getSnapshot();
        pressureMode = updatePressureMode(pressureMode, snapshot, profile.profileKey);
        status.textContent = `${profile.label}/${profile.scenarioLabel} ${sessionIndex + 1}/${sessionCount} · W${snapshot.waveOrdinal}/${snapshot.waveTotal} · 소팅 ${snapshot.telemetry?.sortAttempts || 0}회 · 압박 ${Math.round(Number(snapshot.threat?.pressureScore || 0) * 100)}`;

        if (snapshot.ended) return finish(snapshot);
        if (now - wallStarted > 180000) return finish(snapshot, true);

        if (snapshot.pendingLevelUps <= 0 && snapshot.paused && snapshot.wavePhase === "perk") {
          api.continueAfterPerk();
          snapshot = api.getSnapshot();
        }

        if (snapshot.choices.length && snapshot.pendingLevelUps > 0) {
          const key = `${snapshot.pendingLevelUps}:${snapshot.choices.map((choice) => choice.id).join("|")}`;
          if (!perkDecision || perkDecision.key !== key) {
            const delay = logNormalWithMean(profile.perkDelayMean, profile.delayCv);
            perkDecision = { key, at: clock + delay, delay };
          } else if (clock >= perkDecision.at) {
            const scores = snapshot.choices.map((choice) => perkScore(choice, snapshot, profile, strategy));
            const best = Math.max(...scores);
            const shouldReroll = !snapshot.perkRerollUsed && random() < profile.rerollRate && best < (profile.profileKey === "advanced" ? 2.6 : 2.1);
            perkDelays.push(perkDecision.delay);
            if (shouldReroll && api.rerollPerks()) rerolls += 1;
            else {
              api.choosePerk(weightedPerkIndex(snapshot.choices, scores, profile));
              perkPicks += 1;
            }
            perkDecision = null;
            updateMeta();
          }
        } else if (!snapshot.paused && ["combat", "boss"].includes(snapshot.wavePhase) && clock >= nextSortAt) {
          const pressureMultiplier = getPressureDelayMultiplier(snapshot, profile.profileKey, pressureMode);
          const delay = Math.max(0.45, logNormalWithMean(profile.delayMean * pressureMultiplier, profile.delayCv));
          decisionDelays.push(delay);
          const selected = chooseMove(snapshot, profile, profile.profileKey, pressureMode, planState);
          if (selected) {
            const move = selected.move;
            const result = api.movePiece(move.slot, move.cell, move.toSlot, move.toCell);
            attempts += 1;
            recordMovePlanStats(planState, selected, pressureMode);
            if (selected.mistake) mistakes += 1;
            if (!result.ok) invalidSortAttempts += 1;
          }
          nextSortAt = clock + delay;
          updateMeta();
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  function buildSummary(sessions) {
    const groups = {};
    const strategies = {};
    const scenarios = {};
    for (const session of sessions) strategies[session.strategy] = (strategies[session.strategy] || 0) + 1;
    for (const session of sessions) scenarios[session.scenario] = (scenarios[session.scenario] || 0) + 1;
    for (const key of Object.keys(PROFILES)) {
      const rows = sessions.filter((session) => session.profile === key);
      groups[key] = {
        sessions: rows.length,
        clears: rows.filter((session) => session.result === "clear").length,
        clearRate: rows.length ? rows.filter((session) => session.result === "clear").length / rows.length : 0,
        averageAttempts: rows.length ? rows.reduce((sum, row) => sum + Number(row.actualAttempts || 0), 0) / rows.length : 0,
        averageDecisionSec: rows.length ? rows.reduce((sum, row) => sum + Number(row.decisionDelayAvg || 0), 0) / rows.length : 0,
        averageReachedWave: rows.length ? rows.reduce((sum, row) => sum + Number(row.reachedWave || 0), 0) / rows.length : 0,
        averagePlannedSortRatio: rows.length ? rows.reduce((sum, row) => sum + Number(row.plannedSortRatio || 0), 0) / rows.length : 0,
      };
    }
    return { totalSessions: sessions.length, groups, strategies, scenarios };
  }

  async function postResult(payload) {
    const response = await fetch("/__simulation/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`결과 저장 실패: ${response.status}`);
    return response.json();
  }

  async function main() {
    const status = createStatus();
    const api = await waitForApi();
    const mix = parseMix(params.get("mix"));
    const sessions = [];
    for (let index = 0; index < sessionCount; index += 1) {
      const assignment = coverageMode
        ? coverageAssignment(index)
        : { profile: sampleProfile(mix), strategy: pick(STRATEGIES), scenario: resolveScenario(params.get("scenario")) || pick(SCENARIO_KEYS) };
      const profile = assignment.profile;
      const strategy = assignment.strategy;
      const scenario = assignment.scenario;
      sessions.push(await runSession(api, profile, strategy, scenario, index, status));
    }
    const payload = {
      schemaVersion: "3sort-balance-simulation-v1",
      generatedAt: new Date().toISOString(),
      runId,
      config: { sessionCount, speed, baseSeed, coverageMode, mix: Object.fromEntries(mix), stage: experimentStage, pieces: experimentPieces, scenarios: SCENARIOS },
      summary: buildSummary(sessions),
      sessions,
      events: api.getEvents(),
    };
    api.flushTelemetry();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    window.__BALANCE_SIMULATION_RESULT__ = payload;
    status.textContent = `완료 · ${sessions.length}세션 · 시트 전송 마무리 중`;
    const saved = await postResult(payload);
    status.textContent = `완료 · ${sessions.length}세션 · ${saved.destination || "Google Sheet"}`;
  }

  main().catch(async (error) => {
    console.error("[BALANCE SIMULATION]", error);
    const payload = {
      schemaVersion: "3sort-balance-simulation-v1",
      generatedAt: new Date().toISOString(),
      runId,
      error: error.stack || error.message || String(error),
    };
    try { await postResult(payload); } catch (postError) { console.error(postError); }
  });
})();
