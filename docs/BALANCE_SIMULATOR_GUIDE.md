# 밸런스 자동 플레이 시뮬레이터

## 실행

`run-balance-simulation.cmd`를 더블클릭하면 9세션, 50배속, 커버리지 모드로 실행한다.

```powershell
run-balance-simulation.cmd
```

특정 숙련도만 실행할 수 있다.

```powershell
run-balance-simulation.cmd --profile beginner --sessions 30
run-balance-simulation.cmd --profile intermediate --sessions 30
run-balance-simulation.cmd --profile advanced --sessions 30
```

특정 상황 프리셋만 고정해서 확인할 수도 있다.

```powershell
run-balance-simulation.cmd --scenario pressureAttack --sessions 9
run-balance-simulation.cmd --scenario repairFirst --sessions 9
run-balance-simulation.cmd --profile beginner --scenario mistakeHeavy --sessions 9
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
- 당장 완성되는 3-Sort가 없으면 같은 기물 두 개를 모아 다음 소팅을 준비한다.
- 초보자와 중급자는 몬스터가 슬롯에 근접하거나 적이 누적되면 생존 슬롯의 공격 소팅을 우선한다. 압박이 낮아지면 파괴 슬롯 수리를 다시 시도한다.
- 상급자는 전장 압력, 파괴 슬롯 수, 남은 생존 슬롯 수를 함께 계산해 공격과 수리를 분배한다.
- 모든 숙련도는 슬롯이 공격받거나 전장 압력이 높아지면 평상시보다 소팅 간격이 짧아진다.
- 특전은 화면에 제시된 후보만 현재 전투 상황과 세션 빌드 성향으로 평가한다.
- 특전 선택은 적 누적, 슬롯 체력, 파괴 슬롯 수, 현재 콤보, 보유 기물 타입, 세션 전략을 함께 점수화한다.
- `--stage`와 `--pieces`가 있으면 매 세션 시작 전에 선택 스테이지와 편성을 강제로 적용한다.
- 자동 플레이 결과는 웹앱을 통해 Google Sheet에만 저장하며 `data_source=simulation`으로 구분한다.
- 대시보드에서는 `표본` 필터로 `real`과 `simulation`을 분리한다.
- 실제 플레이 로그는 소팅 완성 수, 평균 소팅 간격, 도달 웨이브, 클리어 여부로 초보자/중급자/상급자를 가볍게 추정한다.

## 출력

실행 결과는 로컬 JSON을 만들지 않고 Google 로그 시트에 저장된다. 실행 종료 후 대시보드는 시트 데이터를 다시 읽어 갱신된다.

주요 실행 옵션:

| 옵션 | 의미 |
|---|---|
| `--sessions 100` | 자동 플레이 세션 수 |
| `--speed 50` | 게임 시간 배속, 최대 50 |
| `--seed 20260702` | 재현용 난수 시드 |
| `--mix beginner:34,intermediate:33,advanced:33` | 숙련도 혼합 비율 |
| `--profile advanced` | 특정 숙련도만 실행 |
| `--scenario pressureAttack` | 특정 상황 프리셋만 실행 |
| `--stage stage-1` | 실행할 StageData key 지정 |
| `--pieces basic_1,...` | 출전 PieceData key 6개 직접 지정 |
| `--show` | 브라우저 화면 표시 |
| `--no-dashboard` | 시트 기록만 하고 대시보드 갱신 생략 |
| `--dry-run` | 브라우저와 필수 파일만 확인 |

시나리오 프리셋:

| 키 | 의미 |
|---|---|
| `standard` | 기본 랜덤 |
| `weakStart` | 초반 실수와 약한 시작 |
| `highRoll` | 특전 선택 운이 좋은 표본 |
| `lowRoll` | 특전 선택 운이 나쁜 표본 |
| `mistakeHeavy` | 이동 실수가 많은 표본 |
| `pressureAttack` | 압박 시 공격 소팅을 더 우선 |
| `repairFirst` | 수리 성향이 강한 표본 |
| `comboFocus` | 콤보/전체정렬 특전 선호 |

기본 커버리지 모드는 초보·중급·상급을 각각 3세션씩 배정하고, 6개 특전 전략과 8개 시나리오를 섞어 최소 커버리지를 만든다. `--random-mix`를 지정한 경우에만 기존 무작위 혼합으로 전환한다.

대시보드에서 `표본=simulation`을 선택하면 최신 시뮬레이터 버전이 자동 선택된다. 이전 자동 플레이 결과는 삭제하지 않고 버전 필터로 분리한다.

## 시뮬 보정 대시보드

`시뮬 보정` 탭은 실제 로그와 자동 플레이 로그를 같은 빌드/스냅샷 필터 안에서 비교한다.

- `실제 표본`: 플레이 로그를 초보자/중급자/상급자로 추정해 묶은 값이다.
- `시뮬 표본`: 자동 플레이가 기록한 `bot_profile`, `bot_strategy`, `bot_scenario`를 그대로 사용한다.
- `보정 필요도`: 클리어율, 평균 도달 웨이브, 3-Sort 완성 수, 평균 소팅 간격 차이를 합친 참고 점수다.
- `시뮬 시나리오 프리셋 결과`: 같은 숙련도 안에서도 압박 공격, 수리 우선, 콤보 중심 같은 행동 차이가 결과에 얼마나 영향을 주는지 확인한다.

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
