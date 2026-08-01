# Fixed-Slot Event Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 테마 선택 이후 노드 화면의 3번 슬롯에서 서버 권위 이벤트를 실행하고, 결과 효과는 실제 적용 없이 구조화된 `[EventEffect][DEFERRED]` 로그로 검증한다.

**Architecture:** `EventCatalog` Repository가 정적 데이터와 조회를, `EventManager` Facade/State Machine이 런타임 인스턴스를, `EventEffectGateway`가 효과 출력 포트를, `EventDiscoveryStorage`가 영구 발견 기록을 각각 소유한다. 기존 `FloorManager`는 `StartEvent` 파사드만 호출하고 완료는 `EventStageCompletedEvent`로 구독하며, UI는 `EventViewEvent`를 구독하는 Adapter라 이벤트 도메인과 기존 게임 모듈 사이에 순환 의존성이 생기지 않는다.

**Tech Stack:** MapleStory Worlds CoreVersion `26.5.0.0`, mLua `@Logic`/`@Component`, UserDataSet (`.csv + .userdataset`), UserDataStorage, UIBuilder, Maker MCP (`refresh`, `logs`, `play`, `maker_execute_script`, `stop`).

## Global Constraints

- 실제 작업 루트는 `D:/Users/dust/Documents/MSW Projects/MapleRush`다.
- 세 테마 맵은 모두 `TileMapMode = 0` MapleTile이다. 이번 작업은 맵이나 Body를 변경하지 않는다.
- 1번 슬롯은 기존 일반 스테이지, 2번 슬롯은 미연결 예약, 3번 슬롯은 이벤트로 고정한다.
- 이벤트는 3번을 선택한 시점에 활성 `common + 현재 테마` 풀에서 `weight`로 서버 추첨한다.
- 선택 결과는 `probability`로 서버에서 정확히 한 번 추첨한다.
- 강제 전투 결과가 하나라도 도달 가능한 이벤트는 1차 후보 풀에서 제외한다.
- 효과는 `EffectIntent`로 만들지만 `EventEffectGateway`에서 로그만 출력한다.
- `GameStateManager`, `StageManager`, `ShopManager`, `RewardManager`에 이벤트 효과를 연결하지 않는다.
- `EventCatalog`는 사용자·UI·진행도·런타임 세션을 참조하지 않는다.
- `EventManager`는 `FloorManager`와 `EventController`를 직접 참조하지 않는다.
- 기존 모듈에서 이벤트 도메인으로 향하는 직접 호출은 `_EventManager:StartEvent(...)` 하나로 제한한다.
- 이벤트 도메인에서 기존 진행 흐름으로 돌아갈 때는 `EventStageCompletedEvent`만 사용한다.
- 서버 스냅샷에서 UI로 전달할 때는 클라이언트 RPC 후 `EventViewEvent`를 발행한다.
- 강제 전투와 실제 효과는 후속 Adapter/Gateway 구현으로 추가하며 `EventManager` 분기문에 다른 매니저 호출을 넣지 않는다.
- `NormalsClearedThisFloor` 이름은 호환성을 위해 유지하되 이벤트 완료도 층 진행 슬롯 한 칸으로 센다.
- `.ui`는 UIBuilder로만 수정·생성하고, `.codeblock`은 수정하지 않는다.
- 사용자 소유의 `.agents`, `.claude`, `.codex`, `Environment`, `AGENTS.md`, `skills-lock.json` 변경은 스테이징하지 않는다.
- 각 구현 커밋은 명시된 파일만 경로 지정해 스테이징한다.

---

## File Map

### 신규

- `RootDesk/MyDesk/Event/Data/EventTemplates.csv` / `.userdataset` — 이벤트 기본 정보와 가중치.
- `RootDesk/MyDesk/Event/Data/EventChoices.csv` / `.userdataset` — 이벤트 선택지.
- `RootDesk/MyDesk/Event/Data/EventOutcomes.csv` / `.userdataset` — 선택 결과 확률과 강제 전투 플래그.
- `RootDesk/MyDesk/Event/Data/EventEffects.csv` / `.userdataset` — 결과별 효과 명령.
- `RootDesk/MyDesk/Event/Data/EventRewards.csv` / `.userdataset` — 결과 보상 참조 검증용 데이터.
- `RootDesk/MyDesk/Event/Data/EventVisuals.csv` / `.userdataset` — 이벤트 모달 시각 데이터.
- `RootDesk/MyDesk/Event/EventCatalog.mlua` — UserDataSet Repository와 적격 이벤트 조회.
- `RootDesk/MyDesk/Event/EventManager.mlua` — 이벤트 인스턴스 Facade와 서버 상태 머신.
- `RootDesk/MyDesk/Event/EventEffectGateway.mlua` — 로그 전용 효과 경계.
- `RootDesk/MyDesk/Event/EventDiscoveryStorage.mlua` — `discoveredChoiceIds` 영구 저장.
- `RootDesk/MyDesk/Event/EventStageCompletedEvent.mlua` — 서버 로컬 완료 알림.
- `RootDesk/MyDesk/Event/EventViewEvent.mlua` — 클라이언트 로컬 표시 알림.
- `RootDesk/MyDesk/UI/EventController.mlua` — 이벤트 모달의 클라이언트 표시와 입력.
- `ui/EventGroup.ui` — 이벤트 본문·선택지·결과 모달.

### 수정

