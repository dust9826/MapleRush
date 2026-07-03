# 적 튜닝 컴포넌트화 + 원거리 3단계 조준 — 설계 문서

- **날짜**: 2026-07-04
- **배경**: 기획자가 적 수치를 적별로 쉽게 조절하도록, 아직 전역(`GameConstants`)에 남은 적 값을 각 적 컴포넌트 property로 이관한다. 겸해 원거리 적의 조준을 **조준(추적)→확정(고정)→공격** 3단계로 재설계해 각 시간을 튜닝 가능하게 한다.
- **스코프**: 일반 적 3종(`EnemyMelee`/`EnemyRanged`/`EnemyChaser`) + 공통(`EnemyHealth`). **보스(`BossController`)는 이번 스코프 밖**(피격박스는 자동 적용됨).

---

## 1. 현재 상태 (배경)

적 튜닝은 이미 상당 부분 per-entity 컴포넌트 property다:
- `EnemyHealth`: `MaxHP`, `HitStunDuration`, `DeadAnimDelay`, `EnemyKind`, `Species`
- `EnemyMelee`: `DetectRadius`, `AttackRadius`, `WindupTime`, `AttackCooldown`, `AttackParryable`
- `EnemyRanged`: `DetectRadius`, `AimTime`, `FireCooldown`, `ProjectileParryable`
- `EnemyChaser`: `ChaseSpeed`, `DetectRange`, `HitSource`
- `EnemyAnimSet`: 상태별 클립 RUID 7종

**아직 전역(GameConstants)이라 적별로 못 바꾸는 값**: 이동속도(`EnemyChaseSpeed`), 근접 공격박스 치수(`EnemyMeleeBoxForward/Height`), 원거리 투사체 속도(`ProjectileSpeed`).

**피격박스(hurtbox)**: `CombatPrimitives.HurtboxOf`가 이미 네이티브 **`HitComponent.BoxSize` + `ColliderOffset`**를 1순위로 사용(없을 때만 전역 `EnemyHboxHW/HH` 폴백). 즉 피격박스는 **이미 인스펙터+에디터 박스로 편집 가능** — 커스텀 앵커 불필요.

---

## 2. 목표 / 비목표

**목표**
- 남은 전역 적 값을 각 적 컴포넌트 property로 이관(적별 인스펙터 편집).
- 원거리 적: 조준을 `TrackTime`(추적) + `LockedTime`(고정) 2구간으로 분리, 각 시간 튜닝 가능. `TrackTime=0`이면 즉시 고정(현재 동작).
- 피격박스는 네이티브 `HitComponent` 활용(신규 앵커 없음), 각 모델 값 확인.
- 근접 공격박스는 **자식 앵커(`AtkBox`)로 시각 배치**(없으면 숫자 폴백).
- 죽은 레거시 상수 제거.

**비목표**
- 보스 수치/패턴 컴포넌트화(후속).
- 잡몹 공격 데미지 가변화 — 현행 "1피격 고정" 유지(향후 `AttackDamage` property로 사소하게 추가 가능).
- 원거리 예고 레인 크기(`GizmoRangedLaneLength/Width`) per-enemy화 — 보스·플레이어 아이템 조준·CombatGizmo가 공유하므로 **전역 유지**.

---

## 3. 설계

### 3.1 EnemyMelee — property 추가 + 전역 치환
추가 property (기본값 = 현재 전역값):
```
property number MoveSpeed = 2.0          -- (← EnemyChaseSpeed)
property number AttackBoxForward = 2.0   -- (← EnemyMeleeBoxForward)
property number AttackBoxHeight = 1.5    -- (← EnemyMeleeBoxHeight)
```
치환:
- `ChaseToward`: `mc.InputSpeed = _GameConstants.EnemyChaseSpeed * timeScale` → `self.MoveSpeed * timeScale`
- 공격 박스: `_GameConstants.EnemyMeleeBoxForward` → `self.AttackBoxForward`, `_GameConstants.EnemyMeleeBoxHeight` → `self.AttackBoxHeight` (RegisterEnemyAttackBox + TelegraphService:Show 두 곳)

