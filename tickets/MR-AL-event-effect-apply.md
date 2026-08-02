---
id: MR-AL
title: 이벤트 효과 실제 적용 (로그 전용 게이트웨이 → 적용 어댑터)
status: backlog
owner: unassigned
area: script
touches: [RootDesk/MyDesk/Event/EventEffectGateway.mlua, RootDesk/MyDesk/Event/EventCatalog.mlua, RootDesk/MyDesk/Event/Data/EventEffects.csv, RootDesk/MyDesk/Stage/GameStateManager.mlua]
depends_on: []
branch: ""
created: 2026-08-02
updated: 2026-08-02
---

# 이벤트 효과 실제 적용 (로그 전용 게이트웨이 → 적용 어댑터)

## Goal

이벤트 선택 결과의 `EffectIntent`를 실제 게임 상태에 적용한다. 현재는
`EventEffectGateway`가 `[EventEffect][DEFERRED]` 로그만 남기는 v1 상태라,
결과 문구("능력 보상 획득" 등)는 뜨지만 메소·체력·능력치에 변화가 없다.

## 배경

- MR-AJ 수직 슬라이스에서 효과 적용은 의도적으로 범위 제외 (Gateway 포트만 확보).
- `EffectIntent`는 이미 데이터에서 흘러옴: `effectId / effectType / period /
  value / stackRule / uiSummary` (EventEffects.csv → EventCatalog →
  EventManager.BuildEffectIntents → Gateway.SubmitBatch).
- 남은 일 = effectType별로 실제 시스템(GameStateManager 메소·목숨,
  PlayerAbility, 상점 가격 등)에 매핑하는 어댑터 작성.

## Acceptance criteria

- [ ] EventEffects.csv에 존재하는 모든 `effect_type`이 적용 매핑을 갖거나,
      미지원 타입은 명시적 경고 로그로 드러난다 (조용한 무시 금지).
- [ ] `period`(즉시/스테이지/층/런) 규칙대로 지속·만료가 동작한다.
- [ ] `stack_rule`(중첩/갱신/무시)이 동일 효과 재획득 시 규칙대로 동작한다.
- [ ] 중복 요청(멱등 재전송)에도 효과가 1회만 적용된다 (resolve 1회 보장에 편승).
- [ ] 효과 적용 결과가 HUD/결과 패널 문구와 일치한다.
- [ ] 사망·재시작·층 이동 시 period 규칙에 맞게 초기화/유지된다.
- [ ] Maker build/runtime 오류 0, 기존 이벤트 플로우 회귀 없음.

## Subtasks

- [ ] EventEffects.csv의 effect_type 인벤토리 정리 + 시스템 매핑표 설계
- [ ] EffectApplier(가칭) 어댑터 작성 — Gateway 뒤에 연결, Gateway 포트 시그니처 유지
- [ ] period/stack 상태 추적 (런/층/스테이지 경계 훅: StartRun/NextNode/ResetStage)
- [ ] 적용 로그 + HUD 반영 확인용 log() 계측
- [ ] Maker 라이브 검증 (효과별 최소 1회 적용 확인 + 회귀)

## Notes / decisions

- Gateway 포트는 유지하고 뒤에 어댑터만 추가 — EventManager는 수정하지 않는 방향.
- 강제 전투 이벤트(forced_combat)는 여전히 범위 밖 (별도 티켓).
- 팀 논의 후 착수. MR-AJ Notes와 `docs/event_stage_design/` 설계 문서 참조.
