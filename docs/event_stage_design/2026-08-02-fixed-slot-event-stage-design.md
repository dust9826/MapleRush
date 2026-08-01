# 고정 3번 슬롯 이벤트 스테이지 설계

- 상태: 승인됨
- 티켓: `MR-AI`
- 기준일: 2026-08-02
- 기준 문서:
  - `event_stage_design_plan.md`
  - `event_stage_design_spec.md`
  - `event_data/*.csv`

## 1. 목표

테마를 선택한 뒤 반복되는 노드 선택 화면에서 3번 슬롯을 이벤트 전용 카드로 고정한다.
플레이어가 3번을 선택하면 서버가 `common + 현재 테마` 이벤트 풀에서 이벤트 하나를 뽑아
모달로 제시하고, 선택지 결과를 서버에서 정확히 한 번 확정한다.

이번 단계는 이벤트 선택·표시·결과 확정 구조를 검증하는 수직 슬라이스다.
이벤트 효과는 실제 게임 시스템에 적용하지 않고 `EventEffectGateway`에서
`[EventEffect][DEFERRED]` 로그만 남긴다.

## 2. 확정 결정

- 1번 슬롯은 기존 일반 스테이지 흐름을 유지한다.
- 2번 슬롯은 다른 기능을 위해 예약하며 이번 작업에서 연결하거나 변경하지 않는다.
- 3번 슬롯은 매 노드 선택 라운드마다 이벤트 카드로 고정한다.
- 이벤트 종류는 3번 슬롯을 클릭한 시점에 서버가 무작위로 선택한다.
- 후보 풀은 활성화된 `common + 현재 테마` 이벤트로 제한한다.
- `weight`가 있는 이벤트 선택과 `probability`가 있는 결과 선택은 서버에서 처리한다.
- 결과는 `EventInstance`당 한 번만 결정하며, 재요청은 기존 결과를 반환한다.
- 이벤트 완료는 진행도 한 칸으로 계산한다.
- 이벤트 효과는 `EffectIntent`로 변환하되 실제 적용하지 않는다.
- 강제 전투 결과를 가질 수 있는 이벤트는 1차 후보 풀에서 제외한다.
- 이벤트는 별도 맵으로 이동하지 않고 현재 MapleTile 테마 맵 위의 모달로 진행한다.

## 3. 검토한 접근법

### 3.1 FloorManager 중심 확장

`FloorManager`에 이벤트 데이터 로드, 추첨, 선택지, 결과까지 모두 넣는 방식이다.
파일 수는 적지만 층 진행과 이벤트 상태가 결합되고, 강제 전투와 실제 효과를 추가할 때
`FloorManager`가 빠르게 비대해진다.

### 3.2 이벤트 전용 맵

이벤트마다 전용 맵으로 이동하는 방식이다. 연출 확장에는 유리하지만 현재 요구사항은
텍스트·일러스트 중심 모달이므로 맵 로딩, 위치 복원, 타이머 정지, 실패 복구 비용이 과하다.

### 3.3 전용 이벤트 도메인과 얇은 통합 경계

기존 `FloorManager`는 노드 라운드와 진행도만 소유한다. 정적 데이터는 `EventCatalog`,
런타임 상태는 `EventManager`, 효과는 `EventEffectGateway`, UI는 `EventController`,
영구 발견 기록은 `EventDiscoveryStorage`로 분리한다.

이 방식을 채택한다. 기존 일반 스테이지 흐름에 대한 침범이 가장 작고, 이후 랜덤 노드,
강제 전투, 실제 효과 실행을 독립적으로 추가할 수 있다.

모듈 경계는 다음 원칙을 따른다.

- 기존 모듈은 `EventManager.StartEvent` 파사드만 알고 이벤트 데이터 구조는 모른다.
- `EventManager`는 `FloorManager`를 직접 호출하지 않고 완료 EventType을 발행한다.
- 클라이언트 UI는 `EventManager`에 참조를 등록하지 않고 표시 EventType을 구독한다.
- 정적 데이터, 런타임 세션, 저장소, 효과 출력, UI 표현을 서로 다른 변경 이유로 분리한다.
- mLua에 인터페이스 문법이 없으므로 Repository, Facade, Gateway, Observer 패턴으로
  의존성 역전 경계를 구현한다.