- `RootDesk/MyDesk/Stage/FloorManager.mlua` — 노드 라운드 ID, 3번 이벤트 라우팅, 진행도 1회 증가.
- `RootDesk/MyDesk/UI/NodeSelectController.mlua` — 3번 버튼 연결과 라운드 ID 전달.
- `RootDesk/MyDesk/Player/PlayerBootstrap.mlua` — 발견 기록 로그인 로드.
- `ui/NodeSelectGroup.ui` — 3번 카드 텍스트 활성화. UIBuilder만 사용.
- `tickets/MR-AI-event-stage-fixed-slot.md` — 검증 결과와 완료 상태.

## Dependency Direction and Extension Seams

```text
FloorManager ──StartEvent──> EventManager Facade/State Machine
                              ├──query──> EventCatalog Repository
                              ├──read/write──> EventDiscoveryStorage Repository
                              └──submit──> EventEffectGateway Output Port

EventManager ──emit──> EventStageCompletedEvent ──observe──> FloorManager
EventManager ──Client RPC──> EventViewEvent ──observe──> EventController Adapter
```

- 새 이벤트·선택지·결과 추가: UserDataSet 행만 추가하며 `FloorManager`와 UI 로직을 수정하지 않는다.
- 실제 효과 적용 추가: `EventEffectGateway` 내부의 effect-type handler registry를 확장하며
  `EventManager`에 `if effectType == ...` 분기를 추가하지 않는다.
- 이벤트 카드 위치 랜덤화 추가: `FloorManager`의 노드 카드 구성 정책만 교체하며
  `EventCatalog`와 `EventManager`를 수정하지 않는다.
- 강제 전투 추가: 후속 `EventOutcomeActionGateway` Output Port로 연결하며
  카탈로그 Repository와 UI Adapter에 전투 매니저 의존성을 넣지 않는다.
- UI 재디자인: `EventViewEvent` snapshot 계약을 유지하는 한 `EventController`와 `.ui`만 교체한다.

---

### Task 1: Event UserDataSets and EventCatalog Repository

**Files:**
- Create: `RootDesk/MyDesk/Event/Data/EventTemplates.csv`
- Create: `RootDesk/MyDesk/Event/Data/EventTemplates.userdataset`
- Create: `RootDesk/MyDesk/Event/Data/EventChoices.csv`
- Create: `RootDesk/MyDesk/Event/Data/EventChoices.userdataset`
- Create: `RootDesk/MyDesk/Event/Data/EventOutcomes.csv`
- Create: `RootDesk/MyDesk/Event/Data/EventOutcomes.userdataset`
- Create: `RootDesk/MyDesk/Event/Data/EventEffects.csv`
- Create: `RootDesk/MyDesk/Event/Data/EventEffects.userdataset`
- Create: `RootDesk/MyDesk/Event/Data/EventRewards.csv`
- Create: `RootDesk/MyDesk/Event/Data/EventRewards.userdataset`
- Create: `RootDesk/MyDesk/Event/Data/EventVisuals.csv`
- Create: `RootDesk/MyDesk/Event/Data/EventVisuals.userdataset`
- Create: `RootDesk/MyDesk/Event/EventCatalog.mlua`

**Interfaces:**
- Consumes: `docs/event_stage_design/event_data/*.csv`.
- Produces:
  - `_EventCatalog:Reload()`
  - `_EventCatalog:IsReady() -> boolean`
  - `_EventCatalog:EligibleEventIds(string theme) -> table`
  - `_EventCatalog:PickWeightedEvent(string theme) -> any`
  - `_EventCatalog:ChoicesFor(string eventId) -> table`
  - `_EventCatalog:OutcomesFor(string eventId, string choiceId) -> table`
  - `_EventCatalog:EffectsFor(string eventId, string choiceId, string outcomeId) -> table`
  - `_EventCatalog:VisualFor(string eventId) -> any`

- [ ] **Step 1: Copy the approved CSV source data into runtime dataset paths**

Copy each source CSV without changing columns or row content:

```text
docs/event_stage_design/event_data/event_templates.csv
→ RootDesk/MyDesk/Event/Data/EventTemplates.csv

event_choices.csv  → EventChoices.csv
event_outcomes.csv → EventOutcomes.csv
event_effects.csv  → EventEffects.csv
event_rewards.csv  → EventRewards.csv
event_visuals.csv  → EventVisuals.csv
```

- [ ] **Step 2: Create the six server-only UserDataSet wrappers**

Use these fixed identifiers so the plan and implementation agree:

```text
EventTemplates  28858d00-37f5-4774-bfc6-d84b2219c549
EventChoices    5481dd67-c83a-4022-bb3a-a88d289470b0
EventOutcomes   970ac912-0c02-4f24-aef1-b08d8f4dc4b8
EventEffects    031507c9-d2b4-46aa-b25c-2636447806db
EventRewards    4a4ee6f2-ff09-40af-bc63-57ff2bdb45f9
EventVisuals    a061a0b0-8bab-480d-b1c7-612d6c0c3b4a
```

Each wrapper follows this exact shape, substituting `NAME` and `UUID`:

```json
{
  "Id": "",
  "GameId": "",
  "EntryKey": "userdataset://UUID",
  "ContentType": "x-mod/userdataset",
  "Content": "",
  "Usage": 0,
  "UsePublish": 1,
  "UseService": 0,
  "CoreVersion": "26.5.0.0",
  "StudioVersion": "0.1.0.0",
  "DynamicLoading": 0,
  "ContentProto": {
    "Use": "Json",
    "Json": {
      "name": "NAME",
      "id": "UUID",
      "serveronly": true,
      "syncDataSetWebUrl": "",
      "dynamicloading": 0
    }
  }
}
```

