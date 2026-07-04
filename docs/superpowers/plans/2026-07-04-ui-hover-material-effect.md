# UI 마우스 호버 머티리얼 이펙트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 버튼 UI에 마우스를 올리면 머티리얼(셰이더) 효과가 켜지고 벗어나면 꺼지는, 어떤 버튼에도 재사용 가능한 `HoverMaterial` 컴포넌트를 추가한다.

**Architecture:** 자기완결형 per-entity `@Component`. 버튼 엔티티에 부착하면 스스로 그 엔티티의 `ButtonStateChangeEvent`를 구독해 `SpriteGUIRendererComponent`의 머티리얼을 Hover 시 적용 / Normal 시 원복한다. 기존 컨트롤러 로직은 건드리지 않고, `Card_Deepmine`에 임시로 정적 적용된 머티리얼만 제거한다.

**Tech Stack:** MSW mlua (`@Component`, ClientOnly), UIBuilder (`.ui` 컴포넌트 부착/패치), Hologram 머티리얼(`MouseHovering`), Maker MCP(refresh/play/logs) 검증.

## Global Constraints

- CoreVersion `26.5.0.0` — 불일치 시 작업 중단.
- `.mlua`는 `RootDesk/MyDesk/<Feature>/` 아래에만 생성. 이 컴포넌트는 UI 부착이므로 `RootDesk/MyDesk/UI/`.
- `.ui`는 **UIBuilder로만** 수정 — raw JSON 편집/그렙 금지. 읽기도 `UIBuilder.read`.
- `.codeblock`는 Maker `refresh`가 생성 — 수동 생성/수정 금지.
- 컴포넌트 타입 문자열은 fully-qualified: 네이티브 `MOD.Core.X`, 스크립트 `script.X`.
- `ChangeMaterial` / `GetMaterialIdByName` 인자는 **bare UUID** — `material://` 접두사 금지.
- `OnBeginPlay`에서 연결한 이벤트는 `OnEndPlay`에서 반드시 해제.
- UI/머티리얼은 클라이언트 전용 — 컴포넌트 동작은 `@ExecSpace("ClientOnly")`.

**대상 버튼 엔티티 (경로 → id):**

| 그룹 / `.ui` | 엔티티 경로 | id |
|---|---|---|
| `ui/ThemeSelectGroup.ui` | `/ui/ThemeSelectGroup/Root/Card_Orbis` | 8ce13f30-c7c0-4dcd-8f4e-ee29013f6734 |
| `ui/ThemeSelectGroup.ui` | `/ui/ThemeSelectGroup/Root/Card_Elnath` | 9827cf4c-e49f-4542-8bb5-ee341d36a2d4 |
| `ui/ThemeSelectGroup.ui` | `/ui/ThemeSelectGroup/Root/Card_Deepmine` | cbce1a09-2dcf-4ec2-b1df-26bb63eee1e7 |
| `ui/NodeSelectGroup.ui` | `/ui/NodeSelectGroup/Root/Panel/BtnNode1` | 143548d7-20f6-44e2-a88f-f1b5901056c1 |
| `ui/NodeSelectGroup.ui` | `/ui/NodeSelectGroup/Root/Panel/BtnNode2` | c1111f36-9180-418f-9435-24b2a2f057cf |
| `ui/NodeSelectGroup.ui` | `/ui/NodeSelectGroup/Root/Panel/BtnNode3` | 38d86f7d-9f18-4c55-8c18-e42ba8a6b41e |

`Card_Deepmine`의 현재 임시 머티리얼: `MaterialId = "material://4b8f8699-1a24-45a3-8897-96dbc2abe52e"` (= `MouseHovering`). 이걸 `""`로 되돌린다.

