# 데이터 테이블 기획서 구조 전환 메모

기준 문서:
- `_doc_hub_exports/text/17_sheet_데이터 테이블_김시온_v0.1 데이터 테이블 구조도.txt`
- `_doc_hub_exports/text/05_doc_몬스터 스폰 시스템_최선동_v2.3 웨이브&몬스터 스폰 시스템_데이터 테이블_v0.1.txt`
- `_doc_hub_exports/text/11_sheet_스테이지 시작 및 슬롯 기물 배치 기획서_임소영_v1.3.txt`
- `_doc_hub_exports/text/20_sheet_기물 시스템 기획서_이동우_v0.3.txt`

## 목표

현재 프로토타입의 `game-data.js`는 런타임 편의를 위해 camelCase 객체 테이블을 사용한다. 앞으로는 기획서의 PascalCase 데이터 테이블 구조를 원본 스키마로 두고, 런타임은 어댑터를 통해 필요한 형태로 읽는다.

## 기획서 기준 핵심 규칙

- 테이블명/컬럼명은 PascalCase를 기본으로 사용한다.
- `ID` 컬럼은 정수 행 참조용 값이다.
- `Key` 컬럼은 사람이 읽기 쉬운 문자열 참조, 리소스, 로컬라이즈, Enum성 값에 사용한다.
- `Desc`는 확인용 설명이며 인게임 로직 데이터에서 제외한다.
- `*` 컬럼은 읽지 않는 주석/보류 컬럼으로 간주한다.

## 2026-06-15 현재 반영 기준

최신 구글 시트 `종합 데이터 테이블_김시온_v0.1` 기준으로 스폰/보스 구조를 재정렬했다.

- `StageData`는 `MonsterGroupID_Normal`, `MonsterGroupID_Speedy`, `MonsterGroupID_Tanker`, `BossID`, `WaveReward`, `StageReward`, `BGID`를 사용한다.
- `WaveData`는 `WaveID`와 `WavePattern_1~9`만 사용한다.
- 10웨이브는 `WaveData`에 넣지 않고 `StageData.BossID -> BossData.BossID`로 자동 생성한다.
- `WavePatternData`는 `WavePatternID`, `Normal_Count`, `Speedy_Count`, `Tanker_Count`를 사용한다.
- `MonsterGroupData`는 `MonsterGroupID`, `MonsterID_1~3` 후보군을 사용하고, `MonsterGroupID_Normal` 그룹에만 `NormalRate_1~3` 일반 몬스터 3종 가중치를 적용한다.
- `MonsterData.ExpTypeID -> ExpData.ExpTypeID`가 경험치 드랍 연결 기준이다.
- `BossData`는 `BossID`, `MonsterID`, `SummonMonsterGroupID`, `SummonInterval`, `SummonCount`, `SpawnXRatio`, `SpawnYRatio`를 사용한다.
- 보스 체력/공격/예고 연출의 기존 감각은 런타임 기본 보스 값으로 보존하고, `BossData`는 보스 선택과 소환 패턴을 우선 제어한다.
- 보상 재화 구분은 없다. `WaveReward`는 웨이브 클리어마다 지급되는 골드, `StageReward`는 스테이지 전체 클리어 시 지급되는 골드다.

## 2026-06-19 밸런스 시트 반영 기준

Drive의 `밸런스 시트_김시온_v0.1 / TowerData`를 포탑 전투 수치의 우선 원천으로 반영했다.

