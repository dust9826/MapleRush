# UI 마우스 호버 머티리얼 이펙트 — 설계

## 목표

버튼 UI에 마우스를 올리면(hover) 머티리얼(셰이더) 효과가 켜지고, 커서가 벗어나면 꺼지는
재사용 가능한 호버 이펙트를 추가한다. ThemeSelectGroup의 3개 테마 카드와
NodeSelectGroup의 3개 분기 노드 버튼에 적용한다.

현재 상태: `Card_Deepmine`(폐광 카드)의 `SpriteGUIRendererComponent.MaterialId`에
`MouseHovering`(Hologram) 머티리얼이 **정적으로** 임시 적용되어 있어 항상 켜진 상태다.
이를 호버 시에만 켜지도록 전환한다.

## 접근: 재사용 `HoverMaterial` @Component

버튼 엔티티에 부착하면 스스로 호버를 감지해 머티리얼을 스왑하는 자기완결형 컴포넌트.
기존 컨트롤러(ThemeSelectController / NodeSelectController)는 로직을 건드리지 않는다
(임시 머티리얼 제거만 UIBuilder로 수행).

대안으로 "두 컨트롤러에 인라인" 방식을 검토했으나, 호버 로직이 2개 스크립트에 중복되고
향후 다른 버튼에 재사용하려면 복사가 필요해 제외. 재사용 컴포넌트가 model-native +
기획자 편집 가능 + YAGNI에 부합.

## 컴포넌트 사양 — `RootDesk/MyDesk/UI/HoverMaterial.mlua`

- 스코프: per-entity `@Component` (버튼 액터에 귀속). 동작은 ClientOnly (UI/머티리얼은 클라 전용).
- 프로퍼티:
  - `property string hoverMaterialName = "MouseHovering"` — 적용할 머티리얼 이름.
    기획자 편집 가능, 버튼별 오버라이드 가능.
- 내부 상태(런타임): 해석된 머티리얼 entryId(bare UUID), SpriteGUIRendererComponent 참조,
  이벤트 핸들.
- **확장성/견고성 가드** (새 UI에 아무렇게나 붙여도 안전하도록):
  - `SpriteGUIRendererComponent`가 없으면 `log` 경고 후 no-op (다른 버튼에 영향 없음).
  - `GetMaterialIdByName`이 빈/nil 반환(이름 오타/미등록)이면 `log` 경고 후 no-op.
  - `ButtonComponent`가 없어 `ButtonStateChangeEvent`가 안 오면 그냥 아무 일 없음(무해).
  - 어떤 가드에 걸려도 예외를 던지지 않아 같은 화면의 다른 버튼/컴포넌트는 정상 동작.

### 동작

```
[client only] OnBeginPlay:
  sprite = self.Entity.SpriteGUIRendererComponent
  matId  = _EntryService:GetMaterialIdByName(self.hoverMaterialName)   -- bare UUID, 1회 해석
  handle = self.Entity:ConnectEvent(ButtonStateChangeEvent, self.OnButtonState)

[client only] OnButtonState(event):
  state == ButtonState.Hover  -> sprite:ChangeMaterial(matId)   -- 효과 켬
  state == ButtonState.Normal -> sprite:ChangeMaterial("")      -- 원복(끔)
  (그 외 상태 Pressed/Released/Clicked는 유지 — 클릭 중에도 이펙트 유지)

[client only] OnEndPlay:
  self.Entity:DisconnectEvent(ButtonStateChangeEvent, handle)
```

- `ChangeMaterial`의 인자는 **bare UUID**. `material://` 접두사 금지.
- `GetMaterialIdByName`은 이미 bare UUID를 반환하므로 그대로 전달.

## 적용 대상 (6개 버튼 엔티티에 `script.HoverMaterial` 부착)

