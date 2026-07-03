# PlayerConfig 캡슐화 — 설계 문서

- **날짜**: 2026-07-03
- **작성 배경**: 기획자가 플레이어 관련 수치/컨트롤을 쉽게 찾아 수정할 수 있도록, 현재 `GameConstants.mlua`(150+ property 혼재)에서 **플레이어 관련만 전용 클래스로 캡슐화**한다.
- **이번 스코프**: 플레이어만. (Enemy/Monster는 후속 — 아래 "후속 작업" 참조)

---

## 1. 문제 (현재 상태)

`RootDesk/MyDesk/Core/GameConstants.mlua`는 `@Logic` 싱글톤으로, **150개 이상의 property**가 한 파일에 혼재한다:

- 플레이어 밸런스(공격력/목숨/대시/데미지 배율/능력)
- 적·보스 스텟
- 이코노미(가격/보상/메소)
- 이펙트 RUID·스케일
- 기즈모/디버그 설정
- 맵 이름

→ 기획자가 "플레이어 밸런스 값"만 찾아 수정하기가 어렵다. 또한 플레이어 **컨트롤 설정**(아래점프 on/off, 액션키)은 아예 코드에 하드코딩되어 있어(`PlayerInputSetup.mlua`의 WASD 매핑) 튜닝 지점이 분산돼 있다.

---

## 2. 목표 / 비목표

**목표**
- 플레이어 관련 수치를 **전용 클래스 한 파일**(`PlayerConfig`)로 모아 가독성·수정 편의를 높인다.
- 인스펙터에서 편집 가능(=`property` 유지), 접근 방식은 기존 `_GameConstants.X`와 동일한 전역 `_PlayerConfig.X`.
- 플레이어 **컨트롤 설정을 설정값화**: 아래점프 on/off 토글 + 액션키 바인딩.
- 아래점프를 실제로 **삭제**(기본값 off)하고 play로 검증.

**비목표**
- Enemy/Monster 스텟 이전(후속).
- 메타 강화(MetaProgression) 로직 변경.
- 히트박스 지오메트리(`PlayerHboxHW/HH`, `PlayerCenterYOffset`) 이전 — 이들은 플레이어 밸런스가 아니라 전투 판정 지오메트리이고 `CombatPrimitives`/기즈모/적 판정과 공유되므로 **GameConstants에 잔류**. (필요 시 별도 패스)

---

## 3. 설계

### 3.1 새 클래스: `RootDesk/MyDesk/Player/PlayerConfig.mlua` (`@Logic`)

`@Logic`을 선택하는 이유(브레인스토밍에서 확정):
- 플레이어 base 스텟 일부(`BaseAttack`, `BaseMaxLives`)를 **`GameStateManager`(@Logic 매니저)** 가 읽는다 → 컴포넌트로 두면 플레이어 엔티티 참조를 구해야 하는 커플링 발생. `@Logic`이면 `_PlayerConfig.X`로 어디서나 참조 가능(플레이어 참조 불필요).
- 컨트롤 설정은 **클라 입력쪽(`PlayerInputSetup`)** 에서 읽는다.
- 두 소비 축(서버 매니저 + 클라 입력) 모두 "게임 전역 규칙"이지 "플레이어 인스턴스별 값"이 아니다 → 전역 싱글톤 `@Logic`이 자연스럽다.
- `Global/DefaultPlayer.model`은 읽기 전용이라(프로젝트는 이미 런타임 `AddComponent` 관례를 씀) 모델 인스펙터 편집 경로는 마찰이 크다.

구역을 주석으로 명확히 나눈 property 목록(기본값은 현재 GameConstants 값 그대로 이관):

