---
id: MR-AB
title: 층별 적 체력 스케일링 (+20%/층 합연산)
status: review
owner: D4LGONA
area: script
touches: [RootDesk/MyDesk/Core/GameConstants.mlua, RootDesk/MyDesk/Enemy/EnemyHealth.mlua]
depends_on: []
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 층별 적 체력 스케일링

## Goal
층이 오를수록 적 체력이 합연산으로 증가 → 후반부 도전 유지. 1층 +0% / 2층 +20% / 3층 +40%. 소숫점 버림.

## Acceptance criteria
- [x] 배율 = 1 + 0.20×(층-1) 합연산 (GameConstants.EnemyHpMultForFloor).
- [x] 적 스폰 시 MaxHP×배율, math.floor(소숫점 버림), HP=MaxHP.
- [x] 모든 적(잡몹+보스) 적용. 튜토리얼/런 밖은 무배율(RunActive 게이팅).
- [x] 빌드 에러 0 + 런타임 검증.

## Notes / decisions
- EnemyHealth.OnBeginPlay에서 스케일 → 모델 기본 MaxHP가 완전히 적용된 뒤라 스폰 직후 읽기 레이스 없음. 잡몹/보스 자동 적용.
- GameConstants.HpAddPerFloor = 0.20 (기획자 편집용 상수).
- 검증: 배율 1.0/1.2/1.4, 30→36/42, 33→39(버림), 실제 스폰 적 floor2 base30→MaxHP36.

## Verify
execute_script: EnemyHpMultForFloor + math.floor 확인 + RunActive/CurrentFloor 세팅 후 적 스폰 → EnemyHealth.MaxHP 스케일 확인. PASS.
