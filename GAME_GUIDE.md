# MapleRush — 게임 구조 & 조작 가이드

MapleStory Worlds(MSW) 기반의 **사이드뷰 액션 로그라이트** 데모입니다.
한 판은 `일반 스테이지 2회 → 상점 → 보스 → 클리어` 순서로 진행됩니다.

---

## 1. 게임 개요

- **장르**: 사이드뷰(MapleTile) 액션. 플레이어는 점프/이동하며 근접·원거리 적과 보스를 처치합니다.
- **핵심 규칙**: 플레이어는 **피격 1회 = 사망**(1-hit). 단, 대시 무적(i-frame)·능력 무적으로 회피합니다.
- **목숨(Lives)**: 스테이지마다 최대치로 회복. 0이 되면 게임 오버.
- **진행**: 스테이지 클리어 시 메소 + 보상(스탯/아이템/능력)을 획득하고 다음 스테이지로 진행.
- **서버 권위**: 전투 판정·스폰·진행은 모두 서버에서 처리하고 클라이언트는 입력/표시만 담당합니다.

---

## 2. 한 판의 전체 흐름

```
플레이어 입장
   │ PlayerBootstrap → StageManager:OnPlayerReady
   ▼
런 시작 (GameStateManager:StartRun) ── 목숨/공격력/메타보너스 초기화
   │
   ▼
테마 선택  (ThemeSelectGroup UI)
   │ RequestSelectTheme
   ▼
┌──────────────────────────────────────────────┐
│  노드 진행 루프 (FloorManager:NextNode)        │
│                                                │
│   일반 스테이지 #1  → map02  (랜덤 적 3~4기)   │
│        클리어 → 보상 UI → 계속                  │
│   일반 스테이지 #2  → map02  (랜덤 적 3~4기)   │
│        클리어 → 보상 UI → 계속                  │
│                                                │
│   상점          → map04  (적 없음, 구매)        │
│        나가기 →                                 │
│                                                │
│   보스 스테이지  → map03  (보스 1기, HP 500)    │
│        클리어 → 보상 UI → 계속                  │
└──────────────────────────────────────────────┘
   │ OnStageRewardDone("boss") + CurrentFloor ≥ MaxFloors(1)
   ▼
게임 클리어  (GameClearGroup UI, 메타 점수 적립)
```

- **스테이지 판정**: 스폰된 적 수(`SpawnedCount`)와 처치 수(`KilledCount`)가 같아지면 클리어.
- **사망 처리**: 목숨이 남아 있으면 현재 스테이지 재시작, 0이면 게임 오버(GameOverGroup UI).
- **진행 횟수**: `GameConstants.Floor1NormalStages = 2` (일반 2회), `MaxFloors = 1` (보스 클리어 시 종료).

---

## 3. 맵 구성

| 맵 | 역할 | 비고 |
|----|------|------|
| `map01` | 시작/로비 맵 (스테이지 흐름 미사용) | 입장 직후 위치, 테마 선택 후 자동으로 전투 맵으로 이동 |
| `map02` | **일반 스테이지** | 근접/원거리 적 랜덤 3~4기 |
| `map03` | **보스 스테이지** | 보스 1기 |
| `map04` | **상점 스테이지** | 적 없음, 구매 UI |

- 모든 맵은 **MapleTile(`TileMapMode = 0`)** 사이드뷰입니다 → 동적 엔티티는 `RigidbodyComponent` 사용.
- map02/03/04는 안정성을 위해 **동일한 아레나 지오메트리**(폭 약 ±10.75, 풋홀드 71개)를 공유합니다. 스테이지별로 다른 외관을 원하면 Maker에서 타일/배경만 재편집하면 됩니다(로직은 그대로 동작).
- **맵 전환**은 `PlayerComponent:MoveToMapPosition(mapId, pos)`로 이루어집니다. 스테이지 타입 → 맵 매핑은 `GameConstants:MapIdForStage()`가 담당합니다.

---

## 4. 코드 구조

스크립트는 모두 `RootDesk/MyDesk/` 아래에 있습니다. (`@Logic` = 전역 싱글톤, `@Component` = 엔티티 부착, `@Event` = 이벤트 페이로드)