```lua
@Logic
script PlayerConfig extends Logic
	-- ===== 생존 =====
	property integer BaseMaxLives = 5

	-- ===== 공격 =====
	property number BaseAttack = 10.0
	property number AttackCooldown = 0.5
	property number PlayerAttackBoxForward = 2.5
	property number PlayerAttackBoxHeight = 2.0

	-- ===== 대시 =====
	property integer BaseMaxDash = 2
	property number BaseDashRecoverTime = 2.5
	property number DashDistance = 5.0
	property number DashDuration = 0.1

	-- ===== 데미지 배율 =====
	property number DmgAttackPct = 1.0
	property number DmgDashPct = 0.5
	property number DmgEmpoweredDashPct = 1.5
	property number DmgReflectPct = 2.0
	property number DmgRockPct = 3.0

	-- ===== 아이템/능력 =====
	property integer BaseMaxItems = 3
	property integer AbilityUsesNormal = 1
	property integer AbilityUsesBoss = 2
	property number InvincibleAbilityDuration = 1.0

	-- ===== 컨트롤 =====
	property boolean EnableDownJump = false           -- 아래점프 허용 여부 (기본 off = 삭제)
	property string KeyLeft = "A"
	property string KeyRight = "D"
	property string KeyUp = "W"
	property string KeyDown = "S"
end
```

> `BaseMaxItems`의 실제 소비처는 구현 시 확인(현재 grep으론 소비 코드 미검출 — 정의만 이관하고, 사용처가 없으면 주석으로 표기).

### 3.2 이관 대상 property (GameConstants → PlayerConfig)

| property | 현재 소비처 |
|---|---|
| `BaseMaxLives` | GameStateManager |
| `BaseAttack` | GameStateManager |
| `AttackCooldown` | PlayerCombat |
| `PlayerAttackBoxForward`, `PlayerAttackBoxHeight` | PlayerCombat, CombatGizmo |
| `BaseMaxDash`, `BaseDashRecoverTime`, `DashDistance` | PlayerDash, GizmoManager |
| `DashDuration` | PlayerDash (대시 i-frame 겸용) |
| `DmgAttackPct`, `DmgReflectPct` | PlayerCombat |
| `DmgDashPct`, `DmgEmpoweredDashPct` | PlayerDash |
| `DmgRockPct` | PlayerItems |
| `AbilityUsesNormal`, `AbilityUsesBoss` | PlayerAbility |
| `InvincibleAbilityDuration` | PlayerAbility |
| `BaseMaxItems` | (사용처 확인 필요) |

> `DashDistance`/`PlayerAttackBox*`는 **기즈모(GizmoManager/CombatGizmo)** 도 읽는다 → 치환 대상에 포함. `DashRangeSpriteWidth` 등 스프라이트/에셋 치수는 **GameConstants 잔류**(밸런스가 아니라 에셋 메타).

### 3.3 소비처 치환 (`_GameConstants.X` → `_PlayerConfig.X`)

수정 파일:
1. `Stage/GameStateManager.mlua` — `BaseMaxLives`, `BaseAttack`
2. `Player/PlayerDash.mlua` — `BaseMaxDash`, `BaseDashRecoverTime`, `DashDistance`, `DashDuration`, `DmgDashPct`, `DmgEmpoweredDashPct`
3. `Player/PlayerCombat.mlua` — `AttackCooldown`, `PlayerAttackBoxForward`, `PlayerAttackBoxHeight`, `DmgAttackPct`, `DmgReflectPct`
4. `Player/PlayerItems.mlua` — `DmgRockPct`
5. `Player/PlayerAbility.mlua` — `AbilityUsesNormal`, `AbilityUsesBoss`, `InvincibleAbilityDuration`
6. `Player/GizmoManager.mlua`, `Player/CombatGizmo.mlua` — `DashDistance`, `PlayerAttackBox*` (읽기만)

그리고 이관한 property를 `GameConstants.mlua`에서 **제거**.

### 3.4 컨트롤: 아래점프 삭제 + 액션키 설정값화 (`PlayerInputSetup.mlua`)

현재: `OnBeginPlay`에서 화살표 액션을 WASD로 복사(하드코딩).

