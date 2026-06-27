---
id: MR-L
title: 로비 화면 신규 (LobbyGroup + 컨트롤러)
status: backlog
owner: unassigned
area: ui
touches:
  - ui/LobbyGroup.ui
  - RootDesk/MyDesk/UI/LobbyController.mlua
depends_on: []
branch: ""
created: 2026-06-26
updated: 2026-06-26
---

# 로비 화면 신규

## Goal
게임 메인 로비 화면을 신규 제작한다. 메인 일러스트 배경 + 중앙 세로 텍스트 메뉴(구하러 가기/능력치 강화/설정/잠시 휴식하기). (UI 설계서 p.5 "게임 메인 [로비]")

## Acceptance criteria
- [ ] 배경 일러: SpriteGUIRenderer로 메인 일러스트 표시
- [ ] "구하러 가기" Button → `StartRun` → 첫 전투 진입
- [ ] "능력치 강화" Button → 메타 강화 화면(MR-O) 열기
- [ ] "설정" Button → 설정 팝업
- [ ] "잠시 휴식하기" Button → 종료/대기
- [ ] 입력 컨텍스트 = UI 버튼 전용 (전투 컨텍스트 외)

## Subtasks
<착수 시 채움>
- [ ] 

## Notes / decisions
- 🔴 신규 — `LobbyGroup.ui` + 컨트롤러 코드 미존재.
- "능력치 강화" 버튼은 MR-O 화면을 엶 → **MR-O가 컷되면 이 버튼은 숨김/비활성** 처리.
- 출처: `docs/maplerush_UI_ver1.pdf` p.5.

## Verify
- Maker `play` → 로비 표시 → 4개 버튼 각각 의도한 화면/동작으로 분기하는지 확인.
