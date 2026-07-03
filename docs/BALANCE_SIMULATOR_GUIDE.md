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

브라우저 화면을 보면서 확인하려면 `--show`를 추가한다. 같은 밸런스를 변경 전후 비교할 때는 동일한 `--seed`를 사용한다.

## 동작 원칙

- 로그 숫자를 직접 만들지 않고 실제 게임을 자동 플레이한다.
- 소팅 시간은 숙련도별 로그정규분포에서 매번 새로 추출하고 게임 종료까지 계속 소팅한다.
- 소팅 횟수는 제한하지 않으며 생존 시간과 평균 소팅 간격에 따른 결과값으로만 기록한다.
- 특전은 화면에 제시된 후보만 현재 전투 상황과 세션 빌드 성향으로 평가한다.
- 자동 플레이 결과는 웹앱을 통해 Google Sheet에만 저장하며 `data_source=simulation`으로 구분한다.
- 대시보드에서는 `표본` 필터로 `real`과 `simulation`을 분리한다.

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
| `--show` | 브라우저 화면 표시 |
| `--no-dashboard` | 시트 기록만 하고 대시보드 갱신 생략 |
| `--dry-run` | 브라우저와 필수 파일만 확인 |

기본 커버리지 모드는 초보·중급·상급을 각각 3세션씩 배정하고, 6개 특전 전략을 모두 최소 한 번 포함한다. `--random-mix`를 지정한 경우에만 기존 무작위 혼합으로 전환한다.

## 권장 표본 순서

1. `--sessions 3 --show`로 행동 확인
2. `--sessions 30`으로 진행 정지와 로그 분포 확인
3. 각 숙련도 100세션씩 실행
4. 실제 사용자 로그와 평균, 중앙값, 분산, 클리어율 비교
5. 프로필 값을 보정한 후 동일 시드로 밸런스 변경 전후 비교
