# 데이터 테이블 컬럼 설명서

작성 기준: `2026-06-24`

이 문서는 프로토타입 런타임이 읽는 `designTables` 컬럼의 의미를 설명한다. 현재 전투/성장/스테이지 데이터의 기준은 `assets/data/game-data.js`의 `designTableSchema`이며, 로컬라이즈 테이블은 당분간 작업 대상에서 제외한다.

## 공통 규칙

| 컬럼 | 의미 |
|---|---|
| `*` | 시트 편집용 메모/구분 컬럼. 런타임 계산에는 사용하지 않는다. |
| `Desc`, `Description` | 편집자 설명. 일부 화면 설명 fallback으로 쓸 수 있지만 핵심 로직 값은 아니다. |
| `ID`로 끝나는 컬럼 | 다른 테이블 행을 참조하는 정수 ID다. |
| `Key`로 끝나는 컬럼 | 런타임 문자열 키, 리소스 키, 또는 표시 키다. |
| 비어 있는 수치 | 대부분 `0` 또는 테이블별 기본값으로 처리한다. 전투 핵심 수치는 가능하면 비워두지 않는다. |

## StageData

스테이지 1개를 정의한다.

| 컬럼 | 의미 |
|---|---|
| `StageID` | 스테이지 고유 ID. |
| `StageName` | 스테이지 표시명 또는 표시 키. |
| `WaveDataID` | 이 스테이지가 사용할 `WaveData` ID. |
| `MonsterGroupID_Normal` | 일반 몬스터 그룹 ID. |
| `MonsterGroupID_Speedy` | 빠른 몬스터 그룹 ID. |
| `MonsterGroupID_Tanker` | 탱커 몬스터 그룹 ID. |
| `BossID` | 마지막 웨이브에서 사용할 `BossData` ID. |
| `WaveReward` | 웨이브 보상 골드. |
| `StageReward` | 스테이지 클리어 보상 골드. |
| `BGID` | 배경 리소스 키. |

## WaveData

스테이지의 1~9웨이브 패턴 묶음을 정의한다. 10웨이브 보스는 `StageData.BossID`에서 생성한다.

| 컬럼 | 의미 |
|---|---|
| `WaveID` | 웨이브 묶음 고유 ID. |
| `WavePattern_1`~`WavePattern_9` | 각 웨이브가 사용할 `WavePatternData.WavePatternID`. |

## WavePatternData

한 웨이브 안에서 5초마다 어떤 몬스터 타입이 몇 마리씩 등장하는지 정의한다. 일반 웨이브는 40초이며 `0, 5, 10, 15, 20, 25, 30초`에 총 7번 스폰하고 `35~40초`는 신규 스폰 없이 정리 시간으로 사용한다.

| 컬럼 | 의미 |
|---|---|
| `WavePatternID` | 웨이브 패턴 고유 ID. |
| `WaveType` | 웨이브 성격. 예: normal, rush, mixed. |
| `Normal_Count` | 5초마다 소환할 일반 몬스터 수. |
| `Speedy_Count` | 5초마다 소환할 빠른 몬스터 수. |
| `Tanker_Count` | 5초마다 소환할 탱커 몬스터 수. |
| `몬스터 총합` | 시트 검산용 1회 스폰 합계. 런타임 핵심 계산에는 사용하지 않는다. 웨이브 예정 총량은 이 값의 7배다. |

## MonsterGroupData

스폰 이벤트에서 사용할 몬스터 ID 묶음이다.

| 컬럼 | 의미 |
|---|---|
| `MonsterGroupID` | 몬스터 그룹 고유 ID. |
| `MonsterID_1`~`MonsterID_3` | 그룹에 포함할 `MonsterData.MonsterID`. 빈 값은 무시한다. |
| `NormalRate_1`~`NormalRate_3` | `StageData.MonsterGroupID_Normal`에 연결된 일반 몬스터 그룹 전용 가중치. 같은 번호의 `MonsterID_1`~`MonsterID_3`에 대응하며, 일반 몬스터 3종의 비율 합계는 자유이고 런타임이 자동 정규화한다. 속도형/탱커형 그룹과 빈 몬스터 자리는 `0`을 입력한다. |

## MonsterData

일반/특수/보스 기반 몬스터의 전투 스탯이다.