- `PieceData`는 공식 ID `8001~8030`, `TowerData`는 공식 ID `7001~7030`, `ProjectileData`는 공식 ID `6001~6005`를 사용한다.
- 현재 활성 전투 계열은 6종이다: 세린/basic, 도이/scatter, 유진/sniper, 가비/breaker, 유은/blast, 리리/support.
- `ranger`는 공식 밸런스 테이블에 없는 확장 후보로 남기지 않고, 선택/생성 데이터와 활성 특전 풀에서 제외했다.
- `TowerAtk`는 실제 1발 기준 피해의 원천이다. 런타임 계산은 `bulletDamage(24) * towerDamageRatio(1) * damageMod(TowerAtk/24)`가 되어 결과적으로 `TowerAtk`와 일치한다.
- `ProjectileCount`는 기본 발사 수의 원천이다. `baseBullets`는 테이블이 없는 레거시 fallback 성격이며, 공식 포탑은 `ProjectileCount`에서 시작하고 콤보/특전 보너스만 더한다.
- `TowerAtkSpeed`, `TowerMaxAmmo`는 시트 값을 그대로 사용한다. 가비 Lv5의 `0.1`도 클램프에 걸리지 않도록 최소 공속 보정값을 낮췄다.
- `TowerMaxLange`는 시트의 보드 단위로 보고 런타임에서 `1 = 38px`로 변환한다. 예: 10 -> 380px, 20 -> 760px.
- `ProjectileSize`는 시트의 보드 단위로 보고 런타임에서 `1 = 20px`로 변환한다. 예: 0.25 -> 5px.
- 공식 `ProjectileData`의 6001은 기본형과 산탄형이 공유한다. 따라서 탄속/수명/유도/산탄 부채꼴 같은 행동값은 `TowerData.TowerAiType` 기준으로 포탑별 override에 저장한다.
- 리리/support는 적을 공격하는 포탑이다. `ProjectileType=heal` 탄이 적에게 명중하면 `TowerAtk`를 기본 회복량으로 가장 체력 비율이 낮은 슬롯을 회복한다.

## 현재 구조와 기획서 구조 차이

