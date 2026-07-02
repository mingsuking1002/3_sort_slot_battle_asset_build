# 전시 빌드 플레이 로그 수집 설정

이 문서는 `3_sort_slot_battle_exhibition_stage1_20260622` 전시 빌드에서 관람객 플레이 로그를 Google Sheets로 받기 위한 설정서다.

## 수집되는 핵심 지표

- 세션별 소팅 성공 횟수: `sessions.sort_successes`
- 세션별 선택 특전: `sessions.picked_perks`, 원본은 `events.event_type = perk_pick`
- 도달 웨이브/클리어 여부: `sessions.result`, `sessions.reached_wave`
- 종료 시 슬롯 체력: `sessions.slot_hp_total`, `slot_hp_avg`, `slot_hp_min`, `slot_hp_ratio_avg`
- 스테이지에 편성한 기물: `sessions.selected_pieces`, `sessions.selected_piece_keys`
- 기물별 누적 피해량: `sessions.damage_by_piece`, 분석용 원본은 `piece_damage`
- 세션 최대 콤보: `sessions.max_combo`
- 웨이브별 기물 피해: `events.event_type = wave_end`의 `damage_by_piece`
- 웨이브별 슬롯 체력 스냅샷: `events.event_type = wave_end`
- 리롤 횟수/포탑 생성 수: `sessions.rerolls`, `sessions.tower_created`

## Google Sheets 수신기 만들기

1. 새 Google Sheet를 만든다.
2. 상단 메뉴에서 `확장 프로그램 > Apps Script`를 연다.
3. 프로젝트 안의 아래 파일 내용을 Apps Script 편집기에 붙여 넣는다.
   - `tools/exhibition-telemetry-apps-script.gs`
4. `배포 > 새 배포 > 유형 선택 > 웹 앱`을 선택한다.
5. 설정은 아래처럼 둔다.
   - 실행 사용자: `나`
   - 액세스 권한: `모든 사용자`
6. 배포 후 생성되는 `웹 앱 URL`을 복사한다.

## 전시 빌드에 URL 연결

`index.html`에서 `EXHIBITION_BUILD.telemetryEndpoint` 값을 웹 앱 URL로 바꾼다.

현재 공식 웹 앱 URL:

```text
https://script.google.com/macros/s/AKfycby2IXOmu8MttsGyU2x-_nIjdTINdsZVx52gjPi6sWIu-4rKDVxuKqzrwCUvn3ON_x9tYg/exec
```

```js
const EXHIBITION_BUILD = Object.freeze({
  enabled: true,
  stageKey: "stage-1",
  hideProgression: true,
  hideConsole: true,
  tutorial: true,
  telemetryEnabled: true,
  telemetryEndpoint: "https://script.google.com/macros/s/여기에_웹앱_URL/exec",
  telemetryDebug: false,
  buildVersion: "exhibition-stage1-20260624-hp-up",
});
```

URL을 코드에 직접 넣기 싫으면 실행 URL에 쿼리로도 넣을 수 있다.

```text
index.html?telemetryEndpoint=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2F...%2Fexec
```

전시 QR은 가능하면 HTTPS 호스팅 주소를 쓰는 편이 좋다. `file://`로 열어도 게임 자체는 동작하지만, 모바일 관람객에게 배포하려면 정적 호스팅이나 사내 웹 서버에 올리는 방식이 안정적이다.

## 생성되는 시트

Apps Script v2는 자동으로 일곱 탭을 만든다.

- `events`: 모든 원본 이벤트. 소팅, 특전, 웨이브 시작/종료, 세션 시작/종료가 모두 쌓인다.
- `sessions`: `session_end`만 모은 요약 탭. 전시 후 평균값을 볼 때는 이 탭을 먼저 보면 된다.
- `piece_damage`: 세션 하나를 기물별 여러 행으로 펼친 분석 탭. 스테이지·기물별 평균 피해량과 선택률을 피벗 테이블로 계산하기 쉽다.
- `wave_stats`: 웨이브별 생성·처치·잔존 몬스터, 소팅, 슬롯 피해, 기물/시스템 피해 요약.
- `piece_wave_stats`: 웨이브·기물별 가동시간, 발사, 투사체, 명중, 피해, 회복, 탄배출 피해.
- `perk_options`: 제시된 특전 선택지 하나당 한 행. `selected`로 실제 선택 여부를 구분한다.
- `system_stats`: 콤보탄, 전체정렬, 탄배출의 사용 횟수와 피해량.

