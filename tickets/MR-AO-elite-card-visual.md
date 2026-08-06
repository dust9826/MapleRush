---
id: MR-AO
title: 엘리트 카드(2번) 전용 색 표기 정비 (제거된 보라 테두리 대체)
status: backlog
owner: unassigned
area: ui
depends_on: []
touches: [ui/NodeSelectGroup.ui]
branch: ""
created: 2026-08-06
updated: 2026-08-06
---

# 엘리트 카드 전용 색 표기 정비

## Goal

MR-AN에서 노드 2번 슬롯을 엘리트 전투로 배치하면서 기획서(§6.1)의 "진하고 밝은 보라 테두리"를
4변 바 스프라이트로 구현했으나, 투박하다는 피드백으로 제거함 (PR #112).
현재 식별은 카드 보라 틴트 + "엘리트 전투" 라벨 + 보라 서브텍스트뿐.
**엘리트 카드가 일반 카드와 분명히 구분되는 전용 색/아트 표기**를 정식으로 정한다.

## 후보 방향 (팀 결정 필요)

- 카드 배경 아트 자체를 엘리트 전용 색 변형으로 교체 (일반 A 카드의 색놀이)
- 카드 sprite에 UI 머티리얼(Outline/ColorGlow 계열, IsUIMaterial=true) 적용
- 버튼(라벨 바) 색만 전용 색으로 교체

## Acceptance criteria

- [ ] 엘리트 카드가 색으로 즉시 구분됨 (일반/이벤트와 혼동 없음)
- [ ] 호버/프레스 반응(Transition·HoverMaterial)과 충돌 없음

## Notes

- 명세 §2의 카드 5:3:2 독립 추첨 전환도 미착수 상태 — 별도 티켓감 (착수 시 카드 시각도 동적 전환 필요).
