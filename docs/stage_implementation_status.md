# 스테이지 기획서(ver3) 구현 현황 정리

> **문서 목적**: `stage_design_doc_ver3.md`의 각 기능이 현재 코드베이스에 얼마나 구현되어 있는지를 정리한다.
> **기준 문서**: `stage_design_doc_ver3.md` (2025-06 ver3)
> **조사 일자**: 2026-06-14
> **조사 범위**: `RootDesk/MyDesk/**/*.mlua`(35개), `RootDesk/MyDesk/Models/**/*.model`(6개), `ui/*.ui`(10개), `map/*.map`(2개)
> **진행도 표기**: ✅ 완료 / 🟡 부분 / ⬜ 미구현(플레이스홀더 포함)

---

## 0. 한눈에 보는 요약

| 영역 | 진행도 | 핵심 미완 사항 |
|---|:---:|---|
| 1. 적 종류 및 행동 로직 | **95%** | 보스 공격 패턴이 더미 3종 고정(가변 풀·실제 패턴 미정) |
| 2-1. 층(Floor) 진행 구조 | **90%** | 테마 2는 자리표시자, 노드 3분기 데이터 라우팅 단순화 |
| 2-2. 일반 스테이지 | **80%** | **맵 풀(20개+) 미구현 — map01 고정**, 직전 맵 중복 방지 미적용 |
| 2-3. 상점 스테이지 | **100%** | (서버·UI 모두 구현 완료) |
| 2-4. 보스 스테이지 | **95%** | 보스 전용 맵 분리 없이 동일 전투맵 사용 추정 |
| 3. 스테이지 보상 | **100%** | (메소 확정/확률 보상/일회성 아이템 3종 완료) |
| 4. 게임 클리어·메타 진행 | **70%** | **메타 진행 트리 UI 미구현(점수 소모 불가)**, 능력 사전 획득 트리 없음 |

> **전체 체감 완성도: 약 90%.** 전투·스테이지·상점·보상의 런타임 로직은 거의 완성. 남은 핵심 작업은 **(1) 일반 스테이지 맵 풀 제작·랜덤 선택**, **(2) 메타 진행 트리 UI**, **(3) 보스 실제 공격 패턴 기획·구현**의 3가지다.

---

## 1. 적 종류 및 행동 로직

### 1.2 근거리 적 — ✅ 완료

| 기능 | 진행도 | 근거 |
|---|:---:|---|
| 대기/추격/공격/복귀 상태머신 | ✅ | `EnemyMelee.mlua` `aiState`("idle"/"windup"/"cooldown"), 추격·복귀 전환 로직 |
| 감지 범위(반지름 3) | ✅ | `EnemyMelee.mlua` `DetectRadius = 3.0` |
| 공격 범위(반지름 1) | ✅ | `EnemyMelee.mlua` `AttackRadius = 1.0` |
| `parryable` 플래그 | ✅ | `EnemyMelee.mlua` `AttackParryable = true` |
| 낭떠러지 정지(Raycast/Foothold) | ✅ | `EnemyMelee.mlua` `ChaseToward()` — `FootholdComponent:Raycast` 발판 끝 감지 |

### 1.3 원거리 적 — ✅ 완료

| 기능 | 진행도 | 근거 |
|---|:---:|---|
| 추격 이동 | ✅ | `EnemyRanged.mlua` `ChaseToward()` |
| 감지 범위(반지름 5) | ✅ | `EnemyRanged.mlua` `DetectRadius = 5.0` |
| 조준 1초 → 발사 → 쿨타임 1초 사이클 | ✅ | `EnemyRanged.mlua` `cyclePhase`, `AimTime`/`FireCooldown` |
| 투사체 발사 | ✅ | `EnemyRanged.mlua` `Fire()` — `enemyprojectile` 스폰 후 `Launch()` |
| 낭떠러지 정지 | ✅ | `EnemyRanged.mlua` `ChaseToward()` (근거리와 동일) |

### 1.3.2 투사체 — ✅ 완료

| 기능 | 진행도 | 근거 |
|---|:---:|---|
| 속도 10 | ✅ | `GameConstants.mlua` `ProjectileSpeed = 10.0` |
| 히트박스 반지름 0.2 | ✅ | `GameConstants.mlua` `RadiusProjectile = 0.2` |
| 직선 이동 | ✅ | `Projectile.mlua` `OnUpdate()` — `Translate(DirX, DirY)` |
| 벽/플레이어 충돌 소멸 | ✅ | `Projectile.mlua` `OnUpdate()` — Raycast 벽 충돌 + 플레이어 충돌 시 `Destroy()` |
| `parryable` 플래그 | ✅ | `Projectile.mlua` `Parryable` 속성 |
| 반사 데미지 공격력×200% | ✅ | `Projectile.mlua` `Reflect()` + `CombatPrimitives`/`PlayerCombat` `DmgReflectPct` |

