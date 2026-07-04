---
id: MR-AC
title: 능력 보상 풀 2종→5종 (버그픽스)
status: review
owner: D4LGONA
area: script
touches: [RootDesk/MyDesk/Stage/RewardManager.mlua, RootDesk/MyDesk/UI/HUDController.mlua]
depends_on: []
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 능력 보상 풀 2종→5종 (버그픽스)

## 문제
능력 보상으로 5종 중 2종(invincible/clearProjectiles)만 획득 가능. 나머지 3종(immovable/manji/spin)은 PlayerAbility에 완전 구현돼 있는데 RewardManager.ClaimAbilityReward의 롤 풀에서 누락.

## Fix
- RewardManager.ClaimAbilityReward: pool = {invincible, clearProjectiles, immovable, manji, spin}, RandomIntegerRange(1, #pool).
- HUDController 능력 라벨: immovable=부동심 / manji=만지 일섬 / spin=회전베기 한글 표기 추가(영문 raw 폴백 방지).

## Acceptance criteria
- [x] 능력 보상이 5종 중 랜덤으로 나옴.
- [x] HUD에 5종 모두 한글 라벨.
- [x] 빌드 에러 0 + 런타임 검증.

## Verify
execute_script: 5-pool 50롤 분포(5종 전부 등장) + ClaimAbilityReward 실제 grant(spin) 확인. PASS.