변경:
- WASD 키를 `_PlayerConfig.KeyLeft/Right/Up/Down` 문자열에서 읽어 매핑. 문자열→`KeyboardKey` 변환은 **작은 룩업 헬퍼**(예: `PlayerInputSetup` 내부 로컬 맵 `{A=KeyboardKey.A, ...}`)로 처리. 지원 키 표에 없는 값이면 로그 경고 후 기본값 유지.
- **아래점프 삭제** (play 검증으로 확정된 방법): `_PlayerConfig.EnableDownJump == false`이면 `pc:RemoveAllActionKeyByActionName("MoveDown")` 호출.
  - **근본 원인**: DefaultPlayer는 `S` 키를 **`MoveDown` 액션**으로 기본 매핑. 아래점프는 "MoveDown(down) 액션이 활성 + Jump" 조합으로 발동. 따라서 특정 키(예: `DownArrow`) 하나만 `RemoveActionKey`하면 `S=MoveDown`이 남아 실패한다(실측 확인). **액션명 `MoveDown`을 전 키에서 제거**해야 down 입력 자체가 사라져 아래점프가 성립 불가.
  - `ActionDownJump()` 오버라이드(공식 문서 방식)는 **sealed 멤버라 LSP가 차단** → 사용 불가. `PlayerControllerComponent` 상속·교체 방식은 Global 모델 변경이 필요해 배제.
  - 검증: OnBeginPlay 후 `GetActionName(KeyboardKey.S)`가 빈값, `Jump`/`MoveLeft`/`MoveRight`는 유지됨(일반 이동/점프 무영향).

### 3.5 데이터 흐름 (변경 후)

```
[기획자] PlayerConfig @Logic 인스펙터  ─┐
                                        │ (인스펙터 편집 / 스크립트 기본값)
   _PlayerConfig.*  ◄────────────────────┘
      ├─ (server) GameStateManager.StartRun()  : MaxLives/AttackStat 산출 (+메타보너스)
      ├─ (server) PlayerCombat/Dash/Items/Ability : 데미지·쿨다운·대시·능력
      ├─ (client) GizmoManager/CombatGizmo        : 디버그 표시 치수
      └─ (client) PlayerInputSetup                : 키 매핑 + 아래점프 on/off
```

---

## 4. 리스크 / 완화

| 리스크 | 완화 |
|---|---|
| `_PlayerConfig` 전역 미해결(@Logic 자동 전역 등록 실패) | `@Logic`은 `_ScriptName` 전역 자동 생성(GameConstants와 동일 패턴). refresh 후 build 로그 확인 |
| 치환 누락(일부 `_GameConstants.X` 잔존) | 이관 property별 grep으로 잔존 0 확인. 이관 후 GameConstants에서 제거하면 미치환 시 **빌드/런타임 에러로 즉시 노출**(안전망) |
| 아래점프 액션 이름 오인 → 삭제 안 됨(무증상) | play 모드에서 down+jump 실제 입력으로 검증(사용자가 full 스코프 + play 검증 선택) |
| 문자열→KeyboardKey 변환 실패 | 미지원 키는 로그 경고 + 기본 키 유지(안전 기본값) |

---

## 5. 검증 (Verify)

1. `refresh` 후 build 로그에 `PlayerConfig` 컴파일 에러/`_PlayerConfig` 미정의 없음.
2. 이관한 각 property에 대해 `_GameConstants.<name>` 잔존 grep = 0.
3. `play` →
   - 공격/대시/능력/아이템 데미지가 이전과 동일하게 동작(로그의 dmg 값 대조).
   - 목숨/공격 스텟이 런 시작 시 정상(`GameStateManager` 로그).
   - **down+jump 입력 시 아래점프가 발생하지 않음**(EnableDownJump=false).
   - WASD 이동 정상.
4. `PlayerConfig` 인스펙터에서 `BaseAttack` 등 값 변경 → play에서 반영 확인(1건 스팟체크).

---

## 6. 후속 작업 (이번 스코프 밖)

- **Enemy/Monster**: 적 `.model`은 RootDesk(쓰기 가능)에 있고, 적 스텟은 적 자신의 컴포넌트(`EnemyMelee`/`EnemyRanged`/`BossController` 등)만 읽는다(전역 매니저가 읽지 않음). → 적은 **모델에 붙는 `EnemyStats` 컴포넌트**(모델 인스펙터에서 편집)가 적합. 소비 패턴이 달라 플레이어(@Logic)와 방식이 갈리는 것이 자연스럽다.
- 히트박스 지오메트리(`PlayerHboxHW/HH`, `PlayerCenterYOffset`)의 재배치 여부 재검토.
```

