---
id: MR-Y
title: 자쿰 보스 고정(추격 안 함) — Stationary 플래그
status: in-progress
owner: dust9826
area: mixed
touches: [RootDesk/MyDesk/Enemy/Boss/BossController.mlua, RootDesk/MyDesk/Models/Enemies/BossZakum.model]
depends_on: []
branch: feat/boss-zakum-stationary
created: 2026-07-04
updated: 2026-07-04
---

# 자쿰 보스 고정(추격 안 함) — Stationary 플래그

## Goal
폐광 자쿰은 원작처럼 제자리 고정형 보스다. 현재 모든 보스가 공유하는 `ChaseToward` 추격 로직 때문에 자쿰도 플레이어를 따라 움직인다. 자쿰만 가만히 서서 패턴만 발동하도록 조정한다.

## Acceptance criteria
- [ ] 자쿰(BossKind="zakum")이 플레이어를 추격해 좌우로 이동하지 않는다.
- [ ] 자쿰의 3패턴(P-Z1 근접/P-Z2 수평탄/P-Z3 다지점)은 정상 발동한다.
- [ ] 엘리쟈/스노우맨 등 다른 보스의 추격 동작은 그대로 유지된다.

## Subtasks
- [ ] BossController에 `Stationary` 불리언 프로퍼티 추가 + 추격 블록 게이팅
- [ ] BossZakum.model에 `Stationary=true` 주입(BossKind와 동일한 Value 방식)
- [ ] refresh → build 로그 확인
- [ ] play로 자쿰 이동 X / 패턴 발동 O 검증
- [ ] 다른 보스 회귀 확인(엘나스/오르비스 진입)

## Notes / decisions
- 설계: 보스별 토글 가능한 model-native `Stationary` 플래그. `self.BossKind == "zakum"` 하드코딩 대신 프로퍼티로 두어 기획자가 다른 보스도 고정형으로 전환 가능.
- FlipX(스프라이트 좌우 향)는 현재 `ChaseToward` 안에서만 갱신됨. 고정 시 향이 안 바뀌지만 패턴 히트박스는 `facing`(playerCenter vs myCenter)로 독립 계산되므로 판정은 정상. 시각적 향 갱신은 플레이테스트 후 필요 시 추가(YAGNI).

## Verify
Maker play → 폐광 자쿰 맵 진입 → 보스가 제자리 유지하는지 + 패턴 로그(`[BossController] pattern P-Z...`) 확인. 로그로 이동 velocity 0 확인.
