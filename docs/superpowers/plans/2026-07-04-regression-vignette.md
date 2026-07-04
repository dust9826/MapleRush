# 회귀(Regression) 눈뜨기 연출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 게임오버/클리어 화면의 `다시도전`/`로비로` 버튼을 누르면 회귀 이미지 풀스크린 + 방사형 비네팅 더블 블링크(감고 뜨면 회귀 이미지 → 홀드 → 감고 뜨면 목적지) 연출을 재생한다.

**Architecture:** 최상위 displayOrder 풀스크린 UIGroup(`RegressionGroup`)에 3레이어 스프라이트(`Illust`/`BlackFill`/`Vignette`)를 깔고, 루트에 부착한 `RegressionOverlay`(@Component, ClientOnly)가 `openness`(0=감음/1=뜸) 한 파라미터로 5비트 상태머신을 `OnUpdate`로 구동한다. `FadeOverlay`의 자기등록+alpha 램프 패턴을 그대로 확장. 4개 버튼 핸들러는 즉시 액션 대신 오버레이 `Play(mode)`를 호출하고, 실제 목적지 로드/컨텍스트 전환은 오버레이가 비트 중간/끝에서 수행한다.

**Tech Stack:** MSW mLua (.mlua @Component/@Logic), UIBuilder(`.ui`), SpriteGUIRendererComponent(`SetAlpha`/`Color`/`ImageRUID`), UITransformComponent(`UIScale`), msw-painter(방사형 텍스처 생성), Maker MCP(refresh/play/logs/screenshot).

## Global Constraints

- CoreVersion `26.5.0.0` — 불일치 시 작업 중단.
- `.mlua`는 `RootDesk/MyDesk/` 하위, 기능 폴더(`UI/`, `Core/`)에. `.ui`는 `ui/`.
- `.ui`는 **UIBuilder(`../msw-ui-system/scripts/msw_ui_builder.cjs`)로만** 생성/수정 — raw JSON 편집 금지. 읽기도 `UIBuilder.read/getComponent`.
- 모든 `.mlua` 생성/수정 후 Maker **`refresh`**(play 중이면 `stop` 먼저). `.codeblock` 수기 편집 금지.
- UI 로직은 전부 **`@ExecSpace("ClientOnly")`**. 서버 호출은 기존 `_StageManager:RequestRestartRun()`(Server RPC)뿐.
- 검증 = MSW verify-checklist: `refresh` → `logs(kind="build")` 에러 0 → `play` → `logs(kind="normal")`에서 각 비트 `log()` 증거 → 필요 시 `screenshot` → `stop`. **"에러 없음 ≠ Pass"**, 각 비트 로그 증거 필수.
- 컴포넌트 타입 문자열은 완전수식: 네이티브 `MOD.Core.XxxComponent`, 스크립트 `script.RegressionOverlay`.

---

## File Structure

- **Create** `RootDesk/MyDesk/UI/RegressionOverlay.mlua` — 연출 상태머신 컴포넌트(ClientOnly). 루트 그룹에 부착.
- **Create** `ui/RegressionGroup.ui` — 풀스크린 오버레이 그룹(UIBuilder). `Illust`/`BlackFill`/`Vignette` 3스프라이트 + 루트에 `script.RegressionOverlay`.
- **Modify** `RootDesk/MyDesk/Core/GameConstants.mlua` — 튜너블 상수 6종 추가.
- **Modify** `RootDesk/MyDesk/Stage/StageManager.mlua` — `property any regressionOverlay = nil` 레지스트리 필드 추가.
- **Modify** `RootDesk/MyDesk/UI/GameOverController.mlua` — `OnRestartClick`/`OnLobbyClick` 오버레이 위임.
- **Modify** `RootDesk/MyDesk/UI/GameClearController.mlua` — 동일.
- **Asset** 방사형 비네팅 PNG(msw-painter) → 업로드 → RUID. 회귀 이미지 RUID = `93cefac9728c4911a9309bcdf96a516a`(주어짐).

