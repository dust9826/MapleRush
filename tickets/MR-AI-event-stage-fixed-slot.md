---
id: MR-AI
title: 고정 3번 슬롯 이벤트 스테이지 수직 슬라이스
status: in_progress
owner: D4LGONA
area: mixed
touches: [RootDesk/MyDesk/Event/EventManager.mlua, RootDesk/MyDesk/Event/EventEffectGateway.mlua, RootDesk/MyDesk/Event/EventDiscoveryStorage.mlua, RootDesk/MyDesk/UI/EventController.mlua, RootDesk/MyDesk/Stage/FloorManager.mlua, RootDesk/MyDesk/UI/NodeSelectController.mlua, RootDesk/MyDesk/Core/PlayerBootstrap.mlua, RootDesk/MyDesk/Event/Data, ui/EventGroup.ui]
depends_on: []
branch: "feat/event-stage"
created: 2026-08-02
updated: 2026-08-02
---

# 고정 3번 슬롯 이벤트 스테이지 수직 슬라이스

## Goal

테마 선택 뒤 노드 화면의 3번 슬롯을 이벤트 전용으로 고정하고, 서버가
`common + 현재 테마` 이벤트를 무작위로 선택해 모달 선택지와 결과를 제공한다.
이벤트 효과는 실제 적용하지 않고 안정된 게이트웨이에서 로그만 남긴다.

확정 설계:
`docs/event_stage_design/2026-08-02-fixed-slot-event-stage-design.md`

## Acceptance criteria

- [ ] 1번 슬롯의 기존 일반 스테이지 흐름이 유지된다.
- [ ] 2번 슬롯은 기존 예약 상태에서 변경되지 않는다.
- [ ] 모든 일반 노드 선택 라운드에서 3번 슬롯이 이벤트 카드로 표시된다.
- [ ] 3번 선택 시 서버가 활성 `common + 현재 테마` 이벤트 풀에서 가중치 추첨한다.
- [ ] `roundId`와 잠금으로 더블클릭·지연 요청이 이벤트를 중복 생성하지 못한다.
- [ ] 선택 결과는 서버에서 한 번만 추첨되고 중복 요청에는 같은 결과를 반환한다.
- [ ] 이벤트 효과는 `EffectIntent`로 변환되어 `[EventEffect][DEFERRED]` 로그만 남긴다.
- [ ] 이벤트 로그는 메소·체력·전투·상점·보상 상태를 변경하지 않는다.
- [ ] 강제 전투 결과가 있는 이벤트는 1차 후보 풀에서 제외된다.
- [ ] 이벤트 완료 시 층 진행도가 정확히 한 칸 증가한다.
- [ ] 이벤트 시작 실패 시 진행도를 소비하지 않고 1번 선택으로 복구할 수 있다.
- [ ] 선택지 발견 기록은 UserDataStorage에 이벤트 기반으로 저장되고 `???` 표시를 제어한다.
- [ ] Maker build/runtime 오류 0, 일반전→상점→보스 흐름 회귀 없음.

## Subtasks

- [ ] 이벤트 CSV를 UserDataSet 쌍으로 옮기고 서버 로더·참조 검증 작성
- [ ] `EventManager` 서버 상태 머신과 멱등 요청 처리 작성
- [ ] 로그 전용 `EventEffectGateway` 작성
- [ ] `EventDiscoveryStorage` 로드·캐시·이벤트 기반 저장 작성
- [ ] `FloorManager`에 3번 이벤트 분기, 라운드 ID, 잠금, 진행도 처리 추가
- [ ] `NodeSelectController`에 3번 버튼 연결, 2번 미변경 확인
- [ ] UIBuilder로 `EventGroup.ui` 작성하고 `EventController` 바인딩
- [ ] Maker refresh → build logs → play → runtime logs 검증

## Notes / decisions

- 이벤트 ID는 노드 라운드 생성 때가 아니라 3번 슬롯 선택 시 추첨한다.
- 이벤트는 별도 맵으로 이동하지 않고 현재 MapleTile 테마 맵 위의 모달로 진행한다.
- 실제 효과 적용, 강제 전투, 2번 슬롯, 랜덤 노드 종류는 후속 티켓 범위다.
- 사용자 소유의 `mswai update` 변경과 기존 `docs/event_stage_design` 원본 파일은 이 티켓 커밋에 섞지 않는다.

## Verify

Maker refresh 후 빌드 로그 오류 0을 확인한다. Play에서 오르비스·엘나스 각각 3번 이벤트를
반복 선택해 테마 풀, 결과 멱등성, `[EventEffect][DEFERRED]` 로그, 진행도 1회 증가를 확인한다.
1번 일반 스테이지와 이후 상점·보스 흐름을 대조군으로 재검증한다.
