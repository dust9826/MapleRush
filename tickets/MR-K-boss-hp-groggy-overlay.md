---
id: MR-K
title: 보스 HP·그로기 게이지 오버레이
status: todo
owner: unassigned
area: ui
touches:
  - ui/HUD.ui
  - RootDesk/MyDesk/UI/HUDController.mlua
depends_on: []
branch: ""
created: 2026-06-26
updated: 2026-06-26
---

# 보스 HP·그로기 게이지 오버레이

## Goal
보스 스테이지에서 기존 게임 진행 HUD 위에 중앙 상단 보스 HP 바 + 그로기 게이지 오버레이를 추가한다. (UI 설계서 p.7 "보스 스테이지")

## Acceptance criteria
- [ ] 보스 HP 바: Sprite(Filled Horizontal)가 `EnemyHealth.HP / MaxHP` 반영
- [ ] 그로기 게이지: Sprite(Filled Horizontal)가 `GroggyGauge.Gauge / GaugeMax` 반영
- [ ] 그로기 상태 연출(점멸 등): `GroggyGauge.IsGroggy` true일 때 표시
- [ ] 보스 스테이지에서만 노출, 일반 스테이지에선 숨김
- [ ] 나머지 HUD는 게임 진행 HUD와 동일 동작

## Subtasks
<착수 시 채움>
- [ ] 

## Notes / decisions
- 기존 `HUD.ui`에 보스 오버레이 요소를 **추가**하는 형태 (별도 .ui 아님).
- MR-J(HUD 요소 바인딩) 위에 얹히는 구조 — **soft-depend on MR-J** (HUD 자체는 이미 존재해 hard block은 아님; MR-J 미완이어도 착수 가능하나 함께 보면 효율적).
- 게이지는 Filled 모드 (설계서 공통규칙).
- 출처: `docs/maplerush_UI_ver1.pdf` p.7.

## Verify
- Maker `play` → 보스 스테이지 진입 → 보스 HP/그로기 게이지가 데미지·그로기 누적에 따라 갱신, IsGroggy 시 연출 확인.