| 기획서 테이블 | 주요 컬럼 | 현재 런타임 대응 | 차이 |
|---|---|---|---|
| `StageData` | `StageID`, `StageName`, `WaveDataID`, `MonsterGroupID_Normal`, `MonsterGroupID_Speedy`, `MonsterGroupID_Tanker`, `BossID`, `WaveReward`, `StageReward`, `BGID`, `Desc` | `stages[]` | `StageID -> WaveDataID -> WavePattern_1~9`와 `BossID -> 10웨이브`로 변환한다. `WaveReward/StageReward`는 모두 골드다. |
| `WaveData` | `WaveID`, `WavePattern_1~9`, `Desc` | `waves{}` + `stages[].waveIds` | 1~9웨이브 패턴 묶음이다. 10웨이브는 보스 자동 생성 규칙으로 처리한다. |
| `WavePatternData` | `WavePatternID`, `WaveType`, `Normal_Count`, `Speedy_Count`, `Tanker_Count`, `몬스터 총합`, `Desc` | `wavePatterns{ events[] }` | 40초 동안 5초 간격 8회 스폰 이벤트로 분배된다. |
| `MonsterGroupData` | `MonsterGroupID`, `MonsterID_1~3`, `NormalRate_1~3`, `Desc` | `monsterGroups{ monsters{} }` | 일반 그룹은 일반 몬스터 3종을 같은 번호의 `NormalRate`로 분배한다. 속도형/탱커형 그룹에는 이 가중치를 적용하지 않는다. |
| `MonsterData` | `MonsterID`, `MonsterName`, `MonsterType`, `ExpTypeID`, `MonsterHp`, `MonsterAtk`, `MonsterAtkSpeed`, `MonsterAtkRange`, `MonsterMoveSpeed`, `MonsterSprite`, `Desc` | `monsters{}` + `defaultConfig` | 절대 스탯을 런타임 배율로 변환한다. 경험치는 `ExpTypeID`로 읽는다. |
| `BossData` | `BossID`, `BossName`, `MonsterID`, `SummonMonsterGroupID`, `SummonInterval`, `SummonCount`, `SpawnXRatio`, `SpawnYRatio`, `Desc` | `bosses{}` | 10웨이브 보스와 소환 몬스터 그룹을 관리한다. |
| `PieceData` | `PieceID`, `PieceName`, `PieceType`, `PieceDesc`, `PieceGrade`, `PieceLv`, `ConnectTower`, `Portrait`, `PieceSprite`, `*`, `Desc` | `pieces{}` | 공식 `8001~8030` 행을 사용한다. `PieceID -> ConnectTower -> TowerData`로 편성/소팅/상점 후보를 생성한다. |
| `PieceUpgradeData` | `UpgradeID`, `PieceGroupID`, `FromPieceID`, `ToPieceID`, `*`, `Desc` | `pieces.*.upgrade` | 강화 성공 시 `FromPieceID` 보유를 제거하고 `ToPieceID` 보유로 교체한다. |
| `UpgradeCostData` | `UpgradeCostID`, `UpgradeID`, `CurrencyType`, `UpgradeCost`, `*`, `Desc` | `pieces.*.upgradeCost` | `PieceUpgradeData.UpgradeID`별 강화 비용을 관리한다. 현재 재화는 골드만 사용한다. |
| `TowerData` | `TowerID`, `TowerName`, `TowerType`, `TowerAiType`, `TargetPriority`, `ProjectileType`, `TowerAtk`, `TowerAtkSpeed`, `TowerMaxLange`, `TowerMaxAmmo`, `SkillID`, `TowerProjectile`, `ProjectileCount`, `ProjectileSize`, `PiercingCount`, `SplashRadius`, `current_hp`, `*`, `Desc`, `TowerLv` | `towers{}` | 공식 `7001~7030` 행을 사용한다. `TowerType`은 역할, `TowerAiType`은 발사 방식, `TargetPriority`는 조준 규칙, `ProjectileType`은 명중 효과다. |
| `ProjectileData` | `ProjectileID`, `ProjectileType`, `ProjectileName`, `ProjectilePrefab` | `projectiles{}` | 공식 `6001~6005` 행을 사용한다. `ProjectileType`은 `normal/explode/pierce/tank/heal` 같은 명중 효과 기준으로 사용한다. 산탄/비유도 같은 발사 방식은 `TowerData.TowerAiType`에서 읽는다. |
| `RarityData` | `PerkRarityID`, `PerkRarityName`, `Weight`, `Color` | `perks.rarities` | 현재는 common/rare/legendary key 중심. 기획서는 정수 ID와 로컬라이즈 Key 중심. |
| `TriggerData` | `TriggerID`, `TriggerType`, `TriggerValue`, `RequiredTag`, `Desc` | `perks.upgrades[].triggerId/design` | 특전 조건 원본. 현재 런타임은 TriggerID 참조를 보존하고, 조건 로직은 어댑터가 해석한다. |
| `EffectData` | `EffectID`, `BuffTowerType`, `ATK`, `ATKSpeed`, `ShotProjCount`, `MaxProj`, `ProjSize`, `ProjPiercing`, `BuffType`, `BuffValue`, `IsOneOff`, `Duration`, `*`, `Desc` | `perks.upgrades[].effectMeta` | 특전의 기본 수치 원본. 복합 효과는 별도 액션 테이블로 분리했다. |
| `PerkData` | `PerkID`, `EffectID`, `PerkName`, `PerkDesc`, `IconResourceID`, `TriggerID`, `MaxLevel`, `PerkRarityType`, `PerkTarget`, `IsActive`, `*`, `Desc` | `perks.upgrades[]` | 특전 카드 원본. 카드/등급/트리거만 담당하고 실제 효과는 액션 테이블에서 읽는다. |
| `PerkActionData` | `ActionID`, `PerkID`, `ActionType`, `ActionKey`, `Amount`, `PieceType`, `EnemyType`, `EnemyTypesJson`, `Desc` | `perks.upgrades[].actions` | 특전이 실제로 적용하는 효과 행이다. 한 특전에 여러 액션을 붙일 수 있다. |
| `PerkLimitData` | `LimitID`, `PerkID`, `ModKey`, `ConfigKey`, `Min`, `Max`, `Desc` | `perks.upgrades[].limit` | 특전별 최대 선택 횟수/상한 조건을 분리해서 관리한다. |
| `LevelData` | `LevelID`, `GoalLevel`, `RequiredXP`, `IsMaxLevel`, `Description`, `PerkEventType` | `levelData` | 레벨별 누적 경험치를 런타임 필요 경험치로 변환한다. |
| `ExpData` | `ExpTypeID`, `ExpAmount`, `BlockSpriteKey`, `Description` | `monsters.*.xp` | `MonsterData.ExpTypeID`로 연결한다. |
| `Resource` | `ResourceID`, `Root`, `ResourceKey`, `Desc` | 일부 리소스 경로/재화 객체 | 구글 시트명 기준. 기존 `ResourceData` 참조는 호환 alias로 유지. |
| `LocalizeData` | `Key`, `Id`, `Shared Comments`, `English(en)`, `English(en) Comments`, `Korean(ko)`, `Korean(ko) Comments` | `localizeData` | 구글 시트 현지화 헤더 기준. |

## 1차 반영 범위

이번 패치는 `game-data.js`에 다음을 추가한다.

