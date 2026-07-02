# 데이터 시트 입력

공식 Google Sheets 링크를 직접 파싱하는 방식을 우선 사용한다. 파서는 `balance` 허용 목록의 전투 수치와 연결 ID만 생성하며 이미지, 이름, 설명, 로컬라이즈, 리소스 키는 제외한다.

```powershell
node tools/sync-game-data.mjs --sheet "https://docs.google.com/spreadsheets/d/13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g/edit" --strict
```

CSV가 필요한 경우에만 이 폴더를 사용한다.

Google Sheets의 데이터 탭을 CSV로 내려받아 이 폴더에 둔다.

예시:

```text
StageData.csv
WaveData.csv
MonsterData.csv
종합 데이터 테이블_김시온_v1.0 - PerkData.csv
```

실행:

```powershell
node tools/sync-game-data.mjs --input data-tables
```

생성 결과는 별도 쿼리 없이 `index.html` 기본 실행에 적용된다. `docs/generated/DATA_TABLE_SYNC_REPORT.md`에서 `ERROR 0 / WARN 0`과 현재 데이터 차이를 먼저 확인한다. 실패한 생성물은 `valid: false`로 덮어써 과거 성공 데이터를 재사용하지 못하게 한다.

현재 파싱 범위에서는 보스 계열, `TriggerData.csv`, `UpgradeCostData.csv`, `Resource.csv`, `LocalizeData.csv`가 필요하지 않다. `PerkData.TriggerID`도 무시한다. 세부 허용 컬럼은 `docs/BALANCE_DATA_PROFILE.md`를 참고한다.
