# 데이터 테이블 컬럼 감사

기준 시트:
- Google Sheet: `종합 데이터 테이블_김시온_v0.1`
- Spreadsheet ID: `13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g`
- 확인일: 2026-06-15

비교 대상:
- `assets/data/game-data.js`의 `designTableSchema`
- `assets/data/game-data.js`의 `designTables`

## 비교 원칙

- 구글 시트 컬럼을 최종 기준으로 둔다.
- `*` 컬럼은 원본에는 존재하지만 런타임에서 읽지 않는 보류/주석 컬럼이다.
- `Desc` / `Description`은 원본에는 존재하지만 인게임 로직에는 사용하지 않는 설명 컬럼이다.
- 현재 프로토타입 편의를 위해 추가한 컬럼은 가능하면 원본 테이블에서 제거하고, 공식 컬럼으로 흡수하거나 별도 공식 테이블로 승격해야 한다.

## 2026-06-15 반영 결과

스폰/보스/경험치 축은 최신 시트 구조에 맞춰 코드와 검증기가 반영되었다.

## 2026-06-16 컬럼 정렬 반영 결과

- `designTableSchema`에 원본 시트의 `*` 보류 컬럼을 추가했다.
- `ResourceData`는 시트명 기준 `Resource`로 정리하고, 기존 참조용 alias만 유지했다.
- `LocalizeData`는 `English(en)`, `Korean(ko)`와 각 Comments 컬럼 기준으로 정리했다.
- `EffectData` 행 데이터도 공식 컬럼만 남겼다. 런타임 액션은 `PerkActionData`, 선택 제한은 `PerkLimitData`, 카드 문구는 `PerkData`에서 조립한다.
- `PieceData` 공식 컬럼 밖에 있던 `Owned`는 제거하고, 시작 보유 여부는 런타임 기본 보유 ID 목록으로 분리했다.
- `PieceData`, `PieceUpgradeData`, `TowerData`는 검증기에서 공식 컬럼 외 필드를 실패 처리한다.
- 검증기는 스키마 컬럼 순서와 모든 공식 `designTables` 행의 공식 컬럼 보유 여부를 함께 검사한다.
- `Stage/Wave/Monster/Exp` 어댑터 검증을 강화했다. 각 런타임 웨이브, 패턴, 이벤트 몬스터 그룹은 원본 ID 참조를 보존하며, 허수아비 스테이지 패턴도 웨이브별 고유 키로 생성한다.

| 테이블 | 반영 상태 |
|---|---|
| `StageData` | `MonsterGroupID_Normal/Speedy/Tanker`, `BossID`, `WaveReward`, `StageReward`, `BGID` 사용 |
| `WaveData` | `WaveID`, `WavePattern_1~9` 사용 |
| `WavePatternData` | `WavePatternID`, `Normal_Count`, `Speedy_Count`, `Tanker_Count` 사용 |
| `MonsterGroupData` | `MonsterGroupID`, `MonsterID_1~3` 사용. 일반 그룹만 `NormalRate_1~3` 적용 |
| `MonsterData` | `ExpTypeID` 포함 구조 사용 |
| `ExpData` | `ExpTypeID` 기준 경험치 연결 사용 |
| `BossData` | 신규 공식 후보 테이블로 `BossID`, `MonsterID`, `SummonMonsterGroupID` 사용 |
| `PerkData` | 구글 시트 기준 카드 컬럼만 사용 |
| `PerkActionData` | 신규 공식 후보 테이블로 실제 특전 효과 행 관리 |
| `PerkLimitData` | 신규 공식 후보 테이블로 특전별 상한 조건 관리 |

주의할 점:

- 10웨이브는 `WaveData`에 존재하지 않는다. `StageData.BossID`가 있으면 런타임에서 10웨이브 보스전이 자동 생성된다.
- 현재 `BossData`는 보스 선택/등장 위치/소환 그룹을 제어한다. 보스 체력, 근접 공격, 원거리 공격, 예고 연출은 기존 보스 런타임 기본값을 유지한다.
- 구글 시트에 아직 `BossData` 탭이 없다면 이 구조를 공식 탭으로 추가해야 한다.

