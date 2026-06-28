---
id: MR-G
title: 적 AI 상태패턴 정비 (ad-hoc 문자열 → FSM, 공격 모션/판정 분리)
status: in-progress
owner: dust9826
area: script
touches:
  - RootDesk/MyDesk/Enemy/EnemyMelee.mlua
  - RootDesk/MyDesk/Enemy/EnemyRanged.mlua
  - RootDesk/MyDesk/Enemy/Boss/BossController.mlua
  - RootDesk/MyDesk/Models/Enemies/
depends_on: []
branch: "feat/enemy-fsm"
created: 2026-06-20
updated: 2026-06-28
---

# 적 AI 상태패턴 정비 (ad-hoc 문자열 → FSM, 공격 모션/판정 분리)

## Goal
적 AI의 상태 관리를 **문자열 기반 ad-hoc 상태 머신**에서 **정식 FSM**(MSW `StateComponent` + `@State`, 또는 `msw-behaviourtree` BT)으로 정비한다. 특히 "공격 모션이 시작되면 조건과 무관하게 끝까지 수행/명중"되는 문제를 고쳐, **공격 모션과 명중 판정을 분리**하고 상태 전이로 중단(인터럽트)·취소가 깔끔하게 되도록 한다. 확장(기절/넉백/페이즈)도 쉬워진다.

## 현황 / 문제 (관찰)
- `EnemyMelee`: `property string aiState`("idle" / "windup" / "cooldown")를 `OnUpdate`에서 수동 분기·전이. 애니는 `PlayClip`(SpriteRUID 직접 교체)으로 구동 — `StateComponent`/`StateAnimationComponent` 미사용.
- `EnemyRanged`: `cyclePhase`("aim" 등) 동일 패턴.
- `BossController`: 패턴/그로기도 자체 상태 추정 — 확인 필요.
- **"공격 모션 무조건 수행"**: windup 진입 후 모션이 재생되며, 진행 중 플레이어가 이탈/조건 변화가 생겨도 상태가 도중 취소·전환되지 않고 사이클이 끝까지 굴러가는 경향. 모션(연출)과 hit 판정이 한 메서드에 묶여 있어 "모션=명중"으로 읽힘.
- 상태가 문자열이라 컴파일 타임 검증 없음, 전이 규칙이 흩어져 있어 유지보수/확장 취약.

## Acceptance criteria
- [ ] 적(근접/원거리) 상태가 **정식 FSM**으로 표현됨 (MSW `StateComponent`+`@State` FSM 또는 BT). 문자열 `aiState`/`cyclePhase` 수동 분기 제거.
- [ ] **공격 모션과 명중 판정 분리**: 모션 재생 ≠ 자동 명중. 명중은 별도 판정 시점에 조건(범위/시야/취소 여부)으로 결정.
- [ ] 공격 windup 중 **인터럽트/취소** 가능 (예: 플레이어 사거리 이탈 → Chase로 복귀, 기절/사망 → 즉시 중단). 조건 미충족 시 공격이 "무조건" 끝까지 가지 않음.
- [ ] 애니메이션이 상태에 종속(상태 전이 → 클립 전환). 가능하면 `StateAnimationComponent` 경로로 정리.
- [ ] 근접·원거리 둘 다 적용, **MapleTile·SideView 양쪽**에서 정상 동작 (회귀 없음).
- [ ] (선택) BossController도 동일 FSM 패턴으로 정리, 페이즈/그로기 전이 명시.

## Subtasks
- [x] 현행 EnemyMelee/EnemyRanged/BossController 상태·전이·애니 구동 방식 정밀 매핑 (2026-06-28)
- [x] FSM 방식 결정 → **클린 커스텀 FSM(enum 상태 + 단일 전이 메서드, Pattern A)** (아래 Notes 결정 참조)
- [ ] **[근접 우선]** EnemyMelee: PATROL/CHASE/ATTACK/COOLDOWN enum FSM — 전이 1메서드, 모션은 상태 진입 시 PlayClip, 공격은 commit(중간취소X), 종료 후 재평가
- [ ] PATROL 거동 추가(스폰 기준 좌우 배회 + leash) + 어그로/공격 범위 전이
- [ ] 양 맵모드(MapleTile/SideView) 검증 + 상태 전이 로그
- [ ] (후속) EnemyRanged 동일 패턴 + BossController(BT 후보) 정리

## Notes / decisions

### 결정 (2026-06-28) — 방식 = 클린 커스텀 FSM (Pattern A), 범위 = 근접 우선
- **방식**: enum 상태 + 단일 전이 메서드(`SetState`). MSW `StateComponent`/`@State`는 안 씀 — 적이 아바타가 아니라 **SpriteRUID 교체(Pattern A)** 라 `StateAnimationComponent` 자동전환 이점이 없고, monster.md도 sprite 적엔 StateComponent를 IDLE/DEAD로만 제한 권장. 구조는 정식 FSM이되 backing은 Pattern A. (StateComponent 전환은 로직 동일·backing만 교체라 추후 쉬움.)
- **거동 스펙(사용자 합의)**: 기본 PATROL(스폰 기준 좌우 배회) → 어그로 범위 진입 시 CHASE(추격) → 공격범위 진입 시 ATTACK. **공격은 한번 시작하면 commit(중간 취소 없음)**, 끝나면 재평가(범위안=재공격 / 어그로안=추격 / 밖=PATROL). 어그로 범위 이탈 시 PATROL 복귀. (= 티켓 원안의 "windup 인터럽트"는 사용자 의도상 **제외** — 공격은 commit.)
- 죽음/그레이스/기절은 상태와 무관한 오버라이드(최우선 가드)로 처리, 해제 시 재평가.
- 범위: **EnemyMelee 먼저** 정비·검증 → 원거리/보스로 확장(보스는 BT 후보).

### 매핑 (현행, 2026-06-28)
- EnemyMelee: `aiState`("idle"/"windup"/"cooldown") 수동분기, PATROL 없음(플레이어 없으면 정지). windup 진입 후 타이머만, 범위이탈 취소 없음.
- EnemyRanged: `cyclePhase`("aim"/"cooldown"), 감지이탈 시 aim 취소 있음.
- BossController: `phase`("delay"/"windup") + `CancelWindup()`(그로기/그레이스), StartPattern/ResolvePattern로 모션·판정 이미 분리.

## Notes / decisions (원본)
- MSW 레퍼런스: `msw-combat-system`(FSM/AI 표), `msw-general/references/animation-state.md`(StateComponent↔StateAnimationComponent 파이프라인, `ChangeState`/`AddState`/`SetActionSheet`, `[LEA-3005]`), `msw-general/references/monster.md`(몬스터 캐논 구성), `msw-behaviourtree`(BT 대안).
- 결정 포인트: 단순 적은 `StateComponent` FSM로 충분, 보스처럼 분기 많은 패턴은 BT가 유리할 수 있음.
- MR-B(보스 공격 애니메이션)와 연관 — 보스 FSM 정비 시 함께 고려.
- 현 적 모델은 MapleTile(Rigidbody) + SideView(Sideviewbody)+MovementComponent 듀얼바디(MR-S에서 추가). FSM 이동 분기는 기존 `GetMoveBody`/맵타입 분기 패턴 재사용.

## Verify
- Maker `play` → 적이 사거리 밖이면 공격 안 함 / windup 중 플레이어 이탈 시 공격 취소·추격 복귀 / 기절·사망 시 즉시 중단 → `logs`로 상태 전이 로그 확인.
- 근접·원거리·보스 각각 MapleTile·SideView에서 모션·판정 분리 동작 확인. build/runtime 에러 0.