---

## Task 1: 방사형 비네팅 텍스처 생성 + RUID 확보

**Files:** 없음(에셋 업로드). 산출물: 비네팅 텍스처 RUID 기록.

**Interfaces:**
- Produces: `VIGNETTE_RUID`(문자열, 방사형 비네팅 스프라이트) — Task 2·5가 사용. `REGRESSION_IMAGE_RUID = "93cefac9728c4911a9309bcdf96a516a"`(주어짐).

- [ ] **Step 1: msw-painter로 방사형 비네팅 텍스처 생성**

`Skill: msw-painter` 로드 후 chunky/soft 방식으로 정사각(예 1024×1024) PNG 생성: **중앙 소프트 투명 원(반경 ~35%) → 바깥으로 갈수록 불투명 검정, 텍스처 코너는 완전 검정**. 알파 그라디언트가 핵심(중앙 alpha=0 → 가장자리 alpha=1, 검정 RGB).

- [ ] **Step 2: 업로드하여 RUID 확보**

msw-painter 워크플로로 `asset_create_resource_storage_item`(계정/그룹) 업로드 → 반환 RUID를 `VIGNETTE_RUID`로 기록. (업로드 스프라이트가 런타임 `unavailable`일 수 있으니 Task 8 play에서 실제 렌더 확인 — 미리 인지.)

- [ ] **Step 3: 회귀 이미지 RUID 유효성 확인**

`REGRESSION_IMAGE_RUID`가 sprite/image 타입인지 `msw-search`/`asset_get_*_metadata_bulk`로 확인. animationclip/skeleton이면 Task 5에서 `image_ruid`에 `thumbnail://` 프리픽스를 붙일 것(메모). sprite면 그대로 사용.

- [ ] **Step 4: 두 RUID를 기록**

이후 태스크에서 참조하도록 `VIGNETTE_RUID` / `REGRESSION_IMAGE_RUID`를 계획 실행 노트에 남긴다. (커밋 없음 — 다음 태스크에서 함께 커밋.)

---

## Task 2: GameConstants 튜너블 추가

**Files:**
- Modify: `RootDesk/MyDesk/Core/GameConstants.mlua`

**Interfaces:**
- Produces: `_GameConstants.RegressionImageRUID`(string), `.RegressionBlinkCloseDuration`(number), `.RegressionBlinkOpenDuration`(number), `.RegressionHoldDuration`(number), `.VignetteClosedScale`(number), `.VignetteOpenScale`(number) — Task 4·5가 사용.

- [ ] **Step 1: 상수 6종 추가**

`GameConstants.mlua`의 마지막 `end` 바로 위에 삽입(`<VIGNETTE_RUID>`는 Task 1 산출값으로 치환):

```lua
	-- 회귀(Regression) 눈뜨기 연출 튜너블 (MR-AE)
	property string RegressionImageRUID = "93cefac9728c4911a9309bcdf96a516a"

	property string RegressionVignetteRUID = "<VIGNETTE_RUID>"

	-- 감기/뜨기 각 방향 지속시간(초). 감기 빠르게, 뜨기 살짝 느리게.
	property number RegressionBlinkCloseDuration = 0.5

	property number RegressionBlinkOpenDuration = 0.7

	-- 회귀 이미지 정지 홀드(초).
	property number RegressionHoldDuration = 0.8

	-- 비네팅 iris UIScale 범위(닫힘=작게, 열림=화면 덮게 크게).
	property number VignetteClosedScale = 0.15

	property number VignetteOpenScale = 4.0
```

- [ ] **Step 2: refresh + 빌드 로그 확인**

`mcp__msw-maker-mcp__maker_stop` → `maker_refresh_workspace` → `maker_logs(kind="build")`. Expected: 새 에러 0(기존 `LIA-1114` info만 허용, `GameConstants.mlua` 관련 에러 없음).

- [ ] **Step 3: 커밋**