- `designTableSchema`: 기획서 기준 테이블명, 컬럼, 타입, PK, 런타임 대응 테이블
- `designTables`: 현재 프로토타입 값을 기획서형 행 데이터로 옮긴 1차 원본 테이블
- `designRuntimeKeyMap`: 정수 ID 기반 기획서 테이블과 기존 string key 런타임을 잇는 매핑

## 다음 이행 순서

1. 완료: `StageData/WaveData/WavePatternData/MonsterGroupData`를 런타임 스폰 로직의 1차 원본으로 변경
2. 완료: `PieceData/TowerData/ProjectileData`를 포탑 소환 원본으로 변경
2-1. 완료: `PieceUpgradeData`와 `UpgradeCostData`를 추가해 기물 강화가 레벨 숫자 계산이 아니라 `PieceID` 교체와 비용 테이블 참조로 동작하게 변경
3. 완료: `RarityData/PerkData/EffectData/TriggerData`를 특전 선택 원본으로 연결. 모든 런타임 특전은 `designTables` 산출물이며, `legacy-extension` 특전은 더 이상 사용하지 않는다.
3-1. 완료: `PerkData`는 카드 정보만 남기고, 실제 효과는 `PerkActionData`, 상한 조건은 `PerkLimitData`로 분리했다.
4. 완료: `LevelData/ExpData`를 경험치와 레벨업 계산 원본으로 변경. `RequiredXP`는 누적 경험치로 보고, 런타임은 레벨별 필요량 `xpCostByLevel`로 변환한다. 비어 있는 레벨 구간은 인접 행 사이를 자동 보간한다.
5. 완료: 새 행 자동 반영. `designRuntimeKeyMap`에 수동 매핑이 없는 행도 ID 기반 런타임 키를 자동 생성한다.
6. 완료: `BossData`를 보스 런타임 원본으로 연결. `StageData.BossID`는 이제 `BossData.BossID`를 참조하고, 10웨이브 보스는 자동 생성된다.
7. 완료: `Stage/Wave/Monster/Exp` 어댑터의 ID 참조 추적 강화. 런타임 웨이브/패턴/이벤트 그룹은 원본 `StageID`, `WaveDataID`, `WavePatternID`, `MonsterGroupID`를 보존하고, 보스 경험치는 `BossData.MonsterID -> MonsterData.ExpTypeID -> ExpData.ExpAmount`로 계산한다.
8. 진행 중: `designTables` 행 데이터 컬럼을 신형/공식 컬럼 기준으로 정렬. `EffectData`의 런타임 보조 컬럼은 제거했고, 특전 실행 정보는 `PerkActionData`/`PerkLimitData`로 분리했다.
9. 완료: 별도 상점 화면은 주요 루프에서 제외하고, 미보유 기물 구매는 덱편성 스크롤 하단의 `보유 하지 않음` 섹션에서 처리한다. `ShopData`는 UI 탭이 아니라 기물 해금 비용 데이터로만 사용한다.
10. 기존 lowercase 테이블은 어댑터 산출물로만 남기고, 직접 수정 금지 영역으로 표시

## 새 데이터 추가 규칙

### 내부 전투 수치 채움 기준

런타임 전투 수치는 가능한 한 기획서형 테이블을 원천으로 사용한다. 테이블에 직접 없는 빈 값은 아래 기준으로 채운다.

| 대상 | 우선 원천 | 빈 값 기준 |
|---|---|---|
| 포탑 역할/발사/타겟/효과 | `TowerData.TowerType`, `TowerAiType`, `TargetPriority`, `ProjectileType` | 공식 포탑은 네 컬럼을 직접 입력한다. 런타임 `aiType`은 `TowerAiType`에서만 만든다. |
| 포탑 공격력/공속/사거리/탄약 | `TowerData.TowerAtk`, `TowerAtkSpeed`, `TowerMaxLange`, `TowerMaxAmmo` | 공격력/공속/탄약은 시트 값을 우선한다. `TowerMaxLange`가 30 이하이면 보드 단위로 보고 `x38px` 변환한다. |
| 투사체 크기/관통/스플래시 | `TowerData.ProjectileSize`, `PiercingCount`, `SplashRadius` | `ProjectileSize`가 2 이하이면 보드 단위로 보고 `x20px` 변환한다. 같은 `ProjectileID`를 공유해도 포탑별 override가 우선한다. |
| 투사체 속도/수명/유도/특수 피해 | `TowerData.TowerAiType` + `ProjectileData.ProjectileType` | `TowerAiType`으로 `basic/basic-non/shotgun/heal` 발사 방식을 정하고, `ProjectileType`으로 `normal/pierce/tank/explode/heal` 명중 효과 기준값을 채운다. `heal` 투사체는 적 명중 시 최저 체력 슬롯을 회복하는 효과다. |
| 몬스터 체력/공격/속도/사거리/경험치 | `MonsterData`, `ExpData` | 색상, 마크, 어그로, 묶음 수 같은 표시/보조값은 `MonsterType` 기준값으로 채운다. |
| 보스 전투 스탯 | `BossData.MonsterID -> MonsterData` | 보스 경고 시간, 근접 범위, 소환 반경 같은 보조값은 보스 기준값으로 채운다. |