### 1.4 보스 — 🟡 부분

| 기능 | 진행도 | 근거 / 비고 |
|---|:---:|---|
| 공격 패턴 풀(랜덤 선택) | ✅ | `BossController.mlua` `StartPattern()` — `RandomIntegerRange(1,3)` 랜덤 선택 |
| 근/원거리 혼용 | ✅ | slam·redSmash(근접) / tripleShot(원거리 3연사) |
| 패턴 간 딜레이 | ✅ | `BossController.mlua` `ResolvePattern()` → `BossPatternDelay`(1.5s) |
| **가변 패턴 풀(3~5개)·실제 패턴 목록** | 🟡 | **더미 3종 고정**(slam/tripleShot/redSmash). 기획상 "구현 시 더미 2~3개 플레이스홀더 권장" 충족하나, 가변 개수 시스템과 실제 보스 패턴은 기획 미정(기획서 §1.4.3 "미정") |

### 1.4.2 보스 그로기 시스템 — ✅ 완료

| 기능 | 진행도 | 근거 |
|---|:---:|---|
| 게이지 최대치 = 보스 최대HP × 1/5 | ✅ | `GroggyGauge.mlua` `OnBeginPlay` `GaugeMax = MaxHP × GroggyGaugeRatio(0.2)` |
| 일반 공격 명중 충전 | ✅ | `EnemyHealth.mlua` `TakeDamage()` — 데미지량만큼 충전 |
| 패링 2배 충전 | ✅ | `EnemyHealth.mlua` — reflect 시 `ATK × GroggyParryMult(2.0)` |
| 초당 2% 자동 감소 | ✅ | `GroggyGauge.mlua` `OnUpdate()` — `GaugeMax × GroggyDecayPerSec(0.02) × delta` |
| 100% → 3초 그로기 | ✅ | `GroggyGauge.mlua` `Charge()` — `ServerElapsedSeconds + GroggyDuration(3.0)` |
| 서버 권위(@Sync) | ✅ | `Gauge`/`GaugeMax`/`IsGroggy` @Sync, 충전·감소 ServerOnly |
| ServerElapsedSeconds 기준 | ✅ | `GroggyGauge.mlua` `groggyEndAt` = `ServerElapsedSeconds` 기반 |
| 섬광탄 5초 감소 정지(충전 가능) | ✅ | `BattlefieldFx.mlua` `ActivateStun()` + 그로기 감소 정지 연동 |

### 적 스폰/카운터 — ✅ 완료

| 기능 | 진행도 | 근거 |
|---|:---:|---|
| 일괄 스폰 | ✅ | `StageManager.mlua` `ResetStage()` — composition 순회 일괄 스폰 |
| 스폰/처치 카운터, 일치 시 클리어 | ✅ | `SpawnedCount`/`KilledCount`, `OnEnemyKilled()` → `StageClear()` |

---

## 2. 스테이지 구조

### 2.2 층(Floor) 진행 — 🟡 부분

| 기능 | 진행도 | 근거 / 비고 |
|---|:---:|---|
| 테마팩 선택(미플레이만 표시) | ✅ | `FloorManager.mlua` `ShowThemeSelect()` — `usedThemes` 필터 |
| 노드맵(일반 N회 → 상점 → 보스) | ✅ | `FloorManager.mlua` `NextNode()` — phase 순차 진행 |
| 1층 4회 / 2층 5회 | ✅ | `GameConstants.mlua` `Floor1NormalStages=4`, `NormalStagesForFloor()` = `4+(floor-1)` |
| 보스 처치 → 다음 층 테마 선택 | ✅ | `FloorManager.mlua` `OnStageRewardDone()` — `CurrentFloor+=1`, phase="theme" |
| 3분기 1택 노드 | 🟡 | UI·선택은 구현되나 3분기 모두 일반 스테이지로 라우팅(기획상 "임시 구현" 명시 — 충족). 분기별 맵 배정 데이터는 맵 풀 미구현으로 미연동 |
| **테마 2종 구현** | 🟡 | 테마 1(오르비스→엘나스→폐광) 식별자만 존재, **테마 2는 자리표시자**(기획서도 "미정"). 배경·지역·맵 구성 미정 |