| 컬럼 | 의미 |
|---|---|
| `MonsterID` | 몬스터 고유 ID. |
| `MonsterName` | 몬스터 표시명 또는 표시 키. |
| `MonsterType` | 런타임 타입. 예: basic, speed, tank, ranged, finalBoss. |
| `ExpTypeID` | 처치 시 지급할 경험치 타입. `ExpData`를 참조한다. |
| `MonsterHp` | 기본 체력. |
| `MonsterAtk` | 슬롯 공격력. |
| `MonsterAtkSpeed` | 공격 주기. 낮을수록 자주 공격한다. |
| `MonsterAtkRange` | 공격 사거리 반지름. Unity 기본 단위의 Collider Radius 값으로 입력하고, 런타임에서 `1 Unity unit = 128px`로 변환한다. 0이면 근접형으로 본다. |
| `MonsterMoveSpeed` | 이동 속도. |
| `MonsterSprite` | 몬스터 스프라이트 리소스 키. |

## BossData

보스 웨이브에 필요한 추가 정보를 정의한다.

| 컬럼 | 의미 |
|---|---|
| `BossID` | 보스 고유 ID. |
| `BossName` | 보스 표시명 또는 표시 키. |
| `MonsterID` | 보스의 기본 스탯으로 사용할 `MonsterData.MonsterID`. |
| `SummonMonsterGroupID` | 소환할 몬스터 그룹 ID. |
| `SummonInterval` | 소환 주기. |
| `SummonCount` | 한 번에 소환할 횟수/묶음 수. |
| `SpawnXRatio`, `SpawnYRatio` | 보스 최초 등장 위치 비율. 0~1 범위 기준. |

## PieceData

로비에서 보유/편성/강화하는 캐릭터 기물이다.

| 컬럼 | 의미 |
|---|---|
| `PieceID` | 기물 고유 ID. 현재 공식 ID는 `8001~8030`. |
| `PieceName` | 기물 표시명. 현재 세린/도이/유진/가비/유은/리리. |
| `PieceType` | 기물 계열. 공식 값은 `AR`, `Shotgun`, `Lange`, `Tank`, `Wide`, `Buffer`. |
| `PieceDesc` | 기물 설명. |
| `PieceGrade` | 등급/별. 현재 1~3성을 지원하며 기본 보유 카드로 지급되고 카드에는 `n성`으로 표시된다. |
| `PieceLv` | 강화 단계. 게임과 밸런스 대시보드 모두 최대 레벨 5로 고정한다. |
| `ConnectTower` | 생성할 `TowerData.TowerID`. |
| `Portrait` | 상세/카드 이미지 경로. |
| `PieceSprite` | 인게임/카드 스프라이트. `세린` 또는 `세린.png`처럼 파일명만 입력하면 `assets/images/towers/세린.png`를 자동 사용한다. 전체 경로도 허용하며, 이미지가 없거나 로드에 실패하면 `PieceName` 첫 글자를 표시한다. |

새 기물은 `PieceData`, 연결된 `TowerData`와 `ProjectileData` 행을 추가하면 밸런스 빌드의 보유/편성 후보와 대시보드에 자동으로 나타난다. 런타임 `PieceData key`는 `타입_성급_레벨` 형식이다. 예: `basic_1_1`, `basic_2_1`, `basic_3_5`. 같은 성급의 레벨 행은 동일한 `PieceName` 또는 `PieceSprite` 값을 사용하고 `PieceLv`를 1~5로 구분한다.

## PieceUpgradeData

기물 강화 연결 규칙이다.

| 컬럼 | 의미 |
|---|---|
| `UpgradeID` | 강화 규칙 고유 ID. |
| `PieceGroupID` | 같은 계열 강화 묶음. 예: basic, scatter, sniper. |
| `FromPieceID` | 강화 전 기물 ID. |
| `ToPieceID` | 강화 후 기물 ID. |

## UpgradeCostData

강화 비용을 정의한다.

| 컬럼 | 의미 |
|---|---|
| `UpgradeCostID` | 비용 행 고유 ID. |
| `UpgradeID` | 연결할 `PieceUpgradeData.UpgradeID`. |
| `CurrencyType` | 비용 재화. 현재는 `gold`. |
| `UpgradeCost` | 강화 비용. |

## TowerData

전투에 생성되는 포탑의 핵심 스탯이다.