```bash
git add RootDesk/MyDesk/Core/GameConstants.mlua
git commit -m "feat(MR-AE): 회귀 연출 GameConstants 튜너블 추가"
```

---

## Task 3: StageManager 레지스트리 필드 추가

**Files:**
- Modify: `RootDesk/MyDesk/Stage/StageManager.mlua`

**Interfaces:**
- Produces: `_StageManager.regressionOverlay`(any, 기본 nil) — Task 4가 자기등록, Task 6·7이 조회.

- [ ] **Step 1: `fadeOverlay` 선언 근처에 필드 추가**

`StageManager.mlua`에서 `fadeOverlay` 프로퍼티 선언을 `Grep`로 찾고(예: `property any fadeOverlay = nil`), 그 바로 아래에 추가:

```lua
	-- 회귀 연출 오버레이(RegressionOverlay) 레지스트리. 클라 OnBeginPlay가 자기등록. (MR-AE)
	property any regressionOverlay = nil
```

- [ ] **Step 2: refresh + 빌드 로그 확인**

`maker_stop` → `maker_refresh_workspace` → `maker_logs(kind="build")`. Expected: `StageManager.mlua` 관련 새 에러 0.

- [ ] **Step 3: 커밋**

```bash
git add RootDesk/MyDesk/Stage/StageManager.mlua
git commit -m "feat(MR-AE): StageManager에 regressionOverlay 레지스트리 필드"
```

---

## Task 4: RegressionOverlay.mlua 작성

**Files:**
- Create: `RootDesk/MyDesk/UI/RegressionOverlay.mlua`

**Interfaces:**
- Consumes: `_GameConstants.*`(Task 2), `_StageManager.regressionOverlay`(Task 3), `_StageManager:RequestRestartRun()`, `_SelectBackdrop:ShowLoading(bool)`, `_SoundManager:PlayBGMKey(string)`, `_InputRouter:SetContext(string)`, `_EntityService:GetEntityByPath(string)`.
- Produces: `script.RegressionOverlay` with `@ExecSpace("ClientOnly") method void Play(string mode)` (`mode` = `"restart"`|`"lobby"`). 속성: `illust`/`blackFill`/`vignetteSr`(SpriteGUIRendererComponent), `vignetteTf`(UITransformComponent) — Task 5가 바인딩 주입.

- [ ] **Step 1: 스크립트 작성**

`RootDesk/MyDesk/UI/RegressionOverlay.mlua` 전체:

```lua
@Component
script RegressionOverlay extends Component

	-- 회귀(Regression) 눈뜨기 연출. RegressionGroup 루트에 부착(ClientOnly). openness(0=감음/1=뜸) 한 파라미터로
	-- 5비트 상태머신을 OnUpdate 구동. FadeOverlay 패턴 확장(자기등록 + 매프레임 램프). 루트는 항상 Enable 유지
	-- (스크립트가 여기 살아 OnUpdate 필요) → 숨김은 자식 alpha 0 + CanvasGroup.BlocksRaycasts=false로.

	-- 3레이어(바인딩 주입, Task 5). illust=회귀 이미지 / blackFill=풀스크린 검정(암전 보장) / vignette=방사형 iris.
	property SpriteGUIRendererComponent illust = ""

	property SpriteGUIRendererComponent blackFill = ""

	property SpriteGUIRendererComponent vignetteSr = ""

	property UITransformComponent vignetteTf = ""

	-- 상태: idle / close1 / open1 / hold / close2 / open2. mode: restart / lobby.
	@HideFromInspector property string phase = "idle"

	@HideFromInspector property number phaseT = 0.0

	@HideFromInspector property string mode = ""

	@ExecSpace("ClientOnly")
	method void OnBeginPlay()
		-- 레지스트리 등록 + 초기 완전 숨김(비차단).
		_StageManager.regressionOverlay = self
		self.phase = "idle"
		self:ApplyOpenness(1.0)
		if isvalid(self.illust) then self.illust:SetAlpha(0) end
		local cg = self.Entity.CanvasGroupComponent
		if isvalid(cg) then cg.BlocksRaycasts = false end
		log("[RegressionOverlay] registered")
	end

	@ExecSpace("ClientOnly")
	method void Play(string mode)
		-- 진입점. 재생 중이면 재진입 무시(더블클릭 가드).
		if self.phase ~= "idle" then return end
		self.mode = mode
		local cg = self.Entity.CanvasGroupComponent
		if isvalid(cg) then cg.BlocksRaycasts = true end
		self:Enter("close1")
		log("[RegressionOverlay] Play mode=" .. tostring(mode))
	end

	method number Clamp01(number v)
		-- 0..1 클램프.
		if v < 0 then return 0 end
		if v > 1 then return 1 end
		return v
	end

	@ExecSpace("ClientOnly")
	method void ApplyOpenness(number o)
		-- openness→비주얼: BlackFill/Vignette alpha=1-o(가장자리 더 어둡게=비네팅), Vignette scale=closed→open 보간.
		if isvalid(self.blackFill) then self.blackFill:SetAlpha(1 - o) end
		if isvalid(self.vignetteSr) then self.vignetteSr:SetAlpha(1 - o) end
		if isvalid(self.vignetteTf) then
			local cs = _GameConstants.VignetteClosedScale
			local os = _GameConstants.VignetteOpenScale
			local s = cs + (os - cs) * o
			self.vignetteTf.UIScale = Vector3(s, s, 1)
		end
	end

	@ExecSpace("ClientOnly")
	method void Enter(string p)
		-- 비트 진입: phase/타이머 리셋 + 초기 비주얼(회귀 이미지 표시 토글 포함).
		self.phase = p
		self.phaseT = 0.0
		if p == "close1" then
			if isvalid(self.illust) then self.illust:SetAlpha(0) end
			self:ApplyOpenness(1.0)
		elseif p == "open1" then
			if isvalid(self.illust) then self.illust:SetAlpha(1) end
			self:ApplyOpenness(0.0)
		elseif p == "hold" then
			self:ApplyOpenness(1.0)
		elseif p == "close2" then
			self:ApplyOpenness(1.0)
		elseif p == "open2" then
			self:ApplyOpenness(0.0)
		end
		log("[RegressionOverlay] phase=" .. p)
	end

	@ExecSpace("ClientOnly")
	method void DoLoad()
		-- close2 암전 완료 순간(뒤에서) 목적지 로드 + 배경 이미지 제거(open2가 목적지를 드러내도록).
		if isvalid(self.illust) then self.illust:SetAlpha(0) end
		if self.mode == "restart" then
			_StageManager:RequestRestartRun()
		else
			local lobby = _EntityService:GetEntityByPath("/ui/LobbyGroup/Root")
			if lobby ~= nil then lobby.Enable = true end
			_SelectBackdrop:ShowLoading(false)
			_SoundManager:PlayBGMKey("bgm_title")
		end
		log("[RegressionOverlay] DoLoad mode=" .. tostring(self.mode))
	end

	@ExecSpace("ClientOnly")
	method void Finish()
		-- 종료: 완전 투명·비차단 복귀 + 최종 입력 컨텍스트.
		self.phase = "idle"
		self:ApplyOpenness(1.0)
		if isvalid(self.illust) then self.illust:SetAlpha(0) end
		local cg = self.Entity.CanvasGroupComponent
		if isvalid(cg) then cg.BlocksRaycasts = false end
		if self.mode == "restart" then
			_InputRouter:SetContext("Combat")
		else
			_InputRouter:SetContext("Lobby")
		end
		log("[RegressionOverlay] finished mode=" .. tostring(self.mode))
	end

	@ExecSpace("ClientOnly")
	method void OnUpdate(number delta)
		-- 5비트 진행. openness 계산 → ApplyOpenness. 비트 종료 시 다음 비트/로드/종료.
		if self.phase == "idle" then return end
		self.phaseT += delta
		local closeDur = _GameConstants.RegressionBlinkCloseDuration
		local openDur = _GameConstants.RegressionBlinkOpenDuration
		local holdDur = _GameConstants.RegressionHoldDuration
		if closeDur <= 0 then closeDur = 0.01 end
		if openDur <= 0 then openDur = 0.01 end
		local o = 1.0
		if self.phase == "close1" then
			o = 1.0 - self:Clamp01(self.phaseT / closeDur)
			if self.phaseT >= closeDur then self:Enter("open1") return end
		elseif self.phase == "open1" then
			o = self:Clamp01(self.phaseT / openDur)
			if self.phaseT >= openDur then self:Enter("hold") return end
		elseif self.phase == "hold" then
			o = 1.0
			if self.phaseT >= holdDur then self:Enter("close2") return end
		elseif self.phase == "close2" then
			o = 1.0 - self:Clamp01(self.phaseT / closeDur)
			if self.phaseT >= closeDur then self:DoLoad() self:Enter("open2") return end
		elseif self.phase == "open2" then
			o = self:Clamp01(self.phaseT / openDur)
			if self.phaseT >= openDur then self:Finish() return end
		end
		self:ApplyOpenness(o)
	end

end
```

