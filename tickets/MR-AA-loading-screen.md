---
id: MR-AA
title: 로딩창 (풀스크린 일러스트 + TIP)
status: done
owner: D4LGONA
area: mixed
touches: [ui/, RootDesk/MyDesk/UI/, RootDesk/MyDesk/Stage/StageManager.mlua]
depends_on: []
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 로딩창 (풀스크린 일러스트 + TIP)

## Goal
맵 로드 대기 시간에 풀스크린 일러스트(랜덤) + 중앙하단 TIP(랜덤)를 띄워 몰입 유지 + 게임플레이 힌트 제공.

## Acceptance criteria
- [ ] `LoadingGroup.ui`: 풀스크린 일러스트 스프라이트(1920x1080 stretch) + 중앙하단 TIP 텍스트. 최상단 표시(가림).
- [ ] `LoadingOverlay.mlua`(클라 @Component): `_StageManager`에 자기등록, Show/Hide. FadeOverlay 패턴.
- [ ] Show 시 일러스트 풀에서 랜덤 1장 + TIP 12개 중 랜덤 1개 세팅.
- [ ] 트리거: **실제 맵 로드만** — 테마맵 진입/보스맵 진입(awaitingMap 폴링 구간)에 Show, 도착 시 Hide.
- [ ] 최소 표시시간 없음(준비되는 즉시 Hide).
- [ ] 일러스트 풀: 컷씬 7장 재활용 + (선택)썸네일 1~2장.

## Subtasks
- [x] SelectBackdrop.mlua (@Logic) — 일러스트 7 + TIP 12 풀 + ShowLoading/HideLoading + overlay 등록
- [x] LoadingOverlay.mlua (@Component) + LoadingGroup.ui (displayOrder 3, 풀스크린 일러스트+TIP)
- [x] 훅: 테마선택/노드선택(FloorManager)에서 ShowLoading(true) / 스테이지 준비완료(StageManager.ClientStageReset) HideLoading / 로비 등장(CutsceneController.EndCutscene) ShowLoading(false)
- [x] play 검증 (등록/표시/모드전환 PASS)

## Notes / decisions
- ★최종 흐름(사용자 확정): 로딩화면(일러스트+TIP)을 켜고 → 그 위에서 맵전환+테마/스테이지 선택 진행 → 스테이지 준비완료 시 끔.
- z-order: LoadingGroup displayOrder=3 → HUD(0)/맵 위, 선택팝업(Node=4/Theme=7)·로비(11) 아래. 팝업/로비가 로딩화면 위에 뜸.
- 로비 첫 등장 시에도 일러스트 배경(단 TIP 없음 — showTip=false). 선택화면은 TIP 표시(true).
- 일러스트 RUID: CutsceneController.scenes 7장 재활용(SelectBackdrop 풀). TIP 12종 기획 표 그대로.
- 상점/보스 맵로드는 이번 범위(테마·스테이지 선택) 밖 — 필요 시 확장.

## Verify
Maker play → 컷씬 종료 후 로비에 일러스트 배경 / 구하러가기 → 테마·스테이지 선택 내내 로딩화면 유지(뒤 맵 안 보임) → 전투 시작 시 숨김. logs로 등록·모드 확인 완료.
