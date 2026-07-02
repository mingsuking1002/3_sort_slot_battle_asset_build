(function () {
  /*
   * 데이터 수정 빠른 지도
   * - 전투 난이도 전체감: defaultConfig, monsters, monsterGroups, wavePatterns
   * - 포탑 성능: designTables.PieceData -> TowerData -> ProjectileData 순서로 연결
   * - 스테이지 흐름: stages -> waves -> wavePatterns -> monsterGroups 순서로 연결
   * - 신규 기물/스테이지 추가: designTables의 PieceData/TowerData/ProjectileData/StageData 행을 추가
   * - 수정 후 검증:
   *   node "3_sort_slot_battle_asset_build/tools/validate-phase-2-3.mjs" "3_sort_slot_battle_asset_build"
   */
  const dataGuide = {
    version: "2026-06-12-authoring-guide",
    quickStart: [
      "몬스터가 너무 많거나 적으면 monsterGroups의 마리 수와 wavePatterns의 time/event를 먼저 봅니다.",
      "몬스터가 너무 세거나 약하면 defaultConfig의 monsterHp/monsterDamage와 monsters의 배율을 봅니다.",
      "포탑이 너무 세거나 약하면 designTables.TowerData와 ProjectileData를 먼저 봅니다.",
      "신규 기물은 PieceData/TowerData/ProjectileData 행을 추가하면 자동으로 편성/상점 후보에 들어갑니다.",
      "기물 강화는 PieceUpgradeData의 FromPieceID -> ToPieceID로 보유 ID를 교체하고, 비용은 UpgradeCostData에서 읽습니다.",
      "신규 스테이지는 StageData/WaveData/WavePatternData 행을 추가하면 메인화면 화살표 목록에 들어갑니다.",
      "신규 보스는 BossData 행을 추가하고 StageData.BossID에서 참조합니다.",
      "기획서 원본형 데이터 구조는 designTables와 designTableSchema를 기준으로 봅니다.",
      "신규 특전은 PerkData/EffectData를 추가하고, 실제 효과는 PerkActionData에 행 단위로 추가합니다.",
      "콤보 특수탄은 specialProjectiles에서 발동 주기, 고정 피해, 최대 체력 피해, 특전 레벨 증가치를 조절합니다.",
    ],
    coreLinks: [
      "pieces.*.connectTower -> towers.*",
      "towers.*.projectileId -> projectiles.*",
      "waves.*.patternId -> wavePatterns.*",
      "wavePatterns.*.events[].groupId -> monsterGroups.*",
      "monsterGroups.*.monsters의 key -> monsters.*",
      "stages[].waveIds -> waves.*",
    ],
    editOrder: [
      "defaultConfig",
      "towers",
      "projectiles",
      "monsters",
      "monsterGroups",
      "wavePatterns",
      "waves",
      "pieces",
      "loadout",
      "perks",
      "specialProjectiles",
    ],
    tables: {
      defaultConfig: {
        label: "전역 전투 밸런스",
        editWhen: "전체 난이도, 슬롯 체력, 기본 탄 데미지, 웨이브 시간, 보스 배율을 조절할 때",
        hotFields: ["slotHp", "monsterHp", "monsterDamage", "bulletDamage", "bulletSpeed", "waveDuration", "enemyCap"],
      },
      towerTypes: {
        label: "포탑 유형 기본값",
        editWhen: "기본형/산탄형/저격형 같은 큰 역할, 색상, 기본 설명을 바꿀 때",
        hotFields: ["name", "color", "image", "aiType", "targetPriority", "projectileType"],
      },
      pieces: {
        label: "실제 기물",
        editWhen: "세린 같은 캐릭터 이름, 보유 여부, 연결 포탑을 바꿀 때",
        hotFields: ["type", "star", "name", "connectTower", "owned"],
      },
      towers: {
        label: "포탑 성능",
        editWhen: "공격력, 공격속도, 사거리, 탄약 수, 타겟 우선순위를 바꿀 때",
        hotFields: ["aiType", "targetPriority", "projectileType", "projectileId", "damageMod", "fireRate", "range", "maxAmmo"],
      },
      projectiles: {
        label: "투사체 성능",
        editWhen: "탄 크기, 탄속, 관통, 산탄 각도, 폭발 범위, 체력 비례 피해를 바꿀 때",
        hotFields: ["homing", "speedMult", "damageRatio", "radius", "life", "pierceHits", "splashRadius"],
      },
      specialProjectiles: {
        label: "콤보 특수 투사체",
        editWhen: "콤보 특수탄의 발동 주기, 이동 속도, 고정 피해, 최대 체력 피해, 특전 레벨 증가치를 바꿀 때",
        hotFields: ["triggerEvery", "flatDamage", "maxHpDamageRatio", "flatDamageBonusPerLevel", "maxLevel", "speed", "radius", "life"],
      },
      monsters: {
        label: "몬스터 타입",
        editWhen: "기본형/탱커형/속도형/원거리형/보스형의 체력, 속도, 공격 배율을 바꿀 때",
        hotFields: ["hpMult", "damageMult", "speedMult", "attackRateMult", "pack", "xp", "canMove", "canAttack", "testDummy"],
      },
      monsterGroups: {
        label: "스폰 묶음",
        editWhen: "한 번에 어떤 몬스터가 몇 마리 나오는지 바꿀 때",
        hotFields: ["monsters", "eliteChance", "spreadX", "spreadY"],
      },
      wavePatterns: {
        label: "웨이브 타임라인",
        editWhen: "몇 초에 어떤 스폰 묶음이 나오는지 바꿀 때",
        hotFields: ["events[].time", "events[].groupId", "events[].repeat", "events[].eliteChance"],
      },
      waves: {
        label: "웨이브 목록",
        editWhen: "웨이브 이름, 타입, 지속시간, 보스/패턴 연결을 바꿀 때",
        hotFields: ["label", "type", "duration", "patternId", "bossId"],
      },
      bosses: {
        label: "보스",
        editWhen: "최종보스 체력, 근접/원거리 공격, 소환 패턴, 등장 위치를 바꿀 때. 원본 수정은 designTables.BossData를 우선 사용합니다.",
        hotFields: ["hpMult", "meleeDamage", "rangedDamage", "attackRange", "summon", "spawn"],
      },
      stages: {
        label: "스테이지",
        editWhen: "스테이지 이름, 메인화면 화살표 순서, 사용 웨이브, 클리어 보상을 바꿀 때",
        hotFields: ["key", "title", "subtitle", "waveIds", "bossIds", "waveReward", "clearReward", "ui.mainImage"],
      },
      loadout: {
        label: "덱 편성/덱 생성",
        editWhen: "출전 기물 수, 선택 가능 기물, 54개 덱 생성 규칙을 바꿀 때",
        hotFields: ["maxSlots", "fallbackPieceKeys", "selectablePieceKeys", "startDeck"],
      },
      perks: {
        label: "특전",
        editWhen: "레벨업 선택지, 등급 확률, 강화 효과를 바꿀 때",
        hotFields: ["rarities", "upgrades[].rarity", "upgrades[].actions"],
      },
      levelData: {
        label: "경험치/콤보",
        editWhen: "레벨업 속도, 콤보 유지 시간, 콤보 특수탄 연결 ID를 바꿀 때",
        hotFields: ["xpBase", "xpLevelGrowth", "comboWindow", "comboSpecialProjectileId"],
      },
      progression: {
        label: "로비 성장",
        editWhen: "기물 강화 연결과 강화 비용을 바꿀 때",
        hotFields: ["PieceUpgradeData.FromPieceID", "PieceUpgradeData.ToPieceID", "UpgradeCostData.UpgradeCost", "PieceData.PieceLv", "TowerData"],
      },
      shop: {
        label: "상점/해금",
        editWhen: "기물 해금 비용과 상점 정렬 순서를 바꿀 때",
        hotFields: ["pieceUnlocks", "fallbackUnlockCost"],
      },
      designTables: {
        label: "기획서 원본형 테이블",
        editWhen: "기획서/스프레드시트의 PascalCase 컬럼 구조를 기준으로 값을 맞출 때",
        hotFields: ["StageData", "WaveData", "WavePatternData", "MonsterData", "BossData", "PieceData", "TowerData", "PieceUpgradeData", "UpgradeCostData", "PerkData", "PerkActionData"],
      },
    },
  };

  // 포탑 유형 테이블: 큰 역할/색상/기본 설명. 실제 수치는 designTables에서 생성된 towers/projectiles가 우선입니다.
  const towerTypes = {
    basic: {
      type: "basic",
      mark: "기",
      name: "기본형",
      color: "#f8f0e3",
      image: "assets/images/ui/PIECE/기본형.png",
      damageMod: 1.0,
      fireRateMod: 1.0,
      range: 340,
      description: "안정적인 순차 연사 유도탄 타워입니다.",
      designRole: "가까운 적을 안정적으로 처리하는 기본 유도 연사형",
      aiType: "basic",
      targetPriority: "near",
      projectileType: "normal",
    },
    scatter: {
      type: "scatter",
      mark: "산",
      name: "근접 산탄형",
      color: "#ff8d4d",
      image: "assets/images/ui/PIECE/산탄형.png",
      damageMod: 0.46,
      fireRateMod: 0.9,
      range: 132,
      description: "가까운 적에게 부채꼴 산탄을 뿌리는 근접 방어 타워입니다.",
      designRole: "근접한 적 무리를 비유도 부채꼴 탄으로 밀어내는 방어형",
      aiType: "shotgun",
      targetPriority: "near",
      projectileType: "normal",
    },
    ranger: {
      type: "ranger",
      mark: "원",
      name: "원거리 난사형",
      color: "#69d7ff",
      image: "assets/images/ui/PIECE/기본형.png",
      owned: false,
      damageMod: 0.7,
      fireRateMod: 0.55,
      range: 500,
      description: "가장 먼 적 방향으로 빠르게 탄을 난사하는 원거리 타워입니다.",
      designRole: "멀리 있는 적 방향으로 빠른 비유도 연사를 수행하는 원거리형",
      aiType: "basic-non",
      targetPriority: "far",
      projectileType: "normal",
    },
    sniper: {
      type: "sniper",
      mark: "저",
      name: "원거리 저격형",
      color: "#d18cff",
      image: "assets/images/ui/PIECE/원거리저격혐.png",
      damageMod: 2.35,
      fireRateMod: 1.95,
      range: 760,
      description: "느리지만 먼 적을 강하게 찍는 저격 타워입니다.",
      designRole: "먼 적을 강하게 관통 타격하는 저격형",
      aiType: "basic-non",
      targetPriority: "far",
      projectileType: "pierce",
    },
    breaker: {
      type: "breaker",
      mark: "탱",
      name: "탱커 대항형",
      color: "#f7c948",
      image: "assets/images/ui/PIECE/탱커대항형.png",
      damageMod: 0.68,
      fireRateMod: 1.25,
      range: 430,
      description: "체력이 높은 적에게 최대 체력 비례 피해를 줍니다.",
      designRole: "체력이 높은 적과 보스를 우선 처리하는 대형 적 대응형",
      aiType: "basic",
      targetPriority: "strong",
      projectileType: "tank",
    },
    blast: {
      type: "blast",
      mark: "범",
      name: "범위형",
      color: "#5dd49a",
      image: "assets/images/ui/PIECE/범위형.png",
      damageMod: 0.74,
      fireRateMod: 1.45,
      range: 360,
      description: "적 무리를 폭발 범위 피해로 정리하는 광역 타워입니다.",
      designRole: "밀집한 적을 폭발 피해로 처리하는 광역형",
      aiType: "basic-non",
      targetPriority: "cluster",
      projectileType: "explode",
    },
    support: {
      type: "support",
      mark: "보",
      name: "보조형",
      color: "#a7f3d0",
      image: "assets/images/ui/PIECE/보조형ㄹ.png",
      damageMod: 1.0,
      fireRateMod: 3.2,
      range: 240,
      description: "느린 주기로 슬롯을 회복하고 주변 타워를 강화합니다.",
      designRole: "체력이 낮은 슬롯을 회복하고 주변 포탑을 강화하는 보조형",
      aiType: "heal",
      targetPriority: "near",
      projectileType: "heal",
    },
  };

  // Piece/Tower/Projectile 런타임 정의는 designTables의 PascalCase 원본 행에서만 생성합니다.

  // 몬스터 테이블: 몬스터 타입별 배율입니다. 기본값은 defaultConfig와 곱해집니다.
  const monsters = {
    basic: {
      key: "basic",
      monsterId: "monster_basic_1",
      name: "기본형",
      role: "표준 근접 몬스터",
      mark: "M",
      color: "#d85d72",
      hpMult: 1,
      damageMult: 1,
      speedMult: 1,
      attackRateMult: 1,
      radiusAdd: 0,
      taunt: 1,
      pack: 1,
      weight: 0.44,
      xp: 1,
      designStatus: "core",
    },
    tank: {
      key: "tank",
      monsterId: "monster_tank_1",
      name: "탱커형",
      role: "높은 체력으로 어그로를 빼는 몬스터",
      mark: "T",
      color: "#b982ff",
      hpMult: 6,
      damageMult: 0.65,
      speedMult: 0.55,
      attackRateMult: 1.15,
      radiusAdd: 5,
      taunt: 7,
      pack: 1,
      weight: 0.12,
      xp: 1,
      designStatus: "core",
    },
    speed: {
      key: "speed",
      monsterId: "monster_speed_1",
      name: "속도형",
      role: "낮은 체력으로 많이 등장하는 빠른 몬스터",
      mark: "S",
      color: "#ffcf5a",
      hpMult: 0.42,
      damageMult: 0.35,
      speedMult: 1.85,
      attackRateMult: 0.82,
      radiusAdd: -2,
      taunt: 0.55,
      pack: 2,
      weight: 0.34,
      xp: 1,
      designStatus: "core",
    },
    ranged: {
      key: "ranged",
      monsterId: "monster_ranged_1",
      name: "원거리형",
      role: "사거리 밖에서 슬롯을 긁는 몬스터",
      mark: "R",
      color: "#69d7ff",
      hpMult: 0.75,
      damageMult: 0.7,
      speedMult: 0.78,
      attackRateMult: 1.45,
      radiusAdd: 0,
      attackRange: 132,
      taunt: 0.8,
      pack: 1,
      weight: 0.1,
      xp: 1,
      designStatus: "core",
    },
    midBoss: {
      key: "midBoss",
      monsterId: "monster_mid_boss_1",
      name: "중간보스",
      role: "이전 보스 웨이브 호환용 대형 몬스터",
      mark: "중",
      color: "#ff9f43",
      hpMult: 1,
      damageMult: 1,
      speedMult: 1,
      attackRateMult: 1,
      radiusAdd: 0,
      taunt: 18,
      pack: 1,
      weight: 0,
      xp: 1,
      designStatus: "legacy-prototype",
    },
    finalBoss: {
      key: "finalBoss",
      monsterId: "monster_final_boss_1",
      name: "최종보스",
      role: "최종 웨이브 전용 보스",
      mark: "왕",
      color: "#ff4f6d",
      hpMult: 1,
      damageMult: 1,
      speedMult: 1,
      attackRateMult: 1,
      radiusAdd: 0,
      taunt: 25,
      pack: 1,
      weight: 0,
      xp: 1,
      designStatus: "core",
    },
    dummy: {
      key: "dummy",
      monsterId: "monster_test_dummy_1",
      name: "허수아비",
      role: "테스트 스테이지에서 이동/공격 없이 맞기만 하는 타겟",
      mark: "허",
      color: "#9ee7ff",
      hpMult: 18,
      damageMult: 0.01,
      speedMult: 0.01,
      attackRateMult: 1,
      radiusAdd: 7,
      taunt: 12,
      pack: 1,
      weight: 0,
      xp: 1,
      canMove: false,
      canAttack: false,
      testDummy: true,
      designStatus: "test-only",
    },
  };

  // 보스 테이블: 보스 전용 체력/공격/소환/등장 위치 데이터입니다.
  const bosses = {
    mid_boss_1: {
      id: "mid_boss_1",
      kind: "mid",
      monsterKey: "midBoss",
      label: "중간보스",
      banner: "중간보스 등장",
      spawn: { xRatio: 0.5, yRatio: 0.11 },
      hpMult: 95,
      meleeDamage: 4,
      rangedDamage: 0,
      speed: 18,
      attackRate: 1.15,
      rangedRate: 0,
      attackRange: 0,
      meleeRange: 38,
      radius: 27,
      taunt: 18,
      xp: 1,
      configKeys: {
        hpMult: "midBossHpMult",
        meleeDamage: "midBossDamage",
        speed: "midBossSpeed",
        meleeWarning: "bossMeleeWarningTime",
      },
      patterns: [],
    },
    final_boss_1: {
      id: "final_boss_1",
      kind: "final",
      monsterKey: "finalBoss",
      label: "최종보스",
      banner: "최종보스 등장",
      spawn: { xRatio: 0.5, yRatio: 0.11 },
      hpMult: 150,
      meleeDamage: 14,
      rangedDamage: 2,
      speed: 22,
      attackRate: 0.95,
      rangedRate: 1.45,
      attackRange: 180,
      meleeRange: 42,
      radius: 31,
      taunt: 25,
      xp: 1,
      summon: {
        monsterKey: "speed",
        interval: 8,
        count: 12,
        radiusMin: 34,
        radiusMax: 74,
        spreadX: 5,
        spreadY: 5,
        banner: "속도형 대량 소환",
        log: "최종보스 패턴: 속도형 대량 소환",
      },
      warning: {
        rangedDelay: 0.75,
        meleeDelay: 0.55,
      },
      configKeys: {
        hpMult: "finalBossHpMult",
        meleeDamage: "finalBossMeleeDamage",
        rangedDamage: "finalBossRangedDamage",
        speed: "finalBossSpeed",
        attackRange: "finalBossRangedRange",
        summonInterval: "finalBossSummonSec",
        summonCount: "finalBossSummonCount",
        rangedWarning: "bossWarningTime",
        meleeWarning: "bossMeleeWarningTime",
      },
      patterns: ["ranged_warning", "melee_warning", "summon_speed_pack"],
    },
  };

  // 몬스터 그룹 테이블: 웨이브 타임라인에서 한 번에 스폰할 몬스터 묶음입니다.
  const monsterGroups = {
    mg_w1_basic_01: { id: "mg_w1_basic_01", monsters: { basic: 4, speed: 1 } },
    mg_w1_basic_02: { id: "mg_w1_basic_02", monsters: { basic: 5, speed: 1 } },
    mg_w2_speed_01: { id: "mg_w2_speed_01", monsters: { basic: 5, speed: 3 } },
    mg_w2_speed_02: { id: "mg_w2_speed_02", monsters: { basic: 6, speed: 4 } },
    mg_w3_tank_01: { id: "mg_w3_tank_01", monsters: { basic: 6, speed: 3, tank: 1 } },
    mg_w3_tank_02: { id: "mg_w3_tank_02", monsters: { basic: 7, speed: 4, tank: 1 } },
    mg_w4_rush_01: { id: "mg_w4_rush_01", monsters: { basic: 8, speed: 6, tank: 1 } },
    mg_w4_rush_02: { id: "mg_w4_rush_02", monsters: { basic: 10, speed: 8, tank: 1 } },
    mg_w5_mixed_01: { id: "mg_w5_mixed_01", monsters: { basic: 9, speed: 5, tank: 1 } },
    mg_w5_mixed_02: { id: "mg_w5_mixed_02", monsters: { basic: 10, speed: 6, tank: 2 } },
    mg_w6_elite_01: { id: "mg_w6_elite_01", monsters: { basic: 10, speed: 6, tank: 2 }, eliteChance: 0.06 },
    mg_w6_elite_02: { id: "mg_w6_elite_02", monsters: { basic: 11, speed: 8, tank: 2 }, eliteChance: 0.08 },
    mg_w7_pressure_01: { id: "mg_w7_pressure_01", monsters: { basic: 9, speed: 10, tank: 3 }, eliteChance: 0.1 },
    mg_w7_pressure_02: { id: "mg_w7_pressure_02", monsters: { basic: 10, speed: 11, tank: 3 }, eliteChance: 0.12 },
    mg_w8_rush_01: { id: "mg_w8_rush_01", monsters: { basic: 11, speed: 11, tank: 3 }, eliteChance: 0.1 },
    mg_w8_rush_02: { id: "mg_w8_rush_02", monsters: { basic: 13, speed: 12, tank: 4 }, eliteChance: 0.12 },
    mg_w9_final_01: { id: "mg_w9_final_01", monsters: { basic: 11, speed: 10, tank: 4 }, eliteChance: 0.12 },
    mg_w9_final_02: { id: "mg_w9_final_02", monsters: { basic: 12, speed: 11, tank: 5 }, eliteChance: 0.14 },
    mg_final_boss_adds: { id: "mg_final_boss_adds", monsters: { speed: 8 } },
    mg_test_dummy_01: {
      id: "mg_test_dummy_01",
      monsters: { dummy: 3 },
      spawnPoint: { xRatio: 0.5, yRatio: 0.31 },
      spreadX: 42,
      spreadY: 10,
    },
    mg_test_dummy_02: {
      id: "mg_test_dummy_02",
      monsters: { dummy: 5 },
      spawnPoint: { xRatio: 0.5, yRatio: 0.5 },
      spreadX: 58,
      spreadY: 16,
    },
    mg_test_dummy_03: {
      id: "mg_test_dummy_03",
      monsters: { dummy: 7 },
      spawnPoint: { xRatio: 0.5, yRatio: 0.69 },
      spreadX: 68,
      spreadY: 18,
    },
  };

  // 웨이브 패턴 테이블: 몇 초에 어떤 monsterGroup을 호출할지 정합니다.
  const wavePatterns = {
    wp_w1: {
      id: "wp_w1",
      events: [
        { time: 0, groupId: "mg_w1_basic_01" },
        { time: 5, groupId: "mg_w1_basic_01" },
        { time: 10, groupId: "mg_w1_basic_02" },
        { time: 15, groupId: "mg_w1_basic_01" },
        { time: 20, groupId: "mg_w1_basic_02" },
        { time: 25, groupId: "mg_w1_basic_01" },
        { time: 30, groupId: "mg_w1_basic_02" },
      ],
    },
    wp_w2: {
      id: "wp_w2",
      events: [
        { time: 0, groupId: "mg_w2_speed_01" },
        { time: 5, groupId: "mg_w2_speed_01" },
        { time: 10, groupId: "mg_w2_speed_02" },
        { time: 15, groupId: "mg_w2_speed_01" },
        { time: 20, groupId: "mg_w2_speed_02" },
        { time: 25, groupId: "mg_w2_speed_01" },
        { time: 30, groupId: "mg_w2_speed_02" },
      ],
    },
    wp_w3: {
      id: "wp_w3",
      events: [
        { time: 0, groupId: "mg_w3_tank_01" },
        { time: 5, groupId: "mg_w3_tank_01" },
        { time: 10, groupId: "mg_w3_tank_02" },
        { time: 15, groupId: "mg_w3_tank_01" },
        { time: 20, groupId: "mg_w3_tank_02" },
        { time: 25, groupId: "mg_w3_tank_01" },
        { time: 30, groupId: "mg_w3_tank_02" },
      ],
    },
    wp_w4: {
      id: "wp_w4",
      events: [
        { time: 0, groupId: "mg_w4_rush_01" },
        { time: 5, groupId: "mg_w4_rush_01" },
        { time: 10, groupId: "mg_w4_rush_02" },
        { time: 15, groupId: "mg_w4_rush_01" },
        { time: 20, groupId: "mg_w4_rush_02" },
        { time: 25, groupId: "mg_w4_rush_01" },
        { time: 30, groupId: "mg_w4_rush_02" },
      ],
    },
    wp_w5: {
      id: "wp_w5",
      events: [
        { time: 0, groupId: "mg_w5_mixed_01" },
        { time: 5, groupId: "mg_w5_mixed_01" },
        { time: 10, groupId: "mg_w5_mixed_02" },
        { time: 15, groupId: "mg_w5_mixed_01" },
        { time: 20, groupId: "mg_w5_mixed_02" },
        { time: 25, groupId: "mg_w5_mixed_01" },
        { time: 30, groupId: "mg_w5_mixed_02" },
      ],
    },
    wp_w6: {
      id: "wp_w6",
      events: [
        { time: 0, groupId: "mg_w6_elite_01" },
        { time: 5, groupId: "mg_w6_elite_01" },
        { time: 10, groupId: "mg_w6_elite_02" },
        { time: 15, groupId: "mg_w6_elite_01" },
        { time: 20, groupId: "mg_w6_elite_02" },
        { time: 25, groupId: "mg_w6_elite_01" },
        { time: 30, groupId: "mg_w6_elite_02" },
      ],
    },
    wp_w7: {
      id: "wp_w7",
      events: [
        { time: 0, groupId: "mg_w7_pressure_01" },
        { time: 5, groupId: "mg_w7_pressure_01" },
        { time: 10, groupId: "mg_w7_pressure_02" },
        { time: 15, groupId: "mg_w7_pressure_01" },
        { time: 20, groupId: "mg_w7_pressure_02" },
        { time: 25, groupId: "mg_w7_pressure_01" },
        { time: 30, groupId: "mg_w7_pressure_02" },
      ],
    },
    wp_w8: {
      id: "wp_w8",
      events: [
        { time: 0, groupId: "mg_w8_rush_01" },
        { time: 5, groupId: "mg_w8_rush_01" },
        { time: 10, groupId: "mg_w8_rush_02" },
        { time: 15, groupId: "mg_w8_rush_01" },
        { time: 20, groupId: "mg_w8_rush_02" },
        { time: 25, groupId: "mg_w8_rush_01" },
        { time: 30, groupId: "mg_w8_rush_02" },
      ],
    },
    wp_w9: {
      id: "wp_w9",
      events: [
        { time: 0, groupId: "mg_w9_final_01" },
        { time: 5, groupId: "mg_w9_final_01" },
        { time: 10, groupId: "mg_w9_final_02" },
        { time: 15, groupId: "mg_w9_final_01" },
        { time: 20, groupId: "mg_w9_final_02" },
        { time: 25, groupId: "mg_w9_final_01" },
        { time: 30, groupId: "mg_w9_final_02" },
      ],
    },
    wp_test_dummy: {
      id: "wp_test_dummy",
      events: [
        { time: 0, groupId: "mg_test_dummy_01" },
        { time: 4, groupId: "mg_test_dummy_02" },
        { time: 8, groupId: "mg_test_dummy_01" },
        { time: 12, groupId: "mg_test_dummy_03" },
        { time: 16, groupId: "mg_test_dummy_02" },
        { time: 20, groupId: "mg_test_dummy_01" },
        { time: 24, groupId: "mg_test_dummy_03" },
        { time: 28, groupId: "mg_test_dummy_02" },
        { time: 32, groupId: "mg_test_dummy_03" },
      ],
    },
  };

  // 웨이브 테이블: 1~10 웨이브의 타입/지속시간/패턴/보스 연결입니다.
  const waves = {
    1: { id: 1, label: "입문 물량", type: "normal", duration: 32, patternId: "wp_w1" },
    2: { id: 2, label: "속도형 적응", type: "normal", duration: 32, patternId: "wp_w2" },
    3: { id: 3, label: "탱커 첫 압박", type: "normal", duration: 32, patternId: "wp_w3" },
    4: { id: 4, label: "러시", type: "rush", duration: 32, patternId: "wp_w4" },
    5: { id: 5, label: "혼합 압박", type: "normal", duration: 32, patternId: "wp_w5" },
    6: { id: 6, label: "엘리트 진입", type: "normal", duration: 32, patternId: "wp_w6" },
    7: { id: 7, label: "속도 압박", type: "normal", duration: 32, patternId: "wp_w7" },
    8: { id: 8, label: "대형 러시", type: "rush", duration: 32, patternId: "wp_w8" },
    9: { id: 9, label: "최종 전 압박", type: "normal", duration: 32, patternId: "wp_w9" },
    10: { id: 10, label: "최종보스", type: "boss", bossId: "final_boss_1", bossKind: "final", duration: 0 },
    101: { id: 101, label: "허수아비 테스트 1", type: "test", duration: 40, patternId: "wp_test_dummy" },
    102: { id: 102, label: "허수아비 테스트 2", type: "test", duration: 40, patternId: "wp_test_dummy" },
    103: { id: 103, label: "허수아비 테스트 3", type: "test", duration: 40, patternId: "wp_test_dummy" },
    104: { id: 104, label: "허수아비 테스트 4", type: "test", duration: 40, patternId: "wp_test_dummy" },
    105: { id: 105, label: "허수아비 테스트 5", type: "test", duration: 40, patternId: "wp_test_dummy" },
    106: { id: 106, label: "허수아비 테스트 6", type: "test", duration: 40, patternId: "wp_test_dummy" },
    107: { id: 107, label: "허수아비 테스트 7", type: "test", duration: 40, patternId: "wp_test_dummy" },
    108: { id: 108, label: "허수아비 테스트 8", type: "test", duration: 40, patternId: "wp_test_dummy" },
    109: { id: 109, label: "허수아비 테스트 9", type: "test", duration: 40, patternId: "wp_test_dummy" },
    110: { id: 110, label: "허수아비 테스트 10", type: "test", duration: 40, patternId: "wp_test_dummy" },
  };

  // 덱 편성/보충 테이블: 6기물, 54개 덱, 슬롯 보충 규칙입니다.
  const loadout = {
    maxSlots: 6,
    defaultPieceKeys: [],
    fallbackPieceKeys: ["basic_1", "scatter_1", "sniper_1", "breaker_1", "blast_1", "support_1"],
    selectablePieceKeys: ["basic_1", "scatter_1", "sniper_1", "breaker_1", "blast_1", "support_1"],
    startDeck: {
      setsPerPiece: 3,
      cellsPerSet: 3,
      initialPiecesPerSlot: 2,
      refillPiecesPerEmptySlot: 2,
    },
  };

  const shop = {
    pieceUnlocks: [],
    fallbackUnlockCost: { gold: 800, ticket: 1 },
  };

  // 스테이지 테이블: 배열 순서가 메인화면 스테이지 화살표 순서입니다.
  const stages = [
    {
      key: "stage-1",
      title: "1 스테이지",
      subtitle: "관계자의 출입금지",
      description: "가운데 3x3 소팅 슬롯을 지키며 10개의 웨이브와 최종보스를 버티는 기본 스테이지입니다.",
      firstWave: 1,
      waveIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      bossIds: ["final_boss_1"],
      loadoutKey: "default",
      clearReward: {
        gold: 1220,
        ticket: 5,
      },
      config: {
        totalWaves: 10,
        waveDuration: 32,
      },
      ui: {
        mainImage: "assets/images/ui/Main/Image_Stage_1 5.png",
        clearImage: "assets/images/ui/Main/Clear Stage.png",
      },
    },
    {
      key: "stage-2",
      title: "2 스테이지",
      subtitle: "안전지대 붕괴",
      description: "1스테이지보다 많은 물량과 빠른 압박을 상정한 임시 2스테이지입니다.",
      firstWave: 1,
      waveIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      bossIds: ["final_boss_1"],
      loadoutKey: "default",
      clearReward: {
        gold: 1600,
        ticket: 7,
      },
      config: {
        totalWaves: 10,
        waveDuration: 40,
        monsterHp: 28,
        monsterDamage: 1.1,
        monsterSpeed: 38,
        enemyCap: 110,
      },
      ui: {
        mainImage: "assets/images/ui/Main/Image_Stage_1 5.png",
        clearImage: "assets/images/ui/Main/Clear Stage.png",
      },
    },
    {
      key: "stage-test-dummy",
      title: "테스트 스테이지",
      subtitle: "허수아비 타격장",
      description: "이동과 공격을 하지 않는 허수아비가 계속 등장하는 포탑/특전/탄약 테스트용 스테이지입니다.",
      testStage: true,
      testMode: "targetDummy",
      firstWave: 101,
      waveIds: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
      bossIds: [],
      loadoutKey: "default",
      clearReward: {
        gold: 0,
        ticket: 0,
      },
      config: {
        totalWaves: 10,
        waveDuration: 40,
        enemyCap: 80,
      },
      ui: {
        mainImage: "assets/images/ui/Main/Image_Stage_1 5.png",
        clearImage: "assets/images/ui/Main/Clear Stage.png",
      },
    },
  ];

  const specialProjectiles = {
    combo_pierce: {
      id: "combo_pierce",
      name: "콤보 관통탄",
      triggerType: "comboMultiple",
      triggerEvery: 10,
      flatDamage: 120,
      maxHpDamageRatio: 0.04,
      flatDamageBonusPerLevel: 0.2,
      maxLevel: 3,
      speed: 520,
      radius: 54,
      trailWidth: 28,
      life: 3,
      pierceAll: true,
      prefab: "assets/images/Projectile/combo.png",
      color: "#f7c948",
      hitColor: "#fff4b0",
      source: "specialProjectiles",
    },
  };

  const levelData = {
    stageStartLevel: 1,
    stageMaxLevel: 20,
    xpBase: 20,
    xpLevelGrowth: 12,
    pendingPerkOnly: true,
    comboWindow: 5,
    comboSpecialProjectileId: "combo_pierce",
    comboFeverEnabled: false,
  };

  // 특전 테이블: 레벨업 후 정비 시간에 고르는 강화 선택지입니다.
  const perks = {
    rarities: {
      common: { label: "일반", weightConfig: "commonRate", defaultWeight: 0.72 },
      rare: { label: "희귀", weightConfig: "rareRate", defaultWeight: 0.23 },
      legendary: { label: "전설", weightConfig: "legendaryRate", defaultWeight: 0.05 },
    },
    upgrades: [
      {
        id: "common-damage",
        rarity: "common",
        title: "공격력 증가",
        body: "모든 피해량이 8% 증가합니다.",
        shortBody: "모든 피해 +8%",
        limit: { modKey: "damageUpgradeCount", configKey: "maxDamageUpgrades", min: 1 },
        actions: [
          { type: "addMod", key: "damageMultiplier", amount: 0.08 },
          { type: "addMod", key: "damageUpgradeCount", amount: 1 },
        ],
      },
      {
        id: "common-fire-rate",
        rarity: "common",
        title: "공격속도 증가",
        body: "모든 타워의 발사 주기가 7% 짧아집니다.",
        shortBody: "발사 주기 7% 감소",
        limit: { modKey: "fireRateUpgradeCount", configKey: "maxFireRateUpgrades", min: 1 },
        actions: [
          { type: "multiplyMod", key: "fireRateMultiplier", amount: 0.93 },
          { type: "addMod", key: "fireRateUpgradeCount", amount: 1 },
        ],
      },
      {
        id: "common-basic-adapt",
        rarity: "common",
        targetType: "basic",
        title: "기본형 적응탄",
        body: "기본형이 모든 몬스터 타입을 조금 더 잘 상대합니다.",
        shortBody: "모든 몬스터 대응력 상승",
        requireActiveType: "basic",
        actions: [{ type: "addEnemyTypeDamage", pieceType: "basic", enemyTypes: ["basic", "speed", "tank", "ranged", "boss"], amount: 0.08 }],
      },
      {
        id: "common-scatter-speed",
        rarity: "common",
        targetType: "scatter",
        title: "산탄 속도형 제압",
        body: "근접 산탄형이 속도형 몬스터에게 주는 피해가 증가합니다.",
        shortBody: "속도형 피해 증가",
        requireActiveType: "scatter",
        actions: [{ type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "speed", amount: 0.28 }],
      },
      {
        id: "common-scatter-knock",
        rarity: "common",
        targetType: "scatter",
        title: "근접 밀어내기",
        body: "근접 산탄형의 넉백이 증가합니다.",
        shortBody: "넉백 증가",
        requireActiveType: "scatter",
        actions: [{ type: "addMod", key: "scatterKnockback", amount: 10 }],
      },
      {
        id: "common-ranger-tempo",
        rarity: "common",
        targetType: "ranger",
        title: "난사 템포 향상",
        body: "원거리 난사형의 연사 간격이 짧아집니다.",
        shortBody: "연사 간격 감소",
        requireActiveType: "ranger",
        actions: [{ type: "multiplyMod", key: "rangerBurstIntervalMult", amount: 0.92 }],
      },
      {
        id: "common-sniper-boss",
        rarity: "common",
        targetType: "sniper",
        title: "저격 보스 조준",
        body: "원거리 저격형이 보스에게 주는 피해가 증가합니다.",
        shortBody: "보스 피해 증가",
        requireActiveType: "sniper",
        actions: [{ type: "addEnemyTypeDamage", pieceType: "sniper", enemyType: "boss", amount: 0.16 }],
      },
      {
        id: "common-sniper-focus",
        rarity: "common",
        targetType: "sniper",
        title: "저격 집중",
        body: "원거리 저격형의 단발 위력이 증가합니다.",
        shortBody: "단발 위력 증가",
        requireActiveType: "sniper",
        actions: [{ type: "addTypeSpecial", pieceType: "sniper", amount: 1 }],
      },
      {
        id: "common-breaker-armor",
        rarity: "common",
        targetType: "breaker",
        title: "장갑 파쇄",
        body: "탱커 대항형이 탱커형에게 주는 피해와 체력 비례 피해가 증가합니다.",
        shortBody: "탱커 피해와 체력비례 피해 증가",
        requireActiveType: "breaker",
        actions: [
          { type: "addEnemyTypeDamage", pieceType: "breaker", enemyType: "tank", amount: 0.18 },
          { type: "addMod", key: "breakerPercentBonus", amount: 0.006 },
        ],
      },
      {
        id: "common-blast-wide",
        rarity: "common",
        targetType: "blast",
        title: "넓은 폭발",
        body: "범위 공격형의 폭발 범위가 넓어지고 피해는 조금 낮아집니다.",
        shortBody: "범위 증가, 피해 소폭 감소",
        requireActiveType: "blast",
        actions: [{ type: "addMod", key: "blastWide", amount: 1 }],
      },
      {
        id: "common-blast-focus",
        rarity: "common",
        targetType: "blast",
        title: "응축 폭발",
        body: "범위 공격형의 폭발 범위가 줄고 중심 피해가 증가합니다.",
        shortBody: "범위 감소, 중심 피해 증가",
        requireActiveType: "blast",
        actions: [{ type: "addMod", key: "blastFocused", amount: 1 }],
      },
      {
        id: "common-support-heal",
        rarity: "common",
        targetType: "support",
        title: "응급 수복",
        body: "보조형의 슬롯 회복량이 증가합니다.",
        shortBody: "회복량 증가",
        requireActiveType: "support",
        actions: [{ type: "addMod", key: "supportHealBonus", amount: 5 }],
      },
      {
        id: "common-duration",
        rarity: "common",
        title: "최대 탄창 증가",
        body: "소팅으로 생성되는 타워의 최대 발사 횟수가 증가합니다.",
        shortBody: "최대 발사 횟수 증가",
        actions: [{ type: "addMod", key: "towerDurationBonus", amount: 0.8 }],
      },
      {
        id: "common-range",
        rarity: "common",
        title: "사거리 증가",
        body: "모든 공격 타워의 사거리가 18 증가합니다.",
        shortBody: "사거리 +18",
        actions: [{ type: "addMod", key: "rangeBonus", amount: 18 }],
      },
      {
        id: "common-bullet-size",
        rarity: "common",
        title: "투사체 크기 증가",
        body: "투사체 크기가 증가해 시인성과 충돌 판정이 좋아집니다.",
        shortBody: "투사체 크기 증가",
        actions: [{ type: "addMod", key: "bulletSizeBonus", amount: 0.8 }],
      },
      {
        id: "common-splash",
        rarity: "common",
        title: "스플래시 범위 증가",
        body: "탄착 주변 피해 범위가 10 증가합니다.",
        shortBody: "스플래시 범위 +10",
        actions: [{ type: "addMod", key: "splashRadiusBonus", amount: 10 }],
      },
      {
        id: "rare-projectile",
        rarity: "rare",
        title: "투사체 증가",
        body: "모든 공격 타워의 발사 수가 1 증가합니다.",
        shortBody: "발사 수 +1",
        limit: { modKey: "projectileUpgradeCount", configKey: "maxProjectileUpgrades", min: 1 },
        actions: [
          { type: "addMod", key: "extraBullets", amount: 1 },
          { type: "addMod", key: "projectileUpgradeCount", amount: 1 },
        ],
      },
      {
        id: "rare-basic-versatile",
        rarity: "rare",
        targetType: "basic",
        title: "기본형 만능 교정",
        body: "기본형의 피해량과 사거리가 함께 증가합니다.",
        shortBody: "피해와 사거리 증가",
        requireActiveType: "basic",
        actions: [
          { type: "addTypeDamage", pieceType: "basic", amount: 0.16 },
          { type: "addMod", key: "rangeBonus", amount: 12 },
        ],
      },
      {
        id: "rare-scatter-knockback",
        rarity: "rare",
        targetType: "scatter",
        title: "산탄 방벽",
        body: "근접 산탄형의 넉백과 속도형 대응력이 크게 증가합니다.",
        shortBody: "넉백과 속도형 대응 강화",
        requireActiveType: "scatter",
        actions: [
          { type: "addMod", key: "scatterKnockback", amount: 22 },
          { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "speed", amount: 0.32 },
        ],
      },
      {
        id: "rare-scatter-pellet",
        rarity: "rare",
        targetType: "scatter",
        title: "근접 파편 증폭",
        body: "근접 산탄형의 파편 수와 탱커 대응력이 증가합니다.",
        shortBody: "파편 수와 탱커 대응 강화",
        requireActiveType: "scatter",
        actions: [
          { type: "addTypeSpecial", pieceType: "scatter", amount: 1 },
          { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "tank", amount: 0.18 },
        ],
      },
      {
        id: "rare-ranger-highrpm",
        rarity: "rare",
        targetType: "ranger",
        title: "고속 연사",
        body: "원거리 난사형의 연사 간격이 크게 짧아집니다.",
        shortBody: "연사 간격 크게 감소",
        requireActiveType: "ranger",
        actions: [{ type: "multiplyMod", key: "rangerBurstIntervalMult", amount: 0.84 }],
      },
      {
        id: "rare-sniper-pierce",
        rarity: "rare",
        targetType: "sniper",
        title: "다중 타격 저격",
        body: "저격 탄환이 추가 적을 더 맞출 수 있습니다. 보스 피해도 증가합니다.",
        shortBody: "관통과 보스 피해 증가",
        requireActiveType: "sniper",
        actions: [
          { type: "addMod", key: "pierceBonus", amount: 1 },
          { type: "addEnemyTypeDamage", pieceType: "sniper", enemyType: "boss", amount: 0.22 },
        ],
      },
      {
        id: "rare-breaker-percent",
        rarity: "rare",
        targetType: "breaker",
        title: "체력 비례 파쇄",
        body: "탱커 대항형의 최대 체력 비례 피해와 보스 피해가 증가합니다.",
        shortBody: "체력비례 피해와 보스 피해 증가",
        requireActiveType: "breaker",
        actions: [
          { type: "addMod", key: "breakerPercentBonus", amount: 0.012 },
          { type: "addEnemyTypeDamage", pieceType: "breaker", enemyType: "boss", amount: 0.12 },
        ],
      },
      {
        id: "rare-blast-wide",
        rarity: "rare",
        targetType: "blast",
        title: "넓은 범위 포격",
        body: "범위 공격형의 폭발 범위가 커지고 피해량이 조금 낮아집니다.",
        shortBody: "넓은 범위 포격 강화",
        requireActiveType: "blast",
        actions: [{ type: "addMod", key: "blastWide", amount: 1 }],
      },
      {
        id: "rare-blast-focused",
        rarity: "rare",
        targetType: "blast",
        title: "집중 포격",
        body: "범위 공격형의 폭발 범위가 줄고 피해량이 증가합니다.",
        shortBody: "좁은 고화력 포격 강화",
        requireActiveType: "blast",
        actions: [{ type: "addMod", key: "blastFocused", amount: 1 }],
      },
      {
        id: "rare-support-heal",
        rarity: "rare",
        targetType: "support",
        title: "정비 네트워크",
        body: "보조형의 슬롯 회복량이 크게 증가합니다.",
        shortBody: "회복량 크게 증가",
        requireActiveType: "support",
        actions: [
          { type: "addMod", key: "supportHealBonus", amount: 8 },
        ],
      },
      {
        id: "legend-duration",
        rarity: "legendary",
        title: "포탑 최대 탄창 증가",
        body: "소팅으로 생성되는 모든 타워의 최대 발사 횟수가 크게 증가합니다.",
        shortBody: "최대 발사 횟수 크게 증가",
        actions: [{ type: "addMod", key: "towerDurationBonus", amount: 1 }],
      },
      {
        id: "legend-regen",
        rarity: "legendary",
        title: "슬롯 자가 회복",
        body: "살아있는 슬롯이 초당 1.4 HP를 회복합니다.",
        shortBody: "살아있는 슬롯 자동 회복",
        actions: [{ type: "addMod", key: "slotRegen", amount: 1.4 }],
      },
      {
        id: "legend-reroll",
        rarity: "legendary",
        title: "리롤 횟수 증가",
        body: "리롤 최대 충전량이 1 증가하고 즉시 1회 충전됩니다.",
        shortBody: "리롤 최대치 +1, 즉시 충전",
        actions: [
          { type: "addMod", key: "rerollMaxCharges", amount: 1 },
          { type: "addRerollCharge", amount: 1 },
        ],
      },
      {
        id: "legend-basic-master",
        rarity: "legendary",
        targetType: "basic",
        title: "기본형 만능 전술",
        body: "기본형이 모든 몬스터 타입에 강해지고 전체 사격 안정성이 증가합니다.",
        shortBody: "기본형 만능 대응 강화",
        requireActiveType: "basic",
        actions: [
          { type: "addEnemyTypeDamage", pieceType: "basic", enemyTypes: ["basic", "speed", "tank", "ranged", "boss"], amount: 0.18 },
          { type: "addTypeDamage", pieceType: "basic", amount: 0.12 },
        ],
      },
      {
        id: "legend-scatter-lockdown",
        rarity: "legendary",
        targetType: "scatter",
        title: "근접 완전 제압",
        body: "근접 산탄형이 속도형과 탱커형을 크게 밀어내고 더 잘 처치합니다.",
        shortBody: "속도형/탱커 제압 강화",
        requireActiveType: "scatter",
        actions: [
          { type: "addMod", key: "scatterKnockback", amount: 34 },
          { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "speed", amount: 0.4 },
          { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "tank", amount: 0.28 },
        ],
      },
      {
        id: "legend-ranger-suppress",
        rarity: "legendary",
        targetType: "ranger",
        title: "제압 연사",
        body: "원거리 난사형의 연사 간격이 크게 짧아져 같은 투사체 수를 더 빠르게 비웁니다.",
        shortBody: "연사 속도 대폭 증가",
        requireActiveType: "ranger",
        actions: [{ type: "multiplyMod", key: "rangerBurstIntervalMult", amount: 0.76 }],
      },
      {
        id: "legend-sniper-rail",
        rarity: "legendary",
        targetType: "sniper",
        title: "레일 저격",
        body: "저격 탄환이 여러 적을 연속으로 맞출 수 있고 보스 저격 능력이 크게 증가합니다.",
        shortBody: "다중 관통 저격 강화",
        requireActiveType: "sniper",
        actions: [
          { type: "addMod", key: "pierceBonus", amount: 2 },
          { type: "addTypeSpecial", pieceType: "sniper", amount: 2 },
          { type: "addEnemyTypeDamage", pieceType: "sniper", enemyType: "boss", amount: 0.28 },
        ],
      },
      {
        id: "legend-breaker-stun",
        rarity: "legendary",
        targetType: "breaker",
        title: "보스 파쇄 기절",
        body: "탱커 대항형이 보스를 더 잘 파쇄하고 짧게 기절시킬 수 있습니다.",
        shortBody: "보스 파쇄와 기절 획득",
        requireActiveType: "breaker",
        actions: [
          { type: "addMod", key: "breakerBossStun", amount: 0.35 },
          { type: "addMod", key: "breakerPercentBonus", amount: 0.018 },
          { type: "addEnemyTypeDamage", pieceType: "breaker", enemyType: "boss", amount: 0.18 },
        ],
      },
      {
        id: "legend-blast-siege",
        rarity: "legendary",
        targetType: "blast",
        title: "섬멸 포격",
        body: "범위 공격형의 폭발 범위와 중심 피해가 함께 증가합니다.",
        shortBody: "폭발 범위와 중심 피해 증가",
        requireActiveType: "blast",
        actions: [
          { type: "addMod", key: "blastWide", amount: 1 },
          { type: "addMod", key: "blastFocused", amount: 1 },
          { type: "addTypeDamage", pieceType: "blast", amount: 0.1 },
        ],
      },
      {
        id: "legend-support-buff",
        rarity: "legendary",
        targetType: "support",
        title: "전장 정비망",
        body: "보조형의 회복량과 슬롯 자가 회복이 함께 증가합니다.",
        shortBody: "회복과 자가회복 강화",
        requireActiveType: "support",
        actions: [
          { type: "addMod", key: "supportHealBonus", amount: 14 },
          { type: "addMod", key: "slotRegen", amount: 0.35 },
        ],
      },
      {
        id: "legend-projectile",
        rarity: "legendary",
        title: "투사체 증가",
        body: "모든 공격 타워의 발사 수가 1 증가합니다.",
        shortBody: "발사 수 +1",
        limit: { modKey: "projectileUpgradeCount", configKey: "maxProjectileUpgrades", min: 1 },
        actions: [
          { type: "addMod", key: "extraBullets", amount: 1 },
          { type: "addMod", key: "projectileUpgradeCount", amount: 1 },
        ],
      },
    ],
  };

  const migratedPerkRows = [
    { PerkID: 10101, EffectID: 9101, RuntimePerkID: "common-basic-adapt", PerkName: "기본형 적응탄", PerkDesc: "기본형이 모든 몬스터 타입을 조금 더 잘 상대합니다.", Title: "기본형 적응탄", Body: "기본형이 모든 몬스터 타입을 조금 더 잘 상대합니다.", ShortBody: "모든 몬스터 대응력 상승", IconResourceID: 301000, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "basicTower", TargetType: "basic", RequireActiveType: "basic", Actions: [{ type: "addEnemyTypeDamage", pieceType: "basic", enemyTypes: ["basic", "speed", "tank", "ranged", "boss"], amount: 0.08 }], Desc: "기본형 적응탄" },
    { PerkID: 10102, EffectID: 9102, RuntimePerkID: "common-scatter-speed", PerkName: "산탄 속도형 제압", PerkDesc: "근접 산탄형이 속도형 몬스터에게 주는 피해가 증가합니다.", Title: "산탄 속도형 제압", Body: "근접 산탄형이 속도형 몬스터에게 주는 피해가 증가합니다.", ShortBody: "속도형 피해 증가", IconResourceID: 301001, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "scatterTower", TargetType: "scatter", RequireActiveType: "scatter", Actions: [{ type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "speed", amount: 0.28 }], Desc: "산탄 속도형 제압" },
    { PerkID: 10103, EffectID: 9103, RuntimePerkID: "common-scatter-knock", PerkName: "근접 밀어내기", PerkDesc: "근접 산탄형의 넉백이 증가합니다.", Title: "근접 밀어내기", Body: "근접 산탄형의 넉백이 증가합니다.", ShortBody: "넉백 증가", IconResourceID: 301002, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "scatterTower", TargetType: "scatter", RequireActiveType: "scatter", Actions: [{ type: "addMod", key: "scatterKnockback", amount: 10 }], Desc: "근접 밀어내기" },
    { PerkID: 10104, EffectID: 9104, RuntimePerkID: "common-ranger-tempo", PerkName: "난사 템포 향상", PerkDesc: "원거리 난사형의 연사 간격이 짧아집니다.", Title: "난사 템포 향상", Body: "원거리 난사형의 연사 간격이 짧아집니다.", ShortBody: "연사 간격 감소", IconResourceID: 301003, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "rangerTower", TargetType: "ranger", RequireActiveType: "ranger", Actions: [{ type: "multiplyMod", key: "rangerBurstIntervalMult", amount: 0.92 }], Desc: "난사 템포 향상" },
    { PerkID: 10105, EffectID: 9105, RuntimePerkID: "common-sniper-boss", PerkName: "저격 보스 조준", PerkDesc: "원거리 저격형이 보스에게 주는 피해가 증가합니다.", Title: "저격 보스 조준", Body: "원거리 저격형이 보스에게 주는 피해가 증가합니다.", ShortBody: "보스 피해 증가", IconResourceID: 301004, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "sniperTower", TargetType: "sniper", RequireActiveType: "sniper", Actions: [{ type: "addEnemyTypeDamage", pieceType: "sniper", enemyType: "boss", amount: 0.16 }], Desc: "저격 보스 조준" },
    { PerkID: 10106, EffectID: 9106, RuntimePerkID: "common-sniper-focus", PerkName: "저격 집중", PerkDesc: "원거리 저격형의 단발 위력이 증가합니다.", Title: "저격 집중", Body: "원거리 저격형의 단발 위력이 증가합니다.", ShortBody: "단발 위력 증가", IconResourceID: 301005, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "sniperTower", TargetType: "sniper", RequireActiveType: "sniper", Actions: [{ type: "addTypeSpecial", pieceType: "sniper", amount: 1 }], Desc: "저격 집중" },
    { PerkID: 10107, EffectID: 9107, RuntimePerkID: "common-breaker-armor", PerkName: "장갑 파쇄", PerkDesc: "탱커 대항형이 탱커형에게 주는 피해와 체력 비례 피해가 증가합니다.", Title: "장갑 파쇄", Body: "탱커 대항형이 탱커형에게 주는 피해와 체력 비례 피해가 증가합니다.", ShortBody: "탱커 피해와 체력비례 피해 증가", IconResourceID: 301006, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "breakerTower", TargetType: "breaker", RequireActiveType: "breaker", Actions: [{ type: "addEnemyTypeDamage", pieceType: "breaker", enemyType: "tank", amount: 0.18 }, { type: "addMod", key: "breakerPercentBonus", amount: 0.006 }], Desc: "장갑 파쇄" },
    { PerkID: 10108, EffectID: 9108, RuntimePerkID: "common-blast-wide", PerkName: "넓은 폭발", PerkDesc: "범위 공격형의 폭발 범위가 넓어지고 피해는 조금 낮아집니다.", Title: "넓은 폭발", Body: "범위 공격형의 폭발 범위가 넓어지고 피해는 조금 낮아집니다.", ShortBody: "범위 증가, 피해 소폭 감소", IconResourceID: 301007, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "blastTower", TargetType: "blast", RequireActiveType: "blast", Actions: [{ type: "addMod", key: "blastWide", amount: 1 }], Desc: "넓은 폭발" },
    { PerkID: 10109, EffectID: 9109, RuntimePerkID: "common-blast-focus", PerkName: "응축 폭발", PerkDesc: "범위 공격형의 폭발 범위가 줄고 중심 피해가 증가합니다.", Title: "응축 폭발", Body: "범위 공격형의 폭발 범위가 줄고 중심 피해가 증가합니다.", ShortBody: "범위 감소, 중심 피해 증가", IconResourceID: 301008, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "blastTower", TargetType: "blast", RequireActiveType: "blast", Actions: [{ type: "addMod", key: "blastFocused", amount: 1 }], Desc: "응축 폭발" },
    { PerkID: 10110, EffectID: 9110, RuntimePerkID: "common-support-heal", PerkName: "응급 수복", PerkDesc: "보조형의 슬롯 회복량이 증가합니다.", Title: "응급 수복", Body: "보조형의 슬롯 회복량이 증가합니다.", ShortBody: "회복량 증가", IconResourceID: 301009, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "supportTower", TargetType: "support", RequireActiveType: "support", Actions: [{ type: "addMod", key: "supportHealBonus", amount: 5 }], Desc: "응급 수복" },
    { PerkID: 10112, EffectID: 9112, RuntimePerkID: "common-duration", PerkName: "최대 탄창 증가", PerkDesc: "소팅으로 생성되는 타워의 최대 발사 횟수가 증가합니다.", Title: "최대 탄창 증가", Body: "소팅으로 생성되는 타워의 최대 발사 횟수가 증가합니다.", ShortBody: "최대 발사 횟수 증가", IconResourceID: 301011, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "AllTower", Actions: [{ type: "addMod", key: "towerDurationBonus", amount: 0.8 }], Desc: "최대 탄창 증가" },
    { PerkID: 10113, EffectID: 9113, RuntimePerkID: "common-range", PerkName: "사거리 증가", PerkDesc: "모든 공격 타워의 사거리가 18 증가합니다.", Title: "사거리 증가", Body: "모든 공격 타워의 사거리가 18 증가합니다.", ShortBody: "사거리 +18", IconResourceID: 301012, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "AllTower", Actions: [{ type: "addMod", key: "rangeBonus", amount: 18 }], Desc: "사거리 증가" },
    { PerkID: 10114, EffectID: 9114, RuntimePerkID: "common-bullet-size", PerkName: "투사체 크기 증가", PerkDesc: "투사체 크기가 증가해 시인성과 충돌 판정이 좋아집니다.", Title: "투사체 크기 증가", Body: "투사체 크기가 증가해 시인성과 충돌 판정이 좋아집니다.", ShortBody: "투사체 크기 증가", IconResourceID: 301013, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "AllTower", Actions: [{ type: "addMod", key: "bulletSizeBonus", amount: 0.8 }], Desc: "투사체 크기 증가" },
    { PerkID: 10115, EffectID: 9115, RuntimePerkID: "common-splash", PerkName: "스플래시 범위 증가", PerkDesc: "탄착 주변 피해 범위가 10 증가합니다.", Title: "스플래시 범위 증가", Body: "탄착 주변 피해 범위가 10 증가합니다.", ShortBody: "스플래시 범위 +10", IconResourceID: 301014, TriggerID: 0, MaxLevel: 3, PerkRarityType: 14, PerkTarget: "AllTower", Actions: [{ type: "addMod", key: "splashRadiusBonus", amount: 10 }], Desc: "스플래시 범위 증가" },
    { PerkID: 10116, EffectID: 9116, RuntimePerkID: "rare-basic-versatile", PerkName: "기본형 만능 교정", PerkDesc: "기본형의 피해량과 사거리가 함께 증가합니다.", Title: "기본형 만능 교정", Body: "기본형의 피해량과 사거리가 함께 증가합니다.", ShortBody: "피해와 사거리 증가", IconResourceID: 301015, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "basicTower", TargetType: "basic", RequireActiveType: "basic", Actions: [{ type: "addTypeDamage", pieceType: "basic", amount: 0.16 }, { type: "addMod", key: "rangeBonus", amount: 12 }], Desc: "기본형 만능 교정" },
    { PerkID: 10117, EffectID: 9117, RuntimePerkID: "rare-scatter-knockback", PerkName: "산탄 방벽", PerkDesc: "근접 산탄형의 넉백과 속도형 대응력이 크게 증가합니다.", Title: "산탄 방벽", Body: "근접 산탄형의 넉백과 속도형 대응력이 크게 증가합니다.", ShortBody: "넉백과 속도형 대응 강화", IconResourceID: 301016, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "scatterTower", TargetType: "scatter", RequireActiveType: "scatter", Actions: [{ type: "addMod", key: "scatterKnockback", amount: 22 }, { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "speed", amount: 0.32 }], Desc: "산탄 방벽" },
    { PerkID: 10118, EffectID: 9118, RuntimePerkID: "rare-scatter-pellet", PerkName: "근접 파편 증폭", PerkDesc: "근접 산탄형의 파편 수와 탱커 대응력이 증가합니다.", Title: "근접 파편 증폭", Body: "근접 산탄형의 파편 수와 탱커 대응력이 증가합니다.", ShortBody: "파편 수와 탱커 대응 강화", IconResourceID: 301017, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "scatterTower", TargetType: "scatter", RequireActiveType: "scatter", Actions: [{ type: "addTypeSpecial", pieceType: "scatter", amount: 1 }, { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "tank", amount: 0.18 }], Desc: "근접 파편 증폭" },
    { PerkID: 10119, EffectID: 9119, RuntimePerkID: "rare-ranger-highrpm", PerkName: "고속 연사", PerkDesc: "원거리 난사형의 연사 간격이 크게 짧아집니다.", Title: "고속 연사", Body: "원거리 난사형의 연사 간격이 크게 짧아집니다.", ShortBody: "연사 간격 크게 감소", IconResourceID: 301018, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "rangerTower", TargetType: "ranger", RequireActiveType: "ranger", Actions: [{ type: "multiplyMod", key: "rangerBurstIntervalMult", amount: 0.84 }], Desc: "고속 연사" },
    { PerkID: 10120, EffectID: 9120, RuntimePerkID: "rare-sniper-pierce", PerkName: "다중 타격 저격", PerkDesc: "저격 탄환이 추가 적을 더 맞출 수 있습니다. 보스 피해도 증가합니다.", Title: "다중 타격 저격", Body: "저격 탄환이 추가 적을 더 맞출 수 있습니다. 보스 피해도 증가합니다.", ShortBody: "관통과 보스 피해 증가", IconResourceID: 301019, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "sniperTower", TargetType: "sniper", RequireActiveType: "sniper", Actions: [{ type: "addMod", key: "pierceBonus", amount: 1 }, { type: "addEnemyTypeDamage", pieceType: "sniper", enemyType: "boss", amount: 0.22 }], Desc: "다중 타격 저격" },
    { PerkID: 10121, EffectID: 9121, RuntimePerkID: "rare-breaker-percent", PerkName: "체력 비례 파쇄", PerkDesc: "탱커 대항형의 최대 체력 비례 피해와 보스 피해가 증가합니다.", Title: "체력 비례 파쇄", Body: "탱커 대항형의 최대 체력 비례 피해와 보스 피해가 증가합니다.", ShortBody: "체력비례 피해와 보스 피해 증가", IconResourceID: 301020, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "breakerTower", TargetType: "breaker", RequireActiveType: "breaker", Actions: [{ type: "addMod", key: "breakerPercentBonus", amount: 0.012 }, { type: "addEnemyTypeDamage", pieceType: "breaker", enemyType: "boss", amount: 0.12 }], Desc: "체력 비례 파쇄" },
    { PerkID: 10122, EffectID: 9122, RuntimePerkID: "rare-blast-wide", PerkName: "넓은 범위 포격", PerkDesc: "범위 공격형의 폭발 범위가 커지고 피해량이 조금 낮아집니다.", Title: "넓은 범위 포격", Body: "범위 공격형의 폭발 범위가 커지고 피해량이 조금 낮아집니다.", ShortBody: "넓은 범위 포격 강화", IconResourceID: 301021, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "blastTower", TargetType: "blast", RequireActiveType: "blast", Actions: [{ type: "addMod", key: "blastWide", amount: 1 }], Desc: "넓은 범위 포격" },
    { PerkID: 10123, EffectID: 9123, RuntimePerkID: "rare-blast-focused", PerkName: "집중 포격", PerkDesc: "범위 공격형의 폭발 범위가 줄고 피해량이 증가합니다.", Title: "집중 포격", Body: "범위 공격형의 폭발 범위가 줄고 피해량이 증가합니다.", ShortBody: "좁은 고화력 포격 강화", IconResourceID: 301022, TriggerID: 0, MaxLevel: 3, PerkRarityType: 13, PerkTarget: "blastTower", TargetType: "blast", RequireActiveType: "blast", Actions: [{ type: "addMod", key: "blastFocused", amount: 1 }], Desc: "집중 포격" },
    { PerkID: 10124, EffectID: 9124, RuntimePerkID: "legend-regen", PerkName: "슬롯 자가 회복", PerkDesc: "살아있는 슬롯이 초당 1.4 HP를 회복합니다.", Title: "슬롯 자가 회복", Body: "살아있는 슬롯이 초당 1.4 HP를 회복합니다.", ShortBody: "살아있는 슬롯 자동 회복", IconResourceID: 301023, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "AllTower", Actions: [{ type: "addMod", key: "slotRegen", amount: 1.4 }], Desc: "슬롯 자가 회복" },
    { PerkID: 10125, EffectID: 9125, RuntimePerkID: "legend-reroll", PerkName: "리롤 횟수 증가", PerkDesc: "리롤 최대 충전량이 1 증가하고 즉시 1회 충전됩니다.", Title: "리롤 횟수 증가", Body: "리롤 최대 충전량이 1 증가하고 즉시 1회 충전됩니다.", ShortBody: "리롤 최대치 +1, 즉시 충전", IconResourceID: 301024, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "AllTower", Actions: [{ type: "addMod", key: "rerollMaxCharges", amount: 1 }, { type: "addRerollCharge", amount: 1 }], Desc: "리롤 횟수 증가" },
    { PerkID: 10126, EffectID: 9126, RuntimePerkID: "legend-basic-master", PerkName: "기본형 만능 전술", PerkDesc: "기본형이 모든 몬스터 타입에 강해지고 전체 사격 안정성이 증가합니다.", Title: "기본형 만능 전술", Body: "기본형이 모든 몬스터 타입에 강해지고 전체 사격 안정성이 증가합니다.", ShortBody: "기본형 만능 대응 강화", IconResourceID: 301025, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "basicTower", TargetType: "basic", RequireActiveType: "basic", Actions: [{ type: "addEnemyTypeDamage", pieceType: "basic", enemyTypes: ["basic", "speed", "tank", "ranged", "boss"], amount: 0.18 }, { type: "addTypeDamage", pieceType: "basic", amount: 0.12 }], Desc: "기본형 만능 전술" },
    { PerkID: 10127, EffectID: 9127, RuntimePerkID: "legend-scatter-lockdown", PerkName: "근접 완전 제압", PerkDesc: "근접 산탄형이 속도형과 탱커형을 크게 밀어내고 더 잘 처치합니다.", Title: "근접 완전 제압", Body: "근접 산탄형이 속도형과 탱커형을 크게 밀어내고 더 잘 처치합니다.", ShortBody: "속도형/탱커 제압 강화", IconResourceID: 301026, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "scatterTower", TargetType: "scatter", RequireActiveType: "scatter", Actions: [{ type: "addMod", key: "scatterKnockback", amount: 34 }, { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "speed", amount: 0.4 }, { type: "addEnemyTypeDamage", pieceType: "scatter", enemyType: "tank", amount: 0.28 }], Desc: "근접 완전 제압" },
    { PerkID: 10128, EffectID: 9128, RuntimePerkID: "legend-ranger-suppress", PerkName: "제압 연사", PerkDesc: "원거리 난사형의 연사 간격이 크게 짧아져 같은 투사체 수를 더 빠르게 비웁니다.", Title: "제압 연사", Body: "원거리 난사형의 연사 간격이 크게 짧아져 같은 투사체 수를 더 빠르게 비웁니다.", ShortBody: "연사 속도 대폭 증가", IconResourceID: 301027, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "rangerTower", TargetType: "ranger", RequireActiveType: "ranger", Actions: [{ type: "multiplyMod", key: "rangerBurstIntervalMult", amount: 0.76 }], Desc: "제압 연사" },
    { PerkID: 10129, EffectID: 9129, RuntimePerkID: "legend-sniper-rail", PerkName: "레일 저격", PerkDesc: "저격 탄환이 여러 적을 연속으로 맞출 수 있고 보스 저격 능력이 크게 증가합니다.", Title: "레일 저격", Body: "저격 탄환이 여러 적을 연속으로 맞출 수 있고 보스 저격 능력이 크게 증가합니다.", ShortBody: "다중 관통 저격 강화", IconResourceID: 301028, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "sniperTower", TargetType: "sniper", RequireActiveType: "sniper", Actions: [{ type: "addMod", key: "pierceBonus", amount: 2 }, { type: "addTypeSpecial", pieceType: "sniper", amount: 2 }, { type: "addEnemyTypeDamage", pieceType: "sniper", enemyType: "boss", amount: 0.28 }], Desc: "레일 저격" },
    { PerkID: 10130, EffectID: 9130, RuntimePerkID: "legend-breaker-stun", PerkName: "보스 파쇄 기절", PerkDesc: "탱커 대항형이 보스를 더 잘 파쇄하고 짧게 기절시킬 수 있습니다.", Title: "보스 파쇄 기절", Body: "탱커 대항형이 보스를 더 잘 파쇄하고 짧게 기절시킬 수 있습니다.", ShortBody: "보스 파쇄와 기절 획득", IconResourceID: 301029, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "breakerTower", TargetType: "breaker", RequireActiveType: "breaker", Actions: [{ type: "addMod", key: "breakerBossStun", amount: 0.35 }, { type: "addMod", key: "breakerPercentBonus", amount: 0.018 }, { type: "addEnemyTypeDamage", pieceType: "breaker", enemyType: "boss", amount: 0.18 }], Desc: "보스 파쇄 기절" },
    { PerkID: 10131, EffectID: 9131, RuntimePerkID: "legend-blast-siege", PerkName: "섬멸 포격", PerkDesc: "범위 공격형의 폭발 범위와 중심 피해가 함께 증가합니다.", Title: "섬멸 포격", Body: "범위 공격형의 폭발 범위와 중심 피해가 함께 증가합니다.", ShortBody: "폭발 범위와 중심 피해 증가", IconResourceID: 301030, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "blastTower", TargetType: "blast", RequireActiveType: "blast", Actions: [{ type: "addMod", key: "blastWide", amount: 1 }, { type: "addMod", key: "blastFocused", amount: 1 }, { type: "addTypeDamage", pieceType: "blast", amount: 0.1 }], Desc: "섬멸 포격" },
    { PerkID: 10132, EffectID: 9132, RuntimePerkID: "legend-support-buff", PerkName: "전장 정비망", PerkDesc: "보조형의 회복량과 슬롯 자가 회복이 함께 증가합니다.", Title: "전장 정비망", Body: "보조형의 회복량과 슬롯 자가 회복이 함께 증가합니다.", ShortBody: "회복과 자가회복 강화", IconResourceID: 301031, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "supportTower", TargetType: "support", RequireActiveType: "support", Actions: [{ type: "addMod", key: "supportHealBonus", amount: 14 }, { type: "addMod", key: "slotRegen", amount: 0.35 }], Desc: "전장 정비망" },
    { PerkID: 10133, EffectID: 9133, RuntimePerkID: "legend-projectile", PerkName: "투사체 증가", PerkDesc: "모든 공격 타워의 발사 수가 1 증가합니다.", Title: "투사체 증가", Body: "모든 공격 타워의 발사 수가 1 증가합니다.", ShortBody: "발사 수 +1", IconResourceID: 301032, TriggerID: 0, MaxLevel: 3, PerkRarityType: 11, PerkTarget: "AllTower", Limit: { modKey: "projectileUpgradeCount", configKey: "maxProjectileUpgrades", min: 1 }, Actions: [{ type: "addMod", key: "extraBullets", amount: 1 }, { type: "addMod", key: "projectileUpgradeCount", amount: 1 }], Desc: "투사체 증가" },
  ].filter((row) => row.TargetType !== "ranger" && row.RequireActiveType !== "ranger");

  const designPerkRuntimeKeyMap = Object.fromEntries(
    migratedPerkRows
      .filter((row) => row.RuntimePerkID)
      .map((row) => [String(row.PerkID), row.RuntimePerkID]),
  );

  const basePerkActionRows = [
    { ActionID: 920001, PerkID: 10001, ActionType: "addMod", ActionKey: "damageMultiplier", Amount: 0.12, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "공격력 증가" },
    { ActionID: 920002, PerkID: 10001, ActionType: "addMod", ActionKey: "damageUpgradeCount", Amount: 1, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "공격력 증가 횟수" },
    { ActionID: 920011, PerkID: 10002, ActionType: "multiplyMod", ActionKey: "fireRateMultiplier", Amount: 0.92, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "공격속도 증가" },
    { ActionID: 920012, PerkID: 10002, ActionType: "addMod", ActionKey: "fireRateUpgradeCount", Amount: 1, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "공격속도 증가 횟수" },
    { ActionID: 920021, PerkID: 10003, ActionType: "addMod", ActionKey: "extraBullets", Amount: 1, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "투사체 증가" },
    { ActionID: 920022, PerkID: 10003, ActionType: "addMod", ActionKey: "projectileUpgradeCount", Amount: 1, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "투사체 증가 횟수" },
    { ActionID: 920031, PerkID: 10004, ActionType: "addMod", ActionKey: "towerDurationBonus", Amount: 1, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "포탑 최대 탄창 증가" },
    { ActionID: 920041, PerkID: 10005, ActionType: "addMod", ActionKey: "supportHealBonus", Amount: 8, PieceType: "", EnemyType: "", EnemyTypesJson: "", Desc: "보조형 회복량 증가" },
  ];

  const basePerkLimitRows = [
    { LimitID: 925001, PerkID: 10001, ModKey: "damageUpgradeCount", ConfigKey: "maxDamageUpgrades", Min: 1, Max: 3, Desc: "공격력 증가 최대 횟수" },
    { LimitID: 925002, PerkID: 10002, ModKey: "fireRateUpgradeCount", ConfigKey: "maxFireRateUpgrades", Min: 1, Max: 5, Desc: "공격속도 증가 최대 횟수" },
    { LimitID: 925003, PerkID: 10003, ModKey: "projectileUpgradeCount", ConfigKey: "maxProjectileUpgrades", Min: 1, Max: 3, Desc: "투사체 증가 최대 횟수" },
  ];

  const migratedPerkActionRows = migratedPerkRows.flatMap((row, rowIndex) =>
    (row.Actions || []).map((action, actionIndex) => ({
      ActionID: 930000 + rowIndex * 10 + actionIndex + 1,
      PerkID: row.PerkID,
      ActionType: action.type,
      ActionKey: action.key || "",
      Amount: Number(action.amount || 0),
      PieceType: action.pieceType || "",
      EnemyType: action.enemyType || "",
      EnemyTypesJson: action.enemyTypes ? JSON.stringify(action.enemyTypes) : "",
      Desc: `${row.Desc} 액션 ${actionIndex + 1}`,
    })),
  );

  const migratedPerkLimitRows = migratedPerkRows
    .filter((row) => row.Limit)
    .map((row, index) => ({
      LimitID: 935000 + index + 1,
      PerkID: row.PerkID,
      ModKey: row.Limit.modKey || "",
      ConfigKey: row.Limit.configKey || "",
      Min: Number(row.Limit.min || 0),
      Max: Number(row.Limit.max || row.MaxLevel || 0),
      Desc: `${row.Desc} 최대 횟수`,
    }));

  // PerkData CSV v1.0 (2026-06-24) 기준 행.
  // 수치는 별도 EffectData 파일이 제공되지 않아 현재 프로토타입 전투 감각에 맞춘 임시 밸런스다.
  const perkTableDefinitions = [
    { perkId: 10001, effectId: 9001, nameKey: "PerkName_ATKUP_Basic", descKey: "PerkDesc_ATKUP_Basic", title: "기본형 공격력 강화", body: "기본형의 공격력이 14% 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 1, targetText: "기본형", targetType: "basic", active: true, iconId: 12001, effectType: "TypeAtkUp", effectValue: 0.14, actions: [{ type: "addTypeDamage", pieceType: "basic", amount: 0.14 }] },
    { perkId: 10002, effectId: 9002, nameKey: "PerkName_ATKSpeedUP_Basic", descKey: "PerkDesc_ATKSpeedUP_Basic", title: "기본형 공격 주기 강화", body: "기본형의 공격 주기가 9% 짧아집니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 1, targetText: "기본형", targetType: "basic", active: true, effectType: "TypeAtkSpeedUp", effectValue: 0.09, actions: [{ type: "addTypeFireRateBonus", pieceType: "basic", amount: 0.09 }] },
    { perkId: 10003, effectId: 9003, nameKey: "PerkName_ShotProjCountUP_Basic", descKey: "PerkDesc_ShotProjCountUP_Basic", title: "기본형 발사체 수 증가", body: "기본형의 1회 발사체 수가 증가합니다.", triggerId: 0, maxLevel: 2, rarityId: 91, target: 1, targetText: "기본형", targetType: "basic", active: false, effectType: "TypeProjectileCountUp", effectValue: 1, actions: [] },
    { perkId: 10004, effectId: 9004, nameKey: "PerkName_MaxProj_Basic", descKey: "PerkDesc_MaxProj_Basic", title: "기본형 탄창 증가", body: "기본형 포탑의 최대 탄창이 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 1, targetText: "기본형", targetType: "basic", active: true, effectType: "TypeAmmoUp", effectValue: 1, actions: [{ type: "addTypeAmmoBonus", pieceType: "basic", amount: 1 }] },
    { perkId: 10005, effectId: 9005, nameKey: "PerkName_ProjSize_Basic", descKey: "PerkDesc_ProjSize_Basic", title: "기본형 발사체 크기 증가", body: "기본형 발사체 크기가 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 1, targetText: "기본형", targetType: "basic", active: false, effectType: "ProjectileSizeUp", effectValue: 0.1, actions: [] },
    { perkId: 10006, effectId: 9006, nameKey: "PerkName_ProjPiercing_Basic", descKey: "PerkDesc_ProjPiercing_Basic", title: "기본형 관통력 증가", body: "기본형 발사체의 관통력이 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 1, targetText: "기본형", targetType: "basic", active: false, effectType: "TypePierceUp", effectValue: 1, actions: [] },
    { perkId: 10007, effectId: 9007, nameKey: "PerkName_BoomArea_Basic", descKey: "PerkDesc_BoomArea_Basic", title: "기본형 폭발 범위 증가", body: "기본형 발사체의 폭발 범위가 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 1, targetText: "기본형", targetType: "basic", active: false, effectType: "TypeBlastRadiusUp", effectValue: 18, actions: [] },
    { perkId: 10008, effectId: 9008, nameKey: "PerkName_ATKUP_Shotgun", descKey: "PerkDesc_ATKUP_Shotgun", title: "샷건형 공격력 강화", body: "샷건형의 공격력이 14% 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 2, targetText: "샷건형", targetType: "scatter", active: true, effectType: "TypeAtkUp", effectValue: 0.14, actions: [{ type: "addTypeDamage", pieceType: "scatter", amount: 0.14 }] },
    { perkId: 10009, effectId: 9009, nameKey: "PerkName_ATKSpeedUP_Shotgun", descKey: "PerkDesc_ATKSpeedUP_Shotgun", title: "샷건형 공격 주기 강화", body: "샷건형의 공격 주기가 9% 짧아집니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 2, targetText: "샷건형", targetType: "scatter", active: true, effectType: "TypeAtkSpeedUp", effectValue: 0.09, actions: [{ type: "addTypeFireRateBonus", pieceType: "scatter", amount: 0.09 }] },
    { perkId: 10010, effectId: 9010, nameKey: "PerkName_ShotProjCountUP_Shotgun", descKey: "PerkDesc_ShotProjCountUP_Shotgun", title: "샷건형 발사체 수 증가", body: "샷건형의 1회 발사체 수가 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 93, target: 2, targetText: "샷건형", targetType: "scatter", active: true, effectType: "TypeProjectileCountUp", effectValue: 1, actions: [{ type: "addTypeProjectileCount", pieceType: "scatter", amount: 1 }] },
    { perkId: 10011, effectId: 9011, nameKey: "PerkName_MaxProj_Shotgun", descKey: "PerkDesc_MaxProj_Shotgun", title: "샷건형 탄창 증가", body: "샷건형 포탑의 최대 탄창이 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 2, targetText: "샷건형", targetType: "scatter", active: true, effectType: "TypeAmmoUp", effectValue: 1, actions: [{ type: "addTypeAmmoBonus", pieceType: "scatter", amount: 1 }] },
    { perkId: 10012, effectId: 9012, nameKey: "PerkName_BoomArea_Shotgun", descKey: "PerkDesc_BoomArea_Shotgun", title: "샷건형 폭발 범위 증가", body: "샷건형 발사체의 폭발 범위가 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 2, targetText: "샷건형", targetType: "scatter", active: false, effectType: "TypeBlastRadiusUp", effectValue: 18, actions: [] },
    { perkId: 10013, effectId: 9013, nameKey: "PerkName_ATKUP_Mortar", descKey: "PerkDesc_ATKUP_Mortar", title: "탱커형 파쇄력 강화", body: "탱커형의 최대 체력 비례 피해가 0.7%p 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 93, target: 3, targetText: "탱커형", targetType: "breaker", active: true, effectType: "TankPercentDamageUp", effectValue: 0.007, actions: [{ type: "addMod", key: "breakerPercentBonus", amount: 0.007 }] },
    { perkId: 10014, effectId: 9014, nameKey: "PerkName_ATKSpeedUP_Mortar", descKey: "PerkDesc_ATKSpeedUP_Mortar", title: "탱커형 공격 주기 강화", body: "탱커형의 공격 주기가 9% 짧아집니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 3, targetText: "탱커형", targetType: "breaker", active: true, effectType: "TypeAtkSpeedUp", effectValue: 0.09, actions: [{ type: "addTypeFireRateBonus", pieceType: "breaker", amount: 0.09 }] },
    { perkId: 10015, effectId: 9015, nameKey: "PerkName_MaxProj_Mortar", descKey: "PerkDesc_MaxProj_Mortar", title: "탱커형 탄창 증가", body: "탱커형 포탑의 최대 탄창이 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 3, targetText: "탱커형", targetType: "breaker", active: true, effectType: "TypeAmmoUp", effectValue: 1, actions: [{ type: "addTypeAmmoBonus", pieceType: "breaker", amount: 1 }] },
    { perkId: 10016, effectId: 9016, nameKey: "PerkName_ProjSize_Mortar", descKey: "PerkDesc_ProjSize_Mortar", title: "탱커형 발사체 크기 증가", body: "탱커형 발사체 크기가 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 3, targetText: "탱커형", targetType: "breaker", active: false, effectType: "ProjectileSizeUp", effectValue: 0.1, actions: [] },
    { perkId: 10017, effectId: 9017, nameKey: "PerkName_ATKUP_SR", descKey: "PerkDesc_ATKUP_SR", title: "원거리형 공격력 강화", body: "원거리형의 공격력이 14% 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 4, targetText: "원거리형", targetType: "sniper", active: true, effectType: "TypeAtkUp", effectValue: 0.14, actions: [{ type: "addTypeDamage", pieceType: "sniper", amount: 0.14 }] },
    { perkId: 10018, effectId: 9018, nameKey: "PerkName_ATKSpeedUP_SR", descKey: "PerkDesc_ATKSpeedUP_SR", title: "원거리형 공격 주기 강화", body: "원거리형의 공격 주기가 9% 짧아집니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 4, targetText: "원거리형", targetType: "sniper", active: true, effectType: "TypeAtkSpeedUp", effectValue: 0.09, actions: [{ type: "addTypeFireRateBonus", pieceType: "sniper", amount: 0.09 }] },
    { perkId: 10019, effectId: 9019, nameKey: "PerkName_MaxProj_SR", descKey: "PerkDesc_MaxProj_SR", title: "원거리형 탄창 증가", body: "원거리형 포탑의 최대 탄창이 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 4, targetText: "원거리형", targetType: "sniper", active: true, effectType: "TypeAmmoUp", effectValue: 1, actions: [{ type: "addTypeAmmoBonus", pieceType: "sniper", amount: 1 }] },
    { perkId: 10020, effectId: 9020, nameKey: "PerkName_ProjPiercing_SR", descKey: "PerkDesc_ProjPiercing_SR", title: "원거리형 관통력 증가", body: "원거리형 발사체의 관통 횟수가 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 93, target: 4, targetText: "원거리형", targetType: "sniper", active: true, effectType: "TypePierceUp", effectValue: 1, actions: [{ type: "addTypePierce", pieceType: "sniper", amount: 1 }] },
    { perkId: 10021, effectId: 9021, nameKey: "PerkName_BoomArea_SR", descKey: "PerkDesc_BoomArea_SR", title: "원거리형 폭발 범위 증가", body: "원거리형 발사체의 폭발 범위가 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 4, targetText: "원거리형", targetType: "sniper", active: false, effectType: "TypeBlastRadiusUp", effectValue: 18, actions: [] },
    { perkId: 10022, effectId: 9022, nameKey: "PerkName_ATKUP_Buffer", descKey: "PerkDesc_ATKUP_Buffer", title: "보조형 공격력 강화", body: "보조형의 공격력이 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 5, targetText: "보조형", targetType: "support", active: false, effectType: "TypeAtkUp", effectValue: 0.12, actions: [] },
    { perkId: 10023, effectId: 9023, nameKey: "PerkName_ATKSpeedUP_Buffer", descKey: "PerkDesc_ATKSpeedUP_Buffer", title: "보조형 공격 주기 강화", body: "보조형의 공격 주기가 9% 짧아집니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 5, targetText: "보조형", targetType: "support", active: true, effectType: "TypeAtkSpeedUp", effectValue: 0.09, actions: [{ type: "addTypeFireRateBonus", pieceType: "support", amount: 0.09 }] },
    { perkId: 10024, effectId: 9024, nameKey: "PerkName_MaxProj_Buffer", descKey: "PerkDesc_MaxProj_Buffer", title: "보조형 탄창 증가", body: "보조형 포탑의 최대 탄창이 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 5, targetText: "보조형", targetType: "support", active: true, effectType: "TypeAmmoUp", effectValue: 1, actions: [{ type: "addTypeAmmoBonus", pieceType: "support", amount: 1 }] },
    { perkId: 10025, effectId: 9025, nameKey: "PerkName_Heal_Buffer", descKey: "PerkDesc_Heal_Buffer", title: "보조형 회복량 증가", body: "보조형의 슬롯 회복량이 16 증가합니다.", triggerId: 0, maxLevel: 2, rarityId: 93, target: 5, targetText: "보조형", targetType: "support", active: true, effectType: "HealUp", effectValue: 16, actions: [{ type: "addMod", key: "supportHealBonus", amount: 16 }] },
    { perkId: 10026, effectId: 9026, nameKey: "PerkName_ATKUP_Boomer", descKey: "PerkDesc_ATKUP_Boomer", title: "범위형 공격력 강화", body: "범위형의 공격력이 14% 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 6, targetText: "범위형", targetType: "blast", active: true, effectType: "TypeAtkUp", effectValue: 0.14, actions: [{ type: "addTypeDamage", pieceType: "blast", amount: 0.14 }] },
    { perkId: 10027, effectId: 9027, nameKey: "PerkName_ATKSpeedUP_Boomer", descKey: "PerkDesc_ATKSpeedUP_Boomer", title: "범위형 공격 주기 강화", body: "범위형의 공격 주기가 9% 짧아집니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 6, targetText: "범위형", targetType: "blast", active: true, effectType: "TypeAtkSpeedUp", effectValue: 0.09, actions: [{ type: "addTypeFireRateBonus", pieceType: "blast", amount: 0.09 }] },
    { perkId: 10028, effectId: 9028, nameKey: "PerkName_ShotProjCountUP_Boomer", descKey: "PerkDesc_ShotProjCountUP_Boomer", title: "범위형 발사체 수 증가", body: "범위형의 1회 발사체 수가 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 6, targetText: "범위형", targetType: "blast", active: false, effectType: "TypeProjectileCountUp", effectValue: 1, actions: [] },
    { perkId: 10029, effectId: 9029, nameKey: "PerkName_MaxProj_Boomer", descKey: "PerkDesc_MaxProj_Boomer", title: "범위형 탄창 증가", body: "범위형 포탑의 최대 탄창이 1 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 91, target: 6, targetText: "범위형", targetType: "blast", active: true, effectType: "TypeAmmoUp", effectValue: 1, actions: [{ type: "addTypeAmmoBonus", pieceType: "blast", amount: 1 }] },
    { perkId: 10030, effectId: 9030, nameKey: "PerkName_BoomArea_Boomer", descKey: "PerkDesc_BoomArea_Boomer", title: "범위형 폭발 범위 증가", body: "범위형의 폭발 반경이 20 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 93, target: 6, targetText: "범위형", targetType: "blast", active: true, effectType: "TypeBlastRadiusUp", effectValue: 20, actions: [{ type: "addTypeBlastRadius", pieceType: "blast", amount: 20 }] },
    { perkId: 10031, effectId: 9101, nameKey: "PerkName_Heal_Slot", descKey: "PerkDesc_Heal_Slot", title: "전체 슬롯 긴급 회복", body: "선택 즉시 살아있는 모든 슬롯의 최대 체력 28%를 회복합니다.", triggerId: 0, maxLevel: 1, rarityId: 92, target: 7, targetText: "0", active: true, effectType: "HealAllSlotsPercent", effectValue: 0.28, actions: [{ type: "healAllSlotsPercent", amount: 0.28 }] },
    { perkId: 10032, effectId: 9102, nameKey: "PerkName_MaxHPUP_Slot", descKey: "PerkDesc_MaxHPUP_Slot", title: "슬롯 최대 체력 증가", body: "모든 슬롯의 최대 체력이 34 증가합니다. 현재 체력은 회복되지 않습니다.", triggerId: 0, maxLevel: 3, rarityId: 92, target: 7, targetText: "0", active: true, effectType: "SlotMaxHpUp", effectValue: 34, actions: [{ type: "addSlotMaxHp", amount: 34 }] },
    { perkId: 10033, effectId: 9103, nameKey: "PerkName_ATKSpeedUp_Slot", descKey: "PerkDesc_ATKSpeedUp_Slot", title: "전 포탑 공격 가속", body: "다음 전투 20초 동안 모든 포탑의 공격 주기가 28% 짧아집니다.", triggerId: 0, maxLevel: 1, rarityId: 92, target: 7, targetText: "0", active: true, effectType: "TimedFireRateUp", effectValue: 0.28, duration: 20, actions: [{ type: "startTimedFireRate", amount: 0.28, duration: 20 }] },
    { perkId: 10034, effectId: 9105, nameKey: "PerkName_ComboDamage", descKey: "PerkDesc_ComboDamage", title: "10콤보 관통탄 강화", body: "10콤보마다 발사되는 관통탄의 고정 피해가 20% 증가합니다.", triggerId: 0, maxLevel: 3, rarityId: 92, target: 8, targetText: "0", active: true, effectType: "ComboProjectileDamageUp", effectValue: 0.2, actions: [{ type: "addSpecialProjectileLevel", projectileId: "combo_pierce", amount: 1 }] },
  ];

  const perkDataRows = perkTableDefinitions.map((row) => ({
    PerkID: row.perkId,
    EffectID: row.effectId,
    PerkName: row.nameKey,
    PerkDesc: row.descKey,
    TriggerID: row.triggerId,
    MaxLevel: row.maxLevel,
    PerkRarityType: row.rarityId,
    PerkTarget: row.target,
    PerkTargetText: row.targetText,
    IsActive: row.active ? 1 : 0,
    IconResourceID: row.iconId || 0,
    "*": "",
    Desc: row.title,
  }));

  const perkEffectRows = perkTableDefinitions.map((row) => ({
    EffectID: row.effectId,
    BuffTowerType: row.targetType || (row.target === 7 ? "Slot" : row.target === 8 ? "Combo" : "All"),
    ATK: row.effectType === "TypeAtkUp" ? row.effectValue : 0,
    ATKSpeed: row.effectType === "TypeAtkSpeedUp" || row.effectType === "TimedFireRateUp" ? row.effectValue : 0,
    ShotProjCount: row.effectType === "TypeProjectileCountUp" ? row.effectValue : 0,
    MaxProj: row.effectType === "TypeAmmoUp" ? row.effectValue : 0,
    ProjSize: row.effectType === "ProjectileSizeUp" ? row.effectValue : 0,
    ProjPiercing: row.effectType === "TypePierceUp" ? row.effectValue : 0,
    BuffType: row.effectType,
    BuffValue: row.effectValue,
    IsOneOff: row.maxLevel === 1,
    Duration: row.duration || 0,
    "*": "",
    Desc: row.title,
  }));

  const perkActionRows = perkTableDefinitions.flatMap((row, rowIndex) =>
    (row.actions || []).map((action, actionIndex) => ({
      ActionID: 940000 + rowIndex * 10 + actionIndex + 1,
      PerkID: row.perkId,
      ActionType: action.type,
      ActionKey: action.key || "",
      Amount: Number(action.amount || 0),
      Duration: Number(action.duration || 0),
      PieceType: action.pieceType || "",
      EnemyType: action.enemyType || "",
      EnemyTypesJson: action.enemyTypes ? JSON.stringify(action.enemyTypes) : "",
      ProjectileID: action.projectileId || "",
      Desc: `${row.title} 액션 ${actionIndex + 1}`,
    })),
  );

  const dataTablePieceFamilies = [
    { group: "basic", pieceStart: 8001, towerStart: 7001, name: "세린", pieceType: "AR", desc: "기본형 단일 유도 사격", image: "assets/images/ui/PIECE/기본형.png" },
    { group: "scatter", pieceStart: 8006, towerStart: 7006, name: "도이", pieceType: "Shotgun", desc: "근거리 산탄 사격", image: "assets/images/ui/PIECE/산탄형.png" },
    { group: "sniper", pieceStart: 8011, towerStart: 7011, name: "유진", pieceType: "Lange", desc: "원거리 관통 사격", image: "assets/images/ui/PIECE/원거리저격혐.png" },
    { group: "breaker", pieceStart: 8016, towerStart: 7016, name: "가비", pieceType: "Tank", desc: "탱커 대항 사격", image: "assets/images/ui/PIECE/탱커대항형.png" },
    { group: "blast", pieceStart: 8021, towerStart: 7021, name: "유은", pieceType: "Wide", desc: "범위 폭발 사격", image: "assets/images/ui/PIECE/범위형.png" },
    { group: "support", pieceStart: 8026, towerStart: 7026, name: "리리", pieceType: "Buffer", desc: "아군 슬롯 회복 지원", image: "assets/images/ui/PIECE/보조형ㄹ.png" },
  ];

  // PieceData 원본형 행 데이터
  // - PieceID: 데이터테이블 공식 ID 8001~8030을 사용한다.
  // - PieceType: 종합 데이터테이블의 AR/Shotgun/Lange/Tank/Wide/Buffer 값을 보존한다.
  // - ConnectTower: 공식 TowerData 7001~7030에 순서대로 연결한다.
  const pieceLevelRows = dataTablePieceFamilies.flatMap((family) =>
    Array.from({ length: 5 }, (_, index) => ({
      PieceID: family.pieceStart + index,
      PieceName: family.name,
      PieceType: family.pieceType,
      PieceDesc: family.desc,
      PieceGrade: 1,
      PieceLv: index + 1,
      ConnectTower: family.towerStart + index,
      Portrait: family.image,
      PieceSprite: family.image,
      "*": "",
      Desc: `${family.name} Lv${index + 1}`,
    })),
  );
  const defaultOwnedPieceIds = new Set(dataTablePieceFamilies.map((family) => family.pieceStart));

  // PieceUpgradeData 원본형 행 데이터
  // - UpgradeID: 강화 규칙 고유 ID.
  // - PieceGroupID: 같은 계열 기물을 묶는 그룹 키. 로비 표시/교체 처리 기준이 된다.
  // - FromPieceID -> ToPieceID: 강화 전/후 기물 ID 연결.
  // - Desc: 편집자 메모.
  const pieceUpgradeRows = dataTablePieceFamilies.flatMap((family, familyIndex) =>
    Array.from({ length: 4 }, (_, index) => ({
      UpgradeID: 880000 + familyIndex * 10 + index + 1,
      PieceGroupID: family.group,
      FromPieceID: family.pieceStart + index,
      ToPieceID: family.pieceStart + index + 1,
      "*": "",
      Desc: `${family.name} Lv${index + 1} -> Lv${index + 2}`,
    })),
  );

  // UpgradeCostData 원본형 행 데이터
  // - UpgradeCostID: 강화 비용 행 고유 ID.
  // - UpgradeID: PieceUpgradeData.UpgradeID 참조.
  // - CurrencyType: 현재는 gold만 사용한다.
  // - UpgradeCost: 해당 1회 강화에 필요한 비용.
  const dataTableUpgradeCostByFromLevel = [100, 200, 300, 400];
  const pieceUpgradeCostRows = pieceUpgradeRows.map((upgradeRow, index) => ({
    UpgradeCostID: 881001 + index,
    UpgradeID: upgradeRow.UpgradeID,
    CurrencyType: "gold",
    UpgradeCost: dataTableUpgradeCostByFromLevel[index % dataTableUpgradeCostByFromLevel.length],
    "*": "",
    Desc: `${upgradeRow.Desc} 비용`,
  }));

  const towerCombatDefaultsByType = {
    basic: { aiType: "basic", targetPriority: "near", projectileType: "normal" },
    scatter: { aiType: "shotgun", targetPriority: "near", projectileType: "normal" },
    ranger: { aiType: "basic-non", targetPriority: "far", projectileType: "normal" },
    sniper: { aiType: "basic-non", targetPriority: "far", projectileType: "pierce" },
    breaker: { aiType: "basic", targetPriority: "strong", projectileType: "tank" },
    blast: { aiType: "basic-non", targetPriority: "cluster", projectileType: "explode" },
    support: { aiType: "heal", targetPriority: "near", projectileType: "heal" },
  };

  function getTowerCombatDefaults(towerType) {
    return towerCombatDefaultsByType[designPieceTypeToRuntime(towerType)] || towerCombatDefaultsByType.basic;
  }

  function applyTowerCombatDefaults(towerRow) {
    const defaults = getTowerCombatDefaults(towerRow.TowerType);
    return {
      ...towerRow,
      TowerAiType: towerRow.TowerAiType || defaults.aiType,
      TargetPriority: towerRow.TargetPriority || defaults.targetPriority,
      ProjectileType: towerRow.ProjectileType || defaults.projectileType,
    };
  }

  // TowerData 원본형 행 데이터
  // - TowerID: PieceData.ConnectTower가 참조하는 포탑 ID.
  // - TowerType: PieceType과 대응되는 포탑 역할값.
  // - TowerAiType: basic/basic-non/shotgun/heal 같은 발사 방식.
  // - TargetPriority: near/far/strong/weak/friendly/cluster 같은 타겟 우선순위.
  // - ProjectileType: normal/explode/pierce/tank/heal 같은 명중 효과.
  // - TowerAtk / TowerAtkSpeed / TowerMaxLange / TowerMaxAmmo: 전투 핵심 성능 수치.
  // - TowerProjectile: ProjectileData.ProjectileID 참조값.
  // - ProjectileCount / ProjectileSize / PiercingCount / SplashRadius: 발사체 성질.
  // - current_hp: CurrentHp 입력값. 탱커 대항형 같은 체력비례 피해 투사체의 퍼센트 계수.
  // - TowerLv: PieceLv와 맞춰 보는 표시용 레벨.
  // - Desc: 편집자 메모.
  const breakerPercentHpDamageByLevel = [3, 6, 9, 12, 15];
  const dataTableTowerFamilies = [
    { start: 7001, name: "세린", towerType: 1, projectileId: 6001, skillId: 0, splash: [0, 0, 0, 0, 0], stats: [
      [12, 0.68, 10, 11, 1, 0.25, 0],
      [15, 0.63, 10, 11, 1, 0.25, 0],
      [19, 0.55, 10, 11, 1, 0.25, 0],
      [25, 0.46, 10, 11, 1, 0.25, 0],
      [34, 0.38, 10, 11, 1, 0.25, 0],
    ] },
    { start: 7006, name: "도이", towerType: 2, projectileId: 6001, skillId: 0, splash: [0, 0, 0, 0, 0], stats: [
      [4, 0.56, 8, 9, 5, 0.15, 0],
      [5, 0.56, 8, 9, 5, 0.15, 0],
      [7, 0.56, 8, 9, 6, 0.15, 0],
      [10, 0.56, 8, 9, 6, 0.15, 0],
      [14, 0.56, 8, 9, 8, 0.15, 0],
    ] },
    { start: 7011, name: "유진", towerType: 3, projectileId: 6002, skillId: 0, splash: [0, 0, 0, 0, 0], stats: [
      [26, 0.95, 20, 9, 1, 0.25, 3],
      [36, 0.95, 20, 9, 1, 0.3, 4],
      [58, 0.95, 20, 9, 1, 0.3, 5],
      [80, 0.95, 20, 9, 1, 0.35, 6],
      [110, 0.95, 20, 9, 1, 0.4, 7],
    ] },
    { start: 7016, name: "가비", towerType: 4, projectileId: 6003, skillId: 0, splash: [0, 0, 0, 0, 0], stats: [
      [9, 0.46, 10, 11, 1, 0.25, 0],
      [12, 0.38, 10, 11, 1, 0.25, 0],
      [16, 0.28, 10, 11, 1, 0.25, 0],
      [21, 0.2, 10, 11, 1, 0.25, 0],
      [27, 0.12, 10, 11, 1, 0.25, 0],
    ] },
    { start: 7021, name: "유은", towerType: 5, projectileId: 6004, skillId: 0, splash: [60, 70, 80, 100, 120], stats: [
      [24, 2.6, 10, 6, 1, 0.3, 0],
      [36, 2.6, 10, 6, 1, 0.34, 0],
      [66, 2.6, 10, 6, 1, 0.38, 0],
      [128, 2.6, 10, 6, 1, 0.44, 0],
      [250, 2.6, 10, 6, 1, 0.5, 0],
    ] },
    { start: 7026, name: "리리", towerType: 6, projectileId: 6005, skillId: 1, splash: [0, 0, 0, 0, 0], stats: [
      [6, 0.7, 10, 10, 1, 0.25, 0],
      [8, 0.65, 10, 10, 1, 0.25, 0],
      [12, 0.55, 10, 10, 1, 0.25, 0],
      [17, 0.46, 10, 10, 1, 0.25, 0],
      [23, 0.38, 10, 10, 1, 0.25, 0],
    ] },
  ];
  const towerLevelRows = dataTableTowerFamilies.flatMap((family) =>
    family.stats.map(([atk, atkSpeed, range, ammo, projectileCount, projectileSize, piercingCount], index) => ({
      TowerID: family.start + index,
      TowerName: family.name,
      TowerType: family.towerType,
      TowerAtk: atk,
      TowerAtkSpeed: atkSpeed,
      TowerMaxLange: range,
      TowerMaxAmmo: ammo,
      SkillID: family.skillId,
      TowerProjectile: family.projectileId,
      ProjectileCount: projectileCount,
      ProjectileSize: projectileSize,
      PiercingCount: piercingCount,
      SplashRadius: family.splash[index] || 0,
      current_hp: family.towerType === 4 ? breakerPercentHpDamageByLevel[index] : 0,
      "*": "",
      Desc: `${family.name} Lv${index + 1}`,
      TowerLv: index + 1,
    })),
  ).map(applyTowerCombatDefaults);

  const generatedPieceRuntimeKeyMap = {
    8001: "basic_1", 8002: "basic_2", 8003: "basic_3", 8004: "basic_4", 8005: "basic_5",
    8006: "scatter_1", 8007: "scatter_2", 8008: "scatter_3", 8009: "scatter_4", 8010: "scatter_5",
    8011: "sniper_1", 8012: "sniper_2", 8013: "sniper_3", 8014: "sniper_4", 8015: "sniper_5",
    8016: "breaker_1", 8017: "breaker_2", 8018: "breaker_3", 8019: "breaker_4", 8020: "breaker_5",
    8021: "blast_1", 8022: "blast_2", 8023: "blast_3", 8024: "blast_4", 8025: "blast_5",
    8026: "support_1", 8027: "support_2", 8028: "support_3", 8029: "support_4", 8030: "support_5",
  };

  const generatedTowerRuntimeKeyMap = {
    7001: "tower_basic_1", 7002: "tower_basic_2", 7003: "tower_basic_3", 7004: "tower_basic_4", 7005: "tower_basic_5",
    7006: "tower_scatter_1", 7007: "tower_scatter_2", 7008: "tower_scatter_3", 7009: "tower_scatter_4", 7010: "tower_scatter_5",
    7011: "tower_sniper_1", 7012: "tower_sniper_2", 7013: "tower_sniper_3", 7014: "tower_sniper_4", 7015: "tower_sniper_5",
    7016: "tower_breaker_1", 7017: "tower_breaker_2", 7018: "tower_breaker_3", 7019: "tower_breaker_4", 7020: "tower_breaker_5",
    7021: "tower_blast_1", 7022: "tower_blast_2", 7023: "tower_blast_3", 7024: "tower_blast_4", 7025: "tower_blast_5",
    7026: "tower_support_1", 7027: "tower_support_2", 7028: "tower_support_3", 7029: "tower_support_4", 7030: "tower_support_5",
  };

  const designTableSchema = {
    source: "종합 데이터 테이블_김시온_v0.1",
    conventions: {
      tableCase: "PascalCase",
      idRule: "ID 컬럼은 정수 행 참조, Key 컬럼은 문자열/리소스/로컬라이즈 참조",
      ignoredColumns: ["*", "Desc", "Description", "몬스터 총합"],
    },
    tables: {
      StageData: {
        pk: "StageID",
        runtimeTable: "stages",
        columns: ["StageID", "StageName", "WaveDataID", "MonsterGroupID_Normal", "MonsterGroupID_Speedy", "MonsterGroupID_Tanker", "BossID", "WaveReward", "StageReward", "BGID", "WaveDuration", "*", "Desc"],
      },
      WaveData: {
        pk: "WaveID",
        runtimeTable: "waves",
        columns: ["WaveID", "WavePattern_1", "WavePattern_2", "WavePattern_3", "WavePattern_4", "WavePattern_5", "WavePattern_6", "WavePattern_7", "WavePattern_8", "WavePattern_9", "*", "Desc"],
      },
      WavePatternData: {
        pk: "WavePatternID",
        runtimeTable: "wavePatterns",
        columns: ["WavePatternID", "WaveType", "Normal_Count", "Speedy_Count", "Tanker_Count", "*", "몬스터 총합", "Desc"],
      },
      MonsterGroupData: {
        pk: "MonsterGroupID",
        runtimeTable: "monsterGroups",
        columns: ["MonsterGroupID", "MonsterID_1", "MonsterID_2", "MonsterID_3", "NormalRate_1", "NormalRate_2", "NormalRate_3", "*", "Desc"],
      },
      MonsterData: {
        pk: "MonsterID",
        runtimeTable: "monsters",
        columns: ["MonsterID", "MonsterName", "MonsterType", "ExpTypeID", "MonsterHp", "MonsterAtk", "MonsterAtkSpeed", "MonsterAtkRange", "MonsterMoveSpeed", "MonsterSprite", "*", "Desc"],
      },
      BossData: {
        pk: "BossID",
        runtimeTable: "bosses",
        columns: ["BossID", "BossName", "MonsterID", "SummonMonsterGroupID", "SummonInterval", "SummonCount", "SpawnXRatio", "SpawnYRatio", "*", "Desc"],
      },
      PieceData: {
        pk: "PieceID",
        runtimeTable: "pieces",
        columns: ["PieceID", "PieceName", "PieceType", "PieceDesc", "PieceGrade", "PieceLv", "ConnectTower", "Portrait", "PieceSprite", "*", "Desc"],
      },
      PieceUpgradeData: {
        pk: "UpgradeID",
        runtimeTable: "pieces.*.upgrade",
        columns: ["UpgradeID", "PieceGroupID", "FromPieceID", "ToPieceID", "*", "Desc"],
      },
      UpgradeCostData: {
        pk: "UpgradeCostID",
        runtimeTable: "pieces.*.upgradeCost",
        columns: ["UpgradeCostID", "UpgradeID", "CurrencyType", "UpgradeCost", "*", "Desc"],
      },
      TowerData: {
        pk: "TowerID",
        runtimeTable: "towers",
        columns: ["TowerID", "TowerName", "TowerType", "TowerAiType", "TargetPriority", "ProjectileType", "TowerAtk", "TowerAtkSpeed", "TowerMaxLange", "TowerMaxAmmo", "SkillID", "TowerProjectile", "ProjectileCount", "ProjectileSize", "PiercingCount", "SplashRadius", "current_hp", "*", "Desc", "TowerLv"],
      },
      ProjectileData: {
        pk: "ProjectileID",
        runtimeTable: "projectiles",
        columns: ["ProjectileID", "ProjectileType", "ProjectileName", "ProjectilePrefab", "PopEffectPrefab", "SubPopEffectPrefab", "*", "Desc"],
      },
      RarityData: {
        pk: "PerkRarityID",
        runtimeTable: "perks.rarities",
        columns: ["PerkRarityID", "PerkRarityName", "Weight", "Color", "*", "Desc"],
      },
      TriggerData: {
        pk: "TriggerID",
        runtimeTable: "perks.upgrades[].actions",
        columns: ["TriggerID", "TriggerType", "TriggerValue", "RequiredTag", "*", "Desc"],
      },
      EffectData: {
        pk: "EffectID",
        runtimeTable: "effectData/perks.upgrades[].actions",
        columns: ["EffectID", "BuffTowerType", "ATK", "ATKSpeed", "ShotProjCount", "MaxProj", "ProjSize", "ProjPiercing", "current_hp", "BuffType", "BuffValue", "IsOneOff", "Duration", "*", "Desc"],
      },
      PerkData: {
        pk: "PerkID",
        runtimeTable: "perks.upgrades",
        columns: ["PerkID", "EffectID", "PerkName", "PerkDesc", "IconResourceID", "TriggerID", "MaxLevel", "PerkRarityType", "PerkTarget", "PerkTargetText", "IsActive", "*", "Desc"],
      },
      PerkActionData: {
        pk: "ActionID",
        runtimeTable: "perks.upgrades[].actions",
        columns: ["ActionID", "PerkID", "ActionType", "ActionKey", "Amount", "Duration", "PieceType", "EnemyType", "EnemyTypesJson", "ProjectileID", "*", "Desc"],
      },
      PerkLimitData: {
        pk: "LimitID",
        runtimeTable: "perks.upgrades[].limit",
        columns: ["LimitID", "PerkID", "ModKey", "ConfigKey", "SpecialProjectileID", "Min", "Max", "*", "Desc"],
      },
      LevelData: {
        pk: "LevelID",
        runtimeTable: "levelData",
        columns: ["LevelID", "GoalLevel", "RequiredXP", "IsMaxLevel", "*", "Description", "PerkEventType"],
      },
      ExpData: {
        pk: "ExpTypeID",
        runtimeTable: "monsters.*.xp",
        columns: ["ExpTypeID", "ExpAmount", "BlockSpriteKey", "*", "Description"],
      },
      Resource: {
        pk: "ResourceID",
        runtimeTable: "shop/progression/defaultPlayerSave.currency",
        columns: ["ResourceID", "Root", "ResourceKey", "Desc"],
      },
      LocalizeData: {
        pk: "Key",
        runtimeTable: "localizeData",
        columns: ["Key", "Id", "Shared Comments", "English(en)", "English(en) Comments", "Korean(ko)", "Korean(ko) Comments"],
      },
    },
  };

  const designRuntimeKeyMap = {
    StageData: { 1001: "stage-1", 1002: "stage-2", 1901: "stage-test-dummy" },
    WaveData: { 2001: "stage-1", 2002: "stage-2", 2901: "stage-test-dummy" },
    WavePatternData: {
      3001: 1,
      3002: 2,
      3003: 3,
      3004: 4,
      3005: 5,
      3006: 6,
      3007: 7,
      3008: 8,
      3009: 9,
      3901: 101,
      3902: 102,
      3903: 103,
      3904: 104,
      3905: 105,
      3906: 106,
      3907: 107,
      3908: 108,
      3909: 109,
    },
    MonsterData: { 4111: "basic", 4121: "speed", 4131: "tank", 4141: "ranged", 4191: "finalBoss", 4991: "dummy" },
    BossData: { 9001: "final_boss_1" },
    PieceData: generatedPieceRuntimeKeyMap,
    TowerData: generatedTowerRuntimeKeyMap,
    ProjectileData: { 6001: "proj_basic_homing", 6002: "proj_sniper_pierce", 6003: "proj_tank_breaker", 6004: "proj_blast_explode", 6005: "proj_support_heal" },
  };

  const designTables = {
    schemaVersion: "2026-06-19-data-table-balance",

    // ============================================================
    // StageData - 스테이지 선택, 보상, 배경, 웨이브 묶음 연결
    // ============================================================
    StageData: [
      { StageID: 1001, StageName: "StageName_1", WaveDataID: 2001, MonsterGroupID_Normal: 11011, MonsterGroupID_Speedy: 11012, MonsterGroupID_Tanker: 11013, BossID: 9001, WaveReward: 5, StageReward: 1220, BGID: "assets/images/ui/Main/Image_Stage_1 5.png", WaveDuration: 32, Desc: "1 스테이지 관계자의 출입금지" },
      { StageID: 1002, StageName: "StageName_2", WaveDataID: 2002, MonsterGroupID_Normal: 11021, MonsterGroupID_Speedy: 11022, MonsterGroupID_Tanker: 11023, BossID: 9001, WaveReward: 5, StageReward: 1600, BGID: "assets/images/ui/Main/Image_Stage_1 5.png", Desc: "2 스테이지 임시 데이터" },
      { StageID: 1901, StageName: "StageName_TestDummy", WaveDataID: 2901, MonsterGroupID_Normal: 11901, MonsterGroupID_Speedy: 11901, MonsterGroupID_Tanker: 11901, BossID: 0, WaveReward: 0, StageReward: 0, BGID: "assets/images/ui/Main/Image_Stage_1 5.png", Desc: "허수아비 타격 테스트 스테이지" },
    ],

    // ============================================================
    // WaveData - 스테이지가 사용할 1~9웨이브 패턴 묶음. 10웨이브는 StageData.BossID로 보스 고정.
    // ============================================================
    WaveData: [
      { WaveID: 2001, WavePattern_1: 3001, WavePattern_2: 3002, WavePattern_3: 3003, WavePattern_4: 3004, WavePattern_5: 3005, WavePattern_6: 3006, WavePattern_7: 3007, WavePattern_8: 3008, WavePattern_9: 3009, Desc: "1스테이지 1~9웨이브 패턴" },
      { WaveID: 2002, WavePattern_1: 3001, WavePattern_2: 3002, WavePattern_3: 3003, WavePattern_4: 3004, WavePattern_5: 3005, WavePattern_6: 3006, WavePattern_7: 3007, WavePattern_8: 3008, WavePattern_9: 3009, Desc: "2스테이지 임시 재사용 패턴" },
      { WaveID: 2901, WavePattern_1: 3901, WavePattern_2: 3902, WavePattern_3: 3903, WavePattern_4: 3904, WavePattern_5: 3905, WavePattern_6: 3906, WavePattern_7: 3907, WavePattern_8: 3908, WavePattern_9: 3909, Desc: "허수아비 테스트 패턴" },
    ],

    // ============================================================
    // WavePatternData - 웨이브 타입과 몬스터 타입별 등장 수량
    // ============================================================
    WavePatternData: [
      { WavePatternID: 3001, WaveType: "Normal", Normal_Count: 38, Speedy_Count: 6, Tanker_Count: 0, "몬스터 총합": 44, Desc: "입문 물량" },
      { WavePatternID: 3002, WaveType: "Normal", Normal_Count: 44, Speedy_Count: 16, Tanker_Count: 0, "몬스터 총합": 60, Desc: "속도형 적응" },
      { WavePatternID: 3003, WaveType: "Normal", Normal_Count: 54, Speedy_Count: 14, Tanker_Count: 8, "몬스터 총합": 76, Desc: "탱커 첫 압박" },
      { WavePatternID: 3004, WaveType: "Rush", Normal_Count: 72, Speedy_Count: 28, Tanker_Count: 8, "몬스터 총합": 108, Desc: "러시" },
      { WavePatternID: 3005, WaveType: "Normal", Normal_Count: 70, Speedy_Count: 24, Tanker_Count: 12, "몬스터 총합": 106, Desc: "혼합 압박" },
      { WavePatternID: 3006, WaveType: "Normal", Normal_Count: 78, Speedy_Count: 30, Tanker_Count: 16, "몬스터 총합": 124, Desc: "엘리트 진입" },
      { WavePatternID: 3007, WaveType: "Normal", Normal_Count: 84, Speedy_Count: 36, Tanker_Count: 20, "몬스터 총합": 140, Desc: "속도 압박" },
      { WavePatternID: 3008, WaveType: "Rush", Normal_Count: 98, Speedy_Count: 44, Tanker_Count: 24, "몬스터 총합": 166, Desc: "대형 러시" },
      { WavePatternID: 3009, WaveType: "Normal", Normal_Count: 100, Speedy_Count: 48, Tanker_Count: 30, "몬스터 총합": 178, Desc: "최종 전 압박" },
      { WavePatternID: 3901, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 1" },
      { WavePatternID: 3902, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 2" },
      { WavePatternID: 3903, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 3" },
      { WavePatternID: 3904, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 4" },
      { WavePatternID: 3905, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 5" },
      { WavePatternID: 3906, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 6" },
      { WavePatternID: 3907, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 7" },
      { WavePatternID: 3908, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 8" },
      { WavePatternID: 3909, WaveType: "Test", Normal_Count: 18, Speedy_Count: 0, Tanker_Count: 0, "몬스터 총합": 18, Desc: "허수아비 테스트 9" },
    ],

    // ============================================================
    // MonsterGroupData - 웨이브가 뽑아 쓸 몬스터 후보군
    // ============================================================
    MonsterGroupData: [
      { MonsterGroupID: 11011, MonsterID_1: 4111, MonsterID_2: 0, MonsterID_3: 0, NormalRate_1: 1, NormalRate_2: 0, NormalRate_3: 0, Desc: "1스테이지 일반 후보군" },
      { MonsterGroupID: 11012, MonsterID_1: 4121, MonsterID_2: 0, MonsterID_3: 0, NormalRate_1: 0, NormalRate_2: 0, NormalRate_3: 0, Desc: "1스테이지 속도 후보군" },
      { MonsterGroupID: 11013, MonsterID_1: 4131, MonsterID_2: 0, MonsterID_3: 0, NormalRate_1: 0, NormalRate_2: 0, NormalRate_3: 0, Desc: "1스테이지 탱커 후보군" },
      { MonsterGroupID: 11021, MonsterID_1: 4111, MonsterID_2: 0, MonsterID_3: 0, NormalRate_1: 1, NormalRate_2: 0, NormalRate_3: 0, Desc: "2스테이지 일반 후보군" },
      { MonsterGroupID: 11022, MonsterID_1: 4121, MonsterID_2: 0, MonsterID_3: 0, NormalRate_1: 0, NormalRate_2: 0, NormalRate_3: 0, Desc: "2스테이지 속도 후보군" },
      { MonsterGroupID: 11023, MonsterID_1: 4131, MonsterID_2: 0, MonsterID_3: 0, NormalRate_1: 0, NormalRate_2: 0, NormalRate_3: 0, Desc: "2스테이지 탱커 후보군" },
      { MonsterGroupID: 11901, MonsterID_1: 4991, MonsterID_2: 0, MonsterID_3: 0, NormalRate_1: 0, NormalRate_2: 0, NormalRate_3: 0, Desc: "허수아비 후보군" },
      { MonsterGroupID: 19001, MonsterID_1: 4121, MonsterID_2: 4111, MonsterID_3: 0, NormalRate_1: 0, NormalRate_2: 0, NormalRate_3: 0, Desc: "보스 소환 후보군" },
    ],

    // ============================================================
    // MonsterData - 일반/속도/탱커/원거리/보스/허수아비 스탯
    // ============================================================
    MonsterData: [
      { MonsterID: 4111, MonsterName: "Monster_Normal_01", MonsterType: 1, ExpTypeID: 81, MonsterHp: 150, MonsterAtk: 1, MonsterAtkSpeed: 1.35, MonsterAtkRange: 0, MonsterMoveSpeed: 34, MonsterSprite: "assets/images/monsters/기본형.png", Desc: "기본형 · 전시 체력 상향" },
      { MonsterID: 4121, MonsterName: "Monster_Speed_01", MonsterType: 2, ExpTypeID: 82, MonsterHp: 135, MonsterAtk: 1, MonsterAtkSpeed: 1.1, MonsterAtkRange: 0, MonsterMoveSpeed: 61, MonsterSprite: "assets/images/monsters/속도형.png", Desc: "속도형 · 전시 체력 상향" },
      { MonsterID: 4131, MonsterName: "Monster_Tank_01", MonsterType: 3, ExpTypeID: 82, MonsterHp: 720, MonsterAtk: 1, MonsterAtkSpeed: 1.55, MonsterAtkRange: 0, MonsterMoveSpeed: 19, MonsterSprite: "assets/images/monsters/탱커형.png", Desc: "탱커형 · 전시 체력 상향" },
      { MonsterID: 4141, MonsterName: "Monster_Ranged_01", MonsterType: 4, ExpTypeID: 82, MonsterHp: 90, MonsterAtk: 1, MonsterAtkSpeed: 1.95, MonsterAtkRange: 126, MonsterMoveSpeed: 27, MonsterSprite: "monster_ranged_1", Desc: "원거리형 · 비활성 예비값" },
      { MonsterID: 4191, MonsterName: "Monster_FinalBoss_01", MonsterType: 9, ExpTypeID: 83, MonsterHp: 6500, MonsterAtk: 10, MonsterAtkSpeed: 1.05, MonsterAtkRange: 172, MonsterMoveSpeed: 21, MonsterSprite: "monster_final_boss_1", Desc: "최종보스 · 전시 체력 상향" },
      { MonsterID: 4991, MonsterName: "Monster_TestDummy_01", MonsterType: 99, ExpTypeID: 84, MonsterHp: 1200, MonsterAtk: 0, MonsterAtkSpeed: 0, MonsterAtkRange: 0, MonsterMoveSpeed: 0, MonsterSprite: "monster_test_dummy_1", Desc: "허수아비 · 고체력 측정용" },
    ],

    // ============================================================
    // BossData - 10웨이브 보스와 소환 몬스터 그룹
    // ============================================================
    BossData: [
      { BossID: 9001, BossName: "BossName_FinalBoss_01", MonsterID: 4191, SummonMonsterGroupID: 19001, SummonInterval: 9, SummonCount: 8, SpawnXRatio: 0.5, SpawnYRatio: 0.11, Desc: "최종보스" },
    ],

    // ============================================================
    // PieceData - 로비/소팅에 등장하는 기물과 연결 타워
    // 핵심 컬럼:
    // PieceID = 기물 ID, PieceLv = 표시 레벨, ConnectTower = 생성할 TowerID
    // ============================================================
    PieceData: pieceLevelRows,

    // ============================================================
    // PieceUpgradeData - 기물 강화 시 보유 PieceID를 다음 PieceID로 교체
    // 핵심 컬럼:
    // FromPieceID -> ToPieceID = 강화 연결, PieceGroupID = 같은 계열 묶음
    // ============================================================
    PieceUpgradeData: pieceUpgradeRows,

    // ============================================================
    // UpgradeCostData - 강화 비용. PieceUpgradeData.UpgradeID와 1:1로 연결
    // 핵심 컬럼:
    // UpgradeID = 강화 규칙 참조, CurrencyType/UpgradeCost = 차감 재화와 비용
    // ============================================================
    UpgradeCostData: pieceUpgradeCostRows,

    // ============================================================
    // TowerData - 소팅 완료 시 생성되는 포탑 스탯과 전투 행동
    // 핵심 컬럼:
    // TowerID = 포탑 ID, TowerAiType = 발사 방식, TargetPriority = 타겟 규칙,
    // ProjectileType = 명중 효과, TowerProjectile = 발사체 ID,
    // TowerAtk/TowerAtkSpeed/TowerMaxLange/TowerMaxAmmo = 전투 수치
    // ============================================================
    TowerData: towerLevelRows,

    // ============================================================
    // ProjectileData - 포탑 발사체 타입과 프리팹 키
    // ============================================================
    ProjectileData: [
      { ProjectileID: 6001, ProjectileType: "Basic", ProjectileName: "노말", ProjectilePrefab: "01", PopEffectPrefab: "Hit_1_blue", SubPopEffectPrefab: "0", "*": "", Desc: "세린/도이 공용 01 투사체" },
      { ProjectileID: 6002, ProjectileType: "Snipe", ProjectileName: "저격", ProjectilePrefab: "13", PopEffectPrefab: "Hit_3_purple", SubPopEffectPrefab: "Hit_1_purple", "*": "", Desc: "유진 13 투사체" },
      { ProjectileID: 6003, ProjectileType: "Tank", ProjectileName: "탱커", ProjectilePrefab: "02", PopEffectPrefab: "splash", SubPopEffectPrefab: "0", "*": "", Desc: "가비 02 투사체" },
      { ProjectileID: 6004, ProjectileType: "Explode", ProjectileName: "폭발", ProjectilePrefab: "14", PopEffectPrefab: "explosion_4", SubPopEffectPrefab: "0", "*": "", Desc: "유은 14 투사체" },
      { ProjectileID: 6005, ProjectileType: "Heal", ProjectileName: "힐링", ProjectilePrefab: "08", PopEffectPrefab: "Hit_1_green", SubPopEffectPrefab: "Level_Up_green", "*": "", Desc: "리리 08 투사체" },
    ],

    // ============================================================
    // RarityData - 특전 등급, 등장 가중치, 등급 색상
    // ============================================================
    RarityData: [
      { PerkRarityID: 91, PerkRarityName: "Perk_Normal", Weight: 50, Color: "#B8C0CC" },
      { PerkRarityID: 92, PerkRarityName: "Perk_Rare", Weight: 30, Color: "#4AA3FF" },
      { PerkRarityID: 93, PerkRarityName: "Perk_Unique", Weight: 20, Color: "#B56CFF" },
      { PerkRarityID: 94, PerkRarityName: "Perk_Legend", Weight: 0, Color: "#FFB84A" },
    ],

    // ============================================================
    // TriggerData - 특전 발동 조건 정의
    // ============================================================
    TriggerData: [
      { TriggerID: 0, TriggerType: "None", TriggerValue: 0, RequiredTag: "None", Desc: "즉시 적용" },
      { TriggerID: 5001, TriggerType: "OnComboReached", TriggerValue: 10, RequiredTag: "None", Desc: "10콤보 달성 시" },
      { TriggerID: 5002, TriggerType: "OnSlotSorted", TriggerValue: 0, RequiredTag: "Heal", Desc: "회복 태그 기물 소팅 시" },
    ],

    // ============================================================
    // EffectData - 공식 효과 수치 원본. 실제 액션은 PerkActionData가 담당.
    // ============================================================
    EffectData: [
      ...perkEffectRows,
    ],

    // ============================================================
    // PerkData - 특전 카드 정보, 등급, 조건, Effect 연결
    // ============================================================
    PerkData: [
      ...perkDataRows,
    ],

    // ============================================================
    // PerkActionData - 특전이 적용하는 실제 액션. PerkData는 카드, ActionData는 효과를 담당.
    // ============================================================
    PerkActionData: [
      ...perkActionRows,
    ],

    // ============================================================
    // PerkLimitData - 특전별 선택 횟수/상한 조건
    // ============================================================
    PerkLimitData: [
    ],

    // ============================================================
    // LevelData - 레벨별 누적 경험치와 특전 이벤트
    // ============================================================
    LevelData: [
      { LevelID: 101, GoalLevel: 1, RequiredXP: 0, IsMaxLevel: 0, Description: "시작 레벨", PerkEventType: "Normal" },
      { LevelID: 102, GoalLevel: 2, RequiredXP: 45, IsMaxLevel: 0, Description: "특전 1회", PerkEventType: "Normal" },
      { LevelID: 103, GoalLevel: 3, RequiredXP: 100, IsMaxLevel: 0, Description: "특전 1회", PerkEventType: "Normal" },
      { LevelID: 104, GoalLevel: 4, RequiredXP: 165, IsMaxLevel: 0, Description: "특전 1회", PerkEventType: "Normal" },
      { LevelID: 105, GoalLevel: 5, RequiredXP: 250, IsMaxLevel: 0, Description: "특전 1회", PerkEventType: "Normal" },
      { LevelID: 120, GoalLevel: 20, RequiredXP: 5000, IsMaxLevel: 1, Description: "임시 최대 레벨", PerkEventType: "Normal" },
    ],

    // ============================================================
    // ExpData - MonsterData.ExpTypeID별 경험치 드랍
    // ============================================================
    ExpData: [
      { ExpTypeID: 81, ExpAmount: 1, BlockSpriteKey: "exp_green", Description: "일반몹 경험치" },
      { ExpTypeID: 82, ExpAmount: 1, BlockSpriteKey: "exp_blue", Description: "엘리트/특수몹 경험치" },
      { ExpTypeID: 83, ExpAmount: 1, BlockSpriteKey: "exp_purple", Description: "보스 경험치" },
      { ExpTypeID: 84, ExpAmount: 1, BlockSpriteKey: "exp_green", Description: "허수아비 경험치" },
    ],

    // ============================================================
    // Resource - 재화/리소스 키 연결
    // ============================================================
    Resource: [
      { ResourceID: 11001, Root: "currency.gold", ResourceKey: "gold", Desc: "코인" },
      { ResourceID: 11002, Root: "currency.ticket", ResourceKey: "ticket", Desc: "탄피/티켓" },
    ],

    // ============================================================
    // LocalizeData - 화면 표시 이름/설명 현지화
    // ============================================================
    LocalizeData: [
      { Key: "StageName_1", Id: 100001, "Shared Comments": "", "English(en)": "Stage 1", "English(en) Comments": "", "Korean(ko)": "1 스테이지", "Korean(ko) Comments": "" },
      { Key: "StageName_2", Id: 100002, "Shared Comments": "", "English(en)": "Stage 2", "English(en) Comments": "", "Korean(ko)": "2 스테이지", "Korean(ko) Comments": "" },
      { Key: "StageName_TestDummy", Id: 100003, "Shared Comments": "", "English(en)": "Target Dummy Stage", "English(en) Comments": "", "Korean(ko)": "허수아비 스테이지", "Korean(ko) Comments": "" },
      { Key: "PieceName_basic_1", Id: 101001, "Shared Comments": "", "English(en)": "Serin", "English(en) Comments": "", "Korean(ko)": "세린", "Korean(ko) Comments": "" },
      { Key: "PieceName_scatter_1", Id: 101002, "Shared Comments": "", "English(en)": "Doi", "English(en) Comments": "", "Korean(ko)": "도이", "Korean(ko) Comments": "" },
      { Key: "PieceName_sniper_1", Id: 101003, "Shared Comments": "", "English(en)": "Yujin", "English(en) Comments": "", "Korean(ko)": "유진", "Korean(ko) Comments": "" },
      { Key: "PieceName_breaker_1", Id: 101004, "Shared Comments": "", "English(en)": "Gabi", "English(en) Comments": "", "Korean(ko)": "가비", "Korean(ko) Comments": "" },
      { Key: "PieceName_blast_1", Id: 101005, "Shared Comments": "", "English(en)": "Yueun", "English(en) Comments": "", "Korean(ko)": "유은", "Korean(ko) Comments": "" },
      { Key: "PieceName_support_1", Id: 101006, "Shared Comments": "", "English(en)": "Riri", "English(en) Comments": "", "Korean(ko)": "리리", "Korean(ko) Comments": "" },
      { Key: "PieceName_ranger_1", Id: 101007, "Shared Comments": "", "English(en)": "Inactive Ranger", "English(en) Comments": "", "Korean(ko)": "비활성 레인저", "Korean(ko) Comments": "" },
    ],
  };

  const generatedBalancePayload = window.GENERATED_GAME_DATA || null;
  const balanceModeRequested = true;
  const balanceDataDiagnostics = [];
  const balanceDataStatus = {
    requested: balanceModeRequested,
    active: false,
    valid: generatedBalancePayload?.valid === true,
    profile: generatedBalancePayload?.dataProfile || "",
    contractVersion: generatedBalancePayload?.contractVersion || "",
    generatedAt: generatedBalancePayload?.generatedAt || "",
    spreadsheetId: generatedBalancePayload?.spreadsheetId || "",
    importedTables: [...(generatedBalancePayload?.importedTables || [])],
    skippedTables: [],
    diagnostics: balanceDataDiagnostics,
  };

  const balanceRuntimeTableKeys = {
    StageData: ["StageID"],
    WaveData: ["WaveID"],
    WavePatternData: ["WavePatternID"],
    MonsterGroupData: ["MonsterGroupID"],
    MonsterData: ["MonsterID"],
    PieceData: ["PieceID"],
    TowerData: ["TowerID"],
    ProjectileData: ["ProjectileID"],
    RarityData: ["PerkRarityID"],
    EffectData: ["EffectID"],
    PerkData: ["PerkID"],
    PieceUpgradeData: ["UpgradeID"],
    PerkActionData: ["ActionID"],
    PerkLimitData: ["LimitID"],
    LevelData: ["LevelID"],
    ExpData: ["ExpTypeID"],
  };

  function getBalanceRowKey(row, keyColumns) {
    const values = (keyColumns || []).map((columnName) => row?.[columnName]);
    return values.length && values.every((value) => value !== "" && value !== null && value !== undefined)
      ? values.map(String).join("::")
      : "";
  }

  function mergeGeneratedBalanceRows(tableName, generatedRows) {
    const keyColumns = balanceRuntimeTableKeys[tableName];
    if (!keyColumns || !Array.isArray(generatedRows)) return;
    const embeddedRows = Array.isArray(designTables[tableName]) ? designTables[tableName] : [];
    const generatedByKey = new Map(
      generatedRows.map((row) => [getBalanceRowKey(row, keyColumns), row]).filter(([key]) => key)
    );
    const mergedRows = embeddedRows.map((row) => {
      const key = getBalanceRowKey(row, keyColumns);
      const override = generatedByKey.get(key);
      if (!override) return row;
      generatedByKey.delete(key);
      return { ...row, ...override };
    });
    generatedByKey.forEach((row) => mergedRows.push({ ...row }));
    designTables[tableName] = mergedRows;
  }

  if (
    balanceModeRequested
    && generatedBalancePayload?.valid === true
    && generatedBalancePayload?.dataProfile === "balance"
    && generatedBalancePayload?.runtimeEnabled === true
  ) {
    Object.entries(generatedBalancePayload.designTables || {}).forEach(([tableName, rows]) => {
      if (tableName === "schemaVersion") return;
      mergeGeneratedBalanceRows(tableName, rows);
    });
    designTables.schemaVersion = generatedBalancePayload.contractVersion || designTables.schemaVersion;
    balanceDataStatus.active = true;
  } else if (balanceModeRequested) {
    balanceDataDiagnostics.push({
      level: "error",
      code: "BALANCE_DATA_UNAVAILABLE",
      message: "생성 밸런스 데이터가 없거나 유효하지 않아 내장 데이터를 사용합니다.",
    });
  }

  function refreshPieceAndTowerRuntimeKeyMaps() {
    const towerMap = { ...(designRuntimeKeyMap.TowerData || {}) };
    (designTables.TowerData || []).forEach((row) => {
      const runtimeType = designPieceTypeToRuntime(row.TowerType);
      const level = Math.max(1, Math.floor(Number(row.TowerLv) || 1));
      if (runtimeType && row.TowerID !== "" && row.TowerID !== null && row.TowerID !== undefined) {
        towerMap[row.TowerID] = `tower_${runtimeType}_${level}`;
      }
    });
    designRuntimeKeyMap.TowerData = towerMap;

    const pieceMap = { ...(designRuntimeKeyMap.PieceData || {}) };
    (designTables.PieceData || []).forEach((row) => {
      const runtimeType = designPieceTypeToRuntime(row.PieceType);
      const level = Math.max(1, Math.floor(Number(row.PieceLv) || 1));
      if (runtimeType && row.PieceID !== "" && row.PieceID !== null && row.PieceID !== undefined) {
        pieceMap[row.PieceID] = `${runtimeType}_${level}`;
      }
    });
    designRuntimeKeyMap.PieceData = pieceMap;
  }
  refreshPieceAndTowerRuntimeKeyMaps();

  designTables.ResourceData = designTables.Resource;

  function fillDesignTableSchemaColumns() {
    Object.entries(designTableSchema.tables || {}).forEach(([tableName, tableSchema]) => {
      const rows = designTables[tableName];
      if (!Array.isArray(rows)) return;
      rows.forEach((row) => {
        (tableSchema.columns || []).forEach((column) => {
          if (!(column in row)) row[column] = "";
        });
      });
    });
  }
  fillDesignTableSchemaColumns();

  function indexDesignRows(tableName, primaryKey) {
    return new Map((designTables[tableName] || []).map((row) => [String(row[primaryKey]), row]));
  }

  function localizeDesignKey(key, fallback = "") {
    if (!key || key === "None") return fallback;
    const rawKey = String(key);
    const row = (designTables.LocalizeData || []).find((item) => item.Key === key);
    if (row) return row["Korean(ko)"] || row.Korean || row["English(en)"] || row.English || fallback || rawKey;
    const looksLikeLocalizeKey = /^[A-Za-z][A-Za-z0-9]*(Name|Desc|Text|Label|Title|Subtitle|Description)_/.test(rawKey);
    return looksLikeLocalizeKey ? fallback || rawKey : rawKey || fallback;
  }

  function splitDesignCount(total, bucketCount) {
    const count = Math.max(0, Math.floor(Number(total) || 0));
    const buckets = Array.from({ length: Math.max(1, bucketCount) }, () => 0);
    for (let index = 0; index < count; index += 1) buckets[index % buckets.length] += 1;
    return buckets;
  }

  function getDesignRuntimeKey(tableName, rowId, prefix, fallback = "") {
    if (rowId === undefined || rowId === null || rowId === "" || rowId === "None") return fallback;
    const mapped = designRuntimeKeyMap[tableName]?.[rowId] || designRuntimeKeyMap[tableName]?.[String(rowId)];
    return mapped || `${prefix}_${rowId}`;
  }

  function getDesignRuntimeMonsterKey(monsterId) {
    return getDesignRuntimeKey("MonsterData", monsterId, "monster");
  }

  function getDesignRuntimeBossKey(bossId) {
    if (!bossId || bossId === "None" || String(bossId) === "0") return "";
    return getDesignRuntimeKey("BossData", bossId, "boss");
  }

  function getDesignRuntimePieceKey(pieceId) {
    return getDesignRuntimeKey("PieceData", pieceId, "piece");
  }

  function getDesignRuntimeTowerKey(towerId) {
    return getDesignRuntimeKey("TowerData", towerId, "tower");
  }

  function getDesignRuntimeProjectileKey(projectileId) {
    return getDesignRuntimeKey("ProjectileData", projectileId, "proj");
  }

  function getDesignRuntimeMonsterGroupKey(groupId) {
    return getDesignRuntimeKey("MonsterGroupData", groupId, "mg_design");
  }

  function designMonsterTypeToRuntime(monsterType) {
    const text = String(monsterType || "").trim().toLowerCase();
    const map = {
      "1": "basic",
      normal: "basic",
      basic: "basic",
      "2": "speed",
      speedy: "speed",
      speed: "speed",
      "3": "tank",
      tanker: "tank",
      tank: "tank",
      "4": "ranged",
      range: "ranged",
      ranged: "ranged",
      "9": "boss",
      boss: "boss",
      finalboss: "boss",
      "99": "dummy",
      dummy: "dummy",
      test: "dummy",
    };
    return map[text] || "basic";
  }

  function distributeDesignMonsterTypes(total, groupId, options = {}) {
    const count = Math.max(0, Math.floor(Number(total) || 0));
    const group = indexDesignRows("MonsterGroupData", "MonsterGroupID").get(String(groupId));
    const monsterRowsById = indexDesignRows("MonsterData", "MonsterID");
    const groupHasNormalMonster = [group?.MonsterID_1, group?.MonsterID_2, group?.MonsterID_3].some((monsterId) => {
      const monsterRow = monsterRowsById.get(String(monsterId));
      return monsterRow && designMonsterTypeToRuntime(monsterRow.MonsterType) === "basic";
    });
    const useNormalRates = options.useNormalRates === true && groupHasNormalMonster;
    const legacyWeights = [6, 3, 1];
    const patternRates = Array.isArray(options.normalRates) ? options.normalRates : [];
    const hasPatternRates = patternRates.some((value) => value !== "" && value !== null && value !== undefined);
    const configuredRates = hasPatternRates
      ? patternRates
      : [group?.NormalRate_1, group?.NormalRate_2, group?.NormalRate_3];
    const allCandidates = legacyWeights.map((legacyWeight, index) => {
      const monsterId = group?.[`MonsterID_${index + 1}`];
      const rawRate = configuredRates[index];
      const configuredRate = Number(rawRate);
      const hasConfiguredRate = rawRate !== "" && rawRate !== null && rawRate !== undefined;
      return {
        monsterKey: Number(monsterId) ? getDesignRuntimeMonsterKey(monsterId) : "",
        weight: useNormalRates && hasConfiguredRate && Number.isFinite(configuredRate) && configuredRate >= 0
          ? configuredRate
          : legacyWeight,
        index,
      };
    });
    let candidates = allCandidates.filter((candidate) => candidate.monsterKey && candidate.weight > 0);
    if (useNormalRates && !candidates.length) {
      const fallbackCandidate = allCandidates.find((candidate) => candidate.monsterKey);
      if (fallbackCandidate) candidates = [{ ...fallbackCandidate, weight: 1 }];
    }
    if (!count || !candidates.length) return {};
    const weightTotal = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    const result = {};
    const allocations = candidates.map((candidate) => {
      const exact = (count * candidate.weight) / weightTotal;
      return { ...candidate, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let remaining = count - allocations.reduce((sum, allocation) => sum + allocation.value, 0);
    allocations
      .slice()
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
      .forEach((allocation) => {
        if (remaining <= 0) return;
        allocation.value += 1;
        remaining -= 1;
      });
    allocations.forEach(({ monsterKey, value }) => {
      if (value > 0) result[monsterKey] = (result[monsterKey] || 0) + value;
    });
    return result;
  }

  function mergeMonsterCounts(...countObjects) {
    return countObjects.reduce((merged, counts) => {
      Object.entries(counts || {}).forEach(([monsterKey, count]) => {
        merged[monsterKey] = (merged[monsterKey] || 0) + Math.max(0, Math.floor(Number(count) || 0));
      });
      return merged;
    }, {});
  }

  function getDesignRuntimeStageKey(stageId, fallbackIndex) {
    return getDesignRuntimeKey("StageData", stageId, "stage", `stage-${fallbackIndex + 1}`);
  }

  function getDesignRuntimeWaveId(stageKey, stageIndex, waveOrdinal) {
    if (stageKey === "stage-1") return waveOrdinal;
    if (stageKey === "stage-test-dummy") return 100 + waveOrdinal;
    return (stageIndex + 1) * 100 + waveOrdinal;
  }

  function getDesignPatternId(stageKey, stageId, waveOrdinal, waveType) {
    if (waveType === "boss") return null;
    if (stageKey === "stage-1") return `wp_w${waveOrdinal}`;
    if (stageKey === "stage-test-dummy") return `wp_test_dummy_w${waveOrdinal}`;
    return `wp_stage_${stageId}_w${waveOrdinal}`;
  }

  function designWaveTypeToRuntime(waveType) {
    const type = String(waveType || "Normal").toLowerCase();
    if (type === "3" || type === "boss") return "boss";
    if (type === "4" || type === "rush") return "rush";
    if (type === "test") return "test";
    return "normal";
  }

  function designPieceTypeToRuntime(pieceType) {
    const type = String(pieceType || "").toLowerCase();
    const map = {
      1: "basic",
      ar: "basic",
      basic: "basic",
      2: "scatter",
      scatter: "scatter",
      shotgun: "scatter",
      ranger: "ranger",
      3: "sniper",
      lange: "sniper",
      range: "sniper",
      ranged: "sniper",
      sniper: "sniper",
      4: "breaker",
      breaker: "breaker",
      tank: "breaker",
      tanker: "breaker",
      5: "blast",
      blast: "blast",
      area: "blast",
      wide: "blast",
      explode: "blast",
      6: "support",
      support: "support",
      buffer: "support",
      heal: "support",
    };
    return map[type] || type || "basic";
  }

  function designTargetPriorityToRuntime(targetPriority) {
    const type = String(targetPriority || "").toLowerCase().replace(/[\s_-]/g, "");
    const map = {
      nearest: "near",
      near: "near",
      farthest: "far",
      far: "far",
      highesthp: "strong",
      highhp: "strong",
      strong: "strong",
      lowesthp: "weak",
      lowhp: "weak",
      weak: "weak",
      lowallyhp: "friendly",
      ally: "friendly",
      friendly: "friendly",
      support: "friendly",
      cluster: "cluster",
    };
    return map[type] || "near";
  }

  function designTowerAiTypeToRuntime(aiType, towerType = "") {
    const type = String(aiType || "").toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
    const map = {
      1: "basic",
      2: "basic-non",
      3: "shotgun",
      4: "heal",
      basic: "basic",
      "basic-non": "basic-non",
      basicnon: "basic-non",
      basicnonhoming: "basic-non",
      nonhoming: "basic-non",
      snipe: "basic-non",
      sniper: "basic-non",
      ranger: "basic-non",
      shotgun: "shotgun",
      scatter: "shotgun",
      heal: "heal",
      support: "heal",
    };
    if (map[type]) return map[type];
    return getTowerCombatDefaults(towerType).aiType;
  }

  function designProjectileTypeToRuntime(projectileType) {
    const type = String(projectileType || "").toLowerCase().replace(/[\s_-]/g, "");
    const map = {
      normal: "normal",
      basic: "normal",
      basicnonhoming: "normal",
      shotgun: "normal",
      scatter: "normal",
      pierce: "pierce",
      piercing: "pierce",
      snipe: "pierce",
      sniper: "pierce",
      tank: "tank",
      breaker: "tank",
      explode: "explode",
      blast: "explode",
      heal: "heal",
      support: "heal",
    };
    return map[type] || "normal";
  }

  function getProjectileFillDefaults(projectileType, aiType) {
    if (projectileType === "normal") {
      if (aiType === "shotgun") return { ...projectileFillDefaultsByType.shotgun };
      if (aiType === "basic-non") return { ...projectileFillDefaultsByType.basicNonHoming };
      return { ...projectileFillDefaultsByType.basic };
    }
    if (projectileType === "pierce") return { ...projectileFillDefaultsByType.snipe, homing: false };
    const effectDefaults = projectileFillDefaultsByType[projectileType] || projectileFillDefaultsByType.basic;
    const result = { ...effectDefaults };
    if (aiType === "basic-non") {
      result.homing = false;
      result.sequentialStored = false;
      result.burstInterval = 0;
    } else if (aiType === "shotgun") {
      result.homing = false;
      result.fanStep = projectileFillDefaultsByType.shotgun.fanStep;
      result.life = Math.min(result.life || 1, projectileFillDefaultsByType.shotgun.life);
    } else if (aiType === "basic" || aiType === "heal") {
      result.homing = result.homing !== false;
    }
    return result;
  }

  const projectileFillDefaultsByType = {
    basic: {
      homing: true,
      sequentialStored: false,
      overdriveInterval: 0.024,
      spreadJitter: 0,
      speedMult: 1,
      damageRatio: 1,
      radius: 5,
      life: 1.3,
      fanStep: 0.035,
      pierce: false,
      pierceHits: 0,
      splashRadius: 0,
      splashDamageRatio: 0,
      percentHpDamage: 0,
      knockback: 0,
    },
    shotgun: {
      homing: false,
      sequentialStored: false,
      overdriveInterval: 0.018,
      spreadJitter: 0,
      speedMult: 0.78,
      damageRatio: 1,
      radius: 4.5,
      life: 0.42,
      fanStep: 0.16,
      pierce: false,
      pierceHits: 0,
      splashRadius: 0,
      splashDamageRatio: 0,
      percentHpDamage: 0,
      knockback: 0,
    },
    basicNonHoming: {
      homing: false,
      sequentialStored: true,
      overdriveInterval: 0.024,
      spreadJitter: 0.018,
      speedMult: 1.22,
      damageRatio: 1,
      radius: 4.8,
      life: 1.65,
      burstInterval: 0.07,
      fanStep: 0.012,
      pierce: false,
      pierceHits: 0,
      splashRadius: 0,
      splashDamageRatio: 0,
      percentHpDamage: 0,
      knockback: 0,
    },
    snipe: {
      homing: false,
      sequentialStored: false,
      overdriveInterval: 0.045,
      spreadJitter: 0,
      speedMult: 1.6,
      damageRatio: 1,
      radius: 6.2,
      life: 1.9,
      fanStep: 0.035,
      pierce: true,
      pierceHits: 2,
      splashRadius: 0,
      splashDamageRatio: 0,
      percentHpDamage: 0,
      knockback: 0,
    },
    tank: {
      homing: true,
      sequentialStored: false,
      overdriveInterval: 0.024,
      spreadJitter: 0,
      speedMult: 1,
      damageRatio: 1,
      radius: 5.4,
      life: 1.35,
      fanStep: 0.035,
      pierce: false,
      pierceHits: 0,
      splashRadius: 0,
      splashDamageRatio: 0,
      percentHpDamage: 0.035,
      knockback: 0,
    },
    explode: {
      homing: true,
      sequentialStored: false,
      overdriveInterval: 0.024,
      spreadJitter: 0,
      speedMult: 0.82,
      damageRatio: 1,
      radius: 7,
      life: 1.35,
      fanStep: 0.035,
      pierce: false,
      pierceHits: 0,
      splashRadius: 52,
      splashDamageRatio: 0.72,
      percentHpDamage: 0,
      knockback: 0,
    },
    heal: {
      homing: true,
      sequentialStored: false,
      overdriveInterval: 0.024,
      spreadJitter: 0,
      speedMult: 1,
      damageRatio: 1,
      radius: 5,
      life: 1.3,
      fanStep: 0.035,
      pierce: false,
      pierceHits: 0,
      splashRadius: 0,
      splashDamageRatio: 0,
      percentHpDamage: 0,
      knockback: 0,
    },
  };

  const towerFillDefaultsByType = {
    basic: { projectileCountScale: 1, description: "가까운 적을 유도 연사로 처리합니다." },
    scatter: { projectileCountScale: 1, description: "근접한 적을 부채꼴 산탄으로 제압합니다." },
    ranger: { projectileCountScale: 1, description: "멀리 있는 적 방향으로 빠르게 난사합니다." },
    sniper: { projectileCountScale: 1, description: "먼 적을 관통 저격탄으로 타격합니다." },
    breaker: { projectileCountScale: 1, description: "최대 체력이 높은 적을 우선 공격합니다." },
    blast: { projectileCountScale: 1, description: "밀집된 적을 폭발 범위 피해로 처리합니다." },
    support: { projectileCountScale: 1, description: "체력이 낮은 슬롯을 회복하고 주변을 보조합니다." },
  };

  const DESIGN_TOWER_RANGE_UNIT_PX = 38;
  const DESIGN_PROJECTILE_SIZE_UNIT_PX = 20;

  function normalizeDesignTowerRange(value) {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return 360;
    return raw <= 30 ? raw * DESIGN_TOWER_RANGE_UNIT_PX : raw;
  }

  function normalizeDesignProjectileSize(value, fallback = 0) {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return fallback;
    return raw <= 2 ? raw * DESIGN_PROJECTILE_SIZE_UNIT_PX : raw;
  }

  function normalizeDesignPercentDamage(value, fallback = 0) {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return fallback;
    return raw > 1 ? raw / 100 : raw;
  }

  function resolveDesignPieceSprite(value) {
    const raw = String(value || "").trim().replace(/\\/g, "/");
    if (!raw) return "";
    if (/^(?:https?:|data:|blob:|\/|\.\.?\/)/i.test(raw) || raw.includes("/")) return raw;
    const filename = /\.png$/i.test(raw) ? raw : `${raw}.png`;
    return `assets/images/towers/${filename}`;
  }

  function resolveDesignProjectileAsset(value) {
    const raw = String(value || "").trim().replace(/\\/g, "/");
    if (!raw || raw === "0") return "";
    if (/^(?:https?:|data:|blob:|\/|\.\.?\/)/i.test(raw) || raw.includes("/")) return raw;
    const filename = /\.(?:png|webp|jpe?g|gif)$/i.test(raw) ? raw : `${raw}.png`;
    return `assets/images/Projectile/${filename}`;
  }

  function getDesignPieceFallbackText(name, fallback = "?") {
    return Array.from(String(name || fallback).trim())[0] || "?";
  }

  function getTowerRowsByProjectileId(projectileId) {
    return (designTables.TowerData || []).filter((towerRow) => String(towerRow.TowerProjectile) === String(projectileId));
  }

  function buildDesignPieceTowerRuntimeTables() {
    const towerById = indexDesignRows("TowerData", "TowerID");
    const projectileById = indexDesignRows("ProjectileData", "ProjectileID");
    const runtime = {
      projectiles: {},
      towers: {},
      pieces: {},
      pieceDefinitions: [],
    };
    const baseBulletDamage = 24;

    (designTables.ProjectileData || []).forEach((projectileRow) => {
      const projectileKey = getDesignRuntimeProjectileKey(projectileRow.ProjectileID);
      if (!projectileKey) return;
      const projectileType = designProjectileTypeToRuntime(projectileRow.ProjectileType);
      const towerRows = getTowerRowsByProjectileId(projectileRow.ProjectileID);
      const ownerTowerRow = towerRows[0] || {};
      const aiType = designTowerAiTypeToRuntime(ownerTowerRow.TowerAiType, ownerTowerRow.TowerType);
      const fillDefaults = getProjectileFillDefaults(projectileType, aiType);
      const sizeOverrideRaw = towerRows.find((row) => Number(row.ProjectileSize) > 0)?.ProjectileSize;
      const sizeOverride = normalizeDesignProjectileSize(sizeOverrideRaw, fillDefaults.radius);
      const pierceOverride = Math.max(0, ...towerRows.map((row) => Number(row.PiercingCount) || 0));
      const splashOverride = Math.max(0, ...towerRows.map((row) => Number(row.SplashRadius) || 0));
      const projectileName = String(projectileRow.ProjectileName || "").trim() || projectileKey;
      const projectilePrefabKey = String(projectileRow.ProjectilePrefab || "").trim();
      const projectilePrefab = resolveDesignProjectileAsset(projectilePrefabKey);
      const popEffectPrefab = String(projectileRow.PopEffectPrefab || "").trim();
      const subPopEffectPrefab = String(projectileRow.SubPopEffectPrefab || "").trim();
      runtime.projectiles[projectileKey] = {
        ...fillDefaults,
        id: projectileKey,
        type: projectileType,
        projectileType,
        aiType,
        name: projectileName,
        radius: sizeOverride,
        pierce: pierceOverride > 0 || fillDefaults.pierce === true,
        pierceHits: pierceOverride > 0 ? pierceOverride : Number(fillDefaults.pierceHits || 0),
        splashRadius: splashOverride > 0 ? splashOverride : Number(fillDefaults.splashRadius || 0),
        prefab: projectilePrefab || projectileKey,
        prefabKey: projectilePrefabKey,
        popEffectPrefab,
        subPopEffectPrefab,
        source: "designTables",
        design: {
          projectileId: projectileRow.ProjectileID,
          projectileType: projectileRow.ProjectileType,
          projectileEffectType: projectileType,
          projectileName,
          projectilePrefabKey,
          projectilePrefab,
          popEffectPrefab,
          subPopEffectPrefab,
          towerAiType: ownerTowerRow.TowerAiType,
          aiType,
          fillSource: "ProjectileTypeDefaults",
          towerOverrides: {
            projectileSize: Number(sizeOverrideRaw) > 0 ? Number(sizeOverrideRaw) : null,
            projectileSizePx: Number(sizeOverrideRaw) > 0 ? sizeOverride : null,
            pierceHits: pierceOverride > 0 ? pierceOverride : null,
            splashRadius: splashOverride > 0 ? splashOverride : null,
          },
        },
      };
    });

    (designTables.TowerData || []).forEach((towerRow) => {
      const towerKey = getDesignRuntimeTowerKey(towerRow.TowerID);
      const projectileKey = getDesignRuntimeProjectileKey(towerRow.TowerProjectile);
      if (!towerKey || !projectileKey) return;
      const runtimeType = designPieceTypeToRuntime(towerRow.TowerType);
      const fillDefaults = towerFillDefaultsByType[runtimeType] || towerFillDefaultsByType.basic;
      const combatDefaults = getTowerCombatDefaults(towerRow.TowerType);
      const damageMod = Math.max(0.01, Number(towerRow.TowerAtk || 0) / baseBulletDamage);
      const projectileRow = projectileById.get(String(towerRow.TowerProjectile));
      const targetPriority = String(towerRow.TargetPriority || "").trim()
        ? designTargetPriorityToRuntime(towerRow.TargetPriority)
        : combatDefaults.targetPriority;
      const aiType = designTowerAiTypeToRuntime(towerRow.TowerAiType, towerRow.TowerType);
      const projectileType = designProjectileTypeToRuntime(towerRow.ProjectileType || projectileRow?.ProjectileType);
      const projectileDefaults = getProjectileFillDefaults(projectileType, aiType);
      const projectileSize = normalizeDesignProjectileSize(towerRow.ProjectileSize, Number(runtime.projectiles[projectileKey]?.radius || projectileDefaults.radius || 0));
      const pierceHits = Math.max(0, Math.floor(Number(towerRow.PiercingCount) || 0));
      const splashRadius = Math.max(0, Number(towerRow.SplashRadius) || 0);
      const towerRange = normalizeDesignTowerRange(towerRow.TowerMaxLange);
      const bulletSpeed = Number(towerRow.BulletSpeed);
      const percentHpDamage = normalizeDesignPercentDamage(towerRow.current_hp, 0);
      runtime.towers[towerKey] = {
        id: towerKey,
        name: localizeDesignKey(towerRow.TowerName, towerRow.Desc || towerRow.TowerName || towerKey),
        type: runtimeType,
        aiType,
        targetPriority,
        projectileType,
        projectileId: projectileKey,
        projectileKey,
        damageMod,
        fireRateMod: 1,
        fireRate: Math.max(0.05, Number(towerRow.TowerAtkSpeed) || 0.6),
        range: Math.max(1, towerRange),
        maxAmmo: Math.max(1, Math.floor(Number(towerRow.TowerMaxAmmo) || 1)),
        projectileCountScale: 1,
        projectileCountBonus: 0,
        projectileCount: Math.max(0, Math.floor(Number(towerRow.ProjectileCount) || 0)),
        projectileSize,
        radius: projectileSize,
        speedMult: Number.isFinite(bulletSpeed) && bulletSpeed > 0
          ? bulletSpeed
          : Number(projectileDefaults.speedMult ?? runtime.projectiles[projectileKey]?.speedMult ?? 1),
        damageRatio: Number(projectileDefaults.damageRatio ?? runtime.projectiles[projectileKey]?.damageRatio ?? 1),
        life: Number(projectileDefaults.life ?? runtime.projectiles[projectileKey]?.life ?? 1.2),
        splashDamageRatio: Number(projectileDefaults.splashDamageRatio ?? runtime.projectiles[projectileKey]?.splashDamageRatio ?? 0),
        percentHpDamage,
        currentHpPercentDamage: percentHpDamage,
        knockback: Number(projectileDefaults.knockback ?? runtime.projectiles[projectileKey]?.knockback ?? 0),
        bossStunDuration: Number(projectileDefaults.bossStunDuration ?? runtime.projectiles[projectileKey]?.bossStunDuration ?? 0),
        pierceHits,
        splashRadius,
        homing: projectileDefaults.homing !== false,
        pierce: pierceHits > 0 || projectileDefaults.pierce === true,
        burstInterval: Number(projectileDefaults.burstInterval || 0),
        fanStep: Number(projectileDefaults.fanStep || 0.18),
        overdriveInterval: Number(projectileDefaults.overdriveInterval || 0.024),
        spreadJitter: Number(projectileDefaults.spreadJitter || 0),
        sequentialStored: projectileDefaults.sequentialStored === true,
        supportPower: Math.max(0, Number(towerRow.TowerAtk) || 0),
        description: towerRow.Desc || fillDefaults.description || "",
        source: "designTables",
        design: {
          towerId: towerRow.TowerID,
          towerLevel: towerRow.TowerLv,
          towerAtk: Number(towerRow.TowerAtk) || 0,
          towerAtkSpeed: Number(towerRow.TowerAtkSpeed) || 0,
          towerMaxLange: Number(towerRow.TowerMaxLange) || 0,
          towerMaxLangePx: towerRange,
          towerProjectile: towerRow.TowerProjectile,
          projectileCount: Math.max(0, Math.floor(Number(towerRow.ProjectileCount) || 0)),
          projectileSize: Number(towerRow.ProjectileSize) || 0,
          projectileSizePx: projectileSize,
          pierceHits,
          splashRadius,
          towerAiType: towerRow.TowerAiType,
          aiType,
          targetPriority,
          projectileType: towerRow.ProjectileType,
          bulletSpeed: Number.isFinite(bulletSpeed) && bulletSpeed > 0 ? bulletSpeed : null,
          currentHp: Number(towerRow.current_hp) || 0,
          currentHpPercentDamage: percentHpDamage,
          fillSource: "TowerTypeDefaults",
        },
      };
    });

    (designTables.PieceData || []).forEach((pieceRow) => {
      const pieceKey = getDesignRuntimePieceKey(pieceRow.PieceID);
      const towerKey = getDesignRuntimeTowerKey(pieceRow.ConnectTower);
      if (!pieceKey || !towerKey) return;
      const runtimeType = designPieceTypeToRuntime(pieceRow.PieceType);
      const baseType = towerTypes[runtimeType] || {};
      const name = String(pieceRow.PieceName || "").trim() || baseType.name || pieceKey;
      const sprite = resolveDesignPieceSprite(pieceRow.PieceSprite || pieceRow.Portrait || baseType.image || "");
      runtime.pieces[pieceKey] = {
        key: pieceKey,
        type: runtimeType,
        star: Math.max(1, Math.floor(Number(pieceRow.PieceGrade) || 1)),
        level: Math.max(1, Math.floor(Number(pieceRow.PieceLv) || 1)),
        name,
        mark: `${baseType.mark || ""}${Math.max(1, Math.floor(Number(pieceRow.PieceGrade) || 1))}`,
        fallbackText: getDesignPieceFallbackText(name, pieceKey),
        connectTower: towerKey,
        image: sprite,
        portrait: sprite,
        owned: defaultOwnedPieceIds.has(Number(pieceRow.PieceID)) || Math.max(1, Math.floor(Number(pieceRow.PieceLv) || 1)) === 1,
        description: localizeDesignKey(pieceRow.PieceDesc, baseType.description || pieceRow.PieceDesc || ""),
        source: "designTables",
        design: {
          pieceId: pieceRow.PieceID,
          pieceType: pieceRow.PieceType,
          pieceLevel: Number(pieceRow.PieceLv) || 1,
          connectTower: pieceRow.ConnectTower,
          pieceSprite: pieceRow.PieceSprite || "",
          resolvedPieceSprite: sprite,
        },
      };
      runtime.pieceDefinitions.push([pieceKey, runtimeType, runtime.pieces[pieceKey].star, name]);
    });

    const upgradeCostByUpgradeId = new Map((designTables.UpgradeCostData || []).map((costRow) => [String(costRow.UpgradeID), costRow]));
    (designTables.PieceUpgradeData || []).forEach((upgradeRow) => {
      const fromKey = getDesignRuntimePieceKey(upgradeRow.FromPieceID);
      const toKey = getDesignRuntimePieceKey(upgradeRow.ToPieceID);
      if (!fromKey || !toKey || !runtime.pieces[fromKey] || !runtime.pieces[toKey]) return;
      const costRow = upgradeCostByUpgradeId.get(String(upgradeRow.UpgradeID));
      const groupId = upgradeRow.PieceGroupID || runtime.pieces[fromKey].upgradeGroupId || fromKey;
      runtime.pieces[fromKey].upgradeGroupId = groupId;
      runtime.pieces[fromKey].nextPieceKey = toKey;
      runtime.pieces[fromKey].upgradeCost = Math.max(0, Math.floor(Number(costRow?.UpgradeCost) || 0));
      runtime.pieces[fromKey].upgradeCurrencyType = costRow?.CurrencyType || "gold";
      runtime.pieces[fromKey].upgradeId = upgradeRow.UpgradeID;
      runtime.pieces[fromKey].upgradeCostId = costRow?.UpgradeCostID || null;
      runtime.pieces[toKey].upgradeGroupId = groupId;
      runtime.pieces[toKey].prevPieceKey = fromKey;
      runtime.pieces[toKey].upgradeOnly = true;
    });

    const autoGroups = new Map();
    for (const piece of Object.values(runtime.pieces)) {
      if (piece.upgradeGroupId) continue;
      const identity = String(piece.design?.pieceSprite || piece.name || "").trim().toLowerCase();
      if (!identity) continue;
      if (!autoGroups.has(identity)) autoGroups.set(identity, []);
      autoGroups.get(identity).push(piece);
    }
    for (const pieces of autoGroups.values()) {
      if (!pieces.length) continue;
      pieces.sort((a, b) => Number(a.level || 1) - Number(b.level || 1));
      const groupId = `piece-auto-${pieces[0].design?.pieceId || pieces[0].key}`;
      pieces.forEach((piece, index) => {
        piece.upgradeGroupId = groupId;
        piece.prevPieceKey = pieces[index - 1]?.key || null;
        piece.nextPieceKey = Number(piece.level || 1) < 5 ? pieces[index + 1]?.key || null : null;
        piece.upgradeOnly = index > 0;
        piece.owned = index === 0;
      });
    }

    return runtime;
  }

  function buildDesignLoadoutRuntimeTable(pieceTowerTables) {
    const maxSlots = Math.max(1, Math.floor(Number(loadout.maxSlots) || 6));
    const selectablePieceKeys = [...new Set((pieceTowerTables.pieceDefinitions || []).map(([pieceKey]) => pieceKey).filter(Boolean))];
    const ownedSelectableKeys = selectablePieceKeys.filter((pieceKey) => pieceTowerTables.pieces[pieceKey]?.owned === true);
    const legacyFallbackKeys = (loadout.fallbackPieceKeys || []).filter((pieceKey) => selectablePieceKeys.includes(pieceKey));
    const fallbackPieceKeys = [
      ...ownedSelectableKeys,
      ...legacyFallbackKeys.filter((pieceKey) => !ownedSelectableKeys.includes(pieceKey)),
      ...selectablePieceKeys.filter((pieceKey) => !ownedSelectableKeys.includes(pieceKey) && !legacyFallbackKeys.includes(pieceKey)),
    ].slice(0, maxSlots);

    return {
      ...loadout,
      maxSlots,
      defaultPieceKeys: (loadout.defaultPieceKeys || []).filter((pieceKey) => selectablePieceKeys.includes(pieceKey)),
      fallbackPieceKeys,
      selectablePieceKeys,
      source: "designTables",
    };
  }

  function buildDesignShopRuntimeTable(pieceTowerTables, runtimeLoadout) {
    const manualEntries = (shop.pieceUnlocks || []).filter((entry) => pieceTowerTables.pieces[entry.pieceKey]);
    const manualKeys = new Set(manualEntries.map((entry) => entry.pieceKey));
    const autoEntries = (runtimeLoadout.selectablePieceKeys || [])
      .filter((pieceKey) => !manualKeys.has(pieceKey) && pieceTowerTables.pieces[pieceKey]?.owned !== true && !pieceTowerTables.pieces[pieceKey]?.upgradeOnly)
      .map((pieceKey, index) => ({
        pieceKey,
        label: `${pieceTowerTables.pieces[pieceKey]?.name || pieceKey} 해금`,
        cost: { ...shop.fallbackUnlockCost },
        sortOrder: 100 + index,
        source: "designTables-auto",
      }));

    return {
      ...shop,
      pieceUnlocks: [...manualEntries, ...autoEntries],
      source: "designTables",
    };
  }

  function buildDesignBossRuntimeTables() {
    const runtimeBosses = Object.fromEntries(Object.entries(bosses).map(([key, value]) => [key, { ...value }]));
    const numberOr = (value, fallback = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const monsterById = indexDesignRows("MonsterData", "MonsterID");
    const expAmountByExpType = Object.fromEntries(
      (designTables.ExpData || []).map((row) => [String(row.ExpTypeID), Math.max(0, Math.floor(Number(row.ExpAmount) || 0))])
    );
    const baseMonsterHp = 22;
    const bossFillDefaults = {
      kind: "final",
      meleeRange: 38,
      radius: 27,
      taunt: 25,
      rangedDamageRatio: 0.15,
      rangedRateMult: 1.6,
      summonInterval: 8,
      summonRadiusMin: 34,
      summonRadiusMax: 74,
      summonSpreadX: 5,
      summonSpreadY: 5,
      warningRangedDelay: 0.75,
      warningMeleeDelay: 0.55,
    };

    for (const bossRow of designTables.BossData || []) {
      const bossKey = getDesignRuntimeBossKey(bossRow.BossID);
      if (!bossKey) continue;
      const baseMonsterRow = monsterById.get(String(bossRow.MonsterID));
      const bossKind = String(bossRow.BossName || bossRow.Desc || "").toLowerCase().includes("mid") ? "mid" : bossFillDefaults.kind;
      const monsterKey = getDesignRuntimeMonsterKey(bossRow.MonsterID) || "finalBoss";
      const bossExpTypeId = String(baseMonsterRow?.ExpTypeID || "");
      const bossXp = Math.max(0, Math.floor(Number(expAmountByExpType[bossExpTypeId] ?? 1)));
      const label = localizeDesignKey(bossRow.BossName, bossRow.Desc || bossKey);
      const summonCount = Math.max(0, Math.floor(numberOr(bossRow.SummonCount, 0)));
      const summonGroupId = Number(bossRow.SummonMonsterGroupID) || 0;
      const summonMonsters = summonGroupId && summonCount > 0 ? distributeDesignMonsterTypes(summonCount, summonGroupId) : {};
      const summon = Object.keys(summonMonsters).length > 0
        ? {
            monsterGroupId: getDesignRuntimeMonsterGroupKey(summonGroupId),
            monsterKey: Object.keys(summonMonsters)[0] || "",
            monsters: summonMonsters,
            interval: Math.max(0.1, numberOr(bossRow.SummonInterval, bossFillDefaults.summonInterval)),
            count: summonCount,
            radiusMin: bossFillDefaults.summonRadiusMin,
            radiusMax: bossFillDefaults.summonRadiusMax,
            spreadX: bossFillDefaults.summonSpreadX,
            spreadY: bossFillDefaults.summonSpreadY,
            banner: `${label} 소환`,
            log: `${label} 패턴: 몬스터 소환`,
            design: {
              summonMonsterGroupId: summonGroupId,
              sourceTable: "MonsterGroupData",
            },
          }
        : null;
      const monsterHp = numberOr(baseMonsterRow?.MonsterHp, baseMonsterHp);
      const monsterAtk = Math.max(0, numberOr(baseMonsterRow?.MonsterAtk, 0));
      const monsterAtkSpeed = Math.max(0.1, numberOr(baseMonsterRow?.MonsterAtkSpeed, 1.15));
      const monsterAtkRange = Math.max(0, numberOr(baseMonsterRow?.MonsterAtkRange, 0));
      const monsterMoveSpeed = Math.max(0, numberOr(baseMonsterRow?.MonsterMoveSpeed, 18));

      runtimeBosses[bossKey] = {
        id: bossKey,
        kind: bossKind,
        monsterKey,
        label,
        banner: `${label} 등장`,
        spawn: {
          xRatio: numberOr(bossRow.SpawnXRatio, 0.5),
          yRatio: numberOr(bossRow.SpawnYRatio, 0.11),
        },
        hpMult: Math.max(1, monsterHp / baseMonsterHp),
        meleeDamage: monsterAtk,
        rangedDamage: monsterAtkRange > 0 ? Math.max(1, Math.round(monsterAtk * bossFillDefaults.rangedDamageRatio)) : 0,
        speed: monsterMoveSpeed,
        attackRate: monsterAtkSpeed,
        rangedRate: monsterAtkRange > 0 ? Math.max(0.1, monsterAtkSpeed * bossFillDefaults.rangedRateMult) : 0,
        attackRange: monsterAtkRange,
        meleeRange: bossFillDefaults.meleeRange,
        radius: bossFillDefaults.radius,
        taunt: bossFillDefaults.taunt,
        xp: bossXp,
        summon,
        warning: {
          rangedDelay: bossFillDefaults.warningRangedDelay,
          meleeDelay: bossFillDefaults.warningMeleeDelay,
        },
        configKeys: {},
        patterns: [],
        source: "designTables",
        design: {
          bossId: bossRow.BossID,
          bossKind,
          monsterId: bossRow.MonsterID,
          expTypeId: bossExpTypeId,
          summonMonsterGroupId: bossRow.SummonMonsterGroupID,
          statSource: "MonsterData",
          fillSource: "BossDataDefaults",
        },
      };
    }

    return {
      bosses: runtimeBosses,
      source: "designTables",
    };
  }

  function designRarityToRuntime(rarityRow) {
    const rarityById = {
      91: "common",
      92: "rare",
      93: "unique",
      94: "legendary",
    };
    const rarityId = Number(rarityRow?.PerkRarityID);
    if (rarityById[rarityId]) return rarityById[rarityId];
    const name = String(rarityRow?.PerkRarityName || "").toLowerCase();
    if (name.includes("legend")) return "legendary";
    if (name.includes("unique")) return "unique";
    if (name.includes("rare")) return "rare";
    return "common";
  }

  function getDesignRarityLabel(rarityKey) {
    return {
      common: "일반",
      rare: "희귀",
      legendary: "전설",
      unique: "고유",
    }[rarityKey] || rarityKey;
  }

  function getDesignRarityWeightConfig(rarityKey) {
    return {
      common: "commonRate",
      rare: "rareRate",
      legendary: "legendaryRate",
      unique: "uniqueRate",
    }[rarityKey] || `${rarityKey}Rate`;
  }

  function parseDesignJson(value, fallback) {
    if (!value) return fallback;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function getDesignPerkId(perkRow, effectRow) {
    return `perk-${perkRow.PerkID}`;
  }

  function getDesignPerkTargetType(perkRow, effectRow) {
    const numericTarget = Number(perkRow?.PerkTarget);
    const targetById = {
      1: "basic",
      2: "scatter",
      3: "sniper",
      4: "breaker",
      5: "blast",
      6: "support",
    };
    if (targetById[numericTarget]) return targetById[numericTarget];
    const target = String(perkRow?.PerkTarget || effectRow?.BuffTowerType || "");
    const lower = target.toLowerCase();
    if (lower.includes("support")) return "support";
    if (lower.includes("basic")) return "basic";
    if (lower.includes("scatter")) return "scatter";
    if (lower.includes("ranger")) return "ranger";
    if (lower.includes("sniper")) return "sniper";
    if (lower.includes("breaker") || lower.includes("tank")) return "breaker";
    if (lower.includes("blast") || lower.includes("area")) return "blast";
    return null;
  }

  function buildActionFromDesignRow(actionRow) {
    const enemyTypes = parseDesignJson(actionRow?.EnemyTypesJson, null);
    const action = {
      type: actionRow.ActionType,
      amount: Number(actionRow.Amount || 0),
    };
    if (actionRow.ActionKey) action.key = actionRow.ActionKey;
    if (Number(actionRow.Duration) > 0) action.duration = Number(actionRow.Duration);
    if (actionRow.PieceType) action.pieceType = actionRow.PieceType;
    if (actionRow.EnemyType) action.enemyType = actionRow.EnemyType;
    if (Array.isArray(enemyTypes)) action.enemyTypes = enemyTypes;
    if (actionRow.ProjectileID) action.projectileId = String(actionRow.ProjectileID);
    return action;
  }

  function getDesignPerkActionRows(perkId) {
    return (designTables.PerkActionData || [])
      .filter((actionRow) => String(actionRow.PerkID) === String(perkId))
      .sort((a, b) => Number(a.ActionID || 0) - Number(b.ActionID || 0));
  }

  function normalizeDesignEffectRatio(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return 0;
    return Math.abs(amount) > 1 ? amount / 100 : amount;
  }

  function buildActionsFromEffectData(perkRow, effectRow) {
    if (!effectRow) return [];
    const actions = [];
    const targetType = getDesignPerkTargetType(perkRow, effectRow);
    const addTargetAction = (type, amount) => {
      if (targetType && Number(amount) !== 0) actions.push({ type, pieceType: targetType, amount: Number(amount) });
    };

    addTargetAction("addTypeDamage", normalizeDesignEffectRatio(effectRow.ATK));
    addTargetAction("addTypeFireRateBonus", normalizeDesignEffectRatio(effectRow.ATKSpeed));
    addTargetAction("addTypeProjectileCount", Number(effectRow.ShotProjCount || 0));
    addTargetAction("addTypeAmmoBonus", Number(effectRow.MaxProj || 0));
    addTargetAction("addTypeProjectileSizeRatio", normalizeDesignEffectRatio(effectRow.ProjSize));
    addTargetAction("addTypePierce", Number(effectRow.ProjPiercing || 0));
    addTargetAction("addTypePercentHpDamage", normalizeDesignPercentDamage(effectRow.current_hp, 0));

    const buffType = Number(effectRow.BuffType || 0);
    const buffValue = Number(effectRow.BuffValue || 0);
    const duration = Math.max(0, Number(effectRow.Duration || 0));
    if (buffType === 1 && targetType && buffValue) {
      actions.push({ type: "addTypeBlastRadiusRatio", pieceType: targetType, amount: normalizeDesignEffectRatio(buffValue) });
    } else if (buffType === 2 && (buffValue || Number(effectRow.ATKSpeed))) {
      actions.push({
        type: "startTimedFireRate",
        amount: normalizeDesignEffectRatio(buffValue || effectRow.ATKSpeed),
        duration,
      });
    } else if (buffType === 3 && buffValue) {
      if (targetType === "support") actions.push({ type: "addMod", key: "supportHealBonus", amount: buffValue });
      else actions.push({ type: "healAllSlotsPercent", amount: normalizeDesignEffectRatio(buffValue) });
    } else if (buffType === 4 && buffValue) {
      actions.push({ type: "addSlotMaxHp", amount: buffValue });
    } else if (buffType === 6 && Number(perkRow?.PerkTarget) === 8) {
      actions.push({ type: "addSpecialProjectileLevel", projectileId: "combo_pierce", amount: 1 });
    }
    return actions.filter((action) => action.type && Number(action.amount || 0) !== 0);
  }

  function getDesignPerkLimitRow(perkId) {
    return (designTables.PerkLimitData || []).find((limitRow) => String(limitRow.PerkID) === String(perkId)) || null;
  }

  function buildDesignPerkActions(perkRow, effectRow) {
    const actionRows = getDesignPerkActionRows(perkRow?.PerkID);
    if (balanceDataStatus.active) {
      const effectActions = buildActionsFromEffectData(perkRow, effectRow);
      if (effectActions.length > 0) return effectActions;
      if (actionRows.length > 0) {
        balanceDataDiagnostics.push({
          level: "warn",
          code: "PERK_EFFECT_FALLBACK",
          perkId: perkRow?.PerkID,
          effectId: perkRow?.EffectID,
          message: "EffectData에 실행 가능한 값이 없어 내장 PerkActionData를 사용합니다.",
        });
      }
    }
    if (actionRows.length > 0) return actionRows.map(buildActionFromDesignRow).filter((action) => action.type);
    const buffType = String(effectRow?.BuffType || "");
    const amount = Number(effectRow?.BuffValue || 0);
    if (buffType === "AtkUp") {
      return [
        { type: "addMod", key: "damageMultiplier", amount: amount || Number(effectRow.ATK) || 0.08 },
        { type: "addMod", key: "damageUpgradeCount", amount: 1 },
      ];
    }
    if (buffType === "AtkSpeedUp") {
      const speedAmount = Number(effectRow.ATKSpeed || amount || 0.07);
      return [
        { type: "multiplyMod", key: "fireRateMultiplier", amount: Math.max(0.1, 1 - speedAmount) },
        { type: "addMod", key: "fireRateUpgradeCount", amount: 1 },
      ];
    }
    if (buffType === "ShotProjCountUp") {
      return [
        { type: "addMod", key: "extraBullets", amount: Number(effectRow.ShotProjCount || amount || 1) },
        { type: "addMod", key: "projectileUpgradeCount", amount: 1 },
      ];
    }
    if (buffType === "AmmoUp") {
      return [{ type: "addMod", key: "towerDurationBonus", amount: Number(effectRow.MaxProj || amount || 1) }];
    }
    if (buffType === "HealUp") {
      return [{ type: "addMod", key: "supportHealBonus", amount: Number(amount || 8) }];
    }
    return [];
  }

  function getDesignPerkTargetLabel(targetType) {
    return {
      basic: "기본형",
      scatter: "샷건형",
      sniper: "저격형",
      breaker: "탱커대항형",
      blast: "범위형",
      support: "보조형",
    }[targetType] || "전체 포탑";
  }

  function buildDesignPerkActionCopy(perkRow, effectRow, actions) {
    const targetType = getDesignPerkTargetType(perkRow, effectRow);
    const targetLabel = getDesignPerkTargetLabel(targetType);
    const percent = (value) => `${Math.round(Number(value || 0) * 1000) / 10}%`;
    const summaries = (actions || []).map((action) => {
      if (action.type === "addTypeDamage") return `공격력 ${percent(action.amount)} 증가`;
      if (action.type === "addTypeFireRateBonus") return `공격 속도 ${percent(action.amount)} 증가`;
      if (action.type === "addTypeProjectileCount") return `1회 발사체 수 ${Number(action.amount) > 0 ? "+" : ""}${action.amount}`;
      if (action.type === "addTypeAmmoBonus") return `최대 탄창 ${Number(action.amount) > 0 ? "+" : ""}${action.amount}`;
      if (action.type === "addTypeProjectileSizeRatio") return `투사체 크기 ${percent(action.amount)} 증가`;
      if (action.type === "addTypePierce") return `관통 횟수 ${Number(action.amount) > 0 ? "+" : ""}${action.amount}`;
      if (action.type === "addTypePercentHpDamage") return `최대 체력 비례 피해 ${Number(action.amount) >= 0 ? "+" : ""}${percent(action.amount)}p`;
      if (action.type === "addTypeBlastRadiusRatio") return `폭발 범위 ${percent(action.amount)} 증가`;
      if (action.type === "healAllSlotsPercent") return `모든 슬롯 체력 ${percent(action.amount)} 회복`;
      if (action.type === "addSlotMaxHp") return `모든 슬롯 최대 체력 ${Number(action.amount) > 0 ? "+" : ""}${action.amount}`;
      if (action.type === "startTimedFireRate") return `${action.duration || 0}초 동안 공격 속도 ${percent(action.amount)} 증가`;
      if (action.type === "addSpecialProjectileLevel") return "10콤보 관통탄 강화";
      if (action.type === "addMod" && action.key === "supportHealBonus") return `회복량 ${Number(action.amount) > 0 ? "+" : ""}${action.amount}`;
      return "";
    }).filter(Boolean);
    const primary = actions?.[0]?.type;
    const titleByAction = {
      addTypeDamage: `${targetLabel} 공격력 강화`,
      addTypeFireRateBonus: `${targetLabel} 공격 속도 강화`,
      addTypeProjectileCount: `${targetLabel} 발사체 수 강화`,
      addTypeAmmoBonus: `${targetLabel} 탄창 강화`,
      addTypeProjectileSizeRatio: `${targetLabel} 투사체 크기 강화`,
      addTypePierce: `${targetLabel} 관통 강화`,
      addTypePercentHpDamage: `${targetLabel} 체력비례 피해 강화`,
      addTypeBlastRadiusRatio: `${targetLabel} 폭발 범위 강화`,
      healAllSlotsPercent: "전체 슬롯 긴급 회복",
      addSlotMaxHp: "슬롯 최대 체력 강화",
      startTimedFireRate: "전 포탑 공격 가속",
      addSpecialProjectileLevel: "10콤보 관통탄 강화",
    };
    const bodyPrefix = targetType ? `${targetLabel}의 ` : "";
    return {
      title: titleByAction[primary] || `특전 ${perkRow.PerkID}`,
      body: summaries.length > 0 ? `${bodyPrefix}${summaries.join(", ")}.` : "",
      shortBody: summaries.join(", "),
    };
  }

  function getDesignPerkCopy(perkId, perkRow, effectRow, actions) {
    if (balanceDataStatus.active) {
      return buildDesignPerkActionCopy(perkRow, effectRow, actions);
    }
    const explicitTitle = localizeDesignKey(perkRow.PerkName, "");
    const explicitBody = localizeDesignKey(perkRow.PerkDesc, perkRow.Desc || effectRow?.Desc || "");
    const definition = perkTableDefinitions.find((row) => String(row.perkId) === String(perkRow.PerkID));
    const title = explicitTitle || definition?.title || perkRow.Desc || effectRow?.Desc || `특전 ${perkRow.PerkID}`;
    const body = explicitBody || definition?.body || "";
    return {
      title,
      body,
      shortBody: definition?.body || perkRow.Desc || effectRow?.Desc || body,
    };
  }

  function getDesignPerkLimit(perkId, perkRow, effectRow) {
    const limitRow = getDesignPerkLimitRow(perkRow?.PerkID);
    if (limitRow) {
      const limit = {
        modKey: limitRow.ModKey,
        configKey: limitRow.ConfigKey,
        min: Number(limitRow.Min || 0),
      };
      if (limitRow.SpecialProjectileID) limit.specialProjectileId = String(limitRow.SpecialProjectileID);
      if (Number(limitRow.Max) > 0) limit.max = Number(limitRow.Max);
      return limit;
    }
    if (perkId === "common-damage") return { modKey: "damageUpgradeCount", configKey: "maxDamageUpgrades", min: 1, max: Number(perkRow.MaxLevel) || 3 };
    if (perkId === "common-fire-rate") return { modKey: "fireRateUpgradeCount", configKey: "maxFireRateUpgrades", min: 1, max: Number(perkRow.MaxLevel) || 5 };
    if (perkId === "rare-projectile") return { modKey: "projectileUpgradeCount", configKey: "maxProjectileUpgrades", min: 1, max: Number(perkRow.MaxLevel) || 3 };
    return null;
  }

  function buildDesignPerkRuntimeTables() {
    const effectById = indexDesignRows("EffectData", "EffectID");
    const rarityById = indexDesignRows("RarityData", "PerkRarityID");
    const runtimeRarities = {};
    (designTables.RarityData || []).forEach((rarityRow) => {
      const rarityKey = designRarityToRuntime(rarityRow);
      runtimeRarities[rarityKey] = {
        ...(perks.rarities?.[rarityKey] || {}),
        label: getDesignRarityLabel(rarityKey),
        weightConfig: getDesignRarityWeightConfig(rarityKey),
        defaultWeight: Math.max(0, Number(rarityRow.Weight) || 0) / 100,
        color: rarityRow.Color || perks.rarities?.[rarityKey]?.color || "#B8C0CC",
        source: "designTables",
        design: {
          perkRarityId: rarityRow.PerkRarityID,
          perkRarityName: rarityRow.PerkRarityName,
        },
      };
    });

    const designUpgrades = (designTables.PerkData || [])
      .filter((perkRow) => perkRow.IsActive === true || Number(perkRow.IsActive) === 1)
      .map((perkRow) => {
        const effectRow = effectById.get(String(perkRow.EffectID));
        const rarityRow = rarityById.get(String(perkRow.PerkRarityType));
        const rarity = designRarityToRuntime(rarityRow);
        const id = getDesignPerkId(perkRow, effectRow);
        const targetType = getDesignPerkTargetType(perkRow, effectRow);
        const actions = buildDesignPerkActions(perkRow, effectRow);
        const copy = getDesignPerkCopy(id, perkRow, effectRow, actions);
        const limit = getDesignPerkLimit(id, perkRow, effectRow);
        return {
          id,
          rarity,
          ...(targetType ? { targetType, requireActiveType: targetType } : {}),
          title: copy.title,
          body: copy.body,
          shortBody: copy.shortBody,
          ...(limit ? { limit } : {}),
          actions,
          source: "designTables",
          design: {
            perkId: perkRow.PerkID,
            effectId: perkRow.EffectID,
            triggerId: perkRow.TriggerID,
            perkRarityType: perkRow.PerkRarityType,
            maxLevel: perkRow.MaxLevel,
            perkTarget: perkRow.PerkTarget,
            perkTargetText: perkRow.PerkTargetText,
          },
        };
      })
      .filter((upgrade) => upgrade.actions.length > 0);

    return {
      rarities: runtimeRarities,
      upgrades: designUpgrades,
      source: "designTables",
    };
  }

  function buildDesignLevelExpRuntimeTables() {
    const levelRows = [...(designTables.LevelData || [])]
      .map((row) => ({
        levelId: row.LevelID,
        goalLevel: Math.max(1, Math.floor(Number(row.GoalLevel) || 1)),
        requiredXp: Math.max(0, Math.floor(Number(row.RequiredXP) || 0)),
        isMaxLevel: Number(row.IsMaxLevel) === 1,
        perkEventType: row.PerkEventType || "Normal",
        description: row.Description || "",
        source: "designTables",
      }))
      .sort((a, b) => a.goalLevel - b.goalLevel);

    const requiredXpByLevel = {};
    const xpCostByLevel = {};
    for (const row of levelRows) {
      requiredXpByLevel[row.goalLevel] = row.requiredXp;
    }
    for (let index = 0; index < levelRows.length - 1; index += 1) {
      const from = levelRows[index];
      const to = levelRows[index + 1];
      const levelGap = Math.max(1, to.goalLevel - from.goalLevel);
      const xpGap = Math.max(1, to.requiredXp - from.requiredXp);
      const perLevel = Math.max(1, Math.ceil(xpGap / levelGap));
      for (let level = from.goalLevel; level < to.goalLevel; level += 1) {
        xpCostByLevel[level] = perLevel;
      }
    }

    const maxLevelRow = levelRows.find((row) => row.isMaxLevel) || levelRows[levelRows.length - 1] || null;
    const stageMaxLevel = Math.max(1, Math.floor(Number(maxLevelRow?.goalLevel) || Number(levelData.stageMaxLevel) || 20));
    const firstPlayableRow = levelRows.find((row) => row.goalLevel > 1);
    const xpBase = Math.max(1, Number(xpCostByLevel[1] || firstPlayableRow?.requiredXp || levelData.xpBase || 20));
    const secondCost = Number(xpCostByLevel[2] || xpBase);
    const xpLevelGrowth = Math.max(0, secondCost - xpBase || Number(levelData.xpLevelGrowth) || 0);

    const expAmountByExpType = Object.fromEntries(
      (designTables.ExpData || []).map((row) => [String(row.ExpTypeID), Math.max(0, Math.floor(Number(row.ExpAmount) || 0))])
    );
    const expTypeToRuntimeKeys = {
      81: ["basic"],
      82: ["speed", "tank", "ranged"],
      83: ["midBoss", "finalBoss"],
      84: ["dummy"],
    };
    const runtimeMonsters = Object.fromEntries(Object.entries(monsters).map(([key, value]) => [key, { ...value }]));
    const baseMonsterHp = 22;
    const baseMonsterDamage = 1;
    const baseMonsterSpeed = 34;
    const baseMonsterAttackRate = 1.35;
    const visualDefaultsByMonsterType = {
      basic: { mark: "M", color: "#d85d72", taunt: 1, pack: 1, radiusAdd: 0, weight: 0.44 },
      speed: { mark: "S", color: "#ffcf5a", taunt: 0.55, pack: 2, radiusAdd: -2, weight: 0.34 },
      tank: { mark: "T", color: "#b982ff", taunt: 7, pack: 1, radiusAdd: 5, weight: 0.12 },
      ranged: { mark: "R", color: "#69d7ff", taunt: 0.8, pack: 1, radiusAdd: 0, weight: 0.1 },
      boss: { mark: "왕", color: "#ff4f6d", taunt: 25, pack: 1, radiusAdd: 0, weight: 0 },
      dummy: { mark: "허", color: "#9ee7ff", taunt: 12, pack: 1, radiusAdd: 7, weight: 0 },
    };

    for (const monsterRow of designTables.MonsterData || []) {
      const monsterKey = getDesignRuntimeMonsterKey(monsterRow.MonsterID);
      if (!monsterKey) continue;
      const monsterType = designMonsterTypeToRuntime(monsterRow.MonsterType);
      const typeDefaults = visualDefaultsByMonsterType[monsterType] || visualDefaultsByMonsterType.basic;
      const monsterHp = Number(monsterRow.MonsterHp);
      const monsterAtk = Number(monsterRow.MonsterAtk);
      const monsterMoveSpeed = Number(monsterRow.MonsterMoveSpeed);
      const monsterAtkSpeed = Number(monsterRow.MonsterAtkSpeed);
      const monsterAtkRange = Number(monsterRow.MonsterAtkRange);
      const isDummy = monsterType === "dummy";
      const expTypeId = String(monsterRow.ExpTypeID || "");
      runtimeMonsters[monsterKey] = {
        key: monsterKey,
        monsterId: monsterRow.MonsterSprite || monsterKey,
        sprite: monsterRow.MonsterSprite || "",
        name: localizeDesignKey(monsterRow.MonsterName, monsterRow.Desc || monsterKey),
        role: monsterRow.Desc || monsterType,
        mark: typeDefaults.mark,
        color: typeDefaults.color,
        hpMult: monsterHp > 0 ? monsterHp / baseMonsterHp : 1,
        damageMult: monsterAtk > 0 ? monsterAtk / baseMonsterDamage : isDummy ? 0.01 : 1,
        speedMult: monsterMoveSpeed > 0 ? monsterMoveSpeed / baseMonsterSpeed : isDummy ? 0.01 : 1,
        attackRateMult: monsterAtkSpeed > 0 ? monsterAtkSpeed / baseMonsterAttackRate : 1,
        radiusAdd: Number(typeDefaults.radiusAdd || 0),
        attackRange: monsterAtkRange > 0 ? monsterAtkRange : 0,
        taunt: Number(typeDefaults.taunt),
        pack: Math.max(1, Math.floor(Number(typeDefaults.pack))),
        weight: Number(typeDefaults.weight || 0),
        xp: Math.max(0, Math.floor(Number(expAmountByExpType[expTypeId] ?? 1))),
        canMove: isDummy ? false : monsterMoveSpeed > 0,
        canAttack: isDummy ? false : monsterAtk > 0,
        testDummy: isDummy,
        expDataType: expTypeId,
        expSource: "designTables",
        source: "designTables",
        design: {
          monsterId: monsterRow.MonsterID,
          monsterType,
          expTypeId: monsterRow.ExpTypeID,
          monsterHp: Number(monsterRow.MonsterHp) || 0,
          monsterAtk: Number(monsterRow.MonsterAtk) || 0,
          monsterAtkSpeed: Number(monsterRow.MonsterAtkSpeed) || 0,
          monsterAtkRange: Number(monsterRow.MonsterAtkRange) || 0,
          monsterMoveSpeed: Number(monsterRow.MonsterMoveSpeed) || 0,
          fillSource: "MonsterTypeDefaults",
        },
      };
    }
    for (const [expTypeId, xpAmount] of Object.entries(expAmountByExpType)) {
      for (const monsterKey of expTypeToRuntimeKeys[expTypeId] || []) {
        if (!runtimeMonsters[monsterKey]) continue;
        runtimeMonsters[monsterKey] = {
          ...runtimeMonsters[monsterKey],
          xp: xpAmount,
          expDataType: expTypeId,
          expSource: "designTables",
        };
      }
    }

    return {
      levelData: {
        ...levelData,
        stageStartLevel: levelRows[0]?.goalLevel || levelData.stageStartLevel || 1,
        stageMaxLevel,
        xpBase,
        xpLevelGrowth,
        levels: levelRows,
        requiredXpByLevel,
        xpCostByLevel,
        source: "designTables",
      },
      monsters: runtimeMonsters,
      expData: {
        byExpType: expAmountByExpType,
        source: "designTables",
      },
    };
  }

  function buildDesignPatternEvents({ stageRow, patternRow, patternId, waveOrdinal }) {
    const waveDuration = Number(patternRow?.Duration ?? patternRow?.WaveDuration ?? stageRow?.WaveDuration ?? 40);
    const eventCount = Math.max(1, Math.min(8, Math.floor((Number.isFinite(waveDuration) && waveDuration > 0 ? waveDuration : 40) / 5) + 1));
    const normalBuckets = splitDesignCount(patternRow.Normal_Count, eventCount);
    const speedyBuckets = splitDesignCount(patternRow.Speedy_Count, eventCount);
    const tankerBuckets = splitDesignCount(patternRow.Tanker_Count, eventCount);
    const events = [];
    for (let index = 0; index < eventCount; index += 1) {
      const monsters = mergeMonsterCounts(
        distributeDesignMonsterTypes(normalBuckets[index], stageRow.MonsterGroupID_Normal, {
          useNormalRates: true,
          normalRates: [patternRow.NormalRate_1, patternRow.NormalRate_2, patternRow.NormalRate_3],
        }),
        distributeDesignMonsterTypes(speedyBuckets[index], stageRow.MonsterGroupID_Speedy),
        distributeDesignMonsterTypes(tankerBuckets[index], stageRow.MonsterGroupID_Tanker)
      );
      if (!Object.keys(monsters).length) continue;
      const groupId = `${patternId}_g${index + 1}`;
      const sourceGroups = [
        { role: "Normal", monsterGroupId: Number(stageRow.MonsterGroupID_Normal) || 0, count: normalBuckets[index] },
        { role: "Speedy", monsterGroupId: Number(stageRow.MonsterGroupID_Speedy) || 0, count: speedyBuckets[index] },
        { role: "Tanker", monsterGroupId: Number(stageRow.MonsterGroupID_Tanker) || 0, count: tankerBuckets[index] },
      ].filter((item) => item.monsterGroupId && item.count > 0);
      events.push({
        time: index * 5,
        groupId,
        spreadX: 18 + Math.min(30, waveOrdinal * 2),
        spreadY: 10,
      });
      stageWaveRuntimeTables.monsterGroups[groupId] = {
        id: groupId,
        monsters,
        source: "designTables",
        design: {
          stageId: stageRow.StageID,
          wavePatternId: patternRow.WavePatternID,
          eventIndex: index + 1,
          sourceGroups,
        },
      };
    }
    return events;
  }

  const stageWaveRuntimeTables = {
    monsterGroups: { ...monsterGroups },
    wavePatterns: { ...wavePatterns },
    waves: { ...waves },
    stages: [],
  };

  function buildDesignStageWaveRuntimeTables() {
    const waveDataById = indexDesignRows("WaveData", "WaveID");
    const patternById = indexDesignRows("WavePatternData", "WavePatternID");
    const legacyStagesByKey = new Map(stages.map((stage) => [stage.key, stage]));
    const runtimeBosses = runtimeBossTables?.bosses || bosses;
    const getRuntimeWaveDuration = (stageRow, patternRow) => {
      const duration = Number(patternRow?.Duration ?? patternRow?.WaveDuration ?? stageRow?.WaveDuration ?? 40);
      return Number.isFinite(duration) && duration > 0 ? duration : 40;
    };

    (designTables.StageData || []).forEach((stageRow, stageIndex) => {
      const stageKey = getDesignRuntimeStageKey(stageRow.StageID, stageIndex);
      const legacyStage = legacyStagesByKey.get(stageKey) || {};
      const waveData = waveDataById.get(String(stageRow.WaveDataID));
      const stageBossKey = getDesignRuntimeBossKey(stageRow.BossID);
      const stageBossIds = stageBossKey && runtimeBosses[stageBossKey] ? [stageBossKey] : [];
      const waveIds = [];

      for (let waveOrdinal = 1; waveOrdinal <= 9; waveOrdinal += 1) {
        const patternIdValue = waveData?.[`WavePattern_${waveOrdinal}`];
        const patternRow = patternById.get(String(patternIdValue));
        if (!patternRow) continue;
        const runtimeType = designWaveTypeToRuntime(patternRow.WaveType);
        const runtimeWaveId = getDesignRuntimeWaveId(stageKey, stageIndex, waveOrdinal);
        const runtimePatternId = getDesignPatternId(stageKey, stageRow.StageID, waveOrdinal, runtimeType);
        const wave = {
          id: runtimeWaveId,
          label: patternRow.Desc || `${waveOrdinal}웨이브`,
          type: runtimeType,
          duration: runtimeType === "boss" ? 0 : getRuntimeWaveDuration(stageRow, patternRow),
          source: "designTables",
          design: {
            stageId: stageRow.StageID,
            waveDataId: stageRow.WaveDataID,
            wavePatternId: patternRow.WavePatternID,
            waveOrdinal,
          },
        };

        wave.patternId = runtimePatternId;
        stageWaveRuntimeTables.wavePatterns[runtimePatternId] = {
          id: runtimePatternId,
          source: "designTables",
          design: {
            stageId: stageRow.StageID,
            wavePatternId: patternRow.WavePatternID,
          },
          events: buildDesignPatternEvents({
            stageRow,
            patternRow,
            patternId: runtimePatternId,
            waveOrdinal,
          }),
        };

        stageWaveRuntimeTables.waves[runtimeWaveId] = wave;
        waveIds.push(runtimeWaveId);
      }

      if (stageBossIds.length > 0) {
        const bossId = stageBossIds[0];
        const bossWaveId = getDesignRuntimeWaveId(stageKey, stageIndex, 10);
        stageWaveRuntimeTables.waves[bossWaveId] = {
          id: bossWaveId,
          label: runtimeBosses[bossId]?.label || "최종보스",
          type: "boss",
          bossId,
          bossKind: runtimeBosses[bossId]?.kind || "final",
          duration: 0,
          source: "designTables",
          design: {
            stageId: stageRow.StageID,
            waveDataId: stageRow.WaveDataID,
            bossId: stageRow.BossID,
            waveOrdinal: 10,
            generatedFromBossData: true,
          },
        };
        waveIds.push(bossWaveId);
      } else if (stageKey === "stage-test-dummy") {
        const patternIdValue = waveData?.WavePattern_9;
        const patternRow = patternById.get(String(patternIdValue));
        if (patternRow) {
          const waveOrdinal = 10;
          const runtimeWaveId = getDesignRuntimeWaveId(stageKey, stageIndex, waveOrdinal);
          const runtimePatternId = getDesignPatternId(stageKey, stageRow.StageID, waveOrdinal, "test");
          stageWaveRuntimeTables.wavePatterns[runtimePatternId] = {
            id: runtimePatternId,
            source: "designTables",
            design: {
              stageId: stageRow.StageID,
              wavePatternId: patternRow.WavePatternID,
              reusedForTestWave10: true,
            },
            events: buildDesignPatternEvents({
              stageRow,
              patternRow,
              patternId: runtimePatternId,
              waveOrdinal,
            }),
          };
          stageWaveRuntimeTables.waves[runtimeWaveId] = {
            id: runtimeWaveId,
            label: "허수아비 테스트 10",
            type: "test",
            duration: getRuntimeWaveDuration(stageRow, patternRow),
            patternId: runtimePatternId,
            source: "designTables",
            design: {
              stageId: stageRow.StageID,
              waveDataId: stageRow.WaveDataID,
              wavePatternId: patternRow.WavePatternID,
              waveOrdinal,
              generatedTestWave: true,
            },
          };
          waveIds.push(runtimeWaveId);
        }
      }

      stageWaveRuntimeTables.stages.push({
        ...legacyStage,
        key: stageKey,
        title: localizeDesignKey(stageRow.StageName, legacyStage.title || stageRow.StageName || `스테이지 ${stageIndex + 1}`),
        subtitle: legacyStage.subtitle || stageRow.Desc || "",
        description: stageRow.Desc || legacyStage.description || "",
        firstWave: waveIds[0] || legacyStage.firstWave || 1,
        waveIds,
        bossIds: stageBossIds,
        waveReward: {
          gold: Number(stageRow.WaveReward) || 0,
        },
        clearReward: {
          gold: Number(stageRow.StageReward) || 0,
          ticket: 0,
        },
        ui: {
          ...(legacyStage.ui || {}),
          mainImage: stageRow.BGID || legacyStage.ui?.mainImage || "",
        },
        source: "designTables",
        design: {
          stageId: stageRow.StageID,
          waveDataId: stageRow.WaveDataID,
        },
      });
    });

    if (!stageWaveRuntimeTables.stages.length) {
      stageWaveRuntimeTables.stages = stages.map((stage) => ({ ...stage }));
    }
    return stageWaveRuntimeTables;
  }

  const runtimePieceTowerTables = buildDesignPieceTowerRuntimeTables();
  const runtimeLoadout = buildDesignLoadoutRuntimeTable(runtimePieceTowerTables);
  const runtimeShop = buildDesignShopRuntimeTable(runtimePieceTowerTables, runtimeLoadout);
  const runtimePerkTables = buildDesignPerkRuntimeTables();
  const runtimeLevelExpTables = buildDesignLevelExpRuntimeTables();
  const runtimeBossTables = buildDesignBossRuntimeTables();
  const runtimeStageWaveTables = buildDesignStageWaveRuntimeTables();

  window.GAME_DATA = {
    version: "2026-06-25-exhibition-projectile-sprites",
    dataGuide,
    designTableSchema,
    designRuntimeKeyMap,
    designTables,
    balanceDataStatus,
    constants: {
      slotCount: 9,
      cellsPerSlot: 3,
      loadoutPieceCount: 6,
      initialPiecesPerSlot: 2,
      refillPiecesPerEmptySlot: 2,
      slotSize: { width: 102, height: 84 },
      slotSizeStorageVersion: 6,
    },
    storageKeys: {
      layout: "slotSortBattleLayoutV6",
      playerSave: "slotSortBattlePlayerSaveV1",
      phonePreset: "slotSortBattlePhonePresetV1",
      lobby: "slotSortBattleLobbyV4",
      stageClear: "slotSortBattleStageClearV1",
      legacyBest: "slotSortBest",
    },
    defaultPlayerSave: {
      version: 1,
      currency: { gold: 1220, ticket: 5 },
      ownedPieces: [],
      selectedLoadout: ["basic_1", "scatter_1", "sniper_1", "breaker_1", "blast_1", "support_1"],
      selectedStageKey: "stage-1",
      clearedStages: {},
      bestScore: 0,
      stageRecords: {},
      settings: { phonePreset: "galaxy-s24" },
      pieceLevels: {},
      pieceStars: {},
      unlockedRewards: {},
    },
    progression: {
      pieceDefaultLevel: 1,
      pieceMaxLevel: 5,
      pieceUpgradeMode: "replacePieceId",
      pieceUpgradeBaseGold: 0,
      pieceUpgradeGoldStep: 0,
      pieceLevelDamageBonus: 0,
      pieceLevelRangeBonus: 0,
      pieceLevelAmmoBonusEvery: 999,
    },
    levelData: runtimeLevelExpTables.levelData,
    specialProjectiles,
    effectData: {
      pieceLevelDamageBonus: { type: "deprecated", stat: "damageMultiplier", perLevel: 0 },
      pieceLevelRangeBonus: { type: "deprecated", stat: "range", perLevel: 0 },
      pieceLevelAmmoBonus: { type: "deprecated", stat: "maxAmmo", everyLevel: 999, amount: 0 },
      perkTowerAmmoBonus: { type: "towerStat", stat: "maxAmmoFromSeconds", amount: 0.8 },
    },
    localizeData: {
      ui: {
        start: "시작!",
        deck: "덱 편성",
        shop: "상점",
        enhance: "강화",
        owned: "보유중",
        acquire: "획득",
      },
      result: {
        clear: "스테이지 클리어",
        fail: "게임 오버",
        firstClearReward: "첫 클리어 보상",
        rewardClaimed: "보상 수령 완료",
        noReward: "보상 없음",
      },
    },
    shop: runtimeShop,
    towerTypes,
    projectiles: runtimePieceTowerTables.projectiles,
    towers: runtimePieceTowerTables.towers,
    pieces: runtimePieceTowerTables.pieces,
    pieceDefinitions: runtimePieceTowerTables.pieceDefinitions,
    gradeStats: {
      1: { damage: 1, fireRate: 1, range: 0, bulletBonus: 0 },
    },
    loadout: runtimeLoadout,
    fallbackLoadoutKeys: runtimeLoadout.fallbackPieceKeys,
    defaultLoadoutKeys: runtimeLoadout.defaultPieceKeys,
    monsters: runtimeLevelExpTables.monsters,
    monsterTypes: runtimeLevelExpTables.monsters,
    bosses: runtimeBossTables.bosses,
    monsterGroups: runtimeStageWaveTables.monsterGroups,
    wavePatterns: runtimeStageWaveTables.wavePatterns,
    waves: runtimeStageWaveTables.waves,
    stages: runtimeStageWaveTables.stages,
    perks: runtimePerkTables,
    waveProfiles: {
      1: {
        label: "입문 물량",
        spawnRate: 1.45,
        batchBonus: 0,
        eliteBonus: -1,
        weights: { basic: 0.8, speed: 0.2, tank: 0, ranged: 0 },
      },
      2: {
        label: "속도형 적응",
        spawnRate: 1.32,
        batchBonus: 0,
        eliteBonus: -1,
        weights: { basic: 0.65, speed: 0.3, tank: 0.05, ranged: 0 },
      },
      3: {
        label: "탱커 첫 압박",
        spawnRate: 1.2,
        batchBonus: 0,
        eliteBonus: -0.02,
        weights: { basic: 0.55, speed: 0.25, tank: 0.2, ranged: 0 },
      },
      4: {
        label: "혼합 압박",
        spawnRate: 1.08,
        batchBonus: 1,
        eliteBonus: 0.01,
        weights: { basic: 0.52, speed: 0.3, tank: 0.18, ranged: 0 },
      },
      6: {
        label: "후반 진입",
        spawnRate: 1.0,
        batchBonus: 1,
        eliteBonus: 0.06,
        weights: { basic: 0.46, speed: 0.39, tank: 0.15, ranged: 0 },
      },
      7: {
        label: "속도형 러시",
        spawnRate: 0.92,
        batchBonus: 1,
        eliteBonus: 0.08,
        weights: { basic: 0.34, speed: 0.54, tank: 0.12, ranged: 0 },
      },
      8: {
        label: "탱커 벽",
        spawnRate: 0.86,
        batchBonus: 2,
        eliteBonus: 0.11,
        weights: { basic: 0.36, speed: 0.28, tank: 0.36, ranged: 0 },
      },
      9: {
        label: "최종 전 압박",
        spawnRate: 0.78,
        batchBonus: 2,
        eliteBonus: 0.16,
        weights: { basic: 0.33, speed: 0.42, tank: 0.25, ranged: 0 },
      },
    },
    phonePresets: [
      {
        key: "galaxy-s24",
        label: "갤럭시 S24 / S25 / S26",
        width: 360,
        height: 780,
        note: "FHD+ 1080x2340 기준 CSS 플레이 영역 360x780",
      },
      {
        key: "galaxy-s24-plus",
        label: "갤럭시 S24+ / S25+",
        width: 412,
        height: 892,
        note: "QHD+ 1440x3120 기준 CSS 플레이 영역 412x892",
      },
      {
        key: "galaxy-s24-ultra",
        label: "갤럭시 S24 Ultra / S25 Ultra",
        width: 412,
        height: 892,
        note: "QHD+ 1440x3120 기준 CSS 플레이 영역 412x892",
      },
      {
        key: "galaxy-s26-large",
        label: "갤럭시 S26+ / S26 Ultra 예상",
        width: 412,
        height: 892,
        note: "대형 갤럭시 QHD+ 계열 임시 대응",
      },
    ],
    defaultConfig: {
      slotHp: 420,
      monsterHp: 22,
      monsterDamage: 1,
      monsterSpeed: 34,
      monsterRadius: 11,
      eliteMonsterRadius: 14,
      monsterAttackRate: 1.35,
      monsterSpawnSec: 0.34,
      spawnBatch: 2,
      spawnSlotMinDistance: 42,
      eliteRate: 0.035,
      eliteHpMult: 1.8,
      eliteDamageMult: 1.55,
      basicMonsterWeight: 0.44,
      tankMonsterWeight: 0.12,
      speedMonsterWeight: 0.34,
      rangedMonsterWeight: 0,
      tankMonsterHpMult: 32.7272727273,
      tankMonsterSpeedMult: 0.55,
      tankMonsterDamageMult: 0.65,
      tankMonsterTaunt: 7,
      speedMonsterHpMult: 6.1363636364,
      speedMonsterSpeedMult: 1.8,
      speedMonsterDamageMult: 0.35,
      speedMonsterPack: 2,
      rangedMonsterHpMult: 4.0909090909,
      rangedMonsterSpeedMult: 0.78,
      rangedMonsterDamageMult: 0.7,
      rangedMonsterAttackRange: 126,
      baseBullets: 4,
      comboBulletBonus: 0,
      maxBullets: 14,
      bulletDamage: 24,
      bulletSpeed: 720,
      bulletRetargetRange: 150,
      basicDamageMod: 1.05,
      scatterDamageMod: 0.483,
      rangerDamageMod: 0.735,
      sniperDamageMod: 2.468,
      breakerDamageMod: 0.714,
      blastDamageMod: 0.777,
      supportDamageMod: 1.05,
      towerDamageRatio: 1.08,
      towerFireRate: 0.6,
      towerQueueLimit: 1,
      towerOverdriveDamageRatio: 0.3,
      sortHealAmount: 5,
      rerollCooldown: 14,
      baseRerollCharges: 2,
      looseThreeFillChance: 0.1,
      repairSortsRequired: 3,
      setsPerPiece: 3,
      fieldClearDamage: 180,
      fieldClearBossDamageRatio: 0.4,
      comboWindow: 5,
      comboFeverEnabled: false,
      enemyCap: 125,
      xpBase: 20,
      xpLevelGrowth: 12,
      commonRate: 0.5,
      rareRate: 0.3,
      legendaryRate: 0,
      uniqueRate: 0.2,
      splashRadius: 28,
      splashDamageRatio: 0.18,
      feverDuration: 10,
      totalWaves: 10,
      waveDuration: 32,
      midBossHpMult: 95,
      midBossDamage: 4,
      midBossSpeed: 18,
      finalBossHpMult: 295.4545454545,
      finalBossMeleeDamage: 10,
      finalBossRangedDamage: 2,
      finalBossSpeed: 21,
      finalBossRangedRange: 172,
      finalBossSummonSec: 9,
      finalBossSummonCount: 8,
      bossWarningTime: 0.75,
      bossMeleeWarningTime: 0.55,
      maxDamageUpgrades: 3,
      maxProjectileUpgrades: 3,
      maxFireRateUpgrades: 5,
      supportHealAmount: 22,
    },
  };
})();
