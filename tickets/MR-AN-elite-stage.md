---
id: MR-AN
title: 엘리트 스테이지 (노드 2번 슬롯 고정 + 적 강화/보라 외곽선 + 전용 보상 풀)
status: done
owner: dust9826
area: mixed
depends_on: []
touches: [RootDesk/MyDesk/Stage, RootDesk/MyDesk/Enemy, RootDesk/MyDesk/Player, RootDesk/MyDesk/Shop, RootDesk/MyDesk/Materials, ui/NodeSelectGroup.ui, ui/RewardGroup.ui]
branch: feat/elite-stage
created: 2026-08-06
updated: 2026-08-06
---

# 엘리트 스테이지

`docs/elite_stage_design_spec.md` 기반. 노드 선택의 **2번 슬롯을 엘리트 전투로 고정**한다
(이벤트=3번 고정과 같은 수직 슬라이스 방식 — 명세 §2의 5:3:2 독립 추첨은 후속).

## Goal

- 엘리트 = 선택된 일반 스테이지의 맵·스폰·적 편성 재사용(임시) + 적 강화 + 전용 보상 추가.
- 적 보정: 층 체력 보정 후 **체력 ×2.0(이벤트 ×1.5와 합연산)**, 이동속도 ×1.3.
- 시각 식별: `EliteEnemyOutline` 머티리얼(Outline 셰이더, 보라) + 스프라이트 1.25배.
  전투 판정은 상수 박스(`GameConstants.EnemyHbox*`, 공격박스 프로퍼티) 기반이라 크기 보정의 영향 없음 → 역보정 불요.
- 보상: 일반 보상 경로 유지(단 엘리트는 능력치 70%/아이템 90%/능력 40% 상향 판정)
  + 전용 보상 1개(10% 확률 2개, 중복 없음, 총 가중치 7 풀 9종).
- 재시작(사망)은 같은 편성·같은 보정 유지, 카드 재추첨 없음 (StageType/composition 보존으로 자동 충족).

## Subtasks

- [x] EliteEnemyOutline.material — Outline 셰이더 프로퍼티(AlphaCut/LitMode/OutlineColor/Thickness)는
      Maker 리소스 카탈로그(MODOutlineMaterial.P.*)에서 역추출
- [x] StageManager: StageType "elite" + StartEliteStageAt + EliteSpeedMult / FloorManager: 슬롯2 라우팅
- [x] EnemyHealth: 층 보정 → 엘리트·이벤트 합연산 → EliteModifier(외곽선+1.25배) 순서
- [x] 적 3종 AI 이동속도 ×1.3 (원본 MoveSpeed 불변)
- [x] GameStateManager: EliteClears + 런 지속 보정 상태(@Sync) / RewardManager: 전용 풀 추첨·적용
- [x] ShopManager: 다음 상점 무료 품목 예약/해제
- [x] UI: 노드 2번 카드(엘리트 전투/보라 테두리) + 3카드 호버 툴팁 + 보상 화면 엘리트 표기
- [x] Verify: 런타임 로그/스크린샷 PASS

## Acceptance criteria

- [x] 노드 선택 2번 카드 = 엘리트 전투 (보라 틴트/라벨 + 호버 툴팁 — 테두리는 피드백으로 제거, 추후 별도 색 표기 예정)
- [x] 엘리트 진입 시 일반 적 전원: 체력 ×2.0(층 보정 후), 이동속도 ×1.3, 보라 외곽선 + 1.25배 크기
- [x] 판정 크기는 원본 유지(상수 박스), 재시작 시 보정 누적 없음(재스폰이라 자동)
- [x] 클리어 시 일반 보상(상향 판정) + 전용 보상 1개(10%로 2개, 중복 없음) 서버 적용 + UI 표기
- [x] EliteClears 별도 집계, 진행 슬롯/덱 소모는 일반과 동일
- [x] 런 종료 시 런 지속 보정·상점 무료 예약 초기화 (StartRun 리셋)

## Notes

- 이벤트 '다음 전투 체력 ×1.5'는 아직 게이트웨이(로그 전용, MR-AL)라 합연산 훅(`EventHpMult()`)만 마련 — 실제 값은 MR-AL에서 배선.
- 명세 §2(카드 5:3:2 독립 추첨), §6.1 모바일 탭 안내는 이번 범위 밖(고정 슬롯 UI 유지).
- 명세 불명확분 해석: 엘리트 메소 = (NormalClears+EliteClears)×MesoPerNormalClear 누진, 점수 = Normal + Elite×2 + Boss×3.