## 4. 현재 구조와 변경 경계

현재 `FloorManager`는 별도 `@Logic`이며 다음 흐름을 이미 담당한다.

- 테마 선택
- 일반 스테이지 덱과 3개 노드 후보 생성
- 노드 선택 화면 표시
- 일반전, 상점, 보스 순서
- 보상 종료 후 다음 노드로 전환

이번 작업은 새 `FloorManager`를 만들지 않는다. 기존 `FloorManager`에 다음 책임만 추가한다.

- 노드 라운드 식별자와 선택 잠금
- 3번 이벤트 슬롯 검증
- 이벤트 완료 후 진행도 한 칸 반영
- 이벤트 시작 실패 시 라운드 잠금 해제

이벤트 데이터, 선택지, 결과, 효과 로그는 `FloorManager` 밖에서 처리한다.

## 5. 구성 요소

### 5.1 FloorManager

노드 선택 라운드를 서버 권위로 관리한다.

```text
NodeRound
- roundId
- phase
- locked
- cards[1] = normal
- cards[2] = reserved
- cards[3] = event
```

클라이언트 요청은 `roundId + slotId`를 포함한다. 서버는 현재 라운드, `PhaseName`,
잠금 상태, 슬롯 종류를 검증한다. 첫 유효 요청에서 라운드를 잠가 더블클릭과 지연 RPC가
두 이벤트를 만들지 못하게 한다.

현재 `NormalsClearedThisFloor`는 `StageManager`와 HUD가 이미 참조하므로 이름은 유지한다.
다만 의미를 “이번 층에서 소비한 일반 진행 슬롯 수”로 확장해 일반전과 이벤트를 모두 센다.
이벤트는 결과 화면 확인과 완료 처리가 성공한 뒤 정확히 한 번 증가한다.

### 5.2 EventCatalog

서버 전용 정적 데이터 Repository다.

책임:

- UserDataSet 여섯 개 로드
- 문자열 셀의 boolean/number 변환
- ID·참조·확률·테마·강제 전투 검증
- 이벤트, 선택지, 결과, 효과, 비주얼 조회
- 현재 테마의 적격 이벤트 목록과 가중치 추첨

런타임 `EventInstance`, 사용자 ID, UI, 진행도는 알지 못한다.

### 5.3 EventManager

서버 권위 이벤트 상태 머신이다.

책임:

- `EventCatalog`를 통한 현재 테마 이벤트 선택
- `EventInstance` 생성
- 선택지 요청 검증
- 결과 확률 추첨과 1회 고정
- `EffectIntent` 생성
- 클라이언트 표시용 스냅샷 생성
- 완료 요청 처리와 서버 로컬 완료 EventType 발행

```text
EventInstance
- instanceId
- roundId
- userId
- theme
- eventId
- state: presented | resolved | completed
- selectedChoiceId
- resolvedOutcomeId
- effectIntents
```

`resolved` 이후 같은 선택 요청이 오면 재추첨하지 않고 기존 결과 스냅샷을 반환한다.
`completed` 이후 완료 요청은 무시한다.

`EventManager`는 `FloorManager`, `StageManager`, `ShopManager`, `RewardManager`를 직접
참조하지 않는다.

### 5.4 EventEffectGateway

`EventManager`가 만든 `EffectIntent` 목록을 받는 안정된 통합 경계다.

이번 티켓에서는 다음만 수행한다.

```text
[EventEffect][DEFERRED]
instance=<instanceId>
event=<eventId>
choice=<choiceId>
outcome=<outcomeId>
effect=<effectId>
period=<period>
type=<effectType>
value=<value>
stack=<stackRule>
```

배치 종료 시 다음 로그를 남긴다.

```text
[EventEffect][DEFERRED] batch complete count=<N>
```

이번 티켓에서는 `GameStateManager`, `StageManager`, `ShopManager`, `RewardManager`,
DataStorage를 호출하지 않는다. 추후 효과 정책을 확정하면 게이트웨이 내부만 실제 실행기로
교체한다.

### 5.5 EventController와 EventGroup.ui

이벤트는 독립적인 팝업 화면 단위로 만든다.