### 2.3 일반 스테이지 — 🟡 부분

| 기능 | 진행도 | 근거 / 비고 |
|---|:---:|---|
| 클리어 조건(모든 적 처치) | ✅ | `StageManager.mlua` `StageClear()` — `KilledCount >= SpawnedCount` |
| 일괄 스폰 | ✅ | `ResetStage()` |
| 사망 시 목숨 -1 재시작 | ✅ | `OnPlayerDeath()` — `CurrentLives -= 1` 후 `ResetStage()` |
| 목숨 0 → 게임 오버 | ✅ | `OnPlayerDeath()` — `GameOver()` |
| 단일 초기화 함수(A-5) | ✅ | `ResetStage()` — 잔존 적·투사체 소멸, 슬로우 해제, 카운터·플레이어·능력 초기화 일괄 처리 |
| **20개+ 맵 풀 랜덤 선택** | ⬜ | **미구현**. `GetMap()`이 `/maps/map01` **고정 반환**, 주석에 "Phase 8에서 랜덤 풀로 확장" 명시. 맵은 `map01`/`map02` 2개만 존재 |
| **직전 맵 중복 방지** | ⬜ | 맵 풀 미구현으로 미적용 |
| SectorConfig 등록·맵 네이밍 규칙 | ⬜ | 맵 풀 작업과 함께 필요(C-4 항목 미착수) |

### 2.4 상점 스테이지 — ✅ 완료

| 기능 | 진행도 | 근거 |
|---|:---:|---|
| 4종 품목(최대목숨 100/스탯 50/능력 150/아이템 40) | ✅ | `ShopManager.mlua` `RequestBuyMaxLife/Stat/Ability/Item()`, 가격 상수 `GameConstants` |
| 구매 확인 팝업 | ✅ | `ShopController.mlua` UI + `UIPopup` 확인 플로우 |
| 가격 2배 갱신·무한 갱신 | ✅ | 각 `RequestBuy*()` — `min(price*2, MesoCap)` |
| 나가기 버튼 → 보스 진행 | ✅ | `FloorManager.mlua` `RequestLeaveShop()` → `NextNode()` |
| 메소 부족 처리 | ✅ | `SpendMeso()` 실패 시 구매 취소 |
| 메소 캡(4,294,967,295) 오버플로우 방지 | ✅ | `GameConstants.MesoCap`, `ClampMeso()`, 가격 갱신 시 클램프 |

### 2.5 보스 스테이지 — 🟡 부분(거의 완료)

| 기능 | 진행도 | 근거 / 비고 |
|---|:---:|---|
| 클리어 조건(보스 처치) | ✅ | `BossController`/`StageManager` 연동 |
| 사망 처리(목숨 -1, 게임오버) | ✅ | 일반 스테이지와 공통 `OnPlayerDeath()` |
| 재시작 시 보스 HP·그로기 초기화(단일 초기화) | ✅ | `ResetStage()` 보스 적용 |
| 능력 사용 횟수 보스 기준(2회) | ✅ | `PlayerAbility.mlua` `ResetUses()` — boss 시 2회 |
| 보상 후 다음 층/클리어 전환 | ✅ | `FloorManager.mlua` `OnStageRewardDone()` |
| 보스 전용 맵 분리 | 🟡 | `GetMap()`이 map01 고정 → 보스 전용 맵 분리 미확인(맵 풀 작업과 함께 정리 필요) |

---

## 3. 스테이지 보상 — ✅ 완료

| 기능 | 진행도 | 근거 |
|---|:---:|---|
| 메소 100% 확정 지급 | ✅ | `StageManager.mlua` `StageClear()` — `AddMeso()` 무조건 |
| 메소 공식(일반 ×10 / 보스 ×150) | ✅ | `GameConstants` `MesoPerClear` 계열 |
| 스탯 50% / 아이템 70% / 능력 15% 독립 판정 | ✅ | `RewardManager.mlua` `RollRewards()` — 독립 확률 롤 |
| 보스 보상 전체 제시 | ✅ | `RollRewards()` — boss 시 `{stat,item,ability}=true` |
| 일회성 아이템 3종(짱돌/연막탄/섬광탄) | ✅ | `RewardManager.mlua` `ClaimItemReward()` 풀 + `PlayerItems:GrantItem()` |
| 짱돌(ATK×300% 투사체) | ✅ | `PlayerItems.mlua` `RequestUseItem()` — rock 분기, `DmgRockPct` |
| 연막탄(3배 범위 5초 은신) | ✅ | `PlayerItems` → `BattlefieldFx:ActivateSmoke()` |
| 섬광탄(화면 내 전 적 3초 기절) | ✅ | `PlayerItems` → `BattlefieldFx:ActivateStun()` |
| 보상 UI(선택 수령/버리기) | ✅ | `RewardController.mlua` |