| 컬럼 | 의미 |
|---|---|
| `TowerID` | 포탑 고유 ID. 현재 공식 ID는 `7001~7030`. |
| `TowerName` | 포탑 표시명. |
| `TowerType` | 포탑 역할/계열. 숫자값은 1 Basic, 2 Shotgun, 3 SR, 4 Mortar, 5 Boomer, 6 Buffer로 변환한다. |
| `TowerAiType` | 어떻게 쏘는가. 현재 공식 값은 `basic`, `basic-non`, `shotgun`, `heal`. 런타임 `aiType`으로 변환된다. |
| `TargetPriority` | 누구를 노리는가. 예: `near`, `far`, `strong`, `weak`, `friendly`, `cluster`. 현재 공식 포탑은 적을 노리는 값만 사용한다. |
| `ProjectileType` | 구형 호환용 선택 열. 비어 있으면 `TowerProjectile`로 연결된 `ProjectileData.ProjectileType`을 사용한다. |
| `TowerAtk` | 포탑 공격력. 런타임 피해와 리리 회복량의 기준이다. |
| `TowerAtkSpeed` | 공격 주기. 낮을수록 자주 공격한다. |
| `TowerMaxLange` | 사거리 반지름. Unity 기본 단위의 Collider Radius 값으로 입력하고, 런타임에서 `1 Unity unit = 128px`로 변환한다. |
| `TowerMaxAmmo` | 포탑 최대 탄약. |
| `SkillID` | 스킬 참조 ID. 현재 보조형 식별 메모 성격이 강하다. |
| `TowerProjectile` | 사용할 `ProjectileData.ProjectileID`. |
| `ProjectileCount` | 한 번의 공격에서 발사할 탄 수. 샷건은 동시에 퍼지고, 샷건이 아닌 다중 탄은 순차 연사된다. |
| `ProjectileSize` | 탄의 전체 크기/지름. Unity unit 기준으로 입력하고, 런타임 충돌 반지름은 `ProjectileSize * 128px / 2`로 변환한다. |
| `PiercingCount` | 관통 가능 횟수. |
| `SplashRadius` | 폭발/범위 피해 반지름. Unity 기본 단위의 Collider Radius 값으로 입력하고, 런타임에서 `1 Unity unit = 128px`로 변환한다. |
| `current_hp` / `CurrentHp` | 체력비례 피해 퍼센트. `3`은 3%, `0.03`은 3%, `3%`도 3%로 해석된다. 탱커 대항형처럼 체력비례 추가 피해를 주는 투사체에 사용한다. |
| `TowerLv` | 포탑 레벨. `PieceData.PieceLv`와 맞춰 보는 표시/검증용 값. |
| `BulletSpeed` | 투사체 이동 속도 배율. 값이 있으면 투사체 종류의 기본 행동값보다 우선한다. |

공격력, 공격 주기, 사거리, 탄약, 발사 수, 탄 크기, 탄속, 관통 수, 폭발 반경, 최대 체력 비례 피해는 모두 `TowerData`가 원천이다. 특전은 이 기본값 위에 런타임 보정만 적용한다.

### TowerData 전투 의미

| 조합 | 의미 |
|---|---|
| `TowerAiType=basic`, `ProjectileType=normal` | 기본 유도탄 공격. |
| `TowerAiType=shotgun`, `ProjectileType=normal` | 동시에 퍼지는 산탄 공격. |
| `TowerAiType=basic-non`, `ProjectileType=pierce` | 비유도 관통탄 공격. |
| `TowerAiType=basic`, `ProjectileType=tank` | 체력 높은 적 대응 공격. |
| `TowerAiType=basic-non`, `ProjectileType=explode` | 비유도 폭발탄 공격. |
| `TowerAiType=heal`, `ProjectileType=heal` | 적을 공격하고 명중 시 가장 체력 비율이 낮은 슬롯을 `TowerAtk`만큼 회복. |

## ProjectileData

발사체의 명중 효과와 프리팹 키를 정의한다. 실제 탄속/수명/유도 여부는 `ProjectileType`과 `TowerData.TowerAiType` 조합으로 채운다.

| 컬럼 | 의미 |
|---|---|
| `ProjectileID` | 발사체 고유 ID. 현재 공식 ID는 `6001~6005`. |
| `ProjectileType` | 명중 효과. `Basic`, `Snipe`, `Tank`, `Explode`, `Heal`을 런타임 타입으로 변환한다. |
| `ProjectileName` | `*` 뒤의 확인용 표시명. 현재 밸런스 파싱에는 사용하지 않는다. |
| `ProjectilePrefab` | 발사체 이미지 키. `01`처럼 파일명만 적으면 `assets/images/Projectile/01.png`로 해석하며, 경로·URL을 직접 적어도 된다. |
| `PopEffectPrefab` | 주 피격/폭발 이펙트 리소스 키. 현재 런타임 메타데이터로 보존하며 이펙트 시스템 확장 시 사용한다. |
| `SubPopEffectPrefab` | 보조 피격/회복 이펙트 리소스 키. `subPopEffect` 헤더도 같은 열로 호환한다. |