```
RootDesk/MyDesk/
├── Core/                        ── 공용 기반
│   ├── GameConstants.mlua       (@Logic)  모든 튜닝 상수 + 스테이지→맵 매핑
│   ├── CombatPrimitives.mlua    (@Logic)  데미지/패링/지오메트리 판정
│   ├── InputRouter.mlua         (@Logic)  입력 → RouterActionEvent 발행 + 컨텍스트 관리
│   ├── RouterActionEvent.mlua   (@Event)  입력 액션 페이로드(action, worldPos, context)
│   └── WallClock.mlua           (@Logic)  실제 시간(슬로우모션 비영향) 스냅샷
│
├── Player/                      ── 플레이어 (런타임에 DefaultPlayer에 부착)
│   ├── PlayerBootstrap.mlua     (@Logic)  입장 시 아래 컴포넌트들을 플레이어에 부착
│   ├── PlayerCombat.mlua        (@Component) 기본 공격(원형 범위) + primary 액션 분배
│   ├── PlayerDash.mlua          (@Component) 360° 대시, 무적, 강화 대시, 잔상
│   ├── PlayerHit.mlua           (@Component) 1-hit 사망 + 무적 예외 판정
│   ├── PlayerAbility.mlua       (@Component) 능력(임시무적/투사체무효화)
│   ├── PlayerItems.mlua         (@Component) 소비 아이템 3슬롯(짱돌/연막/섬광)
│   ├── PlayerInputSetup.mlua    (@Component) WASD 이동 키 매핑
│   └── SlowMotion.mlua          (@Logic)    슬로우모션 + 적 흑백/감속 연출
│
├── Enemy/                       ── 적 / 보스
│   ├── EnemyHealth.mlua         (@Component) 체력/피격/사망 → StageManager:OnEnemyKilled
│   ├── EnemyMelee.mlua          (@Component) 근접 AI(추격→윈드업→공격)
│   ├── EnemyRanged.mlua         (@Component) 원거리 AI(조준→발사)
│   ├── Projectile.mlua          (@Component) 투사체(직선/반사/충돌)
│   ├── EnemyTestSpawner.mlua    (@Component) (구 테스트용 — 현재 맵에 미사용)
│   └── Boss/
│       ├── BossController.mlua  (@Component) 보스 패턴(슬램/3연발/적색강타)
│       └── GroggyGauge.mlua     (@Component) 보스 그로기(기절) 게이지
│
├── Stage/                       ── 스테이지/진행 오케스트레이션 (★ 핵심)
│   ├── GameStateManager.mlua    (@Logic)  런 상태(메소/목숨/공격력/클리어수) @Sync
│   ├── StageManager.mlua        (@Logic)  스테이지 시작/클리어/스폰 + 맵 전환
│   ├── FloorManager.mlua        (@Logic)  테마→일반N→상점→보스→다음층 흐름
│   ├── RewardManager.mlua       (@Logic)  보상 롤 + 수령
│   └── BattlefieldFx.mlua       (@Logic)  연막/섬광 등 전장 효과
│
├── Shop/
│   └── ShopManager.mlua         (@Logic)  상점 가격/구매(메소 차감, 가격 2배 상승)
│
├── Meta/
│   └── MetaProgression.mlua     (@Logic)  영구 점수(DataStorage 저장) + 보너스
│
└── UI/                          ── UI 컨트롤러 (각 .ui 그룹에 바인딩, @Component)
    ├── HUDController.mlua        목숨/대시/메소/능력/아이템/보스 HP 표시
    ├── ThemeSelectController.mlua  테마 선택
    ├── NodeSelectController.mlua   노드(분기) 선택
    ├── RewardController.mlua       보상 수령
    ├── ShopController.mlua         상점
    ├── GameOverController.mlua     게임 오버
    └── GameClearController.mlua    게임 클리어
```

UI 파일은 `ui/` 폴더: `HUD.ui`, `ThemeSelectGroup.ui`, `NodeSelectGroup.ui`, `RewardGroup.ui`, `ShopGroup.ui`, `GameOverGroup.ui`, `GameClearGroup.ui` 등.

---

## 5. 핵심 시스템 동작

### 5.1 스테이지 시작 & 멀티맵 전환 (`StageManager`)
1. `StartStage(type)` 호출 → 타입별 맵 id 계산(`GameConstants:MapIdForStage`).
2. 플레이어가 이미 그 맵이면 즉시 `ResetStage()`, 아니면 `MoveToMapPosition`으로 이동 후 `awaitingMap = true`.
3. `OnUpdate`(서버)가 매 프레임 폴링 → 플레이어가 대상 맵(`CurrentMap.Name`)에 도착하면 `ResetStage()` 실행.
4. `ResetStage()`: 잔존 적/투사체 제거 → 카운터 초기화 → 적 스폰 → 플레이어 위치/상태 리셋 → `StageActive = true` (1.5초 진입 유예).
5. 상점은 적 스폰 없이 맵 이동만 수행하고, 상점 UI는 `FloorManager`가 표시.

### 5.2 클리어 판정 & 진행
- 적 사망 → `EnemyHealth:Die()` → `StageManager:OnEnemyKilled()` → `KilledCount` 증가.
- `KilledCount ≥ SpawnedCount` → `StageClear()` → 메소 지급 + 보상 롤 + 보상 UI.
- 보상 UI "계속" → `RequestProceedNext()` → `FloorManager:OnStageRewardDone(type)`가 다음 노드/상점/보스/클리어로 분기.

