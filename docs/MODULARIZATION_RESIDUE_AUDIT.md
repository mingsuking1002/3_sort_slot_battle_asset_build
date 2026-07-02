# 모듈화 이전 잔재 감사

작성일: 2026-06-22

대상:
- `3_sort_slot_battle_asset_build/assets/data/game-data.js`
- `3_sort_slot_battle_asset_build/index.html`
- `3_sort_slot_battle_asset_build/tools/validate-phase-2-3.mjs`

요약:
- 현재 전투 핵심 데이터는 `assets/data/game-data.js`의 데이터테이블 계층을 통해 런타임으로 변환된다.
- `TowerAiType`은 공식 편집 컬럼이며, 런타임 `aiType`은 `basic/basic-non/shotgun/heal` 발사 방식으로 사용한다.
- 주요 인라인 fallback은 validator에서 금지하고 있어, 구형 프로토타입의 큰 하드코딩은 대부분 제거된 상태다.
- 다만 `ranger`, 구형 stage merge, 저장소 마이그레이션, 일부 설정 fallback은 아직 남아 있다.

## 확인 명령

```powershell
rg -n "TowerAiType|towerAiType|aiType|ranger|legacy|Legacy|fallback|Fallback|baseBullets|supportHealAmount|deprecated|Deprecated|TODO|FIXME" `
  "3_sort_slot_battle_asset_build/assets/data/game-data.js" `
  "3_sort_slot_battle_asset_build/index.html" `
  "3_sort_slot_battle_asset_build/tools/validate-phase-2-3.mjs"
```

```powershell
rg -n "const monsters|const bosses|const wavePatterns|const stages|const designTables|window.GAME_DATA" `
  "3_sort_slot_battle_asset_build/assets/data/game-data.js"
```

## 1. 정리 결정 필요

| ID | 잔재 | 위치 | 현재 상태 | 위험도 | 권장 처리 |
| --- | --- | --- | --- | --- | --- |
| RES-01 | `ranger` 구형 타입 | `assets/data/game-data.js`, `index.html`, `tools/validate-phase-2-3.mjs` 다수 | 공식 6종에는 없지만 구형 타입/특전/설정/표시명이 남아 있다 | 중간 | 공식 타입이 6종으로 확정이면 별도 작업으로 삭제한다 |
| RES-02 | `ranger` 특전 행 | `game-data.js`의 `common-ranger-tempo`, `rare-ranger-highrpm`, `legend-ranger-suppress` | `migratedPerkRows`에서 필터링되어 활성화되지는 않는다 | 낮음-중간 | 데이터 원본 정리 시 삭제하거나 `inactive legacy` 블록으로 분리한다 |
| RES-03 | `rangerBurstIntervalMult`, `rangerDamageMod` | `index.html` 설정/특전/발사 프로필 | 활성 `ranger` 기물이 없어 실전 영향은 거의 없다 | 낮음-중간 | `ranger` 삭제 작업과 함께 제거한다 |
| RES-04 | validator의 `ranger` 기대 규칙 | `tools/validate-phase-2-3.mjs` | 활성 기물이 없으면 검사 루프에서 실질 영향이 없다 | 낮음 | 공식 6종 확정 후 validator 기대값에서도 제거한다 |

## 2. 보류 권장 호환층

| ID | 잔재 | 위치 | 현재 상태 | 위험도 | 권장 처리 |
| --- | --- | --- | --- | --- | --- |
| RES-05 | 구형 `stages` 배열 | `game-data.js`의 `const stages`, `legacyStagesByKey` merge | 새 `StageData`/`StageWaveData` 생성 중 제목, 설명, UI 이미지, firstWave fallback에 사용된다 | 중간 | StageData가 모든 표시/진입 정보를 갖게 되면 merge 제거 |
| RES-06 | 구형 `monsters`, `bosses`, `wavePatterns` 정적 객체 | `game-data.js` 상단 정적 테이블 | 현재는 런타임 생성/비교/보강의 재료로 남아 있다 | 중간 | MonsterData/BossData/WaveData가 완전히 자급자족하면 제거 |
| RES-07 | legacy localStorage 마이그레이션 | `index.html`의 `legacyLobby`, `legacyClearedStages`, `legacyPhonePreset`, `legacyBest` | 예전 저장값을 새 save 구조로 흡수한다 | 낮음 | 저장소 버전 정책 확정 전까지 유지 권장 |
| RES-08 | `fallbackPieceKeys`, `fallbackUnlockCost` | `game-data.js`, `index.html`, validator | 데이터 누락 시 기본 덱/상점 비용을 보장한다 | 낮음 | 런타임 안전장치로 유지 가능 |

## 3. 전투 영향은 낮지만 추후 정리 후보