`ProjectileData`는 투사체 ID, 효과 종류, 표시명, 이미지와 피격 이펙트 키를 소유한다. 수치 밸런스는 중복해서 두지 않고 해당 투사체를 참조하는 `TowerData`가 소유한다.

## specialProjectiles

포탑의 일반 `ProjectileData`와 별개로, 콤보·스킬·특전 등 시스템 조건에서 발사되는 특수 투사체를 정의한다. 현재 `combo_pierce`가 10콤보마다 발사된다.

| 컬럼 | 의미 |
|---|---|
| `id` | 특수 투사체 런타임 ID. 특전 액션과 `levelData.comboSpecialProjectileId`가 참조한다. |
| `name` | 화면 배너와 로그에 표시할 이름. |
| `triggerType` | 발동 조건 분류. 현재 `comboMultiple`은 특정 콤보 배수마다 발동한다. |
| `triggerEvery` | 발동 콤보 간격. 현재 10이면 10, 20, 30콤보에 발사한다. |
| `flatDamage` | 적중 시 주는 기본 고정 피해. |
| `maxHpDamageRatio` | 적 최대 체력에 비례해 추가하는 피해 비율. 0.04는 최대 체력의 4%다. |
| `flatDamageBonusPerLevel` | 특전 레벨당 고정 피해 증가율. 0.2는 LV당 +20%다. |
| `maxLevel` | 이 특수 투사체가 특전으로 강화될 수 있는 최대 레벨. |
| `speed` | 화면에서 이동하는 속도. |
| `radius` | 이동 중 충돌 판정 반경과 탄두 표시 크기. |
| `trailWidth` | 특수탄 꼬리 이펙트의 굵기. |
| `life` | 발사 후 유지 시간. 시간이 끝나면 화면에서 제거된다. |
| `pierceAll` | `true`면 경로상 모든 몬스터를 횟수 제한 없이 각각 한 번 관통한다. |
| `color`, `hitColor` | 탄두·꼬리 및 피격 숫자 색상. |

현재 피해 공식은 아래와 같다.

```text
총 피해 = flatDamage × (1 + 특수탄 레벨 × flatDamageBonusPerLevel)
        + 대상 최대 체력 × maxHpDamageRatio
```

현재 기본값은 `120 + 대상 최대 체력의 4%`이며 LV.0~3에서 고정 피해가 `120 / 144 / 168 / 192`로 증가한다. 최대 체력 비례 피해는 특전 레벨과 무관하게 유지한다.

## RarityData

특전 카드 희귀도와 등장 가중치다.

| 컬럼 | 의미 |
|---|---|
| `PerkRarityID` | 희귀도 고유 ID. |
| `PerkRarityName` | 희귀도 이름. |
| `Weight` | 특전 선택지 등장 가중치. |
| `Color` | UI 색상. |

## TriggerData

특전 발동 조건 메타데이터다.

| 컬럼 | 의미 |
|---|---|
| `TriggerID` | 트리거 고유 ID. |
| `TriggerType` | 발동 조건 유형. |
| `TriggerValue` | 조건 수치. |
| `RequiredTag` | 필요한 태그/상태. |

## EffectData

특전의 기본 수치 메타데이터다. 실제 실행은 `PerkActionData`를 우선한다.

| 컬럼 | 의미 |
|---|---|
| `EffectID` | 효과 고유 ID. |
| `BuffTowerType` | 적용 대상 포탑 계열. |
| `ATK` | 공격력 증가량. |
| `ATKSpeed` | 공격속도 증가량. |
| `ShotProjCount` | 발사체 수 증가량. |
| `MaxProj` | 최대 탄약 증가량. |
| `ProjSize` | 탄 크기 증가량. |
| `ProjPiercing` | 관통 증가량. |
| `current_hp` / `CurrentHp` | 대상 포탑 타입의 체력비례 피해 증가량. `1`은 1%p, `0.01`은 1%p로 적용하며 런타임 `addTypePercentHpDamage` 액션으로 변환한다. |
| `BuffType` | 효과 분류. |
| `BuffValue` | 효과 대표 수치. |
| `IsOneOff` | 1회성 여부. |
| `Duration` | 지속 시간. 0이면 지속/즉시 효과로 본다. |