- [ ] **Step 3: Write the failing catalog probe**

After Maker Refresh generates `EventCatalog.codeblock`, enter Play and execute:

```lua
log("[MR-AI TEST] ready-before=" .. tostring(_EventCatalog:IsReady()))
local ids = _EventCatalog:EligibleEventIds("orbis")
log("[MR-AI TEST] orbis-eligible=" .. tostring(#ids))
```

Expected before implementation:

```text
EventCatalog is unavailable or IsReady is undefined
```

- [ ] **Step 4: Implement EventCatalog storage and conversion helpers**

Start `EventCatalog.mlua` with:

```lua
@Logic
script EventCatalog extends Logic

    property boolean catalogReady = false
    property any templatesById = nil
    property any choicesByEvent = nil
    property any outcomesByChoice = nil
    property any effectsByOutcome = nil
    property any rewardsById = nil
    property any visualsByEvent = nil

    @ExecSpace("ServerOnly")
    method void OnBeginPlay()
        self:Reload()
    end

    method boolean BoolCell(any value)
        local s = string.lower(tostring(value or ""))
        return s == "true" or s == "1" or s == "yes"
    end

    method string ChoiceKey(string eventId, string choiceId)
        return eventId .. "|" .. choiceId
    end

    method string OutcomeKey(string eventId, string choiceId, string outcomeId)
        return eventId .. "|" .. choiceId .. "|" .. outcomeId
end
```

`Reload()` must call `_DataService:GetTable()` for all six exact names, convert numeric and boolean
cells immediately, build the indexes listed under Interfaces, and set `catalogReady=true`
only if every validation rule passes.

This file must not contain `userId`, `instanceId`, `roundId`, UI references, DataStorage calls, or
references to any stage/gameplay manager.

- [ ] **Step 5: Implement exact validation and eligibility rules**

`Reload()` must count and `log_error` each of these:

```text
duplicate event_id
choice references missing event_id
outcome references missing event_id/choice_id
effect references missing event_id/choice_id/outcome_id
missing reward_ref
enabled event with zero choices
enabled event with a choice count other than exactly 2
weight <= 0
probability <= 0
probability sum outside 0.999..1.001 for a choice
unknown theme_id
missing visual row for an enabled event
```

`EligibleEventIds(theme)` includes only rows satisfying:

```lua
rec.enabled
and (rec.eventScope == "common" or rec.themeId == theme)
and (theme == "orbis" or theme == "elnath")
and rec.hasForcedCombat == false
```

`PickWeightedEvent(theme)` uses the verified native signature `_UtilLogic:RandomDouble()` and
multiplies the returned `[0,1)` value by the total positive weight.

- [ ] **Step 6: Refresh and run the catalog probe**

Run:

```text
Maker MCP refresh
Maker MCP logs(category="build")
Maker MCP play
Maker MCP maker_execute_script(catalog probe)
Maker MCP logs(category="runtime")
Maker MCP stop
```

Expected:

```text
[EventCatalog] ready templates=40
[MR-AI TEST] ready-before=true
[MR-AI TEST] orbis-eligible is greater than 0
```

Runtime logs must contain zero missing-reference and probability errors.

- [ ] **Step 7: Commit only Task 1 files**

```powershell
git add -- RootDesk/MyDesk/Event/Data RootDesk/MyDesk/Event/EventCatalog.mlua
git commit -m "feat: add event catalog datasets"
```

---

### Task 2: Deferred Event Effect Gateway

**Files:**
- Create: `RootDesk/MyDesk/Event/EventEffectGateway.mlua`

**Interfaces:**
- Consumes: plain `EffectIntent` tables created by an application service.
- Produces:
  - `_EventEffectGateway:SubmitBatch(any instance, table intents)`

- [ ] **Step 1: Write the failing deferred-effect probe**

Execute in Play:

```lua
local intents = {
    {
        effectId = "next_shop_free_purchase",
        effectType = "shop",
        period = "next_shop",
        value = "1",
        numericValue = 1,
        stackRule = "replace",
        uiSummary = "다음 상점 무료 구매 1회",
    }
}
log("[MR-AI TEST] intent-count=" .. tostring(#intents))
_EventEffectGateway:SubmitBatch({
    instanceId = "TEST-1",
    eventId = "common_lost_merchant",
    selectedChoiceId = "help_cart",
    resolvedOutcomeId = "help_success",
}, intents)
```

Expected before implementation: undefined method or missing `_EventEffectGateway`.

- [ ] **Step 2: Implement the gateway as a server-only logger**

```lua
@Logic
script EventEffectGateway extends Logic

    @ExecSpace("ServerOnly")
    method void SubmitBatch(any instance, table intents)
        local count = 0
        for _, intent in ipairs(intents) do
            count += 1
            log("[EventEffect][DEFERRED]"
                .. " instance=" .. tostring(instance.instanceId)
                .. " event=" .. tostring(instance.eventId)
                .. " choice=" .. tostring(instance.selectedChoiceId)
                .. " outcome=" .. tostring(instance.resolvedOutcomeId)
                .. " effect=" .. tostring(intent.effectId)
                .. " period=" .. tostring(intent.period)
                .. " type=" .. tostring(intent.effectType)
                .. " value=" .. tostring(intent.value)
                .. " stack=" .. tostring(intent.stackRule))
        end
        log("[EventEffect][DEFERRED] batch complete count=" .. tostring(count))
    end
end
```