---

## 4. 게임 클리어 보상 및 메타 진행 — 🟡 부분

| 기능 | 진행도 | 근거 / 비고 |
|---|:---:|---|
| 점수 공식(일반 클리어수 + 보스×3) | ✅ | `FloorManager.mlua` `GameClear()` — `NormalClears + BossClears*3` |
| 점수 상한 65,535 클램프 | ✅ | `MetaProgression.mlua` `AwardScore()`, `GameConstants.ScoreCap` |
| DataStorage 영구 저장 | ✅ | `MetaProgression.mlua` `LoadFor()`/`AwardScore()` — `GetUserDataStorage` + `SetAsync` |
| 영구 스탯 보너스 자동 적용 | ✅ | `MetaProgression.GetBonusAttack()`, `GameStateManager.StartRun()`에서 적용 |
| 게임 클리어 화면 | ✅ | `GameClearController.mlua` — 점수 표시 + 새 런 시작 |
| **메타 진행 트리 UI(점수 소모)** | ⬜ | **미구현 — 플레이스홀더**. 점수는 적립·저장되나 유저가 소모해 영구 강화를 선택하는 트리 UI 없음(`MetaProgression.mlua` 주석 "메타 트리 UI는 플레이스홀더") |
| **능력 사전 획득/강화 트리** | ⬜ | 미구현(메타 트리 UI 의존). 런 중 보상으로 능력 획득은 가능 |
| 영구 스탯 강화 5종 선택 | ⬜ | 공격력 보너스 자동 적용 외, 유저 선택 강화는 트리 UI 미구현으로 불가 |

---

## 5. 미구현·우선 작업 정리

### ⬜ 미구현 (착수 필요)

1. **일반 스테이지 맵 풀** — 최소 20개 맵 제작, `StageManager.GetMap()` 랜덤 선택 로직, 직전 맵 중복 방지, `SectorConfig.config` 등록, 테마/네이밍 규칙(C-4). *현재 map01 고정, map01/map02 2개만 존재.*
2. **메타 진행 트리 UI** — 점수 소모 → 영구 스탯/능력 강화 선택 화면. 점수 적립·저장·자동 보너스는 이미 동작.
3. **능력 사전 획득/강화 트리** — 위 메타 UI에 종속.

### 🟡 부분 구현 (기획 확정 후 확장)

4. **보스 실제 공격 패턴** — 현재 더미 3종(가변 풀 시스템·실제 패턴 미정, 기획서도 "미정"). 보스 확정 후 패턴 작성 필요.
5. **테마 2** — 자리표시자(배경·지역·맵 미정, 기획서도 "미정").
6. **분기 노드별 맵 배정** — 3분기 모두 일반 스테이지로 단순 라우팅(맵 풀 완성 시 분기별 맵 배정 데이터 연동).
7. **보스 전용 맵 분리** — 현재 전투맵 공유 추정, 맵 풀 작업 시 정리.

### ✅ 완료 영역

- 근거리/원거리 적 AI 전체, 투사체, 그로기 시스템(서버 권위)
- 층 진행 골격(테마 선택→노드→상점→보스→다음층), 단일 초기화 함수
- 상점 시스템 전체, 보상 시스템 전체(확률·일회성 아이템 3종)
- 게임 클리어 점수 적립·저장, 플레이어 전투/패링/대시/슬로우모션/아이템/능력, 입력 라우팅, HUD 및 주요 UI 컨트롤러

---

## 부록: 조사된 코드 자산 목록

- **스크립트(35)**: Core(5), Enemy(7), Player(9), Stage(5), Shop(1), Meta(1), UI(7+UIPopup/UIToast)
- **모델(6)**: Enemies(Melee/Ranged/Boss/TrainingDummy), Projectiles(EnemyProjectile), Effects(DashAimPreview)
- **UI(10)**: HUD/Default/Reward/Popup/GameOver/Toast/NodeSelect/Shop/ThemeSelect/GameClear
- **맵(2)**: map01, map02 (둘 다 `TileMapMode = 0` MapleTile, Foothold 구조)