- `EventGroup.ui`: `UIGroup + CanvasGroup`, `GroupType=UIType`, 팝업 계층
- 시작 시 숨김
- 전체 화면 Dimmer가 뒤 UI의 raycast를 차단
- 본문/선택 화면과 결과 화면을 별도 패널로 분리
- 서버 스냅샷의 제목, 설명, 선택지, 결과 요약, 예정 효과 요약만 표시
- 클라이언트에서 이벤트나 결과 확률을 계산하지 않음

이벤트가 열리면 `InputRouter` 컨텍스트를 `Popup`으로 설정한다. 종료 후 다음 노드 화면이
열리면서 `Node` 컨텍스트로 복귀한다. 이벤트는 비전투 구간이므로 `RunTimer`는 비활성 상태를
유지한다.

`EventManager`의 클라이언트 RPC는 UI를 직접 호출하지 않고 `EventViewEvent`를 발행한다.
`EventController`는 이 이벤트를 구독하고 해제하는 UI Adapter다.

### 5.6 EventDiscoveryStorage

기준 문서의 `discoveredChoiceIds`만 영구 저장한다.

- 로그인 시 `PlayerBootstrap` 경로에서 한 번 로드
- 서버 메모리에 캐시
- 처음 선택한 `choiceId`만 추가
- 새로운 발견이 생긴 시점에만 저장
- UI 갱신이나 프레임 루프에서 DataStorage를 호출하지 않음

발견되지 않은 선택지는 상세 설명을 `???`로 표시하고, 선택 라벨은 표시한다.
발견 기록은 효과 적용과 독립적이다.

## 6. 데이터 계약

기존 CSV 여섯 개를 런타임 UserDataSet으로 옮긴다.

- `event_templates.csv`
- `event_choices.csv`
- `event_outcomes.csv`
- `event_effects.csv`
- `event_rewards.csv`
- `event_visuals.csv`

각 CSV는 같은 위치의 `.userdataset` 래퍼와 쌍을 이룬다. 모든 셀은 문자열로 읽히므로
`enabled`, `weight`, `probability`, `forced_combat`, 수치 값은 로드 단계에서 명시적으로 변환한다.

로드 시 다음을 검증한다.

- 중복 ID
- 존재하지 않는 이벤트·선택지·결과·효과·보상 참조
- 선택지가 없는 활성 이벤트
- 음수 가중치 또는 유효하지 않은 확률 합
- 알 수 없는 테마와 비활성 데이터
- 강제 전투 결과가 후보 풀에 들어오는지 여부

후보 이벤트는 다음 조건을 모두 만족해야 한다.

- `enabled = true`
- `event_scope = common` 또는 `theme_id = 현재 테마`
- 현재 버전에서 지원하는 테마
- 도달 가능한 활성 결과 중 `forced_combat = true`가 하나도 없음

이벤트는 `weight`, 선택지 결과는 `probability`를 사용해 서버에서 추첨한다.

## 7. 서버 데이터 흐름

```text
FloorManager.NextNode
→ ClientShowNodeSelect(round snapshot)
→ 3번 클릭
→ RequestSelectNode(roundId, 3)
→ FloorManager 검증 및 round.locked = true
→ EventManager.StartEvent(user, theme, roundId)
→ EventCatalog에서 후보 조회 및 이벤트 추첨
→ EventInstance(state=presented) 생성
→ ClientDispatchView("open", presentation snapshot)
→ EventViewEvent
→ EventController.Open
→ RequestChoose(instanceId, choiceId)
→ 서버 검증 및 결과 1회 추첨
→ EventInstance(state=resolved)
→ EffectIntent 목록 생성
→ EventEffectGateway.SubmitBatch 로그
→ ClientDispatchView("result", result snapshot)
→ EventViewEvent
→ EventController.ShowResult
→ RequestComplete(instanceId)
→ EventInstance(state=completed)
→ EventStageCompletedEvent(roundId)
→ FloorManager.OnEventStageCompleted
→ 진행도 +1
→ FloorManager.NextNode
```

이벤트 ID는 노드 화면을 만들 때가 아니라 3번을 선택한 시점에 뽑는다.
따라서 슬롯 위치는 고정이지만 실제 이벤트 내용은 매 선택마다 무작위다.

