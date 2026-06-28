---
id: MR-P
title: 피격 판정원 기즈모 (플레이어/적 hurtbox 시각화) + 구 마커원 제거
status: review
owner: dust9826
area: script
touches:
  - RootDesk/MyDesk/Player/
  - RootDesk/MyDesk/Core/GameConstants.mlua
depends_on: []
branch: "chore/ticket-system"
created: 2026-06-28
updated: 2026-06-28
---

# 피격 판정원 기즈모 (플레이어/적 hurtbox 시각화) + 구 마커원 제거

## Goal
공격 박스(평타/적근접)는 이미 기즈모로 그려지는데, 실제 명중을 결정하는 **피격원(hurtbox)** 이 안 보여 명중 타이밍/사거리 디버그가 안 됐다. 플레이어·적 피격원을 실제 판정과 동일 중심·반지름으로 그려, 이후 적 공격 판정 튜닝(MR-G)의 시각 근거로 쓴다. 겸사겸사 무의미하게 남아있던 노란 대시 마커원을 제거한다.

## Acceptance criteria
- [x] 플레이어 피격원(green, r=0.5) 상시 표시 — 실제 판정 중심(pos.y + PlayerCenterYOffset)과 일치
- [x] 적 피격원(magenta, r=RadiusEnemyHitbox) 살아있는 적마다 raw 좌표(=CombatPrimitives 판정 중심)에 표시
- [x] 구 노란 대시 마커원(GizmoManager 슬롯1) 제거
- [x] 풀 크기 증가(35→47)에도 기존 맵 깨지지 않음(EnsurePool 견고화)
- [x] build 0에러 + play 실측

## Subtasks
- [x] GameConstants: GizmoLinePoolSize 35→47, 레이아웃 주석 갱신
- [x] GizmoManager: 슬롯1 재용도(IdxPlayerHbox, r=0.5 bake), 적피격원 풀(35~46, ×12) bake+cursor, PlayerHurtbox/EnemyHurtbox 메서드, EnsurePool '마지막 슬롯' 기준 + 없는 인덱스만 스폰
- [x] CombatGizmo: 플레이어 피격원 매 프레임 + EnemyHealth 열거해 적 피격원
- [x] 노란 마커원 bake/place/호출/메서드 제거
- [x] refresh → build 0에러 → play 실측 검증

## Notes / decisions
- 이 프로젝트 전투는 native AttackComponent가 아니라 커스텀 `CombatPrimitives` 오버랩(box-vs-circle). 피격 판정이 둘 다 **원형**이라 원 기즈모가 실제 판정과 정확히 일치.
- 플레이어 피격원 중심 = pos.y + 0.5(=PlayerCenterYOffset), 적 피격원 중심 = 적 transform raw(발밑, y오프셋 없음) — 비대칭은 의도(코드 판정과 일치). 적 피격원이 발밑에 작게 잡히는 게 시각화로 드러남.
- 슬롯1은 다른 인덱스 보존 위해 번호 유지(재용도), 풀 증가는 마지막 슬롯 기준 ensure로 기존 맵 호환.
- **PR #11** (`chore/ticket-system → master`, 커밋 `ddf6d61`). 기존 대시-후속 PR에 포함(스택 아님, 단일 커밋 추가).
- 로드 스킬: msw-combat-system + (gizmo는 [[linerenderer-gizmo]] 메모 규칙 적용).

## Verify
- Maker play → 플레이어 주변 green 원 + 적 위치 magenta 원 렌더. 런타임 조회로 GizmoLine1 Enable=true / pos=player+0.5 / pts=40 확인 완료.