### 3.2 EnemyRanged — 3단계 조준 재설계 + property
**property 변경**:
```
-- 제거: property number AimTime = 1.0
property number TrackTime = 0.3    -- 조준(추적): 방향이 플레이어를 따라감. 0이면 즉시 고정.
property number LockedTime = 0.7   -- 확정 후 발사까지: 방향 고정 + 예고 레인 표시.
property number MoveSpeed = 2.0        -- (← EnemyChaseSpeed)
property number ProjectileSpeed = 10.0 -- (← 전역 ProjectileSpeed; 전역은 보스/플레이어용으로 유지)
```
**동작 로직** (aim 사이클):
- aim 진입 시 `cycleTimer = TrackTime + LockedTime`. `aimLocked = false`.
- 매 프레임 `aimElapsed = (TrackTime + LockedTime) - cycleTimer`:
  - **추적 구간** (`aimElapsed < TrackTime`): `AimDirX/Y`를 플레이어 방향으로 매 프레임 갱신, `IsAiming=true`, `aimLocked=false`. (CombatGizmo 레인이 따라옴)
  - **고정 시점** (`aimElapsed >= TrackTime` && `aimLocked==false`): `AimDir` 현재값으로 동결, `aimLocked=true`, `TelegraphService:Show(... 지속시간=LockedTime ...)` 호출(레인 크기는 전역 `GizmoRangedLaneLength/Width` 유지).
  - **고정 구간**: `AimDir` 불변.
- `cycleTimer <= 0` → `Fire` (투사체 속도 `self.ProjectileSpeed`), `cooldown` 전환.
- 기존 `self.AimTime` 참조(초기화/리셋/감지이탈 판정/Show)는 모두 `TrackTime + LockedTime` 또는 위 로직으로 대체.
- 이동: `ChaseToward`의 `EnemyChaseSpeed` → `self.MoveSpeed`.

경계: `TrackTime=0` → 첫 프레임 즉시 고정(현재와 동일). `LockedTime=0` → 추적 후 즉발.

### 3.2b EnemyMelee 공격박스 — 자식 앵커로 시각 배치 (앵커 우선 / 숫자 폴백)
근접 공격박스를 에디터에서 눈으로 배치하도록 자식 앵커를 사용한다. `EnemyAnimSet`의 "지정하면 override, 없으면 폴백" 패턴을 따른다.
- 근접 적 모델 하위에 자식 엔티티 **`AtkBox`** 배치(적 기준 로컬, 앞쪽 오른쪽 향 기준). `TransformComponent`의 **로컬 위치 = 공격 중심 오프셋**, **Scale = 박스 크기(x=폭, y=높이)**. 에디터에서 위치/크기를 시각적으로 조정.
- 런타임(windup 시): `self.Entity:GetChildByName("AtkBox", false)` 조회(캐시). 있으면 로컬 위치·Scale을 읽어 **facing으로 x 미러**해 박스 계산:
  - `boxCenter = enemyCenter + Vector2(facingX * math.abs(localOffset.x), localOffset.y)`
  - `hw = math.abs(scale.x) * 0.5`, `hh = math.abs(scale.y) * 0.5`
- **폴백**: `AtkBox` 자식이 없으면 §3.1의 숫자 property(`AttackBoxForward`/`AttackBoxHeight`)로 계산(기존 로직). → 앵커는 선택적 override.
- 판정은 기존과 동일하게 `RegisterEnemyAttackBox` + `TelegraphService:Show`에 이 center/hw/hh 전달. 즉 **판정 파이프라인은 그대로, "박스 치수의 출처"만 앵커/숫자로 이원화**.
- 런타임에 `AtkBox` 스프라이트는 숨김(에디터 배치용 마커). 무형 엔티티 + Scale만 써도 되고, 반투명 박스 스프라이트를 두고 런타임 Hide해도 됨(구현 시 결정).

### 3.3 EnemyChaser — 변경 없음
`ChaseSpeed`/`DetectRange` 이미 보유. 접촉 히트박스는 `HurtboxOf`→`HitComponent`로 자동 per-entity.

### 3.4 피격박스 — 네이티브 HitComponent
- `HurtboxOf`가 이미 `HitComponent.BoxSize`/`ColliderOffset` 사용. **코드 변경 없음.**
- 각 적 모델(`RootDesk/MyDesk/Models/Enemies/*.model`)의 `HitComponent.BoxSize`가 유의미한 값인지 **ModelBuilder로 확인**, 0이면 적별로 세팅(= 기획자 시각 편집 지점). `ColliderOffset`으로 중심 오프셋.
- 전역 `EnemyHboxHW/HH`는 폴백으로 잔존(안전망).

