# 밸런스 자동 플레이 시뮬레이터

## 실행

`run-balance-simulation.cmd`를 더블클릭하면 9세션, 50배속, 커버리지 모드로 실행한다.

```powershell
run-balance-simulation.cmd
```

## 클릭 한 번 일반 실행 설정

검증용 `--speed-check`가 아니라 실제 시뮬레이션 로그를 시트에 쌓으려면 `run-balance-simulation.cmd` 안의 기본 실행 줄만 바꾸면 된다.

파일에서 이 줄을 찾는다.

```bat
if "%ARGS%"=="" set "ARGS=--sessions 9 --speed 50 --mix beginner:2,intermediate:5,advanced:2 --show --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1"
```

이 줄의 `set "ARGS=...` 안쪽만 원하는 실행 조건으로 수정하고 저장하면 된다. 그 다음부터는 `.cmd`를 더블클릭하면 해당 조건으로 바로 실행된다.

일반 추천값은 아래다.

```bat
if "%ARGS%"=="" set "ARGS=--sessions 9 --speed 50 --mix beginner:2,intermediate:5,advanced:2 --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1"
```

화면을 보면서 실행하고 싶으면 `--show`를 붙인다.

```bat
if "%ARGS%"=="" set "ARGS=--sessions 9 --speed 50 --mix beginner:2,intermediate:5,advanced:2 --show --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1"
```

표본을 더 많이 쌓는 일반 실행 예시는 아래다.

```bat
if "%ARGS%"=="" set "ARGS=--sessions 30 --speed 50 --mix beginner:2,intermediate:5,advanced:2 --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1"
```

중급자만 30세션 돌리고 싶으면 아래처럼 바꾼다.

```bat
if "%ARGS%"=="" set "ARGS=--sessions 30 --speed 50 --profile intermediate --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1"
```

중요한 차이:

- 일반 실행: `--speed-check`를 넣지 않는다. 각 세션이 끝날 때마다 Google Sheet 체크포인트 업로드 큐에 저장되고, CMD가 뒤에서 순차 업로드한다.
- 속도 검증: `--speed-check`를 넣는다. 로컬에서 배속 차이만 비교하고 시트에는 저장하지 않는다.

특정 숙련도만 실행할 수 있다.

```powershell
run-balance-simulation.cmd --profile beginner --sessions 30
run-balance-simulation.cmd --profile intermediate --sessions 30
run-balance-simulation.cmd --profile advanced --sessions 30
```

특정 상황 프리셋만 고정해서 확인할 수도 있다.

```powershell
run-balance-simulation.cmd --scenario pressureAttack --sessions 9
run-balance-simulation.cmd --scenario comboFocus --sessions 9
run-balance-simulation.cmd --profile intermediate --scenario highRoll --sessions 9
```

스테이지와 출전 기물 6개를 직접 지정해서 실험할 수 있다.

```powershell
run-balance-simulation.cmd --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1 --sessions 30 --speed 50
run-balance-simulation.cmd --stage stage-2 --pieces basic_3,scatter_2,sniper_1,breaker_4,blast_2,support_1 --profile intermediate --sessions 30
```

`--pieces`는 `PieceData`의 기물 ID를 쉼표로 6개 입력한다. 같은 기물 ID를 중복 입력하는 방식은 현재 검증에서 막는다.

브라우저 화면을 보면서 확인하려면 `--show`를 추가한다. 같은 밸런스를 변경 전후 비교할 때는 동일한 `--seed`를 사용한다.

## 동작 원칙