## 즉시 일치하는 테이블

아래 테이블은 구글 시트와 현재 코드의 핵심 컬럼이 거의 일치한다.

| 테이블 | 메모 |
|---|---|
| `PieceData` | `*`, `Desc` 포함 상태로 반영 완료 |
| `PieceUpgradeData` | 신규 공식 후보 테이블로 `FromPieceID -> ToPieceID` 강화 교체 구조 반영 완료 |
| `ProjectileData` | `*` 제외 시 일치 |
| `RarityData` | `*` 제외 시 일치 |
| `TriggerData` | `*` 제외 시 일치 |

## 구조 변경이 필요한 테이블

### StageData

구글 시트 기준:

```text
StageID, StageName, WaveDataID, MonsterGroupID_Normal, MonsterGroupID_Speedy, MonsterGroupID_Tanker, BossID, WaveReward, StageReward, BGID, *, Desc
```

현재 코드:

```text
StageID, StageName, WaveDataID, MonsterGroupKey_Normal, MonsterGroupKey_Elite_1, MonsterGroupKey_Elite_2, BossKey, ClearReward, BGKey, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 이름 변경 | `MonsterGroupKey_Normal` -> `MonsterGroupID_Normal` |
| 이름 변경 | `MonsterGroupKey_Elite_1` -> `MonsterGroupID_Speedy` |
| 이름 변경 | `MonsterGroupKey_Elite_2` -> `MonsterGroupID_Tanker` |
| 이름 변경 | `BossKey` -> `BossID` |
| 이름 변경 | `BGKey` -> `BGID` |
| 구조 변경 | `ClearReward` -> `WaveReward`, `StageReward` |

판단:
- 최신 시트는 문자열 Key보다 정수 ID 참조를 더 강하게 밀고 있다.
- 런타임 어댑터는 StageData에서 문자열 그룹 키를 읽는 구조를 버리고, 정수 `MonsterGroupID_*`를 통해 `MonsterGroupData`를 찾아야 한다.

### WaveData

구글 시트 기준:

```text
WaveID, WavePattern_1, WavePattern_2, WavePattern_3, WavePattern_4, WavePattern_5, WavePattern_6, WavePattern_7, WavePattern_8, WavePattern_9, *, Desc
```

현재 코드:

```text
WaveDataID, WavePattern_1, WavePattern_2, WavePattern_3, WavePattern_4, WavePattern_5, WavePattern_6, WavePattern_7, WavePattern_8, WavePattern_9, WavePattern_10, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 이름 변경 | `WaveDataID` -> `WaveID` |
| 제거 후보 | `WavePattern_10` |

판단:
- 현재 게임은 10웨이브 구조로 구현되어 있으나, 최신 시트 헤더는 9개 패턴만 가진다.
- 10웨이브가 계속 필요하면 구글 시트에 `WavePattern_10`을 추가해야 한다.
- 구글 시트가 맞다면 런타임도 9개 일반/보스 구조로 재해석해야 한다.

### WavePatternData

구글 시트 기준:

```text
WavePatternID, WaveType, Normal_Count, Speedy_Count, Tanker_Count, *, 몬스터 총합, Desc
```

현재 코드:

```text
WavePaternID, WaveType, Normal_Count, Elite_1_Count, Elite_2_Count, Boss_Count, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 오타 수정 | `WavePaternID` -> `WavePatternID` |
| 이름 변경 | `Elite_1_Count` -> `Speedy_Count` |
| 이름 변경 | `Elite_2_Count` -> `Tanker_Count` |
| 제거 후보 | `Boss_Count` |
| 원본 전용 | `몬스터 총합` |

판단:
- 최신 시트는 몬스터 구분을 `Normal/Speedy/Tanker`로 고정하고 있다.
- 현재 코드의 `Elite_1/Elite_2` 추상명은 버리는 쪽이 좋다.
- `몬스터 총합`은 계산/확인용으로 보이며 런타임 입력값으로 쓰지 않는 편이 안전하다.

### MonsterGroupData

구글 시트 기준:

```text
MonsterGroupID, MonsterID_1, MonsterID_2, MonsterID_3, NormalRate_1, NormalRate_2, NormalRate_3, *, Desc
```

현재 코드:

```text
MonsterGroupID, MonsterID_1, MonsterID_2, MonsterID_3, NormalRate_1, NormalRate_2, NormalRate_3, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 런타임 적용 범위 | `NormalRate_1~3`은 `MonsterGroupID_Normal`에 연결된 일반 몬스터 3종에만 적용 |

