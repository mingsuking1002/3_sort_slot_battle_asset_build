# 데이터 테이블 동기화 점검 보고서

- 계약 버전: `2026-07-01-combat-balance-profile-v11`
- 데이터 프로필: `balance` (밸런스 허용 목록)
- 데이터 버전: `2026-07-01-combat-balance-profile-v11`
- 실행 모드: `Google Sheets 링크 동기화`
- 런타임 연결: **기본 실행 모드** (유효한 생성 스냅샷을 항상 적용)
- 외부 적용: **13개**, 내장 fallback: **3개**
- 검사 결과: ERROR 0 / WARN 0 / INFO 9
- 현재 데이터 대비 변경: 523개 행 / 1067개 필드

## 테이블 공급 현황

| 테이블 | 상태 | 공급원 | 행 수 | 누락 계약 헤더 |
|---|---|---|---:|---:|
| StageData | active | Google Sheet | 15 | 0 |
| WaveData | active | Google Sheet | 1 | 0 |
| WavePatternData | active | Google Sheet | 9 | 0 |
| MonsterGroupData | active | Google Sheet | 45 | 0 |
| MonsterData | active | Google Sheet | 90 | 0 |
| BossPatternGroupData | excluded | 미제공 | 0 | 1 |
| BossPatternData | excluded | 미제공 | 0 | 1 |
| BossData | excluded | 미제공 | 0 | 1 |
| PieceData | active | Google Sheet | 30 | 0 |
| PieceUpgradeData | derived | 내장 fallback | 24 | 0 |
| UpgradeCostData | excluded | 미제공 | 0 | 3 |
| TowerData | active | Google Sheet | 90 | 0 |
| ProjectileData | active | Google Sheet | 5 | 0 |
| RarityData | active | Google Sheet | 4 | 0 |
| TriggerData | excluded | 미제공 | 0 | 1 |
| EffectData | active | Google Sheet | 35 | 0 |
| PerkData | active | Google Sheet | 34 | 0 |
| PerkActionData | derived | 내장 fallback | 25 | 0 |
| PerkLimitData | derived | 내장 fallback | 0 | 0 |
| LevelData | active | Google Sheet | 20 | 0 |
| ExpData | active | Google Sheet | 2 | 0 |
| Resource | excluded | 미제공 | 0 | 1 |
| LocalizeData | excluded | 미제공 | 0 | 1 |

## 계약 검사

| 등급 | 테이블 | 내용 |
|---|---|---|
| INFO | TowerData | TowerLv가 없는 90개 행을 TowerID 마지막 두 자리에서 파생했습니다. |
| INFO | PieceData | PieceType이 없는 30개 행을 ConnectTower의 TowerData.TowerType에서 파생했습니다. |
| INFO | BossPatternGroupData | 테이블 데이터가 아직 제공되지 않았습니다. |
| INFO | BossPatternData | 테이블 데이터가 아직 제공되지 않았습니다. |
| INFO | BossData | 테이블 데이터가 아직 제공되지 않았습니다. |
| INFO | UpgradeCostData | 테이블 데이터가 아직 제공되지 않았습니다. |
| INFO | TriggerData | 테이블 데이터가 아직 제공되지 않았습니다. |
| INFO | Resource | 테이블 데이터가 아직 제공되지 않았습니다. |
| INFO | LocalizeData | 테이블 데이터가 아직 제공되지 않았습니다. |

## 현재 designTables 대비 데이터 차이

| 테이블 | 추가 | 삭제 | 수정 |
|---|---:|---:|---:|
| StageData | 13 | 1 | 2 |
| WaveData | 0 | 2 | 1 |
| WavePatternData | 0 | 9 | 9 |
| MonsterGroupData | 39 | 2 | 6 |
| MonsterData | 86 | 2 | 4 |
| BossData | 0 | 1 | 0 |
| PieceData | 0 | 0 | 30 |
| PieceUpgradeData | 0 | 0 | 24 |
| UpgradeCostData | 0 | 24 | 0 |
| TowerData | 90 | 30 | 0 |
| ProjectileData | 0 | 0 | 5 |
| RarityData | 0 | 0 | 4 |
| TriggerData | 0 | 3 | 0 |
| EffectData | 1 | 0 | 34 |
| PerkData | 0 | 0 | 34 |
| PerkActionData | 0 | 0 | 25 |
| LevelData | 20 | 6 | 0 |
| ExpData | 0 | 2 | 2 |
| Resource | 0 | 2 | 0 |
| LocalizeData | 0 | 10 | 0 |