- [ ] **Step 2: refresh + 빌드 로그 확인**

`maker_stop` → `maker_refresh_workspace` → `maker_logs(kind="build")`. Expected: `RegressionOverlay.mlua` 관련 에러 0. (LSP `mlua-diagnose` 훅도 에러 0이어야 함. `LIA-1114` info는 무시.)

- [ ] **Step 3: 커밋**

```bash
git add RootDesk/MyDesk/UI/RegressionOverlay.mlua RootDesk/MyDesk/UI/RegressionOverlay.codeblock
git commit -m "feat(MR-AE): RegressionOverlay 연출 상태머신 컴포넌트"
```

---

## Task 5: RegressionGroup.ui 저작 + 바인딩 주입

**Files:**
- Create: `ui/RegressionGroup.ui`
- Modify: `RootDesk/MyDesk/UI/RegressionOverlay.mlua`(바인딩 주입 — 프로퍼티 기본 UUID)

**Interfaces:**
- Consumes: `REGRESSION_IMAGE_RUID`, `VIGNETTE_RUID`(Task 1); `script.RegressionOverlay`(Task 4, refresh 완료 상태여야 함).
- Produces: `/ui/RegressionGroup` 그룹과 `Illust`/`BlackFill`/`Vignette` 엔티티, 루트에 `script.RegressionOverlay` + CanvasGroup. `RegressionOverlay.mlua`의 4개 프로퍼티에 UUID 주입 완료.

**Builder Preflight:** 이 태스크는 `.ui` 변경 → 실행 전 `../msw-general/references/builder-protocol.md` §3 전체를 Read(매 턴). `Skill: msw-ui-system` 로드.

- [ ] **Step 1: 빌더 스크립트 작성**

`<VIGNETTE_RUID>`는 Task 1 산출값. 회귀 이미지가 sprite가 아니면 `image_ruid`를 `"thumbnail://93cefac9728c4911a9309bcdf96a516a"`로. `.claude/skills/msw-general/`을 CWD로 두고 실행하는 임시 스크립트 `scratchpad/build_regression_ui.cjs`:

