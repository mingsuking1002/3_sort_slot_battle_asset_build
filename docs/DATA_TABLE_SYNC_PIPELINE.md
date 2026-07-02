# 데이터 시트 -> JS 동기화 파이프라인

## 목적

Google Sheets/CSV를 전투 밸런스 데이터의 원본으로 두고, 사람이 `game-data.js`의 행 데이터를 중복 수정하지 않는 구조로 이동한다.

생성 스냅샷은 별도 쿼리 없이 기본 실행에서 항상 적용한다.

- `balance` 허용 목록에 등록된 테이블과 컬럼만 읽는다.
- Google Sheets 링크 또는 CSV를 읽고 자료형과 참조를 검사한다.
- 별도 생성 파일과 차이 보고서를 만든다.
- 유효한 생성 파일을 기본 실행에서 내장 데이터 위에 병합한다.
- 생성 파일이 무효이면 내장 데이터로 안전하게 fallback한다.

이미지, 이름, 설명, 로컬라이즈, 리소스 키는 입력 시트에 존재해도 생성 JS에 포함하지 않는다. ID와 FK는 밸런스 값을 서로 연결하는 데 필요하므로 유지한다. 전체 허용 목록은 `docs/BALANCE_DATA_PROFILE.md`를 따른다.

각 시트의 첫 번째 `*` 열은 데이터와 주석의 경계다. `*` 열과 그 오른쪽의 모든 열은 확인·설명용으로 간주하여 파싱, 필수 컬럼 검사, 미등록 컬럼 경고에서 완전히 제외한다.

## 파일

| 파일 | 역할 |
|---|---|
| `tools/game-data-schema.mjs` | 밸런스 허용 컬럼, 자료형, enum, PK/FK 계약 |
| `tools/sync-game-data.mjs` | Google Sheets/CSV 파싱, 계약 검사, JS 생성, 차이 보고서 작성 |
| `data-tables/` | Google Sheets에서 내려받은 CSV 입력 폴더 |
| `assets/data/generated/game-data.generated.js` | 기본 실행에 적용되는 자동 생성 데이터 스냅샷 |
| `docs/generated/DATA_TABLE_SYNC_REPORT.md` | 현재 데이터와 생성 데이터의 차이 및 계약 경고 |

## 원천 우선순위

1. 공식 종합 데이터 테이블 Google Sheets 링크의 `balance` 허용 컬럼
2. 전투 밸런스 시트의 TowerData 수치
3. `game-data-schema.mjs`의 최종 의미 계약
4. 시트에 없는 파생 테이블은 현재 `game-data.js`를 임시 fallback으로 사용
5. 보스, TriggerData, UpgradeCostData, Resource, LocalizeData는 파싱 및 fallback 모두에서 제외

`TowerData`의 의미 계약은 현재 게임 기획을 우선한다.

- `TowerType`: 포탑 역할. `1 Basic`, `2 Shotgun`, `3 SR`, `4 Mortar`, `5 Boomer`, `6 Buffer`
- `TowerAiType`: `basic`, `basic-non`, `shotgun`, `heal`
- `TargetPriority`: 조준 우선순위
- `ProjectileType`: 명중 효과

`StageData.WaveDuration`은 프로토타입 확장 컬럼이며 종합 시트에서는 생략할 수 있다.

`WavePatternData.NormalRate_1~3`은 일반 몬스터 3종의 가중치에만 사용한다. 속도형과 탱커형 분배에는 적용하지 않는다.

## 실행

핵심 빌드 폴더에서 실행한다.

Windows에서는 프로젝트 루트의 `RUN_UPDATE_BALANCE_BUILD.cmd`를 더블클릭하면 데이터 테이블 파싱, 게임 데이터 검사, 로그 대시보드 갱신, `game_current` 미러 동기화를 한 번에 실행한다.

데이터 테이블만 빠르게 갱신하려면 `RUN_BALANCE_MODE.cmd`를 더블클릭한다.

