---
id: MR-AG
title: 튜토리얼 진입 시 아이템3+랜덤능력 지급, 나갈 때 복원
status: done
owner: D4LGONA
area: script
touches: [RootDesk/MyDesk/Tutorial/TutorialManager.mlua]
depends_on: []
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 튜토리얼 진입 시 아이템3+랜덤능력 지급, 나갈 때 복원

## Goal
튜토리얼(연습장) 진입 시 아이템 3개(짱돌/연막/섬광) + 랜덤 능력 1개를 지급해 자유 연습. 진입 전 기존 로드아웃을 저장했다가 나갈 때 복원.

## Fix
- TutorialManager에 저장 프로퍼티(savedSlot1~3/savedAbilityId/savedAbilityUses/hasSavedLoadout) 추가.
- GrantTutorialLoadout(player): 기존 상태 1회 저장(가드) → items Slot1~3 = rock/smoke/flash, ability = 5종 중 랜덤 + ResetUses + UsesLeft=9(연습용). OnArrived에서 호출.
- RestoreLoadout(player): 저장 상태로 items/ability 복원 + 능력 진행효과(무적/부동심) 해제 + hasSavedLoadout=false. EndTutorial에서 호출.

## Acceptance criteria
- [x] 진입 시 아이템 3개 + 랜덤 능력(연습 사용횟수) 지급.
- [x] 기존 아이템/능력 저장 후 종료 시 정확히 복원.
- [x] 빌드 에러 0 + 런타임 검증(왕복).

## Verify
execute_script: 기존(flash//, manji(2)) → GrantTutorialLoadout → (rock/smoke/flash, immovable(9), saved 확인) → RestoreLoadout → (flash//, manji(2)). PASS.