```javascript
const { UIBuilder } = require("../msw-ui-system/scripts/msw_ui_builder.cjs");

// 최상위 그룹(로비/게임오버 패널보다 위): displayOrder=100, group_type=UIType(1)
const b = new UIBuilder("RegressionGroup", 100, true);

// 루트 CanvasGroup — 유휴 시 입력 비차단(런타임에 Play가 true로 올림)
b.upsertComponent("RegressionGroup", "MOD.Core.CanvasGroupComponent",
  { "@type": "MOD.Core.CanvasGroupComponent", Enable: true, GroupAlpha: 1.0, Interactable: true, BlocksRaycasts: false });

// (뒤) 회귀 이미지 — 풀스크린 스트레치, 초기 alpha 0(런타임 토글)
b.sprite("Illust", { anchor: "stretch", image_ruid: "93cefac9728c4911a9309bcdf96a516a", alpha: 0, raycast: false });

// (중) 검정 암전 보장 레이어 — 기본 스프라이트 검정 틴트, 초기 alpha 0
b.sprite("BlackFill", { anchor: "stretch", color: "#000000", alpha: 0, raycast: false });

// (앞) 방사형 비네팅 iris — 중앙 정렬, 화면보다 큰 rect(스케일로 iris 구동), 초기 alpha 0
b.sprite("Vignette", { anchor: "middle-center", rect_size: [1920, 1080], image_ruid: "<VIGNETTE_RUID>", alpha: 0, raycast: false });

// 루트에 연출 스크립트 부착(Task 4에서 refresh되어 등록된 상태여야 함)
b.addComponent("RegressionGroup", "script.RegressionOverlay");

// write + .mlua 프로퍼티 UUID 주입
b.write("ui/RegressionGroup.ui", {
  bind: {
    mlua: "RootDesk/MyDesk/UI/RegressionOverlay.mlua",
    props: {
      illust: "RegressionGroup/Illust",
      blackFill: "RegressionGroup/BlackFill",
      vignetteSr: "RegressionGroup/Vignette",
      vignetteTf: "RegressionGroup/Vignette",
    },
  },
});
console.log("OK", b.getId("RegressionGroup"));
```

- [ ] **Step 2: 빌더 실행**

```bash
cd ".claude/skills/msw-general" && node "../../../<scratchpadpath>/build_regression_ui.cjs"
```

Expected: `✓ ui_lint: clean` + `OK <uuid>` 출력, 예외 없음. (lint 에러 시 중단·수정 후 재실행 — `.ui`는 롤백됨.)

- [ ] **Step 3: 바인딩 주입 확인**

`Grep`로 `RegressionOverlay.mlua`에서 `property SpriteGUIRendererComponent illust = "` 라인의 기본값이 빈 문자열이 아닌 UUID로 바뀌었는지 확인(4개 프로퍼티 모두). 미주입이면 Task 4 프로퍼티명과 bind props 키 일치 재확인.

- [ ] **Step 4: refresh + 빌드 로그**

`maker_stop` → `maker_refresh_workspace` → `maker_logs(kind="build")`. Expected: `RegressionGroup`/`RegressionOverlay` 관련 에러 0.

- [ ] **Step 5: 커밋**

```bash
git add ui/RegressionGroup* RootDesk/MyDesk/UI/RegressionOverlay.mlua
git commit -m "feat(MR-AE): RegressionGroup.ui 3레이어 오버레이 + 바인딩 주입"
```

> `.ui` 리터럴이 든 Bash 커밋은 가드에 막히므로 커밋 메시지에 `.ui`를 넣지 말고 위처럼 glob(`ui/RegressionGroup*`)로 스테이지.

---

## Task 6: GameOverController 배선

**Files:**
- Modify: `RootDesk/MyDesk/UI/GameOverController.mlua:66-90`

**Interfaces:**
- Consumes: `_StageManager.regressionOverlay`(Task 3·4), `RegressionOverlay:Play(mode)`(Task 4).

- [ ] **Step 1: `OnRestartClick` 위임으로 교체**

`GameOverController.mlua`의 `OnRestartClick` 본문을 교체(패널 숨김은 유지, 액션은 오버레이 위임 + nil 폴백):

```lua
	@ExecSpace("ClientOnly")
	method void OnRestartClick(ButtonClickEvent event)
		-- 다시 도전: 팝업 닫고 회귀 연출 재생(오버레이가 재시작 로드/컨텍스트 수행). 오버레이 없으면 기존 즉시 경로 폴백.
		self.gameOverRoot.Enable = false
		self.fadeT = -1.0
		if isvalid(self.canvasGroup) then self.canvasGroup.GroupAlpha = 1 end
		---@type RegressionOverlay
		local ov = _StageManager.regressionOverlay
		if ov ~= nil and isvalid(ov) then
			ov:Play("restart")
		else
			_InputRouter:SetContext("Combat")
			_StageManager:RequestRestartRun()
		end
		log("[GameOverController] restart -> regression")
	end
```