Do not reference `_GameStateManager`, `_StageManager`, `_ShopManager`, `_RewardManager`, or
`_DataStorageService` in this file.

- [ ] **Step 3: Run the probe and verify no gameplay state changes**

Capture before/after:

```lua
local beforeMeso = _GameStateManager.Meso
-- SubmitBatch call
log("[MR-AI TEST] meso-unchanged=" .. tostring(beforeMeso == _GameStateManager.Meso))
```

Expected:

```text
[EventEffect][DEFERRED] instance=TEST-1 event=common_lost_merchant choice=help_cart outcome=help_success effect=next_shop_free_purchase period=next_shop type=shop value=1 stack=replace
[EventEffect][DEFERRED] batch complete count=1
[MR-AI TEST] meso-unchanged=true
```

- [ ] **Step 4: Commit**

```powershell
git add -- RootDesk/MyDesk/Event/EventEffectGateway.mlua
git commit -m "feat: add deferred event effect gateway"
```

---

### Task 3: Choice Discovery Persistence

**Files:**
- Create: `RootDesk/MyDesk/Event/EventDiscoveryStorage.mlua`
- Modify: `RootDesk/MyDesk/Player/PlayerBootstrap.mlua:5-15`

**Interfaces:**
- Consumes: `UserEnterEvent.UserId`, selected `choiceId`.
- Produces:
  - `_EventDiscoveryStorage:LoadFor(string userId)`
  - `_EventDiscoveryStorage:IsDiscovered(string choiceId) -> boolean`
  - `_EventDiscoveryStorage:Discover(string choiceId) -> boolean`
  - `_EventDiscoveryStorage:Persist()`

- [ ] **Step 1: Write the failing discovery probe**

```lua
log("[MR-AI TEST] discovered-before="
    .. tostring(_EventDiscoveryStorage:IsDiscovered("listen")))
local added = _EventDiscoveryStorage:Discover("listen")
log("[MR-AI TEST] discovery-added=" .. tostring(added))
log("[MR-AI TEST] discovered-after="
    .. tostring(_EventDiscoveryStorage:IsDiscovered("listen")))
```

Expected before implementation: missing `_EventDiscoveryStorage`.

- [ ] **Step 2: Implement load/cache/save with one blob key**

Use:

```lua
property string SaveKey = "event_discovered_choices_v1"
property string ownerUserId = ""
property boolean loaded = false
property any discovered = nil
```

`LoadFor(userId)` calls `GetAndWait(SaveKey)` once and reads:

```lua
{
    version = 1,
    choices = {
        choice_id = true,
    },
}
```

`Discover(choiceId)` returns `false` without writing if already present. For a new ID it updates the
cache, calls `Persist()` once, logs the prefix `[EventDiscoveryStorage] discovered ` followed by the
actual choice ID, and returns `true`.
`SetAsync` callback must log a warning when `errorCode ~= 0`.

- [ ] **Step 3: Wire login loading**

In `PlayerBootstrap.HandleUserEnter` add exactly:

```lua
_EventDiscoveryStorage:LoadFor(event.UserId)
```

next to the existing `_MetaProgression:LoadFor` and `_RecordStorage:LoadFor` calls.

- [ ] **Step 4: Run the discovery probe twice**

First run expected:

```text
discovery-added=true
discovered-after=true
```

Second run in the same Play session expected:

```text
discovery-added=false
```

Stop and start Play once more; loading logs must show the choice still discovered.

- [ ] **Step 5: Commit**

```powershell
git add -- RootDesk/MyDesk/Event/EventDiscoveryStorage.mlua RootDesk/MyDesk/Player/PlayerBootstrap.mlua
git commit -m "feat: persist event choice discoveries"
```

---

### Task 4: Server-Authoritative Event Instances

**Files:**
- Create: `RootDesk/MyDesk/Event/EventManager.mlua`
- Create: `RootDesk/MyDesk/Event/EventStageCompletedEvent.mlua`
- Create: `RootDesk/MyDesk/Event/EventViewEvent.mlua`

**Interfaces:**
- Consumes:
  - `_EventCatalog` Repository queries from Task 1.
  - `_EventEffectGateway:SubmitBatch(...)` from Task 2.
  - `_EventDiscoveryStorage` Repository from Task 3.
- Produces:
  - `_EventManager:StartEvent(string userId, string theme, string roundId) -> boolean`
  - `_EventManager:RequestChoose(string instanceId, string choiceId)`
  - `_EventManager:RequestComplete(string instanceId)`
  - `_EventManager:GetActiveFor(string userId) -> any`
  - `_EventManager:ResolveChoice(any instance, string choiceId) -> any`
  - `_EventManager:BuildEffectIntents(string eventId, string choiceId, string outcomeId) -> table`
  - client RPC `ClientDispatchView(string action, any snapshot)`.
  - `EventStageCompletedEvent` on the server-local `_EventManager` event source.
  - `EventViewEvent` on the client-local `_EventManager` event source.

- [ ] **Step 1: Define the two Observer contracts**

```lua
@Event
script EventStageCompletedEvent extends EventType

    property string roundId = ""
    property string instanceId = ""
    property string userId = ""
    property string eventId = ""

end
```

```lua
@Event
script EventViewEvent extends EventType

    property string action = ""
    property any snapshot = nil

end
```