### 5.3 전투
- **공격**: `CombatPrimitives:DamageEnemiesInCircle` (플레이어 중심 원형 범위) → 적 `TakeDamage`.
- **대시 데미지**: `DamageEnemiesAlongPath` (대시 경로상 적).
- **패링**: 노란색(파링 가능) 적 공격/투사체를 공격 타이밍에 맞춰 무효화·반사. 보스는 패링 시 그로기 게이지 충전.
- **슬로우모션**: 적 공격이 가까울 때 대시하면 발동 → 강화 대시 1회 부여.

### 5.4 보스
- 패턴: `슬램`(노랑/파링가능), `3연발`(노랑/파링가능), `적색강타`(빨강/파링불가).
- 그로기: 누적 데미지/패링으로 게이지(최대 = HP×0.2)가 차면 일정 시간 기절.

### 5.5 메타 진행
- 게임 클리어 시 점수 = `일반클리어수 + 보스클리어수×3` 적립 → DataStorage 영구 저장.
- 다음 런에서 점수에 비례해 추가 목숨/공격력 보너스 제공.

---

## 6. 조작법

> 전투 입력(공격/대시/능력/아이템)은 **Combat 컨텍스트에서만** 동작합니다. 테마/노드/상점/보상/게임오버 등 UI 화면이 떠 있는 동안에는 무시됩니다. UI 위를 클릭한 입력도 무시됩니다.

| 동작 | 키 / 입력 |
|------|-----------|
| **좌우 이동** | `A` / `D` (또는 `←` / `→`) |
| **위/아래** (사다리 등) | `W` / `S` (또는 `↑` / `↓`) |
| **점프** | `Space` (기본 제공) |
| **기본 공격** | **좌클릭 / 터치** — 플레이어 주변 원형 범위 타격 (쿨다운 0.5초) |
| **대시** | **우클릭 길게 눌러 조준 → 떼면 발사** (커서 방향). 기본 2충전, 약 2.5초마다 충전 회복. 대시 중 무적 |
| **강화 대시** | 슬로우모션 발동 중 대시하면 더 멀리·강하게 (1회) |
| **능력 사용** | **휠 클릭(가운데 버튼)** — 장착한 능력 발동(임시무적 / 투사체무효화) |
| **아이템 사용** | `1` / `2` / `3` — 해당 슬롯 아이템 사용(짱돌 / 연막탄 / 섬광탄), 커서 방향 |
| (디버그) 슬로우모션 | `G` |

### 아이템 효과
- **짱돌(rock)**: 커서 방향으로 투사체 발사 (공격력 300%).
- **연막탄(smoke)**: 일정 시간 일반 적의 감지/조준 방해.
- **섬광탄(flash)**: 일반 적 기절. 보스는 그로기 게이지 감소만 일시 정지.

### UI 화면 (마우스 클릭)
- 테마/노드/상점/보상/게임오버/게임클리어 화면의 버튼은 **실제 마우스 클릭**으로 조작합니다.

---

## 7. 주요 튜닝 상수 (`Core/GameConstants.mlua`)

| 상수 | 값 | 의미 |
|------|----|------|
| `BaseMaxLives` | 5 | 기본 최대 목숨 |
| `BaseAttack` | 10 | 기본 공격력 |
| `Floor1NormalStages` | **2** | 일반 스테이지 횟수 (데모) |
| `MaxFloors` | **1** | 총 층 수 — 보스 클리어 시 종료 (데모) |
| `MeleeEnemyHP / RangedEnemyHP / BossHP` | 30 / 20 / 500 | 적 체력 |
| `MesoPerNormalClear / MesoPerBossClear` | 10 / 150 | 클리어 메소 |
| `MapNormal / MapBoss / MapShop` | map02 / map03 / map04 | 스테이지 타입별 맵 |

> **데모 → 정식 전환**: `Floor1NormalStages`와 `MaxFloors`를 늘리면 더 긴 런이 됩니다. 일반 스테이지 적 구성은 `StageManager:RollComposition()`에서 랜덤 3~4기로 생성합니다.

---

## 8. 개발 / 디버그 팁

- **파일 변경 후**: Maker에서 `refresh`(편집 모드 전용) → 빌드 로그 확인 → `play` → 런타임 로그 확인.
- **로그**: 모든 주요 단계에 `log()`가 있어 콘솔에서 흐름 추적 가능 (`[StageManager]`, `[FloorManager]` 등 접두어).
- **흐름 강제 구동(테스트)**: UI 버튼은 시뮬레이션 입력으로 클릭할 수 없으므로, Play 중 서버 컨텍스트에서 스크립트로 직접 호출:
  ```lua
  _FloorManager:RequestSelectTheme("theme1")   -- 테마 선택
  _FloorManager:RequestSelectNode(1)           -- 노드 선택 → 일반 스테이지 시작
  _StageManager:StartStage("boss")             -- 보스 스테이지 강제 시작
  ```
- **읽기 전용**: `Global/`, `Environment/`는 수정 금지. 스크립트/모델은 `RootDesk/MyDesk/`, 맵은 `map/`, UI는 `ui/`.
```
