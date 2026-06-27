---
id: MR-M
title: 테마 선택 2→3테마 확장
status: backlog
owner: unassigned
area: mixed
touches:
  - ui/ThemeSelectGroup.ui
  - RootDesk/MyDesk/UI/ThemeSelectController.mlua
depends_on: []
branch: ""
created: 2026-06-26
updated: 2026-06-26
---

# 테마 선택 2→3테마 확장

## Goal
테마 선택 화면을 기존 2테마에서 3테마(오르비스·엘나스·폐광)로 확장한다. 중앙 3카드, 미플레이 테마만 표시(2층은 2개). (UI 설계서 p.8 "테마 선택")

## Acceptance criteria
- [ ] 테마 카드 ×3: Button(카드) — 오르비스·엘나스·폐광
- [ ] 카드 일러: Sprite로 테마 키비주얼 표시
- [ ] 카드 선택 → `RequestSelectTheme`
- [ ] 미플레이 테마만 노출 (2층은 2개만 표시)
- [ ] 입력 컨텍스트 Node에서 동작

## Subtasks
<착수 시 채움>
- [ ] 

## Notes / decisions
- ⚠️ 기존 컨트롤러가 **2테마 인자 기준** → 3테마로 확장 필요 (UI뿐 아니라 컨트롤러 로직 수정 → area=mixed).
- 출처: `docs/maplerush_UI_ver1.pdf` p.8.

## Verify
- Maker `play` → 테마 선택 진입 → 3카드 표시·선택 동작, 2층 진입 시 2카드만 노출되는지 확인.