판단:
- 일반 그룹은 `MonsterID_1~3`과 `NormalRate_1~3`을 같은 번호로 묶어 사용한다.
- 속도형/탱커형 그룹은 `NormalRate_1~3`을 사용하지 않고 `0`으로 둔다.

### MonsterData

구글 시트 기준:

```text
MonsterID, MonsterName, MonsterType, ExpTypeID, MonsterHp, MonsterAtk, MonsterAtkSpeed, MonsterAtkRange, MonsterMoveSpeed, MonsterSprite, *, Desc
```

현재 코드:

```text
MonsterID, MonsterName, MonsterType, MonsterHp, MonsterAtk, MonsterAtkSpeed, MonsterAtkRange, MonsterMoveSpeed, MonsterSprite, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 추가 필요 | `ExpTypeID` |
| 순서 변경 | `ExpTypeID`가 `MonsterType` 뒤에 들어감 |

판단:
- 경험치 연결은 이제 `MonsterType` 문자열이 아니라 `ExpTypeID`로 해야 한다.
- `ExpData`도 이에 맞춰 변경해야 한다.

### ExpData

구글 시트 기준:

```text
ExpTypeID, ExpAmount, BlockSpriteKey, *, Description
```

현재 코드:

```text
MonsterType, ExpAmount, BlockSpriteKey, Description
```

차이:

| 종류 | 컬럼 |
|---|---|
| 이름/타입 변경 | `MonsterType` -> `ExpTypeID` |

판단:
- `MonsterData.ExpTypeID -> ExpData.ExpTypeID`가 공식 연결이다.
- 현재 `MonsterType` 기반 XP 어댑터는 교체해야 한다.

### LevelData

구글 시트 기준:

```text
LevelID, GoalLevel, RequiredXP, IsMaxLevel, *, Description, PerkEventType
```

현재 코드:

```text
GoalLevel, RequiredXP, IsMaxLevel, PerkEventType, Description
```

차이:

| 종류 | 컬럼 |
|---|---|
| 추가 필요 | `LevelID` |
| 순서 변경 | `PerkEventType`이 마지막으로 이동 |

판단:
- PK는 `GoalLevel`이 아니라 `LevelID`로 변경하는 것이 최신 시트 기준에 맞다.
- 런타임은 여전히 `GoalLevel`로 레벨 값을 읽으면 된다.

### TowerData

2026-06-19 밸런스 시트 반영 기준:

```text
TowerID, TowerName, TowerType, TowerAiType, TargetPriority, ProjectileType, TowerAtk, TowerAtkSpeed, TowerMaxLange, TowerMaxAmmo, SkillID, TowerProjectile, ProjectileCount, ProjectileSize, PiercingCount, SplashRadius, current_hp, *, Desc, TowerLv
```

현재 코드:

```text
TowerID, TowerName, TowerType, TowerAiType, TargetPriority, ProjectileType, TowerAtk, TowerAtkSpeed, TowerMaxLange, TowerMaxAmmo, SkillID, TowerProjectile, ProjectileCount, ProjectileSize, PiercingCount, SplashRadius, current_hp, *, Desc, TowerLv
```

차이:

| 종류 | 컬럼 |
|---|---|
| 반영 완료 | `TowerAiType`, `TargetPriority`, `ProjectileType`을 분리해 발사 방식/타겟/명중 효과 의미를 정렬 |
| 삭제 완료 | 런타임 `aiType`의 구형 타겟 우선순위 의미를 제거하고 `TowerAiType` 발사 방식으로 재정의 |

판단:
- Drive `밸런스 시트_김시온_v0.1 / TowerData`의 7001~7030 수치를 우선 사용한다.
- 공식 테이블의 `TowerType` 숫자값은 런타임에서 1 basic, 2 scatter, 3 sniper, 4 breaker, 5 blast, 6 support로 변환한다.
- `current_hp` / `CurrentHp`는 포탑 체력이 아니라 체력비례 피해 퍼센트로 런타임 `percentHpDamage`에 연결한다. `3`은 3%로 해석한다.
- `EffectData.current_hp` / `CurrentHp`는 특전 선택 시 대상 `PerkTarget` 포탑 타입의 체력비례 피해에 더한다.
- 실제 소팅 슬롯 체력 공식은 기존 `defaultConfig.slotHp` 흐름을 유지한다.
- 신규 포탑은 `TowerAiType=basic/basic-non/shotgun/heal`, `TargetPriority=near/far/strong/weak/friendly/cluster`, `ProjectileType=normal/explode/pierce/tank/heal` 조합으로 추가한다. 현재 공식 보조형은 `TowerAiType=heal`, `TargetPriority=near`, `ProjectileType=heal`로 적을 공격하고 명중 시 최저 체력 슬롯을 회복한다.
- `TowerAtk`는 1발 기준 피해 원천이다. 런타임의 `damageMod`는 `TowerAtk / 24`로 만들어지고, `towerDamageRatio=1`을 곱해 결과 피해가 시트 공격력과 일치한다.
- `ProjectileCount`는 기본 발사 수 원천이다. 기존 `baseBullets`는 공식 데이터가 없는 fallback 성격이며, 공식 포탑은 시트 발사 수에서 시작한다.
- `TowerMaxLange`, `ProjectileSize`, `SplashRadius`, `MonsterAtkRange`는 Unity 기본 단위의 Collider Radius 값으로 입력하고 런타임에서 `1 Unity unit = 128px`로 일괄 변환한다.
- `TowerAtkSpeed`는 0.1까지 허용한다. 가비 Lv5의 0.1이 공식 밸런스 값이다.
- 전투 중 포탑 생애주기는 데이터 컬럼이 아니라 런타임 `idle/search/attack/destroyed` 상태로 관리한다. 탄약 소진 또는 슬롯 HP 0이 `destroyed` 전환 조건이다.
- 공격 확정 전 타겟은 `TargetPriority`와 사거리 기준을 모두 만족해야 한다. 유도 투사체는 발사 대상 사망 시 재타겟하지 않고 소멸한다.

### ProjectileData

구글 시트 기준:

```text
ProjectileID, ProjectileType, ProjectileName, ProjectilePrefab, *, Desc
```

판단:
- `ProjectileData`는 타입/이름/프리팹 중심으로 유지한다. 공식 행은 6001 Basic, 6002 Snipe, 6003 Tank, 6004 Explode, 6005 Heal이다.
- `ProjectileType`은 발사 방식이 아니라 명중 효과다. 현재 허용값은 `normal`, `explode`, `pierce`, `tank`, `heal`이다. `heal`은 비공격 회복이 아니라 적 명중 후 최저 체력 슬롯을 회복하는 효과다.
- 6001은 세린/basic과 도이/scatter가 공유한다. 따라서 탄속/피해비/수명/유도 여부 같은 내부 수치는 `TowerData.TowerAiType`과 `ProjectileData.ProjectileType` 조합으로 포탑별 override에 채운다.
- 크기/관통/스플래시처럼 타워마다 달라질 수 있는 값은 `TowerData.ProjectileSize`, `PiercingCount`, `SplashRadius`가 덮어쓴다.
- 검증기의 `INTERNAL_STATS` 항목이 이 연결을 확인한다.

### PieceUpgradeData

구글 시트 신규 후보:

```text
UpgradeID, PieceGroupID, FromPieceID, ToPieceID, *, Desc
```

판단:
- 사용자가 의도한 강화 방식은 `PieceLv` 숫자만 올리는 구조가 아니라, 레벨별 `PieceData`/`TowerData` 행을 따로 두고 보유 `PieceID`를 교체하는 구조다.
- 강화 비용은 `UpgradeCostData`로 분리한다.
- `ToPieceID`는 상점 상품으로 풀지 않고, `PieceUpgradeData`를 통해서만 획득한다.
- 현재 프로토타입은 공통 성장 템플릿을 사용하지 않고 `8001 -> 8002`처럼 `PieceUpgradeData`에 적힌 공식 PieceID 매칭을 그대로 따른다.
- 공식 1성 강화 비용은 현재 레벨 기준 100/200/300/400을 사용한다.

### EffectData

구글 시트 기준:

```text
EffectID, BuffTowerType, ATK, ATKSpeed, ShotProjCount, MaxProj, ProjSize, ProjPiercing, BuffType, BuffValue, IsOneOff, Duration, *, Desc
```

현재 코드:

```text
EffectID, BuffTowerType, ATK, ATKSpeed, ShotProjCount, MaxProj, ProjSize, ProjPiercing, BuffType, BuffValue, IsOneOff, Duration, RuntimePerkID, TargetType, RequireActiveType, ActionsJson, LimitJson, Title, Body, ShortBody, *, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 공식 컬럼 반영 | `*` |
| 과도기 표시/호환 메타 | `RuntimePerkID`, `TargetType`, `RequireActiveType`, `Title`, `Body`, `ShortBody` |
| 과도기 호환 메타 | `ActionsJson`, `LimitJson` |