- [ ] **Step 2: `OnLobbyClick` 위임으로 교체**

```lua
	@ExecSpace("ClientOnly")
	method void OnLobbyClick(ButtonClickEvent event)
		-- 로비로: 팝업 닫고 회귀 연출 재생(오버레이가 로비 복귀 수행). 폴백=기존 즉시 로비 복귀.
		self.gameOverRoot.Enable = false
		self.fadeT = -1.0
		if isvalid(self.canvasGroup) then self.canvasGroup.GroupAlpha = 1 end
		---@type RegressionOverlay
		local ov = _StageManager.regressionOverlay
		if ov ~= nil and isvalid(ov) then
			ov:Play("lobby")
		else
			local lobby = _EntityService:GetEntityByPath("/ui/LobbyGroup/Root")
			if lobby ~= nil then lobby.Enable = true end
			_SelectBackdrop:ShowLoading(false)
			_InputRouter:SetContext("Lobby")
			_SoundManager:PlayBGMKey("bgm_title")
		end
		log("[GameOverController] lobby -> regression")
	end
```

- [ ] **Step 3: refresh + 빌드 로그**

`maker_stop` → `maker_refresh_workspace` → `maker_logs(kind="build")`. Expected: `GameOverController.mlua` 관련 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add RootDesk/MyDesk/UI/GameOverController.mlua
git commit -m "feat(MR-AE): 게임오버 재시작/로비 버튼 회귀 연출 위임"
```

---

## Task 7: GameClearController 배선

**Files:**
- Modify: `RootDesk/MyDesk/UI/GameClearController.mlua:45-65`

**Interfaces:**
- Consumes: `_StageManager.regressionOverlay`(Task 3·4), `RegressionOverlay:Play(mode)`(Task 4).

- [ ] **Step 1: `OnRestartClick` 위임으로 교체**

```lua
	@ExecSpace("ClientOnly")
	method void OnRestartClick(ButtonClickEvent event)
		-- 다시 도전: 팝업 닫고 회귀 연출 재생(오버레이가 새 런 시작 수행). 폴백=기존 즉시 경로.
		self.clearRoot.Enable = false
		---@type RegressionOverlay
		local ov = _StageManager.regressionOverlay
		if ov ~= nil and isvalid(ov) then
			ov:Play("restart")
		else
			_InputRouter:SetContext("Combat")
			_StageManager:RequestRestartRun()
		end
		log("[GameClearController] restart -> regression")
	end
```

- [ ] **Step 2: `OnLobbyClick` 위임으로 교체**

```lua
	@ExecSpace("ClientOnly")
	method void OnLobbyClick(ButtonClickEvent event)
		-- 로비로: 팝업 닫고 회귀 연출 재생(오버레이가 로비 복귀 수행). 폴백=기존 즉시 로비 복귀.
		self.clearRoot.Enable = false
		---@type RegressionOverlay
		local ov = _StageManager.regressionOverlay
		if ov ~= nil and isvalid(ov) then
			ov:Play("lobby")
		else
			local lobby = _EntityService:GetEntityByPath("/ui/LobbyGroup/Root")
			if lobby ~= nil then lobby.Enable = true end
			_SelectBackdrop:ShowLoading(false)
			_InputRouter:SetContext("Lobby")
			_SoundManager:PlayBGMKey("bgm_title")
		end
		log("[GameClearController] lobby -> regression")
	end
```

- [ ] **Step 3: refresh + 빌드 로그**

`maker_stop` → `maker_refresh_workspace` → `maker_logs(kind="build")`. Expected: `GameClearController.mlua` 관련 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add RootDesk/MyDesk/UI/GameClearController.mlua
git commit -m "feat(MR-AE): 게임클리어 재시작/로비 버튼 회귀 연출 위임"
```

