---
id: MR-AD
title: 패링 성공했는데 죽는 버그 (판정 타이밍)
status: done
owner: D4LGONA
area: script
touches: [RootDesk/MyDesk/Enemy/EnemyMelee.mlua, RootDesk/MyDesk/Enemy/Boss/BossController.mlua]
depends_on: []
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 패링 성공했는데 죽는 버그 (판정 타이밍)

## 문제
패링 성공 이펙트/그로기 충전은 떴는데 적 공격이 먼저 적용돼 플레이어가 죽음.

## 원인
- 패링 성공 판정 창 = `[hitAt-Lead(0.15), hitAt+Trail(0.05)]` — 명중시점 이후 50ms까지 성공 인정.
- 하지만 적/보스는 windup 종료(=hitAt) 순간 바로 `rec.canceled` 확인 후 `RequestHit` 적용.
- → hitAt 직후~+50ms에 들어온 패링: 적이 이미 명중(사망) → 그 다음 패링이 canceled=true+그로기+이펙트. "패링 성공했는데 죽음". 트레일 50ms 구간에서 체계적 발생.

## Fix
- 적 명중 판정(RequestHit)을 `hitAt + ParryWindowTrail`로 지연. 텔레그래프/명중시점(hitAt=windup)은 그대로, 판정만 Trail만큼 늦춤.
  - EnemyMelee: `stateTimer = WindupTime + ParryWindowTrail`
  - BossController: `phaseTimer = pat.windup + ParryWindowTrail`
- 트레일 구간 패링이 명중보다 먼저 canceled 세팅 → 적 해소 시 이미 무효. 부수효과로 텔레그래프가 유효 패링창 내내 표시.

## Acceptance criteria
- [x] 트레일 구간(hitAt~+0.05) 패링 시 플레이어가 죽지 않음.
- [x] 잡몹(EnemyMelee)+보스(BossController) 둘 다 적용.
- [x] 빌드 에러 0. 인게임 늦은 패링 확인(사용자).

## Verify
빌드 통과. 사용자 인게임 테스트에서 늦은 패링 정상 무효화 확인.