- 로그 숫자를 직접 만들지 않고 실제 게임을 자동 플레이한다.
- 소팅 시간은 숙련도별 로그정규분포에서 매번 새로 추출하고 게임 종료까지 계속 소팅한다.
- 소팅 횟수는 제한하지 않으며 생존 시간과 평균 소팅 간격에 따른 결과값으로만 기록한다.
- 당장 완성되는 3-Sort가 없으면 같은 기물 두 개를 모아 다음 소팅을 준비하고, 후속 완성 이동을 `planQueue`에 기억한다.
- 의미 없는 랜덤 이동은 하지 않는다. 직접 3-Sort, 수리/공격 준비 이동, 또는 다음 매칭을 만드는 의미 있는 이동만 수행한다.
- `세린/빈칸/도이`에 `세린`을 넣어 `세린/세린/도이`를 만들고, 이후 `도이`를 빼서 `세린/세린/빈칸`으로 정리하는 체인은 의미 있는 계획 이동으로 취급한다.
- 단, 후보가 모두 막혀 입력이 멈출 때는 `board-unlock` 응급 이동을 1회 허용한다. 이 이동은 사람이 보드를 풀기 위해 하는 최소 이동이며 `boardUnlockCount`, `idleDecisionCount`로 별도 기록한다.
- 초보자와 중급자는 몬스터가 슬롯에 근접하거나 적이 누적되면 생존 슬롯의 공격 소팅을 우선한다. 압박이 낮아지면 파괴 슬롯 수리를 다시 시도한다.
- 상급자는 전장 압력, 파괴 슬롯 수, 남은 생존 슬롯 수를 함께 계산해 공격과 수리를 분배한다.
- 모든 숙련도는 슬롯이 공격받거나 전장 압력이 높아지면 평상시보다 소팅 간격이 짧아진다.
- 특전은 화면에 제시된 후보만 현재 전투 상황과 세션 빌드 성향으로 평가한다.
- 특전 선택은 적 누적, 슬롯 체력, 파괴 슬롯 수, 현재 콤보, 보유 기물 타입, 세션 전략을 함께 점수화하고 가장 높은 점수를 선택한다. 특전 오판 랜덤성은 사용하지 않는다.
- `--stage`와 `--pieces`가 있으면 매 세션 시작 전에 선택 스테이지와 편성을 강제로 적용한다.
- 자동 플레이 결과는 웹앱을 통해 Google Sheet에만 저장하며 `data_source=simulation`으로 구분한다. 일반 실행은 세션 1판 종료마다 체크포인트를 큐에 넣고 바로 다음 세션을 진행하므로 중간에 멈춰도 마지막 완료 세션까지 남는다.
- 대시보드에서는 `표본` 필터로 `real`과 `simulation`을 분리한다.
- 실제 플레이 로그는 소팅 완성 수, 평균 소팅 간격, 도달 웨이브, 클리어 여부로 초보자/중급자/상급자를 가볍게 추정한다.
- 신규 시뮬 로그의 `payload_json.simulation`에는 `plannedSortRatio`, `planFollowupCount`, `planSetupCount`, `planBreakCount`, `reactiveSortRatio`, `averagePlanDepth`, `boardUnlockCount`, `idleDecisionCount`가 기록된다.

## 숙련도 기준

밸런스 판단은 상급자보다 초보자/중급자 안정성을 우선 본다. 상급자는 상한선 확인용이고, 초보자는 초반 이탈 위험, 중급자는 정상 플레이 시 클리어 가능성을 보는 기준 표본이다.

| 숙련도 | 평균 소팅 간격 | 행동 성향 | 대시보드에서 먼저 볼 것 |
|---|---:|---|---|
| 초보자 | 5.8초 | 느리고 실수가 있지만 눈앞의 뚜렷한 3-Sort는 잡는다 | W1~W4 도달률, 초반 슬롯 체력, 소팅 전환율 |
| 중급자 | 3.35초 | 공격/수리 전환을 할 수 있고 압박 상황에서 공격 소팅을 더 우선한다 | W5~W10 클리어율, 압박 웨이브 잔존 수, 특전 선택 후 성과 |
| 상급자 | 2.35초 | 공격, 수리, 콤보, 특전을 대부분 최적에 가깝게 분배한다 | 밸런스 상한, 특정 조합 과성능, 필살기 의존도 |

실제 로그의 숙련도 추정은 `소팅 완성 수`, `소팅 시도 수`, `평균 소팅 간격`, `도달 웨이브`, `클리어 여부`를 함께 본다. 자동 플레이 로그는 `bot_profile`을 그대로 사용한다.

## 출력

실행 결과는 로컬 JSON을 만들지 않고 Google 로그 시트에 저장된다. 실행 종료 후 대시보드는 시트 데이터를 다시 읽어 갱신된다.

주요 실행 옵션:

| 옵션 | 의미 |
|---|---|
| `--sessions 100` | 자동 플레이 세션 수 |
| `--speed 50` | 게임 시간 배속, 최대 50 |
| `--seed 20260702` | 재현용 난수 시드 |
| `--speed-check` | 같은 seed를 여러 배속으로 돌려 핵심 결과 일치 여부 검증 |
| `--check-speeds 1,10,50` | 속도 검증 배속 목록 |
| `--check-sessions 1` | 속도 검증에 사용할 세션 수. 기본 1 |
| `--mix beginner:2,intermediate:5,advanced:2` | 숙련도 혼합 비율 |
| `--profile advanced` | 특정 숙련도만 실행 |
| `--scenario pressureAttack` | 특정 상황 프리셋만 실행 |
| `--stage stage-1` | 실행할 StageData key 지정 |
| `--pieces basic_1,...` | 출전 PieceData key 6개 직접 지정 |
| `--show` | 브라우저 화면 표시 |
| `--no-dashboard` | 시트 기록만 하고 대시보드 갱신 생략 |
| `--dry-run` | 브라우저와 필수 파일만 확인 |

## 속도 검증

50배속 결과를 믿기 전에 같은 seed를 1배속, 10배속, 50배속으로 돌려 핵심 결과가 같은지 확인할 수 있다. 이 검증은 로컬에서만 비교하고 Google Sheet에는 업로드하지 않는다.

```powershell
run-balance-simulation.cmd --speed-check --check-sessions 1 --check-speeds 1,10,50 --seed 20260706 --stage stage-1 --pieces basic_1,scatter_1,sniper_1,breaker_1,blast_1,support_1
```