**확인된 API 시그니처 (`.d.mlua`):**
- `ButtonStateChangeEvent` → `property ButtonState state`.
- `ButtonState`: `Normal=0, Hover=1, Pressed=2, Released=3, Clicked=4`.
- `_EntryService:GetMaterialIdByName(string name) → string` (bare UUID 반환).
- `SpriteGUIRendererComponent`: `MaterialId` (string, 읽기 가능) + `ChangeMaterial(string materialId)`.

---

### Task 1: `HoverMaterial` 컴포넌트 작성

**Files:**
- Create: `RootDesk/MyDesk/UI/HoverMaterial.mlua`

**Interfaces:**
- Produces: 스크립트 컴포넌트 타입 `script.HoverMaterial`, 프로퍼티 `string hoverMaterialName`(기본값 `"MouseHovering"`). Task 2가 이 타입을 6개 버튼 엔티티에 부착한다.
- Consumes: 네이티브 `ButtonStateChangeEvent` / `ButtonState` / `_EntryService` / `SpriteGUIRendererComponent`(위 Global Constraints의 확인된 시그니처).

- [ ] **Step 1: 컴포넌트 파일 작성**

`RootDesk/MyDesk/UI/HoverMaterial.mlua`:

```lua
@Component
script HoverMaterial extends Component

	-- 호버 시 적용할 머티리얼 이름. 기획자 편집 가능, 버튼별 오버라이드 가능.
	property string hoverMaterialName = "MouseHovering"

	-- ButtonStateChangeEvent 구독 핸들.
	property any stateHandler = nil

	@ExecSpace("ClientOnly")
	method void OnBeginPlay()
		-- 스프라이트 렌더러 확보 → 원본 머티리얼 기억 → 호버 머티리얼 해석 → 버튼 상태 이벤트 구독.
		local sprite = self.Entity.SpriteGUIRendererComponent
		if not isvalid(sprite) then
			log_warning("[HoverMaterial] no SpriteGUIRendererComponent on " .. self.Entity.Name)
			return
		end
		self._T.baseMatId = sprite.MaterialId or ""
		local matId = _EntryService:GetMaterialIdByName(self.hoverMaterialName)
		if matId == nil or matId == "" then
			log_warning("[HoverMaterial] material not found: " .. tostring(self.hoverMaterialName) .. " on " .. self.Entity.Name)
			return
		end
		self._T.hoverMatId = matId
		self.stateHandler = self.Entity:ConnectEvent(ButtonStateChangeEvent, self.OnButtonState)
		log("[HoverMaterial] ready on " .. self.Entity.Name .. " mat=" .. self.hoverMaterialName)
	end

	@ExecSpace("ClientOnly")
	method void OnButtonState(ButtonStateChangeEvent event)
		-- Hover 진입 → 머티리얼 적용 / Normal 복귀 → 원본 머티리얼로 원복.
		local sprite = self.Entity.SpriteGUIRendererComponent
		if not isvalid(sprite) then return end
		if event.state == ButtonState.Hover then
			sprite:ChangeMaterial(self._T.hoverMatId)
			log("[HoverMaterial] hover ON " .. self.Entity.Name)
		elseif event.state == ButtonState.Normal then
			sprite:ChangeMaterial(self._T.baseMatId)
			log("[HoverMaterial] hover OFF " .. self.Entity.Name)
		end
	end

	@ExecSpace("ClientOnly")
	method void OnEndPlay()
		-- 이벤트 해제.
		if self.stateHandler ~= nil then
			self.Entity:DisconnectEvent(ButtonStateChangeEvent, self.stateHandler)
			self.stateHandler = nil
		end
	end

end
```

- [ ] **Step 2: LSP 진단 통과 확인**

`mlua-diagnose` 훅이 저장 직후 자동 실행된다. error-severity 진단이 0이 될 때까지 수정.
`LIA-1113/1114/1115` Info(크로스 스크립트 참조 미해결)는 노이즈이므로 무시(§17.2).
Expected: error 0.

- [ ] **Step 3: refresh 후 빌드 로그 확인 (`script.HoverMaterial` 등록)**