`EventStageCompletedEvent` is emitted only in server space. `EventViewEvent` is created only after
the `ClientDispatchView` RPC reaches the client; custom EventType objects never cross the RPC boundary.

- [ ] **Step 2: Write the failing instance-idempotency probe**

```lua
local ok = _EventManager:StartEvent("TEST_USER", "orbis", "ROUND-1")
local inst = _EventManager:GetActiveFor("TEST_USER")
local choices = _EventCatalog:ChoicesFor(inst.eventId)
local first = _EventManager:ResolveChoice(inst, choices[1].choiceId)
local second = _EventManager:ResolveChoice(inst, choices[1].choiceId)
log("[MR-AI TEST] start=" .. tostring(ok))
log("[MR-AI TEST] same-outcome="
    .. tostring(first.outcomeId == second.outcomeId))
```

Expected before implementation: `StartEvent` or `ResolveChoice` undefined.

- [ ] **Step 3: Implement EventManager as a thin Facade/State Machine**

Its owned state is limited to:

```lua
property any activeByUser = nil
property integer nextInstanceSerial = 0
```

It must not contain UserDataSet loading, DataStorage calls, UI entity references, floor progress
mutation, combat calls, shop calls, or reward calls.

- [ ] **Step 4: Implement EventInstance creation**

`StartEvent` must:

```lua
if _EventCatalog:IsReady() == false then return false end
if self.activeByUser[userId] ~= nil
    and self.activeByUser[userId].state ~= "completed" then
    return false
end
```

Then call `_EventCatalog:PickWeightedEvent(theme)` and create:

```lua
{
    instanceId = "EVT-" .. tostring(self.nextInstanceSerial),
    roundId = roundId,
    userId = userId,
    theme = theme,
    eventId = event.eventId,
    state = "presented",
    selectedChoiceId = "",
    resolvedOutcomeId = "",
    effectIntents = {},
}
```

Store the instance in `activeByUser[userId]`, then target that user with:

```lua
self:ClientDispatchView(
    "open",
    self:BuildPresentationSnapshot(instance),
    userId
)
```

- [ ] **Step 5: Implement server snapshot assembly**

`BuildPresentationSnapshot(instance)` gets choices and visual data from `_EventCatalog`. It returns:

```lua
{
    instanceId = instance.instanceId,
    eventId = instance.eventId,
    title = event.title,
    description = event.description,
    primaryRuid = visual.primaryRuid,
    choices = {
        {
            choiceId = rec.choiceId,
            label = rec.label,
            detail = _EventDiscoveryStorage:IsDiscovered(rec.choiceId)
                and rec.detail
                or "???",
        },
    },
}
```

No catalog record table itself is sent to the client.

- [ ] **Step 6: Implement EffectIntent conversion**

`BuildEffectIntents()` maps `_EventCatalog:EffectsFor(...)` records into fresh plain tables:

```lua
{
    effectId = rec.effectId,
    effectType = rec.effectType,
    period = rec.period,
    value = rec.value,
    numericValue = tonumber(rec.value),
    stackRule = rec.stackRule,
    uiSummary = rec.uiSummary,
}
```

- [ ] **Step 7: Implement weighted outcome resolution once**

The shared server helper must:

```lua
if instance.state == "resolved" then
    return self:BuildResultSnapshot(instance)
end
if instance.state ~= "presented" then
    return nil
end
```

Validate the choice belongs to `instance.eventId`, pick one outcome by `probability`, store
`selectedChoiceId` and `resolvedOutcomeId`, build intents, set `state="resolved"`, discover the
choice, and call `_EventEffectGateway:SubmitBatch(instance, intents)` exactly once.

- [ ] **Step 8: Implement sender and state validation on RPCs**

`RequestChoose` and `RequestComplete` are `@ExecSpace("Server")`. Both look up by `senderUserId`,
then require exact `instanceId`. Invalid requests log a warning and leave state unchanged.

After `RequestChoose` gets the resolved snapshot, target the sender with:

```lua
self:ClientDispatchView("result", snapshot, senderUserId)
```

`RequestComplete` accepts only `state == "resolved"` and sets `state="completed"` once. It creates
`EventStageCompletedEvent`, fills its four string fields, and calls `self:SendEvent(event)`.
It also sends `self:ClientDispatchView("close", {}, senderUserId)`. It never references
`_FloorManager`.

- [ ] **Step 9: Implement the client presentation port**

One `@ExecSpace("Client")` RPC bridges serializable data across the network:

```lua
method void ClientDispatchView(string action, any snapshot)
    local event = EventViewEvent()
    event.action = action
    event.snapshot = snapshot
    self:SendEvent(event)
end
```

Use exact actions `"open"`, `"result"`, and `"close"`. UI controllers are not referenced here.

- [ ] **Step 10: Run idempotency and theme-isolation probes**

Repeat event selection 30 times in a test helper that completes each test instance. Assert:

```text
orbis run produces only event_scope=common or theme_id=orbis
elnath run produces only event_scope=common or theme_id=elnath
resolved instance returns the same outcome on every retry
every chosen event has hasForcedCombat=false
```

- [ ] **Step 11: Commit**

```powershell
git add -- RootDesk/MyDesk/Event/EventManager.mlua RootDesk/MyDesk/Event/EventStageCompletedEvent.mlua RootDesk/MyDesk/Event/EventViewEvent.mlua
git commit -m "feat: add server-authoritative event instances"
```

---

### Task 5: Fixed Slot-3 Floor Routing