| 그룹 | 엔티티 | id |
|---|---|---|
| ThemeSelectGroup | `Card_Orbis` | 8ce13f30-c7c0-4dcd-8f4e-ee29013f6734 |
| ThemeSelectGroup | `Card_Elnath` | 9827cf4c-e49f-4542-8bb5-ee341d36a2d4 |
| ThemeSelectGroup | `Card_Deepmine` | cbce1a09-2dcf-4ec2-b1df-26bb63eee1e7 |
| NodeSelectGroup | `BtnNode1` | 143548d7-20f6-44e2-a88f-f1b5901056c1 |
| NodeSelectGroup | `BtnNode2` | c1111f36-9180-418f-9435-24b2a2f057cf |
| NodeSelectGroup | `BtnNode3` | 38d86f7d-9f18-4c55-8c18-e42ba8a6b41e |

각 버튼 엔티티는 이미 ButtonComponent + SpriteGUIRendererComponent를 같은 엔티티에 보유.

## 정리 작업

- `Card_Deepmine`의 `SpriteGUIRendererComponent.MaterialId`(임시 `material://4b8f8699-...`)를
  빈 문자열로 되돌린다 (UIBuilder patchComponent). 이후 호버 때만 적용됨.

## 작업 순서 (스크립트 ↔ UI 의존성)

1. `HoverMaterial.mlua` 작성.
2. Maker `refresh` → `.codeblock` 생성 (`script.HoverMaterial` 타입 등록).
3. UIBuilder로 두 `.ui`에 `script.HoverMaterial` 컴포넌트 부착 + `Card_Deepmine` 임시 머티리얼 제거.
4. Maker `refresh`.
5. `play` → 각 버튼에 마우스 호버/이탈하며 이펙트 on/off 검증, `logs` 확인.

## 구현 중 검증 필요 항목

1. **머티리얼 원복 방식** — `ChangeMaterial("")`로 효과가 실제 해제되는지 play에서 확인.
   해제 안 되면 `RootDesk/MyDesk/Materials/Default.material`(Default 셰이더)을 하나 만들어
   그쪽으로 스왑하는 방식으로 대체.
2. **`MouseHovering.material`의 `IsUIMaterial`** — 현재 `false`인데 UI 스프라이트
   (SpriteGUIRendererComponent)에 적용 중. 레퍼런스 권장(UI 렌더러 → `true`)에 따라
   `true`로 변경이 필요할 가능성 높음. play에서 홀로그램이 정상 렌더되는지 확인 후 확정.
3. **`ButtonStateChangeEvent`의 state 필드명 / `ButtonState` enum 접근** — `.d.mlua`에서
   정확한 필드명과 enum 식별자 확인 후 코드에 반영.

## 검증 기준 (성공 조건)

- 6개 버튼 각각: 마우스 올림 → 홀로그램 이펙트 표시, 이탈 → 원래 모습으로 복귀.
- `Card_Deepmine`이 시작 시 이펙트 꺼진 상태 (임시 정적 적용 제거 확인).
- 버튼 클릭 기능(테마/노드 선택)은 기존과 동일하게 동작.
- 팝업 열고 닫을 때(그룹 Enable 토글) 에러 없음, `logs`에 `LEA-`/`LWA-` 없음.

## 확장성 — 새 UI 버튼에 호버 이펙트 추가하는 방법

이후 다른 UI에 호버 이펙트가 필요하면 **코드 수정 없이** 다음만 하면 된다:

1. 대상 버튼 엔티티(ButtonComponent + SpriteGUIRendererComponent 보유)에
   `script.HoverMaterial` 컴포넌트를 부착 (UIBuilder `addComponent`, 또는 Maker Property Editor).
2. (선택) 다른 머티리얼을 쓰고 싶으면 그 엔티티에서 `hoverMaterialName` 프로퍼티만 오버라이드.

즉 컴포넌트 하나가 "호버 이펙트"의 단일 소스가 되고, 버튼 목록은 각 `.ui`가 소유한다.
컨트롤러 스크립트는 호버 관심사를 전혀 알 필요가 없다.

## 범위 밖 (YAGNI)

- 호버 사운드(별도 작업으로 분리 가능).
- 버튼별 서로 다른 머티리얼 (프로퍼티로 가능하나 현재는 전부 `MouseHovering` 공용).
- 클릭/선택 상태의 별도 시각 표현.