검증 기준:

- 실패 처리: 결과, 도달 웨이브, 소팅 시도 수가 달라짐
- 경고 처리: 이벤트 체크섬, 특전 선택 수, 계획형 소팅 비중이 달라짐

체크섬 경고가 있어도 핵심 결과가 같으면 50배속은 밸런스 탐색용으로 사용할 수 있다. 핵심 결과가 달라지면 해당 seed는 50배속 신뢰 불가로 보고 1배속/10배속 로그와 비교한다.

시나리오 프리셋:

| 키 | 의미 |
|---|---|
| `standard` | 기본 랜덤 |
| `highRoll` | 좋은 특전 후보가 제시됐을 때 리롤 판단이 유리한 표본 |
| `lowRoll` | 좋은 특전 후보가 적게 제시됐을 때 리롤 판단이 보수적인 표본 |
| `pressureAttack` | 압박 시 공격 소팅을 더 우선 |
| `comboFocus` | 콤보/전체정렬 특전 선호 |

기본 커버리지 모드는 9세션 기준 초보자 2세션, 중급자 5세션, 상급자 2세션을 배정한다. 기본 랜덤, 좋은 후보 제시, 나쁜 후보 제시, 압박 공격 우선, 콤보 중심 시나리오를 섞어 최소 커버리지를 만든다. `--random-mix`를 지정한 경우에만 혼합 비율 기반 무작위 배정으로 전환한다.

대시보드에서 `표본=simulation`을 선택하면 최신 시뮬레이터 버전이 자동 선택된다. 이전 자동 플레이 결과는 삭제하지 않고 버전 필터로 분리한다.

## 시뮬 보정 대시보드

`시뮬 보정` 탭은 실제 로그와 자동 플레이 로그를 같은 빌드/스냅샷 필터 안에서 비교한다.

- `실제 표본`: 플레이 로그를 초보자/중급자/상급자로 추정해 묶은 값이다.
- `시뮬 표본`: 자동 플레이가 기록한 `bot_profile`, `bot_strategy`, `bot_scenario`를 그대로 사용한다.
- `보정 필요도`: 클리어율, 평균 도달 웨이브, 3-Sort 완성 수, 평균 소팅 간격 차이를 합친 참고 점수다.
- `시뮬 시나리오 프리셋 결과`: 같은 숙련도 안에서도 압박 공격, 특전 운, 콤보 중심 같은 행동 차이가 결과에 얼마나 영향을 주는지 확인한다.

`bot_scenario` 컬럼은 Apps Script에도 추가되어 있어야 한다. 웹앱 스크립트를 갱신 배포하지 않으면 기존 로그는 저장되지만 시나리오 컬럼은 비어 있을 수 있다.

## 스테이지/기물 조합 분석

자동 플레이 로그에는 실험 조건이 함께 저장된다.

| 컬럼 | 의미 |
|---|---|
| `bot_stage_key` | 자동 플레이가 강제로 선택한 스테이지 key |
| `bot_piece_ids` | 자동 플레이가 강제로 선택한 PieceData key 6개 |
| `bot_piece_types` | 선택 기물의 TowerType/역할 구성 |
| `bot_piece_levels` | 선택 기물의 레벨 구성 |
| `bot_loadout_hash` | 같은 기물 조합을 묶기 위한 정렬된 조합 키 |

대시보드는 이 값을 사용해 스테이지별, 기물 조합별, 스테이지 x 기물 조합별 성과를 나눠 보여준다.

우선 확인할 지표:

- 스테이지별 클리어율, 평균 도달 웨이브, 종료 슬롯 체력
- 기물 조합별 클리어율, 평균 도달 웨이브, 시스템 피해 의존도
- 스테이지 x 기물 조합 히트맵
- 가져간 기물 타입 구성별 평균 성과
- 같은 조합의 초보자/중급자/상급자 성과 차이

## 소팅 지표

- `평균 소팅 시도`: 세션당 기물 이동 횟수다.
- `평균 3-Sort 완성`: 세션당 실제 완성된 생존 슬롯 3-Sort 횟수다. 수리 완료는 별도 집계한다.
- `소팅 전환율`: 전체 3-Sort 완성 수를 전체 이동 시도 수로 나눈 가중 평균이다.
- `평균 소팅 간격`: 실제 게임 시간 기준으로 연속 이동 사이의 평균 초다. 시뮬레이션은 의사결정 지연 평균도 보조값으로 남긴다.

## 권장 표본 순서

1. `--sessions 3 --show`로 행동 확인
2. `--sessions 30`으로 진행 정지와 로그 분포 확인
3. 각 숙련도 100세션씩 실행
4. 실제 사용자 로그와 평균, 중앙값, 분산, 클리어율 비교
5. 프로필 값을 보정한 후 동일 시드로 밸런스 변경 전후 비교