1. 공식 Google Sheets strict 동기화
2. 전체 데이터 무결성 검사
3. 텔레메트리 스키마 검사
4. 밸런스 로그 시트 기반 대시보드 데이터 생성
5. 생성 JS, 보고서, 대시보드, 실행 스크립트의 `game_current` 미러 동기화
6. `index.html`과 `balance-dashboard/index.html` 실행

시트 또는 데이터 검사가 실패하면 게임을 열지 않고 오류를 표시한다.

```powershell
node tools/sync-game-data.mjs
```

CSV 일부를 적용해 비교한다.

```powershell
node tools/sync-game-data.mjs --input data-tables
```

공식 Google Sheets 링크를 직접 파싱한다.

```powershell
node tools/sync-game-data.mjs --sheet "https://docs.google.com/spreadsheets/d/13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g/edit" --strict
```

생성된 시트 밸런스로 플레이한다.

```text
index.html
```

모든 필수 CSV가 준비됐는지 검사한다.

```powershell
node tools/sync-game-data.mjs --input data-tables --strict --check
```

## CSV 파일명

아래 두 형식을 모두 인식한다.

```text
TowerData.csv
종합 데이터 테이블_김시온_v1.0 - TowerData.csv
```

첫 행이 자료형이고 두 번째 행이 컬럼명이어도 PK 컬럼을 기준으로 헤더를 자동 탐색한다. 링크 파싱은 공식 시트의 탭 gid를 사용하며, 아래쪽에 붙은 설명표와 축약 참조표는 데이터 행으로 읽지 않는다.

## 실패 조건

- PK 중복 또는 빈 PK
- 숫자/불리언/JSON 자료형 오류
- 허용하지 않은 enum 값
- FK 대상 행 누락
- CSV가 최종 계약의 필수 컬럼을 누락
- 같은 테이블로 인식되는 CSV가 여러 개 존재

오류가 발생하면 생성 파일을 남겨두지 않고 `valid: false`, 빈 `designTables`인 무효 스냅샷으로 덮어쓴다. 따라서 과거 성공 생성물이 최신 데이터처럼 오인되지 않는다.

값 차이는 자동 실패가 아니다. 보고서를 검토한 뒤 승인한 테이블만 다음 단계에서 런타임에 연결한다.

활성 특전의 EffectData 전투 수치가 모두 0이면 WARN을 기록하고 밸런스 모드에서는 내장 PerkActionData를 임시 fallback한다. WARN이 남아 있는 특전은 시트 값을 채운 뒤 fallback을 제거해야 한다.

## 자동 정규화

- `TowerData`: `TowerLv` 또는 핵심 전투값이 비어 있는 예약 행을 제외한다.
- `PieceData`: 구형 `ConnectTower`를 `PieceType + PieceLv` 기준 현재 `TowerID`로 연결한다.
- `WaveData`: 존재하지 않는 러시 별칭을 `WavePatternData.isRush` 행에 순서대로 연결한다.
- `TowerAiType`: 숫자 1~4를 `basic/basic-non/shotgun/heal`로 해석한다.
- `TowerData`: `TowerLv`가 없으면 `TowerID` 마지막 두 자리에서 레벨을 파생한다.
- `TowerData`: 시트의 `TowerMaxRange`를 기존 런타임의 `TowerMaxLange`로 정규화한다.
- `PieceData`: `PieceType`이 없으면 `ConnectTower`가 가리키는 `TowerData.TowerType`에서 파생한다.
- `TargetPriority`: 시트에서 비어 있으면 `TowerType`별 기본 우선순위를 사용한다.
- `BulletSpeed`: 양수일 때 투사체 속도 배율로 사용한다.

## 다음 단계

1. 공식 시트 링크 strict 파싱을 실행한다.
2. 보고서가 `ERROR 0`인지 확인하고 남은 WARN을 검토한다.
3. 생성 파일이 `valid: true`, `dataProfile: "balance"`인지 확인한다.
4. 승인 후 생성 파일을 읽는 런타임 전환을 별도 단계로 진행한다.