### 특수 투사체 특전 확장

콤보 특수탄 강화 특전을 추가할 때 `PerkActionData`가 생성하는 런타임 액션에 아래 값을 사용한다.

| 런타임 필드 | 값/의미 |
|---|---|
| `type` | `addSpecialProjectileLevel` |
| `projectileId` | `combo_pierce` |
| `amount` | 선택 1회당 증가할 레벨. 일반적으로 1. |

`PerkLimitData.SpecialProjectileID`에 `combo_pierce`, `Max`에 `3`을 지정하면 LV.3 이후 선택지에서 자동 제외된다. 현재 특전 데이터 행은 아직 추가하지 않았으며 런타임 확장 지점만 준비되어 있다.

## PerkData

특전 카드의 표시/분류/등장 정보를 정의한다.

| 컬럼 | 의미 |
|---|---|
| `PerkID` | 특전 고유 ID. |
| `EffectID` | 연결할 `EffectData.EffectID`. |
| `PerkName` | 특전 이름. |
| `PerkDesc` | 특전 설명. |
| `IconResourceID` | 아이콘 리소스 ID. |
| `TriggerID` | 연결할 `TriggerData.TriggerID`. |
| `MaxLevel` | 중복 획득 최대 횟수. |
| `PerkRarityType` | 연결할 `RarityData.PerkRarityID`. |
| `PerkTarget` | 적용 대상 설명. |
| `IsActive` | 활성 여부. 0이면 선택지에서 제외한다. |

## PerkActionData

특전이 실제로 어떤 런타임 수치를 바꾸는지 정의한다.

| 컬럼 | 의미 |
|---|---|
| `ActionID` | 액션 고유 ID. |
| `PerkID` | 연결할 `PerkData.PerkID`. |
| `ActionType` | 실행 방식. 예: `addMod`, `multiplyMod`, `addTypeDamage`, `addTypePercentHpDamage`, `addSpecialProjectileLevel`. |
| `ActionKey` | 바꿀 런타임 키. 예: `supportHealBonus`, `extraBullets`. |
| `Amount` | 적용 수치. |
| `PieceType` | 특정 기물 계열 대상일 때 사용. |
| `EnemyType` | 특정 적 타입 대상일 때 사용. |
| `EnemyTypesJson` | 복수 적 타입 대상일 때 JSON 배열 문자열로 사용. |
| `ProjectileID` | 특수 투사체 액션 대상 ID. 예: `combo_pierce`. 비어 있으면 현재 콤보 특수탄을 사용한다. |

## PerkLimitData

특전 중복/상한 제한을 정의한다.

| 컬럼 | 의미 |
|---|---|
| `LimitID` | 제한 고유 ID. |
| `PerkID` | 연결할 `PerkData.PerkID`. |
| `ModKey` | 제한할 런타임 modifier 키. |
| `ConfigKey` | 제한할 설정 키. |
| `SpecialProjectileID` | 특수 투사체 레벨을 상한 기준으로 사용할 때의 ID. 예: `combo_pierce`. |
| `Min` | 최소값. |
| `Max` | 최대값. |

## LevelData

플레이어 레벨과 필요 경험치 곡선을 정의한다.

| 컬럼 | 의미 |
|---|---|
| `LevelID` | 레벨 행 고유 ID. |
| `GoalLevel` | 도달 레벨. |
| `RequiredXP` | 누적 필요 경험치. 런타임은 레벨별 필요량으로 변환한다. |
| `IsMaxLevel` | 최대 레벨 여부. |
| `PerkEventType` | 레벨업 시 특전 이벤트 유형. |

## ExpData

몬스터 처치 경험치 타입을 정의한다.

| 컬럼 | 의미 |
|---|---|
| `ExpTypeID` | 경험치 타입 ID. |
| `ExpAmount` | 지급 경험치. |
| `BlockSpriteKey` | 경험치 오브 표시 리소스 키. |

## Resource

재화/리소스 키 연결 테이블이다.

| 컬럼 | 의미 |
|---|---|
| `ResourceID` | 리소스 고유 ID. |
| `Root` | 런타임 저장 위치 또는 분류. |
| `ResourceKey` | 실제 재화 키. 예: `gold`, `ticket`. |
| `Desc` | 설명. |

## LocalizeData

현재 작업 대상에서 제외한다. 기존 컬럼 구조는 보존하지만 신규 전투/밸런스 작업은 `PieceData`, `TowerData`, `PerkData`의 직접 표시값을 우선한다.
