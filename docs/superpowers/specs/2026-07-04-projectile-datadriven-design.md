# 투사체 모델화 + 예고 자동계산 — 설계 문서

- **날짜**: 2026-07-04
- **배경**: 원거리 적이 쓰는 투사체를 **모델로 authoring**(적 추가하듯)하고, 적이 `ProjectileModelId`로 어떤 투사체를 쏠지 고르며, **투사체 모델 정보로 공격 예고(예상 레인)를 자동 계산**한다.
- **선행 의존**: `feat/enemy-tuning-components`(PR #41)의 EnemyRanged 3단계 조준. #41 병합 후 구현(이 브랜치를 master에 rebase).

## 결정 사항 (사용자 지시 반영)
1. **CSV 데이터셋 ❌ → 모델 방식 ⭕**: 투사체 타입마다 `.model`, 스펙은 그 모델의 `Projectile` 컴포넌트 값(Speed/Lifetime/HitRadius) + SpriteRenderer(스프라이트). 적 추가와 동일한 워크플로.
2. **런타임 모델-읽기 조사 결과**: 스폰 없이 modelId로 모델 defaults를 읽는 API는 **없음**(`EditorService:GetModelProperty`는 에디터 스크립트 전용 → play/배포 불가). → 예고를 실제 모델값으로 그리려면 **한 번은 스폰해서 읽어야** 한다.
3. **예고 방식 = 시작 시 프로브 캐싱**(best-judgment; 검토 시 조정): `ProjectileRegistry`가 타입당 1회 프로브 스폰→값 읽기→캐시→파괴. 이후 예고·발사는 캐시값(=모델값) 사용. 정확·즉시·매샷 스폰 없음.

## 1. 현재 상태
- `Projectile.mlua`(@Component, `enemyprojectile` 모델): `Speed`, `Lifetime`, `Damage`, `Parryable`, 히트 판정은 **전역 `_GameConstants.RadiusProjectile`**.
- `EnemyRanged.Fire`: `SpawnByModelId("enemyprojectile")` → `Launch(dir, 전역 ProjectileSpeed, 1, parryable)`.
- 예고 레인: 전역 `GizmoRangedLaneLength/Width`(고정) — 실제 투사체와 무관.

## 2. 목표 / 비목표
**목표**: 투사체 타입을 모델로 정의·선택, 예고를 투사체 모델값(속도×수명=사거리, 히트반경)에서 계산 → 예고=실제 일치.
**비목표**: 거동 다양성(유도/확산/관통/포물선) 후속. 투사체 데미지 가변 후속(현행 1피격). 보스 패턴 전면 이관 후속(동일 시스템 재사용만).

## 3. 설계

### 3.1 투사체 타입 = 모델
- 각 타입을 `RootDesk/MyDesk/Models/Projectiles/{Name}.model`로 authoring. 구성: `TransformComponent` + `SpriteRendererComponent`(스프라이트) + Body(현 enemyprojectile 따름) + `script.Projectile`(스펙 값).
- 기존 `enemyprojectile`이 첫 타입(basic). 새 타입 = 모델 복제 후 값·스프라이트 변경(적 변종 추가와 동일).

### 3.2 `Projectile.mlua` 확장
- `property number HitRadius = 0.2` 추가 → 히트 판정을 전역 `RadiusProjectile` 대신 `self.HitRadius` 사용.
- 발사: 방향만 받고 **속도/수명/반경은 모델 자기값 사용**(전역 덮어쓰기 제거).
  - 하위호환: 기존 `Launch(dir, speed, damage, parryable)`는 보스·플레이어 rock도 호출 → **유지**. 신규 `LaunchDir(dirX, dirY, parryable)`(모델 자기 Speed/Lifetime/HitRadius 사용) 추가. EnemyRanged는 `LaunchDir` 사용.

### 3.3 `ProjectileRegistry` (@Logic)
- `method any Get(string modelId, Entity mapCtx)` → `{ speed, lifetime, hitRadius, spriteRUID }`.
- **지연 캐싱**: 캐시에 없으면 `mapCtx.CurrentMap` 아래 `SpawnByModelId(modelId)`로 **미발사 프로브** 1회 스폰(Launched=false라 OnUpdate 무동작) → `Projectile` 컴포넌트 값 읽기 → 캐시 → `Destroy()`. 이후는 캐시 반환.
- 미존재/실패 시 폴백(basic) + 경고.

### 3.4 `EnemyRanged` 연동
- property: `property string ProjectileModelId = "enemyprojectile"`. (기존 `ProjectileSpeed`는 모델값으로 대체 → 제거 검토.)
- **Fire**: `SpawnByModelId(self.ProjectileModelId)` → `comp:LaunchDir(dir.x, dir.y, self.ProjectileParryable)`.
- **예고(3단계 lock 시점)**: `local spec = _ProjectileRegistry:Get(self.ProjectileModelId, self.Entity)`; 레인 길이 = `min(spec.speed * spec.lifetime, 표시상한)`, 폭 = `spec.hitRadius * k`(시각 배수). `TelegraphService:Show(...)`에 반영 → 예고=실제 사거리·크기.
- CombatGizmo의 원거리 예상 레인도 동일 spec 사용(현재 전역 상수 대체).

### 3.5 데이터 흐름
```
[기획자] 투사체 .model (Projectile 값 + 스프라이트)  ← 적 추가와 동일
        │  ProjectileRegistry:Get(modelId) (첫 조회 시 프로브 스폰·읽기·파괴, 캐시)
        ├─ EnemyRanged 예고(lock): 레인 = speed×lifetime × hitRadius
        └─ EnemyRanged 발사: SpawnByModelId(modelId) + LaunchDir → 모델 자기 스펙으로 비행/판정
```

## 4. 리스크 / 완화
| 리스크 | 완화 |
|---|---|
| 프로브 스폰이 순간적으로 보이거나 부작용 | Launched=false → 무동작·무이동, 즉시 Destroy. Projectile엔 OnBeginPlay 없음(무해). 필요시 화면밖/Visible=false |
| `Launch` 시그니처 변경이 보스/rock 깨뜨림 | 기존 `Launch` 유지 + 신규 `LaunchDir` 추가(점진) |
| 예고 레인이 화면 밖까지 길어짐(큰 사거리) | 표시 상한(DetectRadius or cap)으로 클램프 |
| 전역 `RadiusProjectile` 제거 시 타 소비처(rock/보스) | 제거 전 grep; 공유면 Projectile.HitRadius 기본값 유지로 흡수 |

## 5. 검증
1. refresh 빌드 에러 0. Registry 캐싱 로그(프로브 1회) 확인.
2. play: 원거리 발사 시 투사체 Speed/Lifetime/HitRadius/Sprite가 모델값과 일치(로그).
3. play: **예고 레인 길이·폭이 실제 투사체와 일치**(기즈모 육안 + 로그).
4. `enemyprojectile` 복제로 `fast`/`heavy` 모델 추가 → 적 `ProjectileModelId` 변경 시 예고·비행 반영(스팟체크).

## 6. 후속 (스코프 밖)
- 거동 다양성(유도/확산 N발/관통/포물선) — Behavior 값 + 타입별 이동·판정.
- 보스 패턴을 동일 시스템으로 배선.
- 투사체 데미지 per-type.
