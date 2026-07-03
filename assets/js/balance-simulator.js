(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.get("simulation") !== "1") return;

  const sessionCount = Math.max(1, Math.min(2000, Math.floor(Number(params.get("sessions")) || 9)));
  const speed = Math.max(1, Math.min(50, Number(params.get("speed")) || 50));
  const baseSeed = Math.max(1, Math.floor(Number(params.get("seed")) || 20260702));
  const runId = params.get("runId") || `sim-${Date.now()}`;
  const coverageMode = params.get("coverage") === "1";
  const STRATEGIES = ["balanced", "tower-focus", "combo", "survival", "firepower", "experimental"];
  const COVERAGE_PLAN = [
    { profile: "beginner", strategy: "balanced" },
    { profile: "beginner", strategy: "survival" },
    { profile: "beginner", strategy: "experimental" },
    { profile: "intermediate", strategy: "firepower" },
    { profile: "intermediate", strategy: "combo" },
    { profile: "intermediate", strategy: "tower-focus" },
    { profile: "advanced", strategy: "balanced" },
    { profile: "advanced", strategy: "combo" },
    { profile: "advanced", strategy: "survival" },
  ];
  const PROFILES = {
    beginner: {
      label: "초보자", delayMean: 6.78, delayCv: 0.38, perkDelayMean: 7.2,
      successRate: 0.48, perkNoise: 1.45, rerollRate: 0.08,
    },
    intermediate: {
      label: "중급자", delayMean: 4.17, delayCv: 0.29, perkDelayMean: 4.8,
      successRate: 0.73, perkNoise: 0.85, rerollRate: 0.23,
    },
    advanced: {
      label: "상급자", delayMean: 3.04, delayCv: 0.24, perkDelayMean: 3.1,
      successRate: 0.91, perkNoise: 0.42, rerollRate: 0.42,
    },
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

  const random = makeRandom(hashSeed(`${baseSeed}:${runId}`));
  const pick = (items) => items[Math.floor(random() * items.length)];

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
    const weights = { beginner: 34, intermediate: 33, advanced: 33 };
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

  function coverageAssignment(index) {
    const forced = params.get("profile");
    if (PROFILES[forced]) {
      return { profile: forced, strategy: STRATEGIES[index % STRATEGIES.length] };
    }
    const base = COVERAGE_PLAN[index % COVERAGE_PLAN.length];
    const cycle = Math.floor(index / COVERAGE_PLAN.length);
    const strategyIndex = (STRATEGIES.indexOf(base.strategy) + cycle * 2) % STRATEGIES.length;
    return { profile: base.profile, strategy: STRATEGIES[strategyIndex] };
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
    const successful = [];
    for (const targetSlot of snapshot.slots) {
      const pieces = targetSlot.cells.filter(Boolean);
      const emptyCell = targetSlot.cells.findIndex((piece) => !piece);
      if (pieces.length !== 2 || pieces[0] !== pieces[1] || emptyCell < 0) continue;
      for (const source of sources) {
        if (source.slot === targetSlot.id || source.pieceKey !== pieces[0]) continue;
        successful.push({ ...source, toSlot: targetSlot.id, toCell: emptyCell });
      }
    }
    const general = [];
    for (const source of sources) {
      for (const target of emptyTargets) {
        if (source.slot === target.slot) continue;
        general.push({ ...source, toSlot: target.slot, toCell: target.cell });
      }
    }
    return { successful, general };
  }

  function chooseMove(snapshot, profile) {
    const options = combinations(snapshot);
    if (options.successful.length && random() < profile.successRate) {
      return { move: pick(options.successful), intendedSuccess: true };
    }
    const successKeys = new Set(options.successful.map((move) => `${move.slot}:${move.cell}>${move.toSlot}:${move.toCell}`));
    const failures = options.general.filter((move) => !successKeys.has(`${move.slot}:${move.cell}>${move.toSlot}:${move.toCell}`));
    const pool = failures.length ? failures : options.general;
    return pool.length ? { move: pick(pool), intendedSuccess: false } : null;
  }

  function slotHpRatio(snapshot) {
    if (!snapshot.slots.length) return 1;
    return snapshot.slots.reduce((sum, slot) => sum + Math.max(0, slot.hp) / Math.max(1, slot.maxHp), 0) / snapshot.slots.length;
  }

  function perkScore(choice, snapshot, profile, strategy) {
    const rarity = { common: 0.2, rare: 0.75, unique: 1.05, legendary: 1.4 }[choice.rarity] || 0;
    const actions = choice.actions || [];
    const id = String(choice.id || "").toLowerCase();
    const actionTypes = actions.map((action) => String(action.type || ""));
    let score = 1 + rarity + (choice.perkLevel < choice.maxLevel ? 0.25 : -2);
    if (choice.targetType) score += 0.25;
    if (strategy === "combo" && (Number(choice.design?.perkTarget) === 8 || id.includes("combo") || actionTypes.includes("addSpecialProjectileLevel"))) score += 2.4;
    if (strategy === "survival" && (slotHpRatio(snapshot) < 0.72 || actionTypes.some((type) => /heal|slot|maxhp|regen/i.test(type)))) score += 2.1;
    if (strategy === "firepower" && actionTypes.some((type) => /damage|fireRate|ProjectileCount|PercentHp/i.test(type))) score += 1.8;
    if (strategy === "tower-focus" && choice.targetType) score += 1.35;
    if (strategy === "experimental" && choice.perkLevel === 0) score += 1.1;
    if (strategy === "balanced" && !choice.targetType) score += 0.8;
    if (snapshot.enemies > 35 && actionTypes.some((type) => /Blast|ProjectileCount|SpecialProjectile/i.test(type))) score += 0.6;
    score += normal() * profile.perkNoise;
    return score;
  }

  function weightedPerkIndex(choices, scores, profile) {
    const temperature = profile === PROFILES.beginner ? 1.45 : profile === PROFILES.intermediate ? 0.9 : 0.52;
    const max = Math.max(...scores);
    const weights = scores.map((score) => Math.exp((score - max) / temperature));
    let roll = random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < choices.length; index += 1) {
      roll -= weights[index];
      if (roll <= 0) return index;
    }
    return choices.length - 1;
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

  function runSession(api, profileKey, strategy, sessionIndex, status) {
    const profile = PROFILES[profileKey];
    const sessionSeed = hashSeed(`${baseSeed}:${sessionIndex}:${profileKey}:${strategy}`);
    const decisionDelays = [];
    const perkDelays = [];
    let attempts = 0;
    let mistakes = 0;
    let invalidSortAttempts = 0;
    let rerolls = 0;
    let perkPicks = 0;
    let clock = 0;
    let nextSortAt = logNormalWithMean(profile.delayMean, profile.delayCv);
    let perkDecision = null;
    let previousFrame = performance.now();
    const wallStarted = performance.now();
    const eventStart = api.getEvents().length;

    api.startSession({
      botProfile: profileKey,
      botStrategy: strategy,
      simulationSeed: sessionSeed,
    });

    return new Promise((resolve) => {
      function updateMeta() {
        const stats = summarizeDelays(decisionDelays);
        api.setMeta({
          decisionDelayAvg: Number(stats.average.toFixed(3)),
          decisionDelayStddev: Number(stats.stddev.toFixed(3)),
          mistakeCount: mistakes,
          invalidSortAttempts,
          perkDecisionDelayTotal: Number(perkDelays.reduce((sum, value) => sum + value, 0).toFixed(3)),
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
          profile: profileKey,
          strategy,
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
        });
      }

      function frame(now) {
        const realDt = Math.min(0.1, Math.max(0, (now - previousFrame) / 1000));
        previousFrame = now;
        clock += realDt * speed;
        let snapshot = api.getSnapshot();
        status.textContent = `${profile.label} ${sessionIndex + 1}/${sessionCount} · W${snapshot.waveOrdinal}/${snapshot.waveTotal} · 소팅 ${snapshot.telemetry?.sortAttempts || 0}회`;

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
            const shouldReroll = !snapshot.perkRerollUsed && random() < profile.rerollRate && best < (profileKey === "advanced" ? 2.6 : 2.1);
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
          const delay = Math.max(0.45, logNormalWithMean(profile.delayMean, profile.delayCv));
          decisionDelays.push(delay);
          const selected = chooseMove(snapshot, profile);
          if (selected) {
            const move = selected.move;
            const result = api.movePiece(move.slot, move.cell, move.toSlot, move.toCell);
            attempts += 1;
            if (!selected.intendedSuccess) mistakes += 1;
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
    for (const session of sessions) strategies[session.strategy] = (strategies[session.strategy] || 0) + 1;
    for (const key of Object.keys(PROFILES)) {
      const rows = sessions.filter((session) => session.profile === key);
      groups[key] = {
        sessions: rows.length,
        clears: rows.filter((session) => session.result === "clear").length,
        clearRate: rows.length ? rows.filter((session) => session.result === "clear").length / rows.length : 0,
        averageAttempts: rows.length ? rows.reduce((sum, row) => sum + Number(row.actualAttempts || 0), 0) / rows.length : 0,
        averageDecisionSec: rows.length ? rows.reduce((sum, row) => sum + Number(row.decisionDelayAvg || 0), 0) / rows.length : 0,
        averageReachedWave: rows.length ? rows.reduce((sum, row) => sum + Number(row.reachedWave || 0), 0) / rows.length : 0,
      };
    }
    return { totalSessions: sessions.length, groups, strategies };
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
        : { profile: sampleProfile(mix), strategy: pick(STRATEGIES) };
      const profile = assignment.profile;
      const strategy = assignment.strategy;
      sessions.push(await runSession(api, profile, strategy, index, status));
    }
    const payload = {
      schemaVersion: "3sort-balance-simulation-v1",
      generatedAt: new Date().toISOString(),
      runId,
      config: { sessionCount, speed, baseSeed, coverageMode, mix: Object.fromEntries(mix) },
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