### 필드 변경 상세

- `StageData.1001.StageName`: `"StageName_1"` -> ``
- `StageData.1001.BossID`: `9001` -> ``
- `StageData.1001.StageReward`: `1220` -> `5`
- `StageData.1001.BGID`: `"assets/images/ui/Main/Image_Stage_1 5.png"` -> ``
- `StageData.1001.WaveDuration`: `32` -> `""`
- `StageData.1001.Desc`: `"1 스테이지 관계자의 출입금지"` -> ``
- `StageData.1001.*`: `""` -> ``
- `StageData.1002.StageName`: `"StageName_2"` -> ``
- `StageData.1002.WaveDataID`: `2002` -> `2001`
- `StageData.1002.BossID`: `9001` -> ``
- `StageData.1002.StageReward`: `1600` -> `5`
- `StageData.1002.BGID`: `"assets/images/ui/Main/Image_Stage_1 5.png"` -> ``
- `StageData.1002.Desc`: `"2 스테이지 임시 데이터"` -> ``
- `StageData.1002.*`: `""` -> ``
- `WaveData.2001.Desc`: `"1스테이지 1~9웨이브 패턴"` -> ``
- `WaveData.2001.*`: `""` -> ``
- `WavePatternData.3001.WaveType`: `"Normal"` -> `""`
- `WavePatternData.3001.Normal_Count`: `38` -> `15`
- `WavePatternData.3001.Speedy_Count`: `6` -> `0`
- `WavePatternData.3001.몬스터 총합`: `44` -> ``
- `WavePatternData.3001.Desc`: `"입문 물량"` -> ``
- `WavePatternData.3001.*`: `""` -> ``
- `WavePatternData.3001.isRush`: `` -> `0`
- `WavePatternData.3001.NormalRate_1`: `` -> `100`
- `WavePatternData.3001.NormalRate_2`: `` -> `0`
- `WavePatternData.3001.NormalRate_3`: `` -> `0`
- `WavePatternData.3001.Duration`: `` -> `""`
- `WavePatternData.3001.WaveDuration`: `` -> `""`
- `WavePatternData.3002.WaveType`: `"Normal"` -> `""`
- `WavePatternData.3002.Normal_Count`: `44` -> `20`
- `WavePatternData.3002.Speedy_Count`: `16` -> `0`
- `WavePatternData.3002.몬스터 총합`: `60` -> ``
- `WavePatternData.3002.Desc`: `"속도형 적응"` -> ``
- `WavePatternData.3002.*`: `""` -> ``
- `WavePatternData.3002.isRush`: `` -> `0`
- `WavePatternData.3002.NormalRate_1`: `` -> `100`
- `WavePatternData.3002.NormalRate_2`: `` -> `0`
- `WavePatternData.3002.NormalRate_3`: `` -> `0`
- `WavePatternData.3002.Duration`: `` -> `""`
- `WavePatternData.3002.WaveDuration`: `` -> `""`
- `WavePatternData.3003.WaveType`: `"Normal"` -> `""`
- `WavePatternData.3003.Normal_Count`: `54` -> `30`
- `WavePatternData.3003.Speedy_Count`: `14` -> `0`
- `WavePatternData.3003.Tanker_Count`: `8` -> `0`
- `WavePatternData.3003.몬스터 총합`: `76` -> ``
- `WavePatternData.3003.Desc`: `"탱커 첫 압박"` -> ``
- `WavePatternData.3003.*`: `""` -> ``
- `WavePatternData.3003.isRush`: `` -> `0`
- `WavePatternData.3003.NormalRate_1`: `` -> `70`
- `WavePatternData.3003.NormalRate_2`: `` -> `30`
- `WavePatternData.3003.NormalRate_3`: `` -> `0`
- `WavePatternData.3003.Duration`: `` -> `""`
- `WavePatternData.3003.WaveDuration`: `` -> `""`
- `WavePatternData.3004.Normal_Count`: `72` -> `60`
- `WavePatternData.3004.Speedy_Count`: `28` -> `0`
- `WavePatternData.3004.Tanker_Count`: `8` -> `0`
- `WavePatternData.3004.몬스터 총합`: `108` -> ``
- `WavePatternData.3004.Desc`: `"러시"` -> ``
- `WavePatternData.3004.*`: `""` -> ``
- `WavePatternData.3004.isRush`: `` -> `1`
- `WavePatternData.3004.NormalRate_1`: `` -> `30`
- `WavePatternData.3004.NormalRate_2`: `` -> `70`
- `WavePatternData.3004.NormalRate_3`: `` -> `0`
- `WavePatternData.3004.Duration`: `` -> `""`
- `WavePatternData.3004.WaveDuration`: `` -> `""`
- `WavePatternData.3005.WaveType`: `"Normal"` -> `""`
- `WavePatternData.3005.Normal_Count`: `70` -> `25`
- `WavePatternData.3005.Speedy_Count`: `24` -> `10`
- `WavePatternData.3005.Tanker_Count`: `12` -> `0`
- `WavePatternData.3005.몬스터 총합`: `106` -> ``
- `WavePatternData.3005.Desc`: `"혼합 압박"` -> ``
- `WavePatternData.3005.*`: `""` -> ``
- `WavePatternData.3005.isRush`: `` -> `0`
- `WavePatternData.3005.NormalRate_1`: `` -> `0`
- `WavePatternData.3005.NormalRate_2`: `` -> `100`
- `WavePatternData.3005.NormalRate_3`: `` -> `0`
- `WavePatternData.3005.Duration`: `` -> `""`
- `WavePatternData.3005.WaveDuration`: `` -> `""`
- `WavePatternData.3006.WaveType`: `"Normal"` -> `""`
- `WavePatternData.3006.Normal_Count`: `78` -> `30`
- `WavePatternData.3006.Speedy_Count`: `30` -> `10`
- `WavePatternData.3006.Tanker_Count`: `16` -> `0`
- `WavePatternData.3006.몬스터 총합`: `124` -> ``
- `WavePatternData.3006.Desc`: `"엘리트 진입"` -> ``
- `WavePatternData.3006.*`: `""` -> ``
- `WavePatternData.3006.isRush`: `` -> `0`
- `WavePatternData.3006.NormalRate_1`: `` -> `0`
- `WavePatternData.3006.NormalRate_2`: `` -> `70`
- `WavePatternData.3006.NormalRate_3`: `` -> `30`
- `WavePatternData.3006.Duration`: `` -> `""`
- `WavePatternData.3006.WaveDuration`: `` -> `""`
- `WavePatternData.3007.WaveType`: `"Normal"` -> `""`
- `WavePatternData.3007.Normal_Count`: `84` -> `30`
- `WavePatternData.3007.Speedy_Count`: `36` -> `10`
- `WavePatternData.3007.Tanker_Count`: `20` -> `5`
- `WavePatternData.3007.몬스터 총합`: `140` -> ``
- `WavePatternData.3007.Desc`: `"속도 압박"` -> ``
- `WavePatternData.3007.*`: `""` -> ``
- `WavePatternData.3007.isRush`: `` -> `0`
- `WavePatternData.3007.NormalRate_1`: `` -> `0`
- `WavePatternData.3007.NormalRate_2`: `` -> `30`
- `WavePatternData.3007.NormalRate_3`: `` -> `70`
- `WavePatternData.3007.Duration`: `` -> `""`
- `WavePatternData.3007.WaveDuration`: `` -> `""`
- `WavePatternData.3008.Normal_Count`: `98` -> `60`
- `WavePatternData.3008.Speedy_Count`: `44` -> `20`
- `WavePatternData.3008.Tanker_Count`: `24` -> `10`
- `WavePatternData.3008.몬스터 총합`: `166` -> ``
- `WavePatternData.3008.Desc`: `"대형 러시"` -> ``
- `WavePatternData.3008.*`: `""` -> ``
- `WavePatternData.3008.isRush`: `` -> `1`
- `WavePatternData.3008.NormalRate_1`: `` -> `0`
- `WavePatternData.3008.NormalRate_2`: `` -> `0`
- `WavePatternData.3008.NormalRate_3`: `` -> `100`
- `WavePatternData.3008.Duration`: `` -> `""`
- `WavePatternData.3008.WaveDuration`: `` -> `""`
- `WavePatternData.3009.WaveType`: `"Normal"` -> `""`
- `WavePatternData.3009.Normal_Count`: `100` -> `30`
- `WavePatternData.3009.Speedy_Count`: `48` -> `10`
- `WavePatternData.3009.Tanker_Count`: `30` -> `10`
- `WavePatternData.3009.몬스터 총합`: `178` -> ``
- `WavePatternData.3009.Desc`: `"최종 전 압박"` -> ``
- `WavePatternData.3009.*`: `""` -> ``
- `WavePatternData.3009.isRush`: `` -> `0`
- `WavePatternData.3009.NormalRate_1`: `` -> `0`
- `WavePatternData.3009.NormalRate_2`: `` -> `0`
- `WavePatternData.3009.NormalRate_3`: `` -> `100`
- `WavePatternData.3009.Duration`: `` -> `""`
- `WavePatternData.3009.WaveDuration`: `` -> `""`
- `MonsterGroupData.11011.MonsterID_1`: `4111` -> `4011`
- `MonsterGroupData.11011.MonsterID_2`: `0` -> `4012`
- `MonsterGroupData.11011.MonsterID_3`: `0` -> `4013`
- `MonsterGroupData.11011.NormalRate_1`: `1` -> ``
- `MonsterGroupData.11011.NormalRate_2`: `0` -> ``
- `MonsterGroupData.11011.NormalRate_3`: `0` -> ``
- `MonsterGroupData.11011.Desc`: `"1스테이지 일반 후보군"` -> ``
- `MonsterGroupData.11011.*`: `""` -> ``
- `MonsterGroupData.11012.MonsterID_1`: `4121` -> `4014`
- `MonsterGroupData.11012.NormalRate_1`: `0` -> ``
- `MonsterGroupData.11012.NormalRate_2`: `0` -> ``
- `MonsterGroupData.11012.NormalRate_3`: `0` -> ``
- `MonsterGroupData.11012.Desc`: `"1스테이지 속도 후보군"` -> ``
- `MonsterGroupData.11012.*`: `""` -> ``
- `MonsterGroupData.11013.MonsterID_1`: `4131` -> `4015`
- `MonsterGroupData.11013.NormalRate_1`: `0` -> ``
- `MonsterGroupData.11013.NormalRate_2`: `0` -> ``
- `MonsterGroupData.11013.NormalRate_3`: `0` -> ``
- `MonsterGroupData.11013.Desc`: `"1스테이지 탱커 후보군"` -> ``
- `MonsterGroupData.11013.*`: `""` -> ``
- `MonsterGroupData.11021.MonsterID_1`: `4111` -> `4021`
- `MonsterGroupData.11021.MonsterID_2`: `0` -> `4022`
- `MonsterGroupData.11021.MonsterID_3`: `0` -> `4023`
- `MonsterGroupData.11021.NormalRate_1`: `1` -> ``
- `MonsterGroupData.11021.NormalRate_2`: `0` -> ``
- `MonsterGroupData.11021.NormalRate_3`: `0` -> ``
- `MonsterGroupData.11021.Desc`: `"2스테이지 일반 후보군"` -> ``
- `MonsterGroupData.11021.*`: `""` -> ``
- `MonsterGroupData.11022.MonsterID_1`: `4121` -> `4024`
- `MonsterGroupData.11022.NormalRate_1`: `0` -> ``
- `MonsterGroupData.11022.NormalRate_2`: `0` -> ``
- `MonsterGroupData.11022.NormalRate_3`: `0` -> ``
- `MonsterGroupData.11022.Desc`: `"2스테이지 속도 후보군"` -> ``
- `MonsterGroupData.11022.*`: `""` -> ``
- `MonsterGroupData.11023.MonsterID_1`: `4131` -> `4025`
- `MonsterGroupData.11023.NormalRate_1`: `0` -> ``
- `MonsterGroupData.11023.NormalRate_2`: `0` -> ``
- `MonsterGroupData.11023.NormalRate_3`: `0` -> ``
- `MonsterGroupData.11023.Desc`: `"2스테이지 탱커 후보군"` -> ``
- `MonsterGroupData.11023.*`: `""` -> ``
- `MonsterData.4111.MonsterName`: `"Monster_Normal_01"` -> ``
- `MonsterData.4111.MonsterHp`: `150` -> `60`
- `MonsterData.4111.MonsterAtk`: `1` -> `31`
- `MonsterData.4111.MonsterAtkSpeed`: `1.35` -> `1.2`
- `MonsterData.4111.MonsterAtkRange`: `0` -> `1`
- `MonsterData.4111.MonsterMoveSpeed`: `34` -> `1`
- `MonsterData.4111.MonsterSprite`: `"assets/images/monsters/기본형.png"` -> ``
- `MonsterData.4111.Desc`: `"기본형 · 전시 체력 상향"` -> ``
- `MonsterData.4111.*`: `""` -> ``
- `MonsterData.4121.MonsterName`: `"Monster_Speed_01"` -> ``
- `MonsterData.4121.MonsterType`: `2` -> `1`
- `MonsterData.4121.ExpTypeID`: `82` -> `81`
- `MonsterData.4121.MonsterHp`: `135` -> `65`
- `MonsterData.4121.MonsterAtk`: `1` -> `34`
- `MonsterData.4121.MonsterAtkSpeed`: `1.1` -> `1.2`
- `MonsterData.4121.MonsterAtkRange`: `0` -> `1`
- `MonsterData.4121.MonsterMoveSpeed`: `61` -> `1`
- `MonsterData.4121.MonsterSprite`: `"assets/images/monsters/속도형.png"` -> ``
- `MonsterData.4121.Desc`: `"속도형 · 전시 체력 상향"` -> ``
- `MonsterData.4121.*`: `""` -> ``
- `MonsterData.4131.MonsterName`: `"Monster_Tank_01"` -> ``
- `MonsterData.4131.MonsterType`: `3` -> `1`
- `MonsterData.4131.ExpTypeID`: `82` -> `81`
- `MonsterData.4131.MonsterHp`: `720` -> `70`
- `MonsterData.4131.MonsterAtk`: `1` -> `37`
- `MonsterData.4131.MonsterAtkSpeed`: `1.55` -> `1.2`
- `MonsterData.4131.MonsterAtkRange`: `0` -> `1`
- `MonsterData.4131.MonsterMoveSpeed`: `19` -> `1`
- `MonsterData.4131.MonsterSprite`: `"assets/images/monsters/탱커형.png"` -> ``
- `MonsterData.4131.Desc`: `"탱커형 · 전시 체력 상향"` -> ``
- `MonsterData.4131.*`: `""` -> ``
- 변경 상세는 200건까지만 표시했습니다.

