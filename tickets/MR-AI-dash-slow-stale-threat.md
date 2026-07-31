---
id: MR-AI
title: 죽은 적 위협 잔존으로 대시 슬로우 오발동 (러브샷 계열 버그)
status: in-progress
owner: dust9826
area: script
touches: [RootDesk/MyDesk/Core/CombatPrimitives.mlua, RootDesk/MyDesk/Enemy/EnemyHealth.mlua, RootDesk/MyDesk/Enemy/Boss/BossController.mlua]
depends_on: []
branch: "dust9826/MapleRush"
created: 2026-08-01
updated: 2026-08-01
---

# 죽은 적 위협 잔존으로 대시 슬로우 오발동

## Goal
적을 죽인 직후(또는 러브샷 방지로 상쇄된 상황에서) 대시하면 이미 죽은 적의 공격이 위협으로 남아
슬로우모션(불릿타임)이 오발동하는 버그를 수정한다. "죽은 적은 더 이상 위협이 아니다"를
투사체(기존 러브샷 방지)뿐 아니라 **공격 레코드**에도 일관 적용.

## Acceptance criteria
- [ ] windup 중이던 적을 처치한 뒤 그 자리에서 대시해도 슬로우가 발동하지 않는다
- [ ] 보스 사망/그로기/그레이스로 끊긴 windup의 공격 레코드가 위협·패링 대상에서 제외된다
- [ ] 살아있는 적의 공격/투사체에 대한 슬로우 트리거는 기존과 동일하게 동작한다

## Subtasks
- [ ] CombatPrimitives: 레코드에 source(공격 주체) 저장 + `CancelAttacksBySource` 추가
- [ ] EnemyHealth.Die: `DestroyOwnedProjectiles`와 나란히 소스 레코드 일괄 취소
- [ ] BossController.CancelWindup: `rec.canceled = true` 실제 설정 (현재 기즈모 브로드캐스트만 함)
- [ ] Verify: build 0에러 + 런타임 로그 증거

## Notes / decisions
- 근본 원인: `RegisterEnemyAttackBox` 레코드는 만료(expireAt)나 패링 외엔 취소 경로가 없음.
  적이 windup 중 죽으면 레코드가 최대 windup+0.25s+Trail 동안 `AnyThreatNear`에 위협으로 잔존.
- `CancelWindup`은 기즈모 취소만 브로드캐스트하고 서버 레코드 `canceled`를 안 세우던 별도 홀.
- 취소 시 `BroadcastCancel`도 호출해 클라 기즈모 동기 제거(패링 UI 혼선 방지).

## Verify
Maker: refresh → build 0에러 → play → 스테이지 진입 → windup 중 적 처치 → 즉시 대시 →
`[CombatPrimitives] ... canceled ... (source died)` 로그 확인 + `[SlowMotion] SERVER slow ACTIVE` 미출력.