---

## Task 8: 통합 play 검증 + 티켓 마감

**Files:** 없음(검증). 실패 시 해당 태스크로 복귀.

- [ ] **Step 1: 게임오버 유도 → 다시도전 검증**

`maker_clear_logs` → `maker_play`. 게임을 진행해 목숨을 소진(사망 유도)하거나, 존재하는 디버그 치트로 게임오버 화면을 띄운다. `다시도전` 클릭(`maker_mouse_input` — 버튼 좌표는 `maker_screenshot`으로 확인). 직후 `maker_logs(kind="normal")`.

Expected 로그 순서(각 1회): `[RegressionOverlay] Play mode=restart` → `phase=close1` → `phase=open1` → `phase=hold` → `phase=close2` → `[RegressionOverlay] DoLoad mode=restart` → `[StageManager] run restart requested` → `phase=open2` → `[RegressionOverlay] finished mode=restart`. 런타임 에러 0.

- [ ] **Step 2: 비주얼 스크린샷 확인**

연출이 짧으므로 검증 라운드 한정으로 `_GameConstants.RegressionHoldDuration`을 5.0으로 임시 상향(refresh) 후 재생 → `hold` 구간에서 `maker_screenshot`으로 **회귀 이미지 풀스크린 + 열린 상태** 확인. 확인 후 0.8로 되돌린다(refresh). BlackFill/Vignette 암전이 실제로 보이는지(회귀 이미지·비네팅 RUID 렌더)도 확인 — `unavailable`이면 Task 1 RUID 재확보.

- [ ] **Step 3: 로비로 버튼 검증**

게임오버 화면에서 `로비로` 클릭 → 로그 `Play mode=lobby` … `DoLoad mode=lobby` → `phase=open2` → `finished mode=lobby`, 그리고 로비 화면 등장 + `bgm_title` 재생 확인.

- [ ] **Step 4: 게임클리어 경로 검증**

게임 승리(또는 클리어 치트)로 클리어 화면 → `다시도전`/`로비로` 각각 위 로그 시퀀스가 동일하게 나오는지 확인. `maker_stop`.

- [ ] **Step 5: 티켓 마감 + 최종 커밋**

`tickets/MR-AE-death-regression-vignette.md`의 Acceptance criteria 체크, `status: review`(또는 검증 통과 시 `done`), `updated: 2026-07-04`. 서브태스크 체크오프.

```bash
git add tickets/MR-AE-death-regression-vignette.md
git commit -m "chore(MR-AE): 회귀 연출 검증 완료 — 티켓 review"
```

---

## Self-Review

- **Spec 커버리지**: 4버튼 트리거(Task 6·7) / 더블 블링크(Task 4 상태머신) / iris+BlackFill 암전(Task 4·5) / restart·lobby(Task 4 DoLoad·Finish) / 암전 뒤 로드(Task 4 close2→DoLoad) / 비트 로그+스크린샷(Task 8) — 스펙 항목 전부 태스크 존재. ✅
- **에셋**: 회귀 이미지(주어진 RUID) + 방사형 비네팅(Task 1) — 커버. ✅
- **타입 일관성**: `Play(string mode)`, `Enter/ApplyOpenness/DoLoad/Finish/Clamp01`, 프로퍼티 `illust/blackFill/vignetteSr/vignetteTf` — Task 4 정의 ↔ Task 5 bind props ↔ Task 6·7 호출 일치. `_StageManager.regressionOverlay`(Task 3 정의 ↔ Task 4 등록 ↔ Task 6·7 조회) 일치. ✅
- **플레이스홀더**: `<VIGNETTE_RUID>`는 Task 1 산출 후 치환하도록 명시(실 플레이스홀더 아님). 그 외 실제 코드 완비. ✅
- **주의**: 루트 그룹은 절대 `Enable=false` 하지 않음(스크립트 OnUpdate 유지) — 숨김은 alpha+BlocksRaycasts로. Task 4 코드가 이를 준수.
