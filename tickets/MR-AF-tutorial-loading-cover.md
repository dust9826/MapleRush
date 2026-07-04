---
id: MR-AF
title: 튜토리얼 진입 안 됨 (로비 로딩배경이 안 걷힘)
status: review
owner: D4LGONA
area: script
touches: [RootDesk/MyDesk/Tutorial/TutorialManager.mlua, RootDesk/MyDesk/UI/PauseController.mlua, RootDesk/MyDesk/UI/GameOverController.mlua, RootDesk/MyDesk/UI/GameClearController.mlua]
depends_on: [MR-AA]
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 튜토리얼 진입 안 됨 (로비 로딩배경이 안 걷힘)

## 원인
MR-AA에서 로비 첫 등장 시 로딩 일러스트 배경(order 3)을 깔았는데(EndCutscene→ShowLoading(false)), 튜토리얼 준비 완료(TutorialManager.ClientTutorialReady)에 HideLoading이 없어서 배경이 튜토리얼 맵을 계속 덮음 → "튜토리얼 안 들어가짐"처럼 보임. (구하러가기 경로는 ClientStageReset이 HideLoading을 부름)

## Fix
- TutorialManager.ClientTutorialReady에 `_SelectBackdrop:HideLoading()` 추가.
- 로비 복귀 시 항상 일관된 배경을 갖도록 복귀 지점 4곳에 `_SelectBackdrop:ShowLoading(false)` 추가: 튜토리얼 종료(ClientReturnToTitle)·런 포기(PauseController)·게임오버·게임클리어.
- 상태 규칙 통일: 로비 진입=배경 ON(TIP 없음) / 게임플레이 진입=배경 OFF.

## Acceptance criteria
- [x] 튜토리얼 진입 시 로딩배경이 걷혀 튜토리얼 맵이 보임.
- [x] 모든 로비 복귀 경로에서 일러스트 배경 일관 표시.
- [x] 빌드 에러 0 + 런타임 검증.

## Verify
execute_script: 로비 배경 ON → ClientTutorialReady → 배경 OFF(before=true, after=false). PASS.
