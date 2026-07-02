# 밸런스 데이터 파싱 프로필

## 원칙

`balance` 프로필은 플레이 결과에 영향을 주는 수치와 그 수치를 연결하는 ID/FK만 생성한다. 시트에 다른 컬럼이 있어도 `tools/game-data-schema.mjs`의 허용 목록에 없으면 생성 JS에서 제거한다.

## 허용 테이블과 컬럼

| 테이블 | 생성 컬럼 |
|---|---|
| StageData | StageID, WaveDataID, MonsterGroupID_Normal, MonsterGroupID_Speedy, MonsterGroupID_Tanker, WaveReward, StageReward, WaveDuration |
| WaveData | WaveID, WavePattern_1~9 |
| WavePatternData | WavePatternID, WaveType, isRush, Normal_Count, Speedy_Count, Tanker_Count, NormalRate_1~3, Duration, WaveDuration |
| MonsterGroupData | MonsterGroupID, MonsterID_1~3 |
| MonsterData | MonsterID, MonsterType, ExpTypeID, MonsterHp, MonsterAtk, MonsterAtkSpeed, MonsterAtkRange, MonsterMoveSpeed |
| PieceData | PieceID, PieceType, PieceGrade, PieceLv, ConnectTower |
| TowerData | TowerID, TowerType, TowerAiType, TargetPriority, ProjectileType, TowerAtk, TowerAtkSpeed, TowerMaxRange, TowerMaxAmmo, TowerProjectile, ProjectileCount, ProjectileSize, PiercingCount, SplashRadius, current_hp, BulletSpeed, TowerLv |
| ProjectileData | ProjectileID, ProjectileType |
| RarityData | PerkRarityID, Weight |
| EffectData | EffectID, BuffTowerType, ATK, ATKSpeed, ShotProjCount, MaxProj, ProjSize, ProjPiercing, BuffType, BuffValue, IsOneOff, Duration |
| PerkData | PerkID, EffectID, MaxLevel, PerkRarityType, PerkTarget, IsActive |
| LevelData | LevelID, GoalLevel, RequiredXP, IsMaxLevel, PerkEventType |
| ExpData | ExpTypeID, ExpAmount |

`PieceUpgradeData`, `PerkActionData`, `PerkLimitData`는 시트 계약이 완성될 때까지 현재 런타임 값을 같은 허용 목록으로 투영해 fallback한다.

## 제외 데이터

- 모든 이미지, 스프라이트, 아이콘, 프리팹 및 배경 경로
- 표시 이름, 설명, 색상 및 UI 문구
- Resource와 LocalizeData 전체
- BossData, BossPatternData, BossPatternGroupData 전체
- TriggerData 전체와 PerkData.TriggerID
- UpgradeCostData 전체: 아웃게임 기물 성장 비용
- 시트 오른쪽의 컬럼 설명표와 메모 행

## 자동 보정

- 미완성 `TowerData` 예약 행은 제외한다.
- `TowerData.TowerMaxRange`는 기존 런타임 필드 `TowerMaxLange`로 정규화한다.
- `PieceData.PieceType`이 없으면 `ConnectTower`가 가리키는 `TowerData.TowerType`에서 파생한다.
- 구형 `PieceData.ConnectTower`는 타입과 레벨이 유일하게 일치할 때만 새 포탑 ID로 바꾼다.
- 러시 별칭 패턴은 `isRush` 행과 개수가 일치할 때만 연결한다.
- 보정 후보가 없거나 여러 개면 추측하지 않고 strict 파싱을 실패시킨다.
- `NormalRate_1~3`은 `WavePatternData.Normal_Count`의 일반 몬스터 3종 분배에만 사용한다.

## 성공 기준

```powershell
node tools/sync-game-data.mjs --sheet "https://docs.google.com/spreadsheets/d/13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g/edit" --strict
```

성공한 생성물은 `valid: true`, `dataProfile: "balance"`를 가진다. ERROR가 하나라도 있으면 빈 `designTables`를 가진 `valid: false` 스냅샷으로 덮어쓴다.