**Files:**
- Modify: `RootDesk/MyDesk/Stage/FloorManager.mlua:15-245`
- Modify: `RootDesk/MyDesk/UI/NodeSelectController.mlua:1-52`
- Modify via UIBuilder: `ui/NodeSelectGroup.ui`

**Interfaces:**
- Consumes: `_EventManager:StartEvent(...)`.
- Produces:
  - `_FloorManager:RequestSelectNode(string roundId, integer slotId)`
  - `_FloorManager:OnEventStageCompleted(EventStageCompletedEvent event)`
  - `NodeSelectController:Open(integer stageNo, integer totalStages, string roundId)`.

- [ ] **Step 1: Write the failing floor-routing probe**

```lua
_FloorManager.currentNodeRoundId = "ROUND-TEST"
_FloorManager.nodeRoundLocked = false
_FloorManager.PhaseName = "normal"
_FloorManager:RequestSelectNode("STALE", 3)
log("[MR-AI TEST] stale-unlocked="
    .. tostring(_FloorManager.nodeRoundLocked == false))
```

Expected before implementation: signature mismatch or missing round properties.

- [ ] **Step 2: Add node round state**

Add server properties:

```lua
property integer nodeRoundSerial = 0
property string currentNodeRoundId = ""
property boolean nodeRoundLocked = false
property any eventCompletedHandler = nil
```

Subscribe once and disconnect symmetrically:

```lua
method void OnBeginPlay()
    self.eventCompletedHandler = _EventManager:ConnectEvent(
        EventStageCompletedEvent,
        self.OnEventStageCompleted
    )
end

method void OnEndPlay()
    if self.eventCompletedHandler ~= nil then
        _EventManager:DisconnectEvent(
            EventStageCompletedEvent,
            self.eventCompletedHandler
        )
    end
end
```

When `NextNode()` enters the normal branch:

```lua
self.nodeRoundSerial += 1
self.currentNodeRoundId =
    tostring(_GameStateManager.CurrentFloor)
    .. "-" .. self.CurrentTheme
    .. "-" .. tostring(self.NormalsClearedThisFloor)
    .. "-" .. tostring(self.nodeRoundSerial)
self.nodeRoundLocked = false
```

Pass `currentNodeRoundId` to `ClientShowNodeSelect` and `NodeSelectController:Open`.

- [ ] **Step 3: Replace branch selection with exact slot routing**

Change the server signature to:

```lua
@ExecSpace("Server")
method void RequestSelectNode(string roundId, integer slotId)
```

Validate:

```lua
roundId == self.currentNodeRoundId
self.PhaseName == "normal"
self.nodeRoundLocked == false
senderUserId == self:FirstPlayerComponent().UserId
```

Routing:

```text
slot 1 → lock, keep existing nodeSpawnChoices[1] + StartStageAt flow
slot 2 → reject without locking or hiding the node screen
slot 3 → lock, call EventManager.StartEvent
other  → reject
```

If `StartEvent` returns false, set `nodeRoundLocked=false` and reopen the same node snapshot.

- [ ] **Step 4: Implement event completion as one progress slot**

```lua
@ExecSpace("ServerOnly")
method void OnEventStageCompleted(EventStageCompletedEvent event)
    if event.roundId ~= self.currentNodeRoundId then return end
    if self.PhaseName ~= "normal" or self.nodeRoundLocked == false then return end
    local pc = self:FirstPlayerComponent()
    if pc == nil or event.userId ~= pc.UserId then return end
    self.NormalsClearedThisFloor += 1
    _RecordStorage:StampStage(
        _GameStateManager.CurrentFloor,
        _RecordStorage:ComputeStageProgress(
            self.NormalsClearedThisFloor,
            self.ShopDoneThisFloor,
            false
        ),
        _RunTimer:ServerElapsed()
    )
    log("[FloorManager] event done progress="
        .. tostring(self.NormalsClearedThisFloor))
    self:NextNode()
end
```

Do not increment `_GameStateManager.NormalClears` and do not remove a stage from the normal deck.
The handler knows only the completed-event contract; it does not read `EventInstance` or catalog data.

- [ ] **Step 5: Bind only slot 3 in NodeSelectController**

Add:

```lua
property ButtonComponent btnNode3 = "38d86f7d-9f18-4c55-8c18-e42ba8a6b41e"
property any hNode3 = nil
property string currentRoundId = ""
```

Connect/disconnect `ButtonClickEvent` symmetrically. `OnNode3Click` calls `SelectNode(3)`.
`SelectNode` calls:

```lua
_FloorManager:RequestSelectNode(self.currentRoundId, slotId)
```

Do not add a `btnNode2` property or handler.

- [ ] **Step 6: Patch slot-3 presentation through UIBuilder**

Use:

```javascript
const { UIBuilder } = require(
  "C:/Users/dust/orca/workspaces/MapleRush/MapleRush/.agents/skills/msw-ui-system/scripts/msw_ui_builder.cjs"
);
const uiPath = "D:/Users/dust/Documents/MSW Projects/MapleRush/ui/NodeSelectGroup.ui";
const b = UIBuilder.read(uiPath);
b.patch("Root/Panel/BtnNode3/Label", { enable: true });
b.patchComponent(
  "Root/Panel/BtnNode3/Label",
  "MOD.Core.TextComponent",
  { Text: "이벤트" }
);
b.patch("Root/Panel/BtnNode3/Sub", { enable: true });
b.patchComponent(
  "Root/Panel/BtnNode3/Sub",
  "MOD.Core.TextComponent",
  { Text: "무슨 일이...?" }
);
b.write(uiPath, {
  bind: {
    mlua: "D:/Users/dust/Documents/MSW Projects/MapleRush/RootDesk/MyDesk/UI/NodeSelectController.mlua",
    props: {
      btnNode3: "Root/Panel/BtnNode3"
    }
  }
});
```