### 3.5 GameConstants 정리
**이관 완료 후 제거**(잔여 소비처 0 확인 후):
- `EnemyMeleeBoxForward`, `EnemyMeleeBoxHeight` (→ EnemyMelee)
- `EnemyChaseSpeed` (→ Melee/Ranged MoveSpeed)
- 죽은 레거시(소비처 0): `EnemyMoveSpeed`, `MeleeEnemyHP`, `RangedEnemyHP`, `RangedAimTime`, `RangedFireCooldown`

**유지**(공유 소비처 존재): `GizmoRangedLaneLength/Width`(보스·플레이어아이템·CombatGizmo), `ProjectileSpeed`(보스·플레이어), `EnemyHboxHW/HH`(hurtbox 폴백).

---

## 4. 리스크 / 완화
| 리스크 | 완화 |
|---|---|
| 이관 property 기본값이 현재 전역값과 달라 밸런스 변동 | 기본값을 현재 전역값과 **동일**하게. 총 조준시간 `TrackTime+LockedTime=1.0`으로 현행 유지 |
| 전역 상수 제거 시 미치환 잔존 → 컴파일/런타임 에러 | 이관 property별 grep 잔존 0 확인 후 제거. 제거하면 미치환 시 즉시 에러로 노출(안전망) |
| 모델 `HitComponent.BoxSize`가 0이면 폴백 상수로 동작(시각 편집 무효) | 구현 시 ModelBuilder로 각 모델 확인, 0이면 세팅 |
| 원거리 추적→고정 전환 버그(즉시고정/무한추적) | play로 `TrackTime` 0 / 0.3 / 큰 값 각각 검증. 로그로 lock 시점 확인 |

## 5. 검증
1. `refresh` 후 build 에러 0.
2. 이관 property별 `_GameConstants.<name>` 잔존 grep = 0.
3. `play`:
   - 근접: 이동/공격박스가 컴포넌트 값대로. 인스펙터에서 `MoveSpeed`/`AttackBoxForward` 변경 반영(스팟체크).
   - 원거리: **앞 30%는 조준이 플레이어를 따라오다가, 이후 고정되어 안 따라옴**(로그로 lock 시점 + 위치 확인). `TrackTime=0`이면 즉시 고정.
   - 피격박스: 플레이어 공격이 `HitComponent.BoxSize` 범위에서 적중(기즈모로 확인).
4. 모델 인스펙터에서 적별 값이 독립적으로 먹히는지 1종 스팟체크.

## 6. 후속 — 다음 스펙 (스코프 밖)

### 6.1 투사체 데이터 드리븐 + 예고 자동 계산 (별도 스펙 예정)
> 규모가 있어 이번 스펙과 분리. 방향만 확정하고 상세는 다음 설계 문서에서.

- **투사체를 authored 타입으로**: 각 투사체 종류를 `.model`(또는 카탈로그 데이터)로 정의 — `Speed`, `Lifetime`, `HitRadius`, 예고 폭, 스프라이트/거동. (`Projectile`은 이미 `Speed/Lifetime/Damage/Parryable` property 보유 → 토대 존재.)
- **적이 투사체를 선택**: `EnemyRanged.ProjectileModelId`(문자열, 기본 `"enemyprojectile"`) — `EnemyAnimSet`처럼 참조. 발사 시 그 모델을 스폰.
- **예고를 투사체 정보로 계산**: 원거리 예고 레인 = 투사체의 `Speed × Lifetime`(사거리) × `HitRadius`(폭)에서 도출 → 예고가 실제 투사체 비행과 일치. (현재 전역 상수 레인 대체.)
- **미해결 결정(다음 스펙에서)**: 투사체 스펙의 출처 — (a) 투사체 모델의 `Projectile` 컴포넌트 defaults(스폰-투-리드 문제), (b) 투사체 카탈로그 `.userdataset`(적·예고 공용 조회, 가장 데이터 드리븐), (c) 적이 스펙 보유 후 스폰 투사체에 주입(가장 단순, 예고=실제 보장). → 카탈로그(b) 유력.

### 6.2 기타 후속
- 보스 수치(전역 `BossHP`)·공격패턴 박스 치수·그로기 게이지 컴포넌트화(보스도 `AtkBox` 앵커 확장 가능).
- 잡몹 `AttackDamage`(피격당 목숨 감소량) per-enemy화.