MCP 순서: `stop` → `refresh` → `logs(category="build")`.
Expected: 빌드 에러 0. `script.HoverMaterial` 타입이 등록되어 Task 2에서 참조 가능.
에러가 있으면 Step 1로 돌아가 수정 후 재실행.

- [ ] **Step 4: 커밋**

```bash
git add RootDesk/MyDesk/UI/HoverMaterial.mlua RootDesk/MyDesk/UI/HoverMaterial.codeblock
git commit -m "feat(ui): 재사용 HoverMaterial 컴포넌트 — 버튼 호버 시 머티리얼 스왑"
```

---

### Task 2: 6개 버튼에 컴포넌트 부착 + Card_Deepmine 임시 머티리얼 제거

**Files:**
- Modify: `ui/ThemeSelectGroup.ui` (Card_Orbis/Elnath/Deepmine에 `script.HoverMaterial` 부착 + Card_Deepmine의 `MaterialId` 제거)
- Modify: `ui/NodeSelectGroup.ui` (BtnNode1/2/3에 `script.HoverMaterial` 부착)
- Create(임시): `.builder-work/wire_hover.cjs` (부착 스크립트; 커밋 대상 아님)

**Interfaces:**
- Consumes: Task 1의 `script.HoverMaterial` 타입.
- Produces: 6개 버튼 엔티티가 `HoverMaterial`을 보유한 `.ui` 두 개.

- [ ] **Step 1: 부착 스크립트 작성**

`.builder-work/wire_hover.cjs` (프로젝트 루트 기준. 없으면 폴더 생성):

```javascript
const { UIBuilder } = require("D:/Users/4cat1/Documents/MSW/MapleRush/.claude/skills/msw-ui-system/scripts/msw_ui_builder.cjs");
const ROOT = "D:/Users/4cat1/Documents/MSW/MapleRush/ui/";
const SCRIPT_TYPE = "script.HoverMaterial";

// --- ThemeSelectGroup: 3 카드 부착 + Deepmine 임시 머티리얼 제거 ---
{
  const b = UIBuilder.read(ROOT + "ThemeSelectGroup.ui");
  const base = "/ui/ThemeSelectGroup/Root/";
  for (const card of ["Card_Orbis", "Card_Elnath", "Card_Deepmine"]) {
    const p = base + card;
    if (!b.hasComponent(p, SCRIPT_TYPE)) b.addComponent(p, SCRIPT_TYPE);
  }
  b.patchComponent(base + "Card_Deepmine", "MOD.Core.SpriteGUIRendererComponent", { MaterialId: "" });
  b.write(ROOT + "ThemeSelectGroup.ui");
  console.log("ThemeSelectGroup wired");
}

// --- NodeSelectGroup: 3 노드 부착 ---
{
  const b = UIBuilder.read(ROOT + "NodeSelectGroup.ui");
  const base = "/ui/NodeSelectGroup/Root/Panel/";
  for (const node of ["BtnNode1", "BtnNode2", "BtnNode3"]) {
    const p = base + node;
    if (!b.hasComponent(p, SCRIPT_TYPE)) b.addComponent(p, SCRIPT_TYPE);
  }
  b.write(ROOT + "NodeSelectGroup.ui");
  console.log("NodeSelectGroup wired");
}
```

- [ ] **Step 2: 스크립트 실행 (write 자동 lint 포함)**

```bash
node ".builder-work/wire_hover.cjs"
```

Expected: `ThemeSelectGroup wired` / `NodeSelectGroup wired` 출력, `write()` 자동 lint 통과(`✓ ui_lint: clean` 또는 경고만). 에러로 실패하면 파일이 롤백되므로 원인 수정 후 재실행.

- [ ] **Step 3: 부착 결과 검증 (UIBuilder read-side)**

`.builder-work/verify_hover.cjs`:

```javascript
const { UIBuilder } = require("D:/Users/4cat1/Documents/MSW/MapleRush/.claude/skills/msw-ui-system/scripts/msw_ui_builder.cjs");
const ROOT = "D:/Users/4cat1/Documents/MSW/MapleRush/ui/";
const T = "script.HoverMaterial";
const check = (f, paths) => {
  const b = UIBuilder.read(ROOT + f);
  for (const p of paths) {
    const has = b.hasComponent(p, T);
    let mat = "";
    const sc = b.getComponent(p, "MOD.Core.SpriteGUIRendererComponent");
    if (sc) mat = sc.MaterialId || "";
    console.log(`${p.split("/").pop()}: HoverMaterial=${has} MaterialId="${mat}"`);
  }
};
check("ThemeSelectGroup.ui", [
  "/ui/ThemeSelectGroup/Root/Card_Orbis",
  "/ui/ThemeSelectGroup/Root/Card_Elnath",
  "/ui/ThemeSelectGroup/Root/Card_Deepmine",
]);
check("NodeSelectGroup.ui", [
  "/ui/NodeSelectGroup/Root/Panel/BtnNode1",
  "/ui/NodeSelectGroup/Root/Panel/BtnNode2",
  "/ui/NodeSelectGroup/Root/Panel/BtnNode3",
]);
```

```bash
node ".builder-work/verify_hover.cjs"
```

Expected: 6개 모두 `HoverMaterial=true`. 3개 카드/3개 노드 `MaterialId=""` (특히 `Card_Deepmine`이 `""` — 임시 머티리얼 제거 확인).

- [ ] **Step 4: refresh + 빌드 로그**

MCP: `stop` → `refresh` → `logs(category="build")`.
Expected: 빌드 에러 0.

- [ ] **Step 5: 커밋**

```bash
git add ui/ThemeSelectGroup.ui ui/NodeSelectGroup.ui
git commit -m "feat(ui): 테마 카드 3종 + 노드 버튼 3종에 HoverMaterial 부착, Deepmine 임시 머티리얼 제거"
```

---

### Task 3: 플레이 검증 + 원복 방식/`IsUIMaterial` 확정

**Files:**
- (조건부) Modify: `RootDesk/MyDesk/Materials/MouseHovering.material` (`IsUIMaterial` → `true`)
- (조건부) Create: `RootDesk/MyDesk/Materials/Default.material` + `HoverMaterial.mlua` 원복 경로 수정 (empty-string 원복 실패 시에만)

**Interfaces:**
- Consumes: Task 1/2 결과물.

- [ ] **Step 1: 플레이 진입 및 테마 선택 팝업 노출**

MCP: `clear_logs` → `refresh` → `logs(category="build")`(에러 0 확인) → `play`.
테마 선택 팝업(`ThemeSelectGroup`)이 뜨는 지점까지 진행(로비→진입). 필요 시 `_FloorManager`/게임 흐름으로 팝업이 열리도록 플레이.
게임 흐름상 팝업 도달이 번거로우면, 검증용으로 `maker_execute_script`로 해당 컨트롤러의 `Open(...)`을 호출해 팝업만 띄워도 된다.

- [ ] **Step 2: 호버 on/off 동작 확인**

각 카드/노드 버튼 위로 마우스 이동(`mouse_input`) 후, 벗어나게 이동.
`logs(category="runtime")` 확인.
Expected 로그(양성 증거):
- 진입 시: `[HoverMaterial] ready on Card_Orbis mat=MouseHovering` 등 6개.
- 호버 시: `[HoverMaterial] hover ON <name>`.
- 이탈 시: `[HoverMaterial] hover OFF <name>`.
`screenshot`은 사용자가 요청하거나 시각 확인이 필요할 때만 호출.

- [ ] **Step 3: 원복(끄기) 실제 동작 판정**