Snapshot before write and run UI lint after write.

- [ ] **Step 7: Verify slot behavior**

Maker Play:

```text
click slot 1 → existing normal stage starts
slot 2 → no handler and no state change
click slot 3 twice quickly → one EventInstance only
send stale roundId probe → warning, no lock, no progress
complete event → NormalsClearedThisFloor increases exactly once
```

- [ ] **Step 8: Commit**

```powershell
git add -- RootDesk/MyDesk/Stage/FloorManager.mlua RootDesk/MyDesk/UI/NodeSelectController.mlua ui/NodeSelectGroup.ui
git commit -m "feat: route fixed event card from floor selection"
```

---

### Task 6: Event Modal UI and Client Controller

**Files:**
- Create via UIBuilder: `ui/EventGroup.ui`
- Create: `RootDesk/MyDesk/UI/EventController.mlua`
- Modify: `RootDesk/MyDesk/Event/EventManager.mlua`

**Interfaces:**
- Consumes: `EventViewEvent` actions and presentation/result snapshots.
- Produces:
  - `EventController:Open(any snapshot)`
  - `EventController:ShowResult(any snapshot)`
  - `EventController:Close()`
  - `EventController:OnEventView(EventViewEvent event)`
  - button RPC calls `_EventManager:RequestChoose(instanceId, choiceId)` and `_EventManager:RequestComplete(instanceId)`.

- [ ] **Step 1: Write the failing UI delegation probe**

With Play running:

```lua
_EventManager:ClientDispatchView("open", {
    instanceId = "UI-TEST",
    title = "모험가들의 소문",
    description = "두 모험가가 낮은 목소리로 다투고 있다.",
    primaryRuid = "",
    choices = {
        { choiceId = "listen", label = "이야기를 듣는다", detail = "???" },
        { choiceId = "move_on", label = "지나간다", detail = "???" },
    },
})
```

Expected before implementation: no `EventViewEvent` subscriber and no modal.

- [ ] **Step 2: Create EventGroup.ui with UIBuilder**

Build a hidden `GroupType=2`, `GroupOrder=10` UI with this exact hierarchy:

```text
EventGroup
├─ Controller
└─ Root
   ├─ Dimmer
   └─ Panel
      ├─ Bg
      ├─ Title
      ├─ Illustration
      ├─ Description
      ├─ ChoicePanel
      │  ├─ BtnChoice1
      │  │  └─ Detail
      │  └─ BtnChoice2
      │     └─ Detail
      └─ ResultPanel
         ├─ ResultText
         ├─ EffectSummary
         └─ BtnContinue
```

Required sizes on the 1920×1080 canvas:

```text
Panel          1180×760
Illustration   420×420, left half
Description    600×170, upper-right
BtnChoice1/2   560×110, lower-right
ResultPanel    600×350, right half, enable=false initially
Dimmer         stretch, black alpha 0.65, raycast=true
```

Write and inject with this exact binding map:

```javascript
b.write(
  "D:/Users/dust/Documents/MSW Projects/MapleRush/ui/EventGroup.ui",
  {
    bind: {
      mlua: "D:/Users/dust/Documents/MSW Projects/MapleRush/RootDesk/MyDesk/UI/EventController.mlua",
      props: {
        eventRoot: "Root",
        titleText: "Root/Panel/Title",
        descriptionText: "Root/Panel/Description",
        illustration: "Root/Panel/Illustration",
        choicePanel: "Root/Panel/ChoicePanel",
        btnChoice1: "Root/Panel/ChoicePanel/BtnChoice1",
        detail1: "Root/Panel/ChoicePanel/BtnChoice1/Detail",
        btnChoice2: "Root/Panel/ChoicePanel/BtnChoice2",
        detail2: "Root/Panel/ChoicePanel/BtnChoice2/Detail",
        resultPanel: "Root/Panel/ResultPanel",
        resultText: "Root/Panel/ResultPanel/ResultText",
        effectSummary: "Root/Panel/ResultPanel/EffectSummary",
        btnContinue: "Root/Panel/ResultPanel/BtnContinue"
      }
    }
  }
);
```

- [ ] **Step 3: Implement EventController lifecycle and handlers**

Properties:

```lua
property Entity eventRoot
property TextComponent titleText
property TextComponent descriptionText
property SpriteGUIRendererComponent illustration
property Entity choicePanel
property ButtonComponent btnChoice1
property TextComponent detail1
property ButtonComponent btnChoice2
property TextComponent detail2
property Entity resultPanel
property TextComponent resultText
property TextComponent effectSummary
property ButtonComponent btnContinue
property string instanceId = ""
property string choiceId1 = ""
property string choiceId2 = ""
```

`OnBeginPlay` subscribes to `_EventManager:ConnectEvent(EventViewEvent, self.OnEventView)`, hides
`eventRoot`, and connects all three buttons. `OnEndPlay` disconnects the event subscription and all
button handlers.

The Adapter dispatches only on the event action:

```lua
method void OnEventView(EventViewEvent event)
    if event.action == "open" then
        self:Open(event.snapshot)
    elseif event.action == "result" then
        self:ShowResult(event.snapshot)
    elseif event.action == "close" then
        self:Close()
    end
end
```

