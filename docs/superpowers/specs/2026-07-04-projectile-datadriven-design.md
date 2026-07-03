# 투사체 데이터 드리븐 + 예고 자동계산 — 설계 문서

- **날짜**: 2026-07-04
- **배경**: 원거리 적/보스가 쓰는 투사체를 **데이터로 authoring**해, 적이 "어떤 투사체를 쏠지" 고르게 하고, **투사체 정보로 공격 예고(예상 레인)를 자동 계산**한다.
- **선행 의존**: `feat/enemy-tuning-components`(PR #41)의 EnemyRanged 3단계 조준. 이 브랜치는 그 위에 쌓임 → #41 병합 후 진행.
- **best-judgment로 정한 기본 스코프(사용자 검토 시 조정)**:
  - 다양성 = **수치·외형만**(직선 비행 공통, 타입별 속도/크기/수명/스프라이트). 거동(유도/확산/관통)은 후속.
  - 스펙 저장 = **카탈로그 데이터셋**(`.userdataset` + `.csv`, SoundTable 선례). 투사체 모델은 1개(제네릭), 스프라이트는 행에서 주입 → **타입 추가 = CSV 행 추가**(새 모델 불필요).

---

## 1. 현재 상태

- `Projectile.mlua`(@Component, enemyprojectile 모델): `DirX/Y`, `Speed=10`, `Damage=10`, `Parryable`, `Lifetime=2.0`, `TerrainGrace`, 히트 판정은 **전역 `_GameConstants.RadiusProjectile`** 사용.
- `EnemyRanged.Fire`: `SpawnByModelId("enemyprojectile")` → `Launch(dir, 전역 ProjectileSpeed, 1, parryable)`.
- 예고 레인: 전역 `GizmoRangedLaneLength/Width`(고정) — **실제 투사체 사거리와 무관**.
- 즉, 투사체는 사실상 1종, 예고는 실제와 별개.

## 2. 목표 / 비목표

**목표**
- 투사체 타입을 데이터로 정의(속도/수명/히트반경/예고폭/스프라이트).
- 적이 타입을 **키로 선택**(`EnemyRanged.ProjectileType`).
- 예고 레인을 **타입 스펙에서 계산**(사거리 = 속도×수명, 폭 = 예고폭) → 예고=실제 일치.

**비목표**
- 거동 다양성(유도/확산/관통/포물선) — 후속 스펙.
- 투사체 데미지 가변화 — 현행 1피격 고정 유지(카탈로그에 열은 두되 기본 1).
- 보스 패턴 전면 이관 — 이번엔 EnemyRanged 우선, 보스는 동일 카탈로그 재사용만(후속에서 배선).

## 3. 설계

### 3.1 카탈로그 데이터셋 — `Enemy/ProjectileTable`
`RootDesk/MyDesk/Enemy/ProjectileTable.csv` + `.userdataset`(SoundTable 패턴). 열:

| 열 | 타입 | 의미 |
|---|---|---|
| `Key` | string | 타입 키(예: `basic`, `fast`, `heavy`) |
| `Speed` | number | 비행 속도(월드유닛/초) |
| `Lifetime` | number | 수명(초) → 사거리 = Speed×Lifetime |
| `HitRadius` | number | 피격 판정 반경(← 전역 RadiusProjectile 대체) |
| `TelegraphWidth` | number | 예고 레인 폭 |
| `SpriteRUID` | string | 투사체 스프라이트 |
| `Damage` | number | 피격 수(기본 1) |

### 3.2 `ProjectileCatalog` (@Logic)
- OnBeginPlay에 데이터셋 로드 → 딕셔너리 캐시.
- `method any Get(string key)` → `{ speed, lifetime, hitRadius, telegraphWidth, spriteRUID, damage }`. 미존재 키는 `basic` 폴백 + 경고 로그.
- (SoundManager가 SoundTable 로드하는 방식 그대로 참고.)

### 3.3 제네릭 투사체 — `Projectile.mlua` 확장
- `HitRadius` property 추가 → 히트 판정을 `_GameConstants.RadiusProjectile` 대신 `self.HitRadius` 사용.
- `Launch` 시그니처 확장: 방향 + 스펙 주입.
  ```
  Launch(dirX, dirY, spec)   -- spec = catalog row
    self.Speed = spec.speed
    self.Lifetime = spec.lifetime
    self.HitRadius = spec.hitRadius
    self.Damage = spec.damage
    self.Entity.SpriteRendererComponent.SpriteRUID = spec.spriteRUID  -- 외형 주입
  ```
  (기존 `Launch(dir, speed, damage, parryable)` 호출부 — 보스/플레이어 아이템(rock)도 있음 → 하위호환 위해 **오버로드 or 기존 시그니처 유지 + 신규 `LaunchSpec` 추가**. 구현 시 확정.)

### 3.4 `EnemyRanged` 연동
- property 추가: `property string ProjectileType = "basic"`. (기존 `ProjectileSpeed`는 카탈로그로 대체되므로 제거 검토 — 구현 시.)
- **Fire**: `local spec = _ProjectileCatalog:Get(self.ProjectileType)` → `SpawnByModelId("enemyprojectile")` → `Launch(dir, spec)`.
- **예고(3단계 lock 시점)**: `local spec = _ProjectileCatalog:Get(self.ProjectileType)`; 레인 길이 = `min(spec.speed * spec.lifetime, 표시상한)`, 폭 = `spec.telegraphWidth`. `TelegraphService:Show(...)` 인자에 반영. → 예고가 실제 투사체 사거리·폭과 일치.
- CombatGizmo의 원거리 레인도 동일 스펙을 읽게(현재 전역 상수) — 구현 시 EnemyRanged에서 스펙 노출 or 기즈모가 catalog 조회.

### 3.5 데이터 흐름
```
[기획자] ProjectileTable.csv (행=타입)
        │
   _ProjectileCatalog:Get(key)
        ├─ EnemyRanged 예고(lock): 레인 = speed×lifetime × telegraphWidth
        └─ EnemyRanged 발사: 제네릭 투사체 스폰 + Launch(spec) (속도/수명/반경/스프라이트 주입)
                              → Projectile: self.HitRadius로 판정
```

## 4. 리스크 / 완화
| 리스크 | 완화 |
|---|---|
| `Launch` 시그니처 변경이 보스/플레이어 rock 호출부 깨뜨림 | 기존 `Launch` 유지 + 신규 `LaunchSpec(dir, spec)` 추가(오버로드), 점진 이관 |
| 데이터셋 로드 타이밍(적 스폰이 카탈로그보다 이를 수 있음) | `@Logic` OnBeginPlay는 컴포넌트보다 먼저(스크립팅 규칙) — 안전. 미로드 시 basic 폴백 |
| 예고 레인 상한 없으면 원거리 큰 사거리 투사체가 화면 밖까지 예고 | 표시 상한(예: DetectRadius 또는 고정 cap)으로 클램프 |
| 전역 `RadiusProjectile` 제거 시 다른 소비처 | 제거 전 grep 확인(플레이어 rock/보스도 Projectile 재사용) — 공유면 유지 or 이관 |

## 5. 검증
1. `refresh` 빌드 에러 0. 데이터셋 로드 로그 확인.
2. play: 원거리 적 발사 시 스폰 투사체의 Speed/Lifetime/HitRadius/Sprite가 카탈로그 값과 일치(로그).
3. play: **예고 레인 길이/폭이 실제 투사체 사거리·크기와 일치**(기즈모 육안 + 로그).
4. 카탈로그에 `fast`/`heavy` 행 추가 → 적 `ProjectileType` 변경 시 반영(스팟체크).

## 6. 후속 (스코프 밖)
- 거동 다양성(유도/확산 N발/관통/포물선) — Behavior 열 + 타입별 이동·판정 로직.
- 보스 패턴을 카탈로그로 배선.
- 투사체 데미지 per-type 활성화.
