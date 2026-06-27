---
id: MR-J
title: 게임 HUD 요소 바인딩 (목숨/대시/아이템/능력/메소)
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

# 게임 HUD 요소 바인딩

## Goal
게임 진행 HUD(좌상단 세로 [목숨·대시·아이템] + 우측 능력 / 우상단 메소)의 각 요소를 서버 `@Sync` 데이터에 바인딩해 실시간 표시한다. (UI 설계서 p.6 "게임 진행 HUD")

## Acceptance criteria
- [ ] 목숨: 아이콘 + Text가 `GameStateManager.CurrentLives` 반영 (아이콘 1개 + ×N 표기)
- [ ] 대시 게이지: Sprite ×N가 `PlayerDash.DashCount / MaxDash` 반영
- [ ] 아이템 슬롯 ×3: Button(카드)가 `PlayerItems.Slot1~3` 반영
- [ ] 능력: Button + 아이콘이 `Ability.AbilityId / UsesLeft` 반영
- [ ] 메소: Text가 `GameStateManager.Meso` 반영
- [ ] 입력 컨텍스트 Combat에서 정상 동작

## Subtasks
<착수 시 채움>
- [ ] 

## Notes / decisions
- 바인딩 데이터는 전부 서버 권위 `@Sync` — UI는 표시만 (설계서 공통규칙 p.3 "바인딩 데이터").
- 공통 규칙: UIGroup GroupOrder HUD=1(항상 바닥), 게이지는 SpriteGUIRenderer Filled 모드.
- 출처: `docs/maplerush_UI_ver1.pdf` p.6.

## Verify
- Maker `play` → 전투 진입 → 목숨/대시/아이템/능력/메소 값이 실제 상태와 일치하는지 `logs`로 확인.