`Open(snapshot)`:

```lua
_InputRouter:SetContext("Popup")
self.eventRoot.Enable = true
self.choicePanel.Enable = true
self.resultPanel.Enable = false
```

It displays server strings only. If `primaryRuid` is empty, disable the illustration entity;
otherwise assign `illustration.ImageRUID`.

`ShowResult(snapshot)` disables `choicePanel`, enables `resultPanel`, joins
`snapshot.effectSummaries` with newline, and does not compute effects.

`Close()` clears IDs, disables root, and leaves context restoration to the next
`FloorManager.ClientShowNodeSelect`. `EventController` never writes floor progress or reads catalog
tables.

- [ ] **Step 4: Complete EventManager snapshot fields**

Presentation snapshot:

```lua
{
    instanceId,
    eventId,
    title,
    description,
    primaryRuid,
    choices = {
        { choiceId, label, detail },
        { choiceId, label, detail },
    },
}
```

Result snapshot:

```lua
{
    instanceId,
    outcomeId,
    resultSummary,
    effectSummaries = { "다음 상점 무료 구매 1회" },
}
```

The Task 1 Repository validation guarantees exactly two choices for every eligible event, so this
Adapter renders two choices without adding catalog-policy branches.

- [ ] **Step 5: Preview, lint, refresh, and visually verify**

Run UIBuilder preview and lint, then:

```text
Maker refresh
build logs error 0
Play
open event
verify Dimmer blocks node UI
verify both choice labels/details
select choice
verify result replaces choices
continue
verify next node screen returns
```

- [ ] **Step 6: Commit**

```powershell
git add -- ui/EventGroup.ui RootDesk/MyDesk/UI/EventController.mlua RootDesk/MyDesk/Event/EventManager.mlua
git commit -m "feat: add event choice popup"
```

---

### Task 7: End-to-End Verification and Ticket Completion

**Files:**
- Modify: `tickets/MR-AI-event-stage-fixed-slot.md`
- Modify if findings require corrections: only files introduced or listed in Tasks 1–6.

**Interfaces:**
- Consumes: completed event vertical slice.
- Produces: runtime evidence and completed `MR-AI` ticket.

- [ ] **Step 1: Run static and dataset validation**

Verify:

```text
six CSV/UserDataSet pairs exist
all wrapper CoreVersion values are 26.5.0.0
all EntryKey/id pairs match
no duplicate or dangling data references
every eligible event has exactly two choices
no eligible event can reach forced_combat=true
```

- [ ] **Step 2: Run Maker build gate**

```text
stop if Play is active
refresh
logs(category="build")
```

Expected: error count 0. Do not continue to runtime while build errors remain.

- [ ] **Step 3: Run Orbis end-to-end scenario**

```text
start new run
choose Orbis
verify slot 3 event card and untouched slot 2
choose slot 3
verify selected event is common or orbis
choose an option twice rapidly
verify one outcome and one deferred batch
continue
verify progress +1 and next node screen
```

- [ ] **Step 4: Run Elnath end-to-end scenario**

Repeat with Elnath and verify no Orbis-only event appears.

- [ ] **Step 5: Run failure and regression scenarios**

Use `maker_execute_script` to submit:

```text
stale roundId
invalid slotId
slotId=2
wrong instanceId
choiceId from another event
duplicate RequestComplete
```

Expected: warnings only, no duplicate progress, no reroll, no stuck lock.

Then complete a normal stage through slot 1 and continue through shop and boss. Confirm no regression.

- [ ] **Step 6: Verify deferred effects are inert**

Capture before/after values for:

```text
GameStateManager.Meso
GameStateManager.CurrentLives
GameStateManager.AttackStat
StageManager.StageType
ShopManager prices
```

Choose several events. Only deferred logs may change; all captured gameplay values remain equal.

- [ ] **Step 7: Update ticket evidence**

Check each acceptance criterion, append:

```text
build log result
runtime scenario results
event IDs observed by theme
duplicate-request evidence
deferred log examples
known manual visual-review notes
```

Set frontmatter `status: done` and `updated: 2026-08-02` only after every required check passes.

- [ ] **Step 8: Audit the commit boundary**

Run:

```powershell
git status --short
git diff --name-only origin/master...HEAD
```

Confirm unrelated `.agents`, `.claude`, `.codex`, `Environment`, `AGENTS.md`, and
`skills-lock.json` changes are not in any event-stage commit.

- [ ] **Step 9: Commit verification evidence**

```powershell
git add -- tickets/MR-AI-event-stage-fixed-slot.md
git commit -m "test: verify fixed-slot event stage"
```

- [ ] **Step 10: Push and open the implementation PR**

```powershell
git push -u origin feat/event-stage
gh pr create --base master --head feat/event-stage --title "feat: add fixed-slot event stage" --body "## Summary`n- 고정 3번 슬롯 이벤트 스테이지 추가`n- 서버 권위 이벤트 결과와 로그 전용 효과 Gateway 추가`n- UserDataSet·발견 기록·이벤트 모달 추가`n`n## Verification`n- Maker build/runtime 오류 0`n- 오르비스·엘나스 테마 격리 및 중복 요청 검증`n- 일반전→상점→보스 회귀 검증"
```

Request code review, address findings, rerun Maker verification after any code change, then merge only
when the PR is green and the working tree audit shows no unrelated files.