각 탭의 1행에는 한국어 컬럼 설명, 2행에는 분석 및 코드에서 사용하는 영문 컬럼명이 들어간다. 두 행은 고정되며 실제 로그 데이터는 3행부터 쌓인다. 기존에 1행 영문 헤더로 생성된 탭도 새 스크립트가 다음 로그를 받을 때 자동으로 설명 행을 위에 추가한다.

## 바로 볼 수 있는 분석 예시

`sessions` 탭에서 아래처럼 보면 된다.

- 평균 소팅 성공 횟수: `sort_successes` 평균
- 가장 많이 고른 특전: `picked_perks` 기준 피벗 테이블
- 평균 도달 웨이브: `reached_wave` 평균
- 클리어율: `result = clear` 비율
- 종료 시 평균 슬롯 체력: `slot_hp_ratio_avg` 평균
- 최대 콤보 평균과 분포: `max_combo`
- 스테이지별 편성 조합: `stage_key`, `selected_piece_keys`

웨이브별 난이도는 `events` 탭에서 `event_type = wave_end`만 필터링한 뒤 `wave_ordinal`, `slot_hp_ratio_avg`, `enemy_count`를 보면 된다.

기물 밸런스는 `piece_damage` 탭에서 피벗 테이블을 만들고 행에 `piece_name`, 열 또는 필터에 `stage_key`, 값에 `damage_done` 평균과 `session_id` 개수를 넣으면 된다. `damage_share` 평균을 함께 보면 플레이 시간 차이가 있어도 세션 안에서 어떤 기물이 피해를 많이 담당했는지 비교할 수 있다.

## 스크립트 갱신 시 주의

이미 웹 앱을 배포했다면 Apps Script 내용을 새 버전으로 교체한 뒤 `배포 > 배포 관리 > 수정 > 새 버전`으로 다시 배포한다. 기존 웹 앱 URL은 그대로 유지할 수 있다.

## 로컬 확인

`telemetryEndpoint`가 비어 있으면 Google Sheets로 전송하지 않는다. 대신 최근 이벤트는 브라우저 개발자 도구 콘솔에서 `window.__EXHIBITION_TELEMETRY__`로 확인할 수 있고, 로컬 저장소에는 `3sort_exhibition_telemetry_offline_v1` 키로 남는다.

실제 전시 데이터 수집 전에는 테스트 플레이 1회를 진행해서 Google Sheet의 `events`, `sessions` 탭에 행이 생기는지 확인한다.

## 밸런스 대시보드 갱신

`RUN_BALANCE_DASHBOARD.cmd`를 실행하면 현재 생성 밸런스 JS와 플레이 로그 시트를 결합한 뒤 `balance-dashboard/index.html`을 연다.

데이터 테이블 시트까지 함께 갱신하려면 `RUN_UPDATE_BALANCE_BUILD.cmd`를 실행한다.

- 현재 Apps Script v2가 아직 배포되지 않아 새 탭이 없어도 기존 `events.payload_json`에서 웨이브·특전·시스템 통계를 복원한다.
- 새 배포 이후에는 `wave_stats`, `piece_wave_stats`, `perk_options`, `system_stats`를 우선 사용한다.
- 빌드와 밸런스 스냅샷이 다른 세션은 필터 및 `버전 비교` 화면에서 분리된다.
- 원본 로그 시트 주소는 `RUN_BALANCE_DASHBOARD.cmd`의 `LOG_SHEET` 값이다.

현재 공식 시트:

- 데이터 테이블: `https://docs.google.com/spreadsheets/d/13GmSWRxvcBWgMDpW0ypgrPBkkb3zXRAefZBM2W-YA0g/edit?usp=sharing`
- 밸런스 로그: `https://docs.google.com/spreadsheets/d/1Sy_vOpjJXiDLIzIHGsKtWkls7DStSdkYBllsDpZoSBI/edit?usp=sharing`

검증 명령:

```text
node tools/validate-telemetry-schema.mjs
node tools/build-balance-dashboard.mjs
```