## 계약 메모

- **WavePatternData**: NormalRate_1~3은 Normal_Count를 일반 몬스터 3종에만 분배하는 가중치이며 isRush는 WaveType=Rush로 정규화합니다.
- **BossPatternGroupData**: 밸런스 프로필에서 보스 계열은 제외합니다.
- **BossPatternData**: 밸런스 프로필에서 보스 계열은 제외합니다.
- **BossData**: 현재 공식 데이터에 보스가 없으므로 파싱하지 않습니다.
- **PieceData**: PieceType이 없으면 ConnectTower가 참조하는 TowerData.TowerType에서 파생합니다. 구형 ConnectTower ID는 PieceType + PieceLv 기준으로 현재 TowerData ID에 연결합니다.
- **UpgradeCostData**: 아웃게임 기물 강화 비용이므로 전투 balance 프로필에서 제외합니다.
- **TowerData**: TowerType은 1 Basic, 2 Shotgun, 3 SR, 4 Mortar, 5 Boomer, 6 Buffer입니다. TowerMaxRange는 런타임 TowerMaxLange로 정규화합니다. TowerLv가 없으면 TowerID 마지막 두 자리에서 파생합니다.
- **TriggerData**: 조건부 특전을 사용하지 않으므로 balance 프로필에서 제외합니다.
- **EffectData**: CurrentHp는 대상 포탑 타입의 체력비례 피해 퍼센트 증가량으로 적용합니다.
- **PerkData**: 현재 모든 특전은 선택 즉시 적용하며 조건부 TriggerID는 파싱하지 않습니다.
- **Resource**: 이미지·오디오·리소스 키는 밸런스 프로필에서 제외합니다.
- **LocalizeData**: 이름·설명·로컬라이즈는 밸런스 프로필에서 제외합니다.

## 다음 사용 순서

1. `node tools/sync-game-data.mjs --sheet "Google Sheets 링크"`를 실행하거나 각 탭 CSV를 `data-tables/`에 둡니다.
2. CSV를 쓸 때는 `node tools/sync-game-data.mjs --input data-tables`를 실행합니다.
3. 이 보고서의 ERROR/WARN과 데이터 차이를 검토합니다.
4. `index.html`을 열고 HUD의 `SHEET` 상태와 실제 전투 수치를 확인합니다.