## 8. 오류 및 복구

### 이벤트 시작 실패

후보가 없거나 데이터 검증이 실패하면 진행도를 소비하지 않는다. `FloorManager`는 라운드
잠금을 풀고 노드 화면을 유지해 플레이어가 1번 일반 스테이지를 선택할 수 있게 한다.

### 중복·지연 요청

현재 `roundId`, `instanceId`, 상태를 모두 검증한다. 과거 라운드 요청과 완료된 인스턴스 요청은
부작용 없이 거부한다.

### 잘못된 선택지

현재 이벤트에 속하지 않거나 비활성인 선택지는 서버에서 거부한다. 이벤트 화면과 인스턴스
상태는 유지한다.

### 재연결·UI 재요청

서버에 활성 `EventInstance`가 있으면 현재 상태에 맞는 스냅샷을 다시 보낸다.
`presented`면 선택 화면, `resolved`면 이미 확정된 결과 화면을 복원한다. 결과는 재추첨하지 않는다.

### 효과 로그 실패

로그 전용 게이트웨이는 게임 상태를 변경하지 않는다. 개별 EffectIntent 데이터가 잘못되면
해당 항목에 `log_error`를 남기되 결과 확정 자체를 되돌리거나 재추첨하지 않는다.

## 9. 이번 티켓에서 하지 않는 것

- 2번 슬롯 기능 구현
- 일반·엘리트·이벤트 노드 종류의 랜덤 가중치 배치
- 이벤트 효과의 실제 적용
- 강제 일반전·엘리트전
- 이벤트 보상 지급
- 상점 무료 구매·할인
- 배율 중첩 정책 확정
- DeepMine 확장 활성화
- 이벤트 전용 맵과 월드 연출

이 항목들은 이번 구조의 경계를 통해 후속 티켓으로 추가한다.

## 10. 검증 기준

### 정적 검증

- 모든 `.mlua` LSP 진단 오류 0
- 모든 UserDataSet 참조 검증 통과
- `EventGroup.ui` UIBuilder lint 통과
- 기존 사용자 미커밋 파일이 커밋에 포함되지 않음

### Maker 런타임 검증

- 테마 선택 후 각 노드 라운드에서 3번이 이벤트 카드로 표시됨
- 1번 일반 스테이지가 기존처럼 동작함
- 2번 슬롯은 기존 상태에서 변하지 않음
- 오르비스에서 `common + orbis`, 엘나스에서 `common + elnath`만 추첨됨
- 동일 `EventInstance`에 대한 중복 선택 요청이 같은 결과를 반환함
- 각 효과에 `[EventEffect][DEFERRED]` 로그가 출력됨
- 메소, 체력, 전투, 상점, 보상 상태가 이벤트 로그로 인해 변하지 않음
- 이벤트 완료 시 진행도가 정확히 한 칸 증가함
- 이벤트 시작 실패 시 진행도가 소비되지 않고 1번 선택이 가능함
- 일반전 이후 상점과 보스 진입에 회귀가 없음
- Maker build/runtime 오류 0

## 11. 예상 구현 파일

신규:

- `RootDesk/MyDesk/Event/EventCatalog.mlua`
- `RootDesk/MyDesk/Event/EventManager.mlua`
- `RootDesk/MyDesk/Event/EventEffectGateway.mlua`
- `RootDesk/MyDesk/Event/EventDiscoveryStorage.mlua`
- `RootDesk/MyDesk/Event/EventStageCompletedEvent.mlua`
- `RootDesk/MyDesk/Event/EventViewEvent.mlua`
- `RootDesk/MyDesk/UI/EventController.mlua`
- `RootDesk/MyDesk/Event/Data/*.csv`
- `RootDesk/MyDesk/Event/Data/*.userdataset`
- `ui/EventGroup.ui`

수정:

- `RootDesk/MyDesk/Stage/FloorManager.mlua`
- `RootDesk/MyDesk/UI/NodeSelectController.mlua`
- `RootDesk/MyDesk/Player/PlayerBootstrap.mlua`

`.ui`는 UIBuilder로만 작성하고, `.codeblock`은 Maker Refresh가 생성하도록 둔다.
