---
id: MR-AE
title: 상점 UI 뒤 배경도 로딩화면으로
status: done
owner: D4LGONA
area: script
touches: [RootDesk/MyDesk/Stage/FloorManager.mlua]
depends_on: [MR-AA]
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 상점 UI 뒤 배경도 로딩화면으로

## Goal
상점 팝업이 뜰 때 뒤 상점 맵이 그대로 보이던 것을 로딩화면(일러스트 배경)으로 가림 (테마/스테이지 선택과 동일 톤).

## Fix
- FloorManager.ClientShowShop에 `_SelectBackdrop:ShowLoading(true)` 추가.
- 상점 스테이지는 ResetStage(→ClientStageReset→HideLoading)를 안 타므로(StageManager 437·492) 여기서 켜면 유지됨.
- 상점 나가 보스 스테이지 진입 시 ClientStageReset이 HideLoading으로 끔 → 대칭.
- z-order: ShopGroup(5) > LoadingGroup(3) → 팝업이 로딩 배경 위에 렌더.

## Acceptance criteria
- [x] 상점 열릴 때 로딩 일러스트 배경 표시(뒤 맵 가림).
- [x] 상점 팝업은 배경 위에 정상 표시.
- [x] 빌드 에러 0 + 런타임 검증.

## Verify
execute_script: ClientShowShop 호출 → loadingShown=true(일러스트+TIP), shopPopupOpen=true. PASS.