호버 이탈 후 카드가 **원래 모습(홀로그램 없음)** 으로 돌아오는지 육안/스크린샷 확인.
- 정상 원복됨 → Step 5로.
- 이탈 후에도 이펙트가 남음(= `ChangeMaterial("")`가 클리어 안 됨) → Step 4 수행.

- [ ] **Step 4: (조건부) Default 머티리얼 원복 경로로 대체**

`RootDesk/MyDesk/Materials/Default.material` 생성:

```json
{
  "Id": "",
  "GameId": "",
  "EntryKey": "material://00000000-0000-4000-8000-0000000000d0",
  "ContentType": "x-mod/material",
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
      "name": "Default",
      "id": "00000000-0000-4000-8000-0000000000d0",
      "shadertype": "Default",
      "IsUIMaterial": true,
      "RequiresUIStencilStateChange": false
    }
  }
}
```

`HoverMaterial.mlua`의 `OnBeginPlay`에서 baseMatId 대체분 해석 추가, `OnButtonState`의 Normal 분기를 Default로 스왑:

`OnBeginPlay` 안, `self._T.baseMatId = sprite.MaterialId or ""` 아래에 삽입:

```lua
		if self._T.baseMatId == "" then
			local defId = _EntryService:GetMaterialIdByName("Default")
			if defId ~= nil and defId ~= "" then self._T.baseMatId = defId end
		end
```

(원복은 기존 `sprite:ChangeMaterial(self._T.baseMatId)` 그대로 — baseMatId가 Default entryId로 채워짐.)
그 후 `refresh` → Step 1~3 재검증.

- [ ] **Step 5: (조건부) `IsUIMaterial` 확정**

Step 2~3에서 홀로그램이 UI 카드 위에 **정상 렌더**되면 그대로 둔다.
렌더가 깨지거나(스텐실/클리핑 이상) 안 보이면 `MouseHovering.material`의 `IsUIMaterial`을 `true`로 수정:

`RootDesk/MyDesk/Materials/MouseHovering.material`에서:

```
"IsUIMaterial": false,   →   "IsUIMaterial": true,
```

`refresh` → Step 1~3 재검증하여 정상 렌더 확인.

- [ ] **Step 6: 최종 검증 (verify-checklist)**

- [ ] 빌드 에러 0 (`logs(category="build")` 재확인).
- [ ] 6개 버튼 각각 호버 ON/OFF 로그가 정확한 side(Client)에서 출력됨.
- [ ] `Card_Deepmine`이 시작 시 이펙트 꺼진 상태(임시 정적 제거 확인).
- [ ] 카드/노드 **클릭 → 테마/노드 선택** 기존 동작 정상(`[ThemeSelectController] selected ...` / `[NodeSelectController] branch ...` 로그).
- [ ] 팝업 열고 닫을 때 `LEA-`/`LWA-` 에러 없음.
- [ ] `stop`으로 편집 모드 복귀.

- [ ] **Step 7: 커밋 (조건부 변경분이 있으면)**

```bash
# Step 4/5에서 변경이 있었던 파일만 add
git add RootDesk/MyDesk/UI/HoverMaterial.mlua RootDesk/MyDesk/UI/HoverMaterial.codeblock RootDesk/MyDesk/Materials/
git commit -m "fix(ui): 호버 머티리얼 원복 방식/IsUIMaterial 검증 반영"
```

---

## 확장성 메모 (실행자 참고)

새 UI 버튼에 호버 이펙트를 추가하려면 코드 수정 없이:
1. 대상 버튼 엔티티(ButtonComponent + SpriteGUIRendererComponent 보유)에 UIBuilder `addComponent(path, "script.HoverMaterial")`.
2. (선택) 다른 머티리얼을 쓰려면 그 엔티티에서만 `patchComponent(path, "script.HoverMaterial", { hoverMaterialName: "<이름>" })`로 오버라이드.

컨트롤러 스크립트는 호버 관심사를 알 필요가 없다.