판단:
- 실제 효과/제한은 이제 `PerkActionData`, `PerkLimitData`가 우선이다.
- `ActionsJson`, `LimitJson`은 과도기 호환용 fallback이다. 신규 데이터는 넣지 않는 것을 원칙으로 한다.
- `Title/Body/ShortBody` 계열은 다음 단계에서 `LocalizeData` 또는 표시 전용 테이블로 이관하는 것이 좋다.

### PerkData

구글 시트 기준:

```text
PerkID, EffectID, PerkName, PerkDesc, IconResourceID, TriggerID, MaxLevel, PerkRarityType, PerkTarget, IsActive, *, Desc
```

현재 코드:

```text
PerkID, EffectID, PerkName, PerkDesc, IconResourceID, TriggerID, MaxLevel, PerkRarityType, PerkTarget, IsActive, *, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 반영 완료 | 구글 시트 기준 컬럼/순서와 일치 |

판단:
- `PerkName`, `PerkDesc`는 Localize Key로 쓰는 것이 원본 의도에 맞다.
- 실제 효과는 `PerkActionData`, 선택 상한은 `PerkLimitData`에서 읽는다.

### PerkActionData

구글 시트 신규 후보:

```text
ActionID, PerkID, ActionType, ActionKey, Amount, PieceType, EnemyType, EnemyTypesJson, *, Desc
```

판단:
- `PerkData`를 카드 정보로 깨끗하게 유지하기 위해 추가한 공식 후보 테이블이다.
- 한 특전에 여러 액션이 필요하면 같은 `PerkID`로 여러 행을 추가한다.
- 런타임은 이 테이블을 최우선으로 읽고, 없을 때만 구형 `ActionsJson` fallback을 읽는다.

### PerkLimitData

구글 시트 신규 후보:

```text
LimitID, PerkID, ModKey, ConfigKey, Min, Max, *, Desc
```

판단:
- 투사체 증가 최대 3회 같은 상한 조건을 카드 데이터에서 분리하기 위한 공식 후보 테이블이다.
- 런타임은 이 테이블을 최우선으로 읽고, 없을 때만 구형 `LimitJson` fallback을 읽는다.

### LocalizeData

구글 시트 기준:

```text
Key, Id, Shared Comments, English(en), English(en) Comments, Korean(ko), Korean(ko) Comments
```

현재 코드:

```text
Key, Id, Shared Comments, English(en), English(en) Comments, Korean(ko), Korean(ko) Comments
```

차이:

| 종류 | 컬럼 |
|---|---|
| 반영 완료 | 구글 시트 기준 컬럼/순서와 일치 |

판단:
- 런타임 로컬라이즈 함수는 새 컬럼명과 기존 컬럼명을 모두 읽는 과도기 호환을 유지한다.

### Resource

구글 시트 기준:

```text
ResourceID, Root, Root, Desc
```

현재 코드:

```text
ResourceID, Root, ResourceKey, Desc
```

차이:

| 종류 | 컬럼 |
|---|---|
| 반영 완료 | 테이블명은 `Resource`로 정리 |
| 시트 정정 권장 | 구글 시트의 두 번째 `Root`는 `ResourceKey`로 보는 것이 안전 |

판단:
- 구글 시트의 `Root, Root` 중복은 애매하다.
- 코드는 `Resource` 테이블명으로 맞췄고, 기존 `ResourceData` 참조는 alias로만 유지한다.

### UpgradeCostData

구글 시트 신규 후보:

```text
UpgradeCostID, UpgradeID, CurrencyType, UpgradeCost, *, Desc
```

현재 코드:

```text
UpgradeCostID, UpgradeID, CurrencyType, UpgradeCost, *, Desc
```

판단:
- `PieceUpgradeData`는 강화 연결만 담당하고, 이 테이블이 비용을 담당한다.
- `UpgradeID`는 `PieceUpgradeData.UpgradeID`와 1:1로 연결한다.
- 현재 프로토타입의 강화 재화는 `gold`만 사용한다.

### BossData

구글 시트 기준:

```text
없음
```

현재 코드:

```text
BossKey, BossName, BossKind, MonsterID, HpMult, MeleeDamage, RangedDamage, Speed, AttackRate, RangedRate, AttackRange, MeleeRange, Radius, Taunt, Exp, SpawnXRatio, SpawnYRatio, SummonMonsterID, SummonInterval, SummonCount, SummonRadiusMin, SummonRadiusMax, WarningRangedDelay, WarningMeleeDelay, Banner, Desc
```

판단:
- 지금 게임에는 보스 런타임 정보가 필요하다.
- 구글 시트 기준과 맞추려면 `BossData`를 새 공식 시트로 추가하는 방향이 가장 낫다.
- 대안으로 보스도 `MonsterData`만으로 표현할 수 있지만, 소환/원거리/근접/예고 패턴이 있어 `MonsterData`에 넣으면 더 지저분해진다.

## 추천 기준안

테이블을 교체하기 쉬운 구조로 가려면 아래 기준을 추천한다.

1. 구글 시트와 `designTableSchema` 컬럼을 1:1로 맞춘다.
2. 구글 시트에 없는 컬럼은 `designTables`에서 제거한다.
3. 게임에 꼭 필요한데 구글 시트에 없는 데이터는 임시 확장 객체가 아니라 공식 신규 테이블로 승격한다.
4. `BossData`, `UpgradeCostData`, `PerkActionData`, `PerkLimitData`를 공식 신규 테이블 후보로 둔다.
5. 기존 어댑터의 구형 컬럼명 호환층은 검증 완료 후 순차 제거한다. `TowerAiType`은 공식 발사 방식 컬럼으로 재정의했다.

## 작업 순서 제안

1. `designTableSchema`를 구글 시트 기준으로 먼저 변경한다.
2. `designTables` 행 데이터를 신형 컬럼명으로 변환한다.
3. `Stage/Wave/Monster/Exp` 어댑터를 ID 참조 구조로 변경한다.
4. `LevelData`, `TowerData`, `Resource`의 컬럼명/순서를 맞춘다. `TowerData`의 `TowerAiType` 공식화는 완료했다.
5. 완료: `UpgradeCostData`를 추가해 강화 연결과 강화 비용을 분리한다.
6. `PerkData/EffectData` 확장 컬럼을 제거하고, 필요한 기능을 공식 신규 테이블로 분리한다.
7. `BossData`를 공식 신규 테이블로 유지할지, 구글 시트에 추가할지 결정한다.
8. 검증기를 구글 시트 컬럼 기준으로 업데이트한다.