검증기는 `INTERNAL_STATS` 항목으로 위 규칙을 확인한다.

### 새 기물 추가

새 캐릭터/기물을 만들 때는 최소 3개 행이 한 세트로 필요하다. 강화 단계를 쓰려면 레벨별 `PieceData/TowerData` 행, `PieceUpgradeData` 연결 행, `UpgradeCostData` 비용 행도 함께 추가한다.

1. `ProjectileData`에 새 `ProjectileID` 행을 추가한다.
2. `TowerData`에 새 `TowerID` 행을 추가하고 `TowerProjectile`에 위 `ProjectileID`를 연결한다.
3. `PieceData`에 새 `PieceID` 행을 추가하고 `ConnectTower`에 위 `TowerID`를 연결한다.
4. 이름/설명을 한국어로 깔끔하게 쓰고 싶으면 `LocalizeData`에 `PieceName`, `PieceDesc`, `TowerName`, `ProjectileName` 키를 추가한다.
5. 강화형 기물은 `PieceData.PieceLv`별로 별도 `PieceID`를 만들고, `PieceUpgradeData.FromPieceID -> ToPieceID`로 연결한다.
6. 강화 비용은 `UpgradeCostData.UpgradeID`에 같은 강화 규칙 ID를 넣고 `UpgradeCost`를 입력한다.

수동 매핑이 없으면 런타임 키는 자동으로 만들어진다.

| 테이블 | 자동 키 예시 |
|---|---|
| `PieceData.PieceID = 8031` | `piece_8031` |
| `TowerData.TowerID = 7031` | `tower_7031` |
| `ProjectileData.ProjectileID = 6008` | `proj_6008` |

새 기물은 자동으로 `loadout.selectablePieceKeys`에 들어간다. `PieceData`에는 공식 컬럼만 넣고, 시작 보유 기물은 코드의 `defaultOwnedPieceIds` 또는 저장 데이터 `defaultPlayerSave.ownedPieces`에서 관리한다. 비보유 기물은 상점 해금 대상이며, 별도 상점 비용이 없으면 `shop.fallbackUnlockCost`를 사용한다.

저장 데이터의 `selectedLoadout`이 비어 있거나 구형 로비 저장값이 유효하지 않으면 런타임은 `defaultPlayerSave.selectedLoadout`, 그 다음 `loadout.fallbackPieceKeys` 순서로 시작 편성을 복구한다. 프로토타입은 6명 편성을 전제로 전투에 진입하므로, 빈 저장값은 "무편성" 의도가 아니라 이전 버전 저장 마이그레이션 대상으로 취급한다.

### 포탑 전투 상태와 투사체 예외

포탑 데이터 컬럼은 포탑의 정적 정의만 담당하고, 전투 중 생애주기는 런타임 상태값으로 관리한다.

- 포탑 런타임 상태는 `idle -> search -> attack -> destroyed` 흐름을 기준으로 한다.
- 공격 확정 전에는 `TowerData.TargetPriority`와 `TowerData.TowerMaxLange`를 함께 확인해 사거리 안 대상만 조준한다.
- 탄약이 0이 되거나 소팅 슬롯 HP가 0이 되면 포탑은 `destroyed`로 전환되고 제거된다.
- 이미 발사된 비유도/범위 투사체는 포탑이 사라져도 자체 수명과 충돌 규칙으로 처리한다.
- 유도 투사체는 발사 시점의 대상만 추적한다. 대상이 사망하거나 전투 목록에서 제거되면 재타겟하지 않고 소멸한다.

### 기물 강화 규칙

강화는 스탯 계산식이 아니라 데이터 ID 교체 방식이다.

