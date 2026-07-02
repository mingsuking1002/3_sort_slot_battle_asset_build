const column = (type, options = {}) => ({ type, ...options });

function table(primaryKey, runtimeTable, columns, options = {}) {
  const columnDefinitions = Object.fromEntries(
    columns.map(([name, type, settings = {}]) => [name, column(type, settings)])
  );
  const optionalHeaders = new Set(options.optionalHeaders || []);
  const requiredHeaders = Object.keys(columnDefinitions).filter((name) => !optionalHeaders.has(name));

  return {
    primaryKey,
    runtimeTable,
    status: "active",
    source: "종합 데이터 테이블_김시온_v1.0",
    requiredForFullImport: true,
    columns: columnDefinitions,
    requiredHeaders,
    foreignKeys: [],
    ignoredInputHeaders: [],
    ...options,
  };
}

const integer = "integer";
const number = "number";
const string = "string";
const boolean = "boolean";
const scalar = "scalar";
const jsonString = "json-string";

const presentationHeaders = (...headers) => ["*", "Desc", "Description", ...headers];

export const GAME_DATA_SCHEMA = {
  version: "2026-07-01-combat-balance-profile-v11",
  profile: "balance",
  documentationHeaders: [
    "*",
    "Desc",
    "Description",
    "몬스터 총합",
    "알림",
    "칼럼 설명",
    "칼럼명",
    "컬럼 설명",
    "필드 이름",
    "PK/FK",
    "연결 테이블. 칼럼",
    "연결 테이블. 컬럼",
    "설명",
    "우선순위",
    "구현 우선 순위",
    "자료형",
    "이미지",
    "최대 획득 보상",
  ],
  sources: {
    comprehensive: {
      title: "종합 데이터 테이블_김시온_v1.0",
      spreadsheetId: "13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g",
      role: "밸런스 프로필 공식 원천",
      notes: "현재 WaveData의 러시 별칭 ID는 WavePatternData.isRush 행에 순서대로 연결합니다.",
      tabGids: {
        LevelData: 1526616797,
        ExpData: 1128082159,
        StageData: 686994501,
        WaveData: 1240379266,
        WavePatternData: 451275482,
        MonsterGroupData: 223020161,
        PieceData: 609065975,
        TowerData: 420664100,
        ProjectileData: 473143608,
        RarityData: 1162340687,
        EffectData: 96645785,
        PerkData: 598436648,
        MonsterData: 2116604790,
      },
    },
    towerBalance: {
      title: "전투 밸런스 기획서_김시온_v0.1",
      spreadsheetId: "1bjLbK4Hls8CjeTz9JWnSBLWct_xlmht-A9kbNY1PKmI",
      role: "TowerData 수치 확인용. 최종 컬럼 계약은 종합 데이터 테이블을 우선",
    },
    schemaAudit: {
      title: "데이터 테이블-JS 매칭 점검표",
      spreadsheetId: "1VUhMCCl_D2DANbrX0yatzGNc-Xj5rBRMntJohnOFm6E",
      role: "시트와 JS의 미반영 컬럼 추적",
    },
  },
  tables: {
    StageData: table("StageID", "stages", [
      ["StageID", integer],
      ["WaveDataID", integer],
      ["MonsterGroupID_Normal", integer],
      ["MonsterGroupID_Speedy", integer],
      ["MonsterGroupID_Tanker", integer],
      ["WaveReward", integer],
      ["StageReward", integer],
      ["WaveDuration", number],
    ], {
      optionalHeaders: ["WaveDuration"],
      ignoredInputHeaders: presentationHeaders("StageName", "BossID", "BGID", "StageIcon"),
      foreignKeys: [
        { column: "WaveDataID", table: "WaveData", target: "WaveID" },
        { column: "MonsterGroupID_Normal", table: "MonsterGroupData", target: "MonsterGroupID" },
        { column: "MonsterGroupID_Speedy", table: "MonsterGroupData", target: "MonsterGroupID" },
        { column: "MonsterGroupID_Tanker", table: "MonsterGroupData", target: "MonsterGroupID" },
      ],
    }),

    WaveData: table("WaveID", "waves", [
      ["WaveID", integer],
      ...Array.from({ length: 9 }, (_, index) => [`WavePattern_${index + 1}`, integer]),
    ], {
      ignoredInputHeaders: presentationHeaders(),
      foreignKeys: Array.from({ length: 9 }, (_, index) => ({
        column: `WavePattern_${index + 1}`,
        table: "WavePatternData",
        target: "WavePatternID",
      })),
    }),

    WavePatternData: table("WavePatternID", "wavePatterns", [
      ["WavePatternID", integer],
      ["WaveType", scalar, { enum: [1, 2, 3, 4, "1", "2", "3", "4", "Normal", "Rush", "Boss", "Test"] }],
      ["isRush", scalar],
      ["Normal_Count", integer],
      ["Speedy_Count", integer],
      ["Tanker_Count", integer],
      ["NormalRate_1", number],
      ["NormalRate_2", number],
      ["NormalRate_3", number],
      ["Duration", number],
      ["WaveDuration", number],
    ], {
      optionalHeaders: ["WaveType", "isRush", "Duration", "WaveDuration"],
      ignoredInputHeaders: presentationHeaders("몬스터 총합"),
      notes: "NormalRate_1~3은 Normal_Count를 일반 몬스터 3종에만 분배하는 가중치이며 isRush는 WaveType=Rush로 정규화합니다.",
    }),

    MonsterGroupData: table("MonsterGroupID", "monsterGroups", [
      ["MonsterGroupID", integer],
      ["MonsterID_1", integer],
      ["MonsterID_2", integer],
      ["MonsterID_3", integer],
    ], {
      ignoredInputHeaders: presentationHeaders("NormalRate_1", "NormalRate_2", "NormalRate_3"),
      foreignKeys: Array.from({ length: 3 }, (_, index) => ({
        column: `MonsterID_${index + 1}`,
        table: "MonsterData",
        target: "MonsterID",
        allow: [0, ""],
      })),
    }),

    MonsterData: table("MonsterID", "monsters", [
      ["MonsterID", integer],
      ["MonsterType", integer],
      ["ExpTypeID", integer],
      ["MonsterHp", number],
      ["MonsterAtk", number],
      ["MonsterAtkSpeed", number],
      ["MonsterAtkRange", number],
      ["MonsterMoveSpeed", number],
    ], {
      ignoredInputHeaders: presentationHeaders("MonsterName", "MonsterSprite", "BossPatternGroupID"),
      foreignKeys: [
        { column: "ExpTypeID", table: "ExpData", target: "ExpTypeID", allow: [0, ""] },
      ],
    }),

    BossPatternGroupData: table("BossPatternGroupID", "bosses.*.patterns", [
      ["BossPatternGroupID", integer],
    ], {
      status: "excluded",
      requiredForFullImport: false,
      notes: "밸런스 프로필에서 보스 계열은 제외합니다.",
    }),

    BossPatternData: table("BossPatternID", "bosses.*.patterns", [
      ["BossPatternID", integer],
    ], {
      status: "excluded",
      requiredForFullImport: false,
      notes: "밸런스 프로필에서 보스 계열은 제외합니다.",
    }),

    BossData: table("BossID", "bosses", [
      ["BossID", integer],
    ], {
      status: "excluded",
      requiredForFullImport: false,
      notes: "현재 공식 데이터에 보스가 없으므로 파싱하지 않습니다.",
    }),

    PieceData: table("PieceID", "pieces", [
      ["PieceID", integer],
      ["PieceName", string],
      ["PieceType", scalar, { enum: [1, 2, 3, 4, 5, 6, "AR", "Shotgun", "Lange", "Tank", "Wide", "Buffer"] }],
      ["PieceGrade", integer],
      ["PieceLv", integer],
      ["ConnectTower", integer],
      ["PieceSprite", string],
    ], {
      optionalHeaders: ["PieceName", "PieceType", "PieceSprite"],
      ignoredInputHeaders: presentationHeaders(
        "PieceDesc", "Portrait", "PieceCartoon", "PieceDetailIllust"
      ),
      foreignKeys: [
        { column: "ConnectTower", table: "TowerData", target: "TowerID" },
      ],
      notes: "PieceType이 없으면 ConnectTower가 참조하는 TowerData.TowerType에서 파생합니다. PieceSprite의 단순 파일명은 assets/images/towers/<파일명>.png로 연결합니다. 구형 ConnectTower ID는 PieceType + PieceLv 기준으로 현재 TowerData ID에 연결합니다.",
    }),

    PieceUpgradeData: table("UpgradeID", "pieces.*.upgrade", [
      ["UpgradeID", integer],
      ["PieceGroupID", string],
      ["FromPieceID", integer],
      ["ToPieceID", integer],
    ], {
      source: "런타임 파생 데이터",
      status: "derived",
      requiredForFullImport: false,
      ignoredInputHeaders: presentationHeaders(),
      foreignKeys: [
        { column: "FromPieceID", table: "PieceData", target: "PieceID" },
        { column: "ToPieceID", table: "PieceData", target: "PieceID" },
      ],
    }),

    UpgradeCostData: table("PieceGrade", "pieces.*.upgradeCost", [
      ["PieceGrade", integer],
      ["PieceLv", integer],
      ["UpgradeCost", number],
    ], {
      status: "excluded",
      requiredForFullImport: false,
      primaryKeyColumns: ["PieceGrade", "PieceLv"],
      legacyPrimaryKey: "UpgradeCostID",
      notes: "아웃게임 기물 강화 비용이므로 전투 balance 프로필에서 제외합니다.",
    }),

    TowerData: table("TowerID", "towers", [
      ["TowerID", integer],
      ["TowerType", integer, { enum: [1, 2, 3, 4, 5, 6] }],
      ["TowerAiType", scalar, { enum: [1, 2, 3, 4, "1", "2", "3", "4", "basic", "basic-non", "shotgun", "heal"] }],
      ["TargetPriority", string, { enum: ["near", "far", "strong", "weak", "friendly", "cluster"] }],
      ["ProjectileType", string, { enum: ["normal", "explode", "pierce", "tank", "heal"] }],
      ["TowerAtk", number],
      ["TowerAtkSpeed", number],
      ["TowerMaxLange", number],
      ["TowerMaxAmmo", integer],
      ["TowerProjectile", integer],
      ["ProjectileCount", number],
      ["ProjectileSize", number],
      ["PiercingCount", integer],
      ["SplashRadius", number],
      ["current_hp", number],
      ["BulletSpeed", number],
      ["TowerLv", integer],
    ], {
      source: "종합 데이터 테이블 TowerData + 발사/타겟/투사체 분리 계약",
      optionalHeaders: ["TargetPriority", "ProjectileType", "TowerLv"],
      inputHeaderAliases: { TowerMaxRange: "TowerMaxLange", CurrentHp: "current_hp" },
      ignoredInputHeaders: presentationHeaders(
        "TowerName", "TowerTypeText", "SkillID", "TowerTypeName"
      ),
      foreignKeys: [
        { column: "TowerProjectile", table: "ProjectileData", target: "ProjectileID" },
      ],
      notes: "TowerType은 1 Basic, 2 Shotgun, 3 SR, 4 Mortar, 5 Boomer, 6 Buffer입니다. TowerMaxRange는 런타임 TowerMaxLange로 정규화합니다. TowerLv가 없으면 TowerID 마지막 두 자리에서 파생합니다.",
    }),

    ProjectileData: table("ProjectileID", "projectiles", [
      ["ProjectileID", integer],
      ["ProjectileType", scalar, { enum: [1, 2, 3, 4, 5, "Basic", "Snipe", "Tank", "Explode", "Heal"] }],
    ], {
      ignoredInputHeaders: presentationHeaders(
        "ProjectileName", "ProjectilePrefab", "PopEffectPrefab", "subPopEffect", "SubPopEffectPrefab"
      ),
    }),

    RarityData: table("PerkRarityID", "perks.rarities", [
      ["PerkRarityID", integer],
      ["Weight", number],
    ], {
      ignoredInputHeaders: presentationHeaders(
        "PerkRarityName", "Color", "PerkPanelCard", "PerkIconBG"
      ),
    }),

    TriggerData: table("TriggerID", "perks.upgrades[].trigger", [
      ["TriggerID", integer],
    ], {
      status: "excluded",
      requiredForFullImport: false,
      notes: "조건부 특전을 사용하지 않으므로 balance 프로필에서 제외합니다.",
    }),

    EffectData: table("EffectID", "perks.upgrades[].effectMeta", [
      ["EffectID", integer],
      ["BuffTowerType", scalar],
      ["ATK", number],
      ["ATKSpeed", number],
      ["ShotProjCount", number],
      ["MaxProj", number],
      ["ProjSize", number],
      ["ProjPiercing", number],
      ["current_hp", number],
      ["BuffType", scalar],
      ["BuffValue", number],
      ["IsOneOff", boolean],
      ["Duration", number],
    ], {
      optionalHeaders: ["BuffTowerType", "current_hp"],
      inputHeaderAliases: { CurrentHp: "current_hp", PercentHpDamage: "current_hp" },
      ignoredInputHeaders: presentationHeaders("Duration의 float은 초(s)단위."),
      notes: "CurrentHp는 대상 포탑 타입의 체력비례 피해 퍼센트 증가량으로 적용합니다.",
    }),

    PerkData: table("PerkID", "perks.upgrades", [
      ["PerkID", integer],
      ["EffectID", integer],
      ["MaxLevel", integer],
      ["PerkRarityType", integer],
      ["PerkTarget", scalar],
      ["IsActive", integer],
    ], {
      ignoredInputHeaders: presentationHeaders(
        "PerkName", "PerkDesc", "PerkTargetText", "IconResourceID", "IconResourceKey", "PieceTypeIcon", "TriggerID"
      ),
      foreignKeys: [
        { column: "EffectID", table: "EffectData", target: "EffectID" },
        { column: "PerkRarityType", table: "RarityData", target: "PerkRarityID" },
      ],
      notes: "현재 모든 특전은 선택 즉시 적용하며 조건부 TriggerID는 파싱하지 않습니다.",
    }),

    PerkActionData: table("ActionID", "perks.upgrades[].actions", [
      ["ActionID", integer],
      ["PerkID", integer],
      ["ActionType", string],
      ["ActionKey", string],
      ["Amount", number],
      ["Duration", number],
      ["PieceType", string],
      ["EnemyType", string],
      ["EnemyTypesJson", jsonString],
      ["ProjectileID", scalar],
    ], {
      source: "런타임 파생 데이터",
      status: "derived",
      requiredForFullImport: false,
      ignoredInputHeaders: presentationHeaders(),
      foreignKeys: [{ column: "PerkID", table: "PerkData", target: "PerkID" }],
    }),

    PerkLimitData: table("LimitID", "perks.upgrades[].limit", [
      ["LimitID", integer],
      ["PerkID", integer],
      ["ModKey", string],
      ["ConfigKey", string],
      ["SpecialProjectileID", scalar],
      ["Min", number],
      ["Max", number],
    ], {
      source: "런타임 파생 데이터",
      status: "derived",
      requiredForFullImport: false,
      ignoredInputHeaders: presentationHeaders(),
      foreignKeys: [{ column: "PerkID", table: "PerkData", target: "PerkID" }],
    }),

    LevelData: table("LevelID", "levelData", [
      ["LevelID", integer],
      ["GoalLevel", integer],
      ["RequiredXP", number],
      ["IsMaxLevel", integer],
      ["PerkEventType", scalar],
    ], {
      optionalHeaders: ["PerkEventType"],
      ignoredInputHeaders: presentationHeaders(),
    }),

    ExpData: table("ExpTypeID", "monsters.*.xp", [
      ["ExpTypeID", integer],
      ["ExpAmount", number],
    ], {
      ignoredInputHeaders: presentationHeaders("BlockSpriteKey"),
    }),

    Resource: table("ResourceKey", "resources", [
      ["ResourceKey", string],
    ], {
      status: "excluded",
      requiredForFullImport: false,
      notes: "이미지·오디오·리소스 키는 밸런스 프로필에서 제외합니다.",
    }),

    LocalizeData: table("Key", "localizeData", [
      ["Key", string],
    ], {
      status: "excluded",
      requiredForFullImport: false,
      notes: "이름·설명·로컬라이즈는 밸런스 프로필에서 제외합니다.",
    }),
  },
};

export const GAME_DATA_TABLE_ORDER = Object.keys(GAME_DATA_SCHEMA.tables);
