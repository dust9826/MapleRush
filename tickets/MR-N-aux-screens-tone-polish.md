---
id: MR-N
title: 보조 4종 색·아이콘 게임 톤 정비 (+토스트 GroupOrder 수정)
status: backlog
owner: unassigned
area: ui
touches:
  - ui/PopupGroup.ui
  - ui/ToastGroup.ui
  - ui/GameOverGroup.ui
  - ui/GameClearGroup.ui
  - ui/RewardGroup.ui
depends_on: []
branch: ""
created: 2026-06-26
updated: 2026-06-26
---

# 보조 4종 색·아이콘 게임 톤 정비

## Goal
보조 화면 4종(구매확인 팝업 / 토스트 / 보상 / 게임오버·클리어)의 색·아이콘을 게임 톤으로 정비한다. (UI 설계서 p.13~14 "보조 화면 ①·②")

## Acceptance criteria
- [ ] 구매 확인 팝업(PopupGroup·UIPopup): 딤+패널, 확인/취소 — 색·아이콘 게임 톤
- [ ] 토스트(ToastGroup·UIToast): 성공=청록 / 실패=크림슨 색 구분, 2~3초 페이드, 하단 중앙 누적 표시
- [ ] 보상(RewardGroup·RewardController): 롤된 보상만 카드 제시(수령/버리기) → 다음으로
- [ ] 결과(GameOver/GameClearGroup): 동일 레이아웃, 타이틀·색만 전환(오버=크림슨/클리어=청록) + 결과 stat + 영구점수 + 재도전/로비
- [ ] **토스트 z-order 수정**: `ToastGroup` GroupOrder 5→20 (상점=7 등에 가려지지 않게, 설계서 토스트=최상단)

## Subtasks
<착수 시 채움>
- [ ] 

## Notes / decisions
- 토스트 GroupOrder=5 현재값은 ShopGroup(7)보다 낮아 상점 위 토스트가 가려짐 — MR-C 작업 중 발견된 잠재 이슈를 여기서 처리(권장 20).
- **노드 선택 화면**은 기존 3택 구조와 정합(추가 작업 거의 없음, 설계서 p.9) — 별도 티켓 없이 색/아이콘 정비 시 함께 점검.
- 출처: `docs/maplerush_UI_ver1.pdf` p.9, p.13, p.14.

## Verify
- Maker `play` → 구매/획득/실패 시 토스트 색·페이드 확인, 상점 위에서도 토스트가 앞에 뜨는지, 게임오버/클리어 색 전환 확인.