| ID | 잔재 | 위치 | 현재 상태 | 위험도 | 권장 처리 |
| --- | --- | --- | --- | --- | --- |
| RES-09 | `baseBullets` | `game-data.js` config, `index.html` HUD/설정/legacyCount | 현재 `ProjectileCount`가 우선이고, 없는 경우 fallback으로 쓰인다 | 낮음-중간 | 모든 포탑 투사체 수가 `TowerData.ProjectileCount`만 쓰도록 확정되면 삭제 |
| RES-10 | `legacyCount` | `index.html`의 발사 프로필 생성부 | `ProjectileCount`가 없을 때만 fallback | 낮음 | 데이터 누락 허용 정책을 없앨 때 제거 |
| RES-11 | `supportHealAmount` | `game-data.js` config, `index.html` 설정/표시/회복 fallback | 리리는 현재 `TowerAtk` 우선, 값이 없을 때 fallback으로만 사용 | 낮음 | 보조형 회복량을 100% `TowerAtk`로 강제하면 삭제 |
| RES-12 | deprecated piece level config | `game-data.js`의 `pieceLevelDamageBonus`, `pieceLevelRangeBonus`, `pieceLevelAmmoBonus` | 모두 deprecated이며 실질 성장값은 테이블 중심 | 낮음 | 구형 성장 시스템을 더 이상 비교하지 않으면 삭제 |
| RES-13 | 구형 직접 힐 발사 분기 | `index.html` | 제거 완료. 리리는 `TowerAiType=heal`, `TargetPriority=near`, `ProjectileType=heal`로 적을 공격하고 명중 시 회복한다 | 완료 | 추가 작업 없음 |

## 4. 작업 대상에서 제외할 항목

| ID | 항목 | 이유 |
| --- | --- | --- |
| EXC-01 | LocalizeData 안의 `PieceName_ranger_1` | 사용자가 로컬라이즈를 당분간 작업 대상에서 제외한다고 했으므로 보류 |
| EXC-02 | 인트로 로고 fallback, 아이콘 fallback CSS | 데이터 모듈화 잔재가 아니라 에셋 로딩 안전장치 |
| EXC-03 | `server.err.log`, `server.out.log` | 0바이트 로컬 개발 로그. 전투/데이터 동작과 무관 |

## 5. 확인된 비잔재

| ID | 항목 | 판정 |
| --- | --- | --- |
| OK-01 | 루트 `3_sort_slot_battle_asset_build/game-data.js` | 존재하지 않음. 현재 참조는 `assets/data/game-data.js`로 정리됨 |
| OK-02 | 루트 `3_sort_slot_battle_asset_build/data` 폴더 | 존재하지 않음 |
| OK-03 | 구형 `PIECE_DEFINITIONS` 인라인 정의 | validator 금지 목록에 있고 현재 검증 통과 대상 |
| OK-04 | `window.GAME_DATA || {}` 식의 런타임 전체 fallback | validator 금지 목록에 있고 현재 검증 통과 대상 |
| OK-05 | 상점 비용 `gold: 800, ticket: 1` 인라인 fallback | validator 금지 목록에 있고 현재 검증 통과 대상 |
| OK-06 | 보스/몬스터 기본값 인라인 fallback | validator 금지 목록에 있고 현재 검증 통과 대상 |

## 6. 추천 정리 순서

1. `ranger` 삭제 여부를 먼저 결정한다.
   - 공식 타입이 Basic, Scatter, Sniper, Breaker, Blast, Support 6종이면 `ranger`는 삭제 후보.
   - 나중에 7번째 타입으로 복귀할 가능성이 있으면 `inactive legacy`로 명시 분리한다.
2. `StageData`/`StageWaveData`가 UI 표시값까지 완전히 갖도록 보강한다.
   - 그 뒤 `legacyStagesByKey` merge를 제거한다.
3. `ProjectileCount` 누락을 허용하지 않는 정책으로 바꾼다.
   - 그 뒤 `baseBullets`, `legacyCount` fallback을 제거한다.
4. 보조형 회복량을 `TowerAtk`로만 계산하도록 확정한다.
   - 그 뒤 `supportHealAmount` fallback을 제거한다.
5. 저장소 버전 마이그레이션 유예 기간이 끝나면 legacy localStorage 흡수 코드를 삭제한다.

## 7. 현재 결론

지금 바로 전투 QA에 영향을 줄 가능성이 가장 큰 잔재는 `ranger` 계열 이름과 설정이 여러 군데 남아 있다는 점이다. 다만 활성 덱과 공식 데이터에는 연결되어 있지 않으므로 즉시 플레이를 망가뜨리는 상태는 아니다.

가장 중요한 구조 정리는 이미 완료된 편이다. 다음 청소는 기능 수정이라기보다 정책 결정에 가깝다. 즉, `ranger`를 정말 폐기할지, 구형 stage fallback을 언제 끊을지, 데이터 누락 fallback을 얼마나 오래 허용할지를 정하면 된다.