| 단계 | 보유 상태 |
|---|---|
| 강화 전 | `FromPieceID` 기물 보유 |
| 강화 성공 | `UpgradeCostData`의 비용 차감 |
| 강화 후 | `FromPieceID` 보유 제거, `ToPieceID` 보유 추가 |

예시:

| UpgradeID | PieceGroupID | FromPieceID | ToPieceID | 의미 |
|---|---|---:|---:|---|
| 880001 | `basic` | 8001 | 8002 | 세린 Lv1 -> Lv2 |
| 880002 | `basic` | 8002 | 8003 | 세린 Lv2 -> Lv3 |

| UpgradeCostID | UpgradeID | CurrencyType | UpgradeCost | 의미 |
|---:|---:|---|---:|---|
| 881001 | 880001 | `gold` | 100 | 세린 Lv1 -> Lv2 비용 |
| 881002 | 880002 | `gold` | 200 | 세린 Lv2 -> Lv3 비용 |

편성 중인 기물이 강화되면 편성 슬롯도 자동으로 다음 `PieceID`로 교체된다. `ToPieceID` 기물은 상점에 별도 상품으로 노출하지 않고 강화로만 획득한다.

### 새 스테이지 추가

새 스테이지를 만들 때는 다음 행을 함께 추가한다.

1. `WavePatternData`에 1~9웨이브 패턴 행을 추가한다.
2. `WaveData`에 9개 패턴을 `WavePattern_1~9`로 연결한다.
3. 필요하면 `MonsterGroupData`에 새 후보군을 추가한다.
4. 필요하면 `MonsterData`에 새 몬스터 행을 추가한다.
5. `BossData`에 보스 행을 추가하거나 기존 `BossID`를 사용한다.
6. `StageData`에 새 스테이지 행을 추가하고 `WaveDataID`, 몬스터 그룹, `BossID`, 보상, 배경을 연결한다.

수동 매핑이 없으면 `StageData.StageID = 1003`은 `stage_1003` 같은 런타임 키로 자동 생성되며, 메인화면 스테이지 화살표 목록에 포함된다.

### 새 보스 추가

새 보스는 `BossData` 행으로 추가한다.

1. 보스가 사용할 몬스터 외형/기본 타입을 `MonsterData`에 추가하거나 기존 `MonsterID`를 사용한다.
2. `BossData`에 새 `BossID` 행을 추가한다. 예: `9002`
3. `StageData.BossID`에 해당 `BossID`를 적는다.
4. 그 스테이지의 10웨이브는 `WaveData`와 별개로 해당 보스를 자동 사용한다.

보스가 소환 패턴을 쓰려면 `SummonMonsterGroupID`, `SummonInterval`, `SummonCount`를 채운다. `SummonMonsterGroupID = 0`이거나 `SummonCount = 0`이면 소환 패턴이 없는 보스로 처리된다.

### 새 특전 추가

새 특전은 `EffectData`, `PerkData`, `PerkActionData` 행을 한 세트로 추가한다. 선택 횟수 제한이 있으면 `PerkLimitData`도 함께 추가한다.

1. `EffectData`에 새 `EffectID` 행을 추가한다.
2. `PerkData`에 새 `PerkID` 행을 추가하고 `EffectID`를 연결한다.
3. `PerkRarityType`은 `RarityData.PerkRarityID`를 사용한다. 현재 `14=일반`, `13=희귀`, `11=전설`이다.
4. 실제 효과는 `PerkActionData`에 행 단위로 추가한다. 한 특전에 액션이 여러 개면 같은 `PerkID`로 여러 행을 만든다.
5. 최대 횟수 제한이 필요하면 `PerkLimitData`에 같은 `PerkID`로 제한 행을 추가한다.

`PerkActionData` 예시:

| ActionID | PerkID | ActionType | ActionKey | Amount | PieceType | EnemyType | EnemyTypesJson | Desc |
|---|---|---|---|---:|---|---|---|---|
| 30001 | 20001 | `addMod` | `supportHealBonus` | 8 |  |  |  | 보조형 회복량 증가 |

`PerkLimitData` 예시:

| LimitID | PerkID | ModKey | ConfigKey | Min | Max | Desc |
|---|---|---|---|---:|---:|---|
| 40001 | 20002 | `projectileUpgradeCount` | `maxProjectileUpgrades` | 1 | 3 | 투사체 증가 최대 3회 |
