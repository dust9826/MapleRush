---
id: MR-I
title: 대시 방-영역 클램프 (RoomRegion 논리 충돌 + 마커 authoring)
status: in-progress
owner: dust9826
area: mixed
touches:
  - RootDesk/MyDesk/Player/PlayerDash.mlua
  - RootDesk/MyDesk/Core/CombatPrimitives.mlua
  - RootDesk/MyDesk/Models/
  - map/
depends_on: []
branch: ""
created: 2026-06-20
updated: 2026-06-24
---

# 대시 방-영역 클램프 (RoomRegion 논리 충돌 + 마커 authoring)

## Goal
대시 거리 클램프를 터레인 충돌(풋홀드/타일 레이캐스트)에서 **"현재 방의 논리 영역(RoomRegion)" 기준**으로 바꾼다. 맵 모드와 무관한 순수 수학 충돌이라 MapleTile/SideView 차이·바닥-벽 오탐이 사라지고, 한 맵에 여러 방(비직사각형 포함)을 지원한다. 코드리뷰 finding #2·#3·#7을 함께 해소한다.

## 배경 (MR-S 결론)
- 표준 모드 = MapleTile 확정(MR-S). 대시 벽 정지는 터레인 충돌에 의존하지 않고 커스텀 논리 충돌로 간다.
- `CombatPrimitives:RaycastWallDistance`는 대시 전용 호출(`ComputeDashLength`에서만 사용) → 본 작업으로 대체/제거 가능.
- 게임필 결정: **대시는 "현재 방 논리 영역"에 클램프**(밧줄/장애물 물리 콜라이더는 Body 충돌로 별도). 영역과 물리 콜라이더는 분리.

## Acceptance criteria
- [ ] `RoomRegion` 추상화: `Contains(point)` + `ClampRay(origin, dir, maxLen)` 두 메서드. **RectRegion 구현 1개**(볼록 다각형은 필요 시 추가, 호출부 불변)
- [ ] 방 경계를 **데이터로 authoring** — 맵마다 마커/존 엔티티로 정의, 스크립트는 읽기만 (`.model` + `.map` 인스턴스)
- [ ] `RoomRegistry`(또는 동등): 맵의 마커들을 읽어 방 목록 보유 + `CurrentRoomFor(playerPos)` 제공
- [ ] `PlayerDash.ComputeDashLength`가 `currentRoom:ClampRay(...)`로 거리 산정 → `RaycastWallDistance` 호출 제거
- [ ] 사용하지 않게 된 `CombatPrimitives:RaycastWallDistance` 제거 (다른 호출 없음 확인)
- [ ] 대시가 현재 방 경계를 벗어나지 않음 + 방이 없는(미authoring) 맵에서도 안전한 폴백(기존 최대 사거리)
- [ ] 실측: MapleTile 맵에서 대시가 방 경계에 멈추고, 아래로 조준해도 죽지 않음(finding #2 해소), 방 밖으로 안 나감

## Subtasks (raycast 재설계, 2026-06-24)
- [x] 설계/리서치 멀티에이전트 워크플로우 + 적대적 검토 (wf_dadfd919-99b)
- [x] 런타임 raycast 프로브 — 클라 sim 동작 / passive Trigger 히트 / self-hit(플레이어 TriggerBox) / 그룹 필터 정확성 검증
- [x] GameConstants: `DashBlockGroup`, `DashFloorMinSin` 추가
- [x] CombatPrimitives: `OBBRayEntry`(회전 박스) + `ClampRayToCurrentRoom` raycast 블록 경로(그룹 존재 가드) + `ApplyFloorAimAssist`
- [x] PlayerDash: `ComputeAimDir`(접지 하향 조준 보정) 프리뷰/실행 동일 적용
- [x] 빌드 로그 0에러 확인 (refresh)
- [x] **(사용자)** Maker 프로젝트 설정 > Collision 에 `DashBlock` 그룹 생성 (Id=GUID `2fec08db23d947ff98e49fca06c9b359`)
- [x] `DashBlockRegion.model` authoring — Transform + TriggerComponent(passive, legacy false, CollisionGroup=DashBlock GUID, BoxSize 3×3), script 無. `roomregionmarker` 복제 기반.
- [x] map02에 테스트 블록 박스 `DashBlockTest` (6,1,0) 배치
- [x] **실측 검증(execute_script, play map02)**: clamp +x=3.500(블록 진입, self-hit 없음) / -x=8.139·+y=7.223(allow-box 공존) / ApplyFloorAimAssist 5케이스 전부 정확(접지+급하향만 보정, 공중·완만·상향 불변). 빌드 0에러.
- [ ] **남은 item 2**: 대시 후 플레이어 안 겹침(도착 위치 보정) + 예상 도착 반투명 미리보기 — 실측에서 실제 박힘/겹침 발생 시 진행(검토 권고: 발생 확인 후). 착지 고스트는 스프라이트 에셋 결정 필요.
- [ ] 인게임 체감 튜닝: 블록 박스 위치/크기(에디터 [Edit]) + DashWallMargin. (게임필, 눈으로)
- 보류(검토 YAGNI): foothold 스냅 / 방향투영 clearance — 실측 필요 시.

## Notes / decisions
- **확장은 이음새까지만(YAGNI):** ✅ RoomRegion 인터페이스 + 방=데이터(마커) 두 이음새. ❌ 임의 오목 다각형·내비메시·동적 방 병합·멀티 per-player 방(1인 1런 전제 유지)·방 그래프/잠금.
- **비직사각형:** 처음엔 Rect, 필요해지면 ConvexPolyRegion(레이 vs 변 반평면 클리핑 ~10줄) 추가. 호출부 안 바뀜.
- **현재 방 판정:** v1은 점-포함(`Contains`) 순회. 나중에 트리거 기반으로 교체 가능(한 곳만 수정).
- **밧줄/장애물:** 방 구분 + 플레이어 막기 = Body 물리 콜라이더로 별도 처리. 대시 영역(논리)과 분리. 단, 영역이 실제 벽 위치와 어긋나지 않게 authoring 규율 필요(마커를 벽에 맞춤).
- **center/foot(finding #3):** 이 작업에서 대시 기하 기준을 하나로 통일(중앙 권장)해 0.5유닛 불일치도 함께 정리.
- 슬랩(레이 vs AABB) 클램프 스케치:
  ```lua
  -- origin에서 dir로 방 사각형[minX,maxX]×[minY,maxY]을 처음 벗어나는 거리
  local tx = dir.x>0 and (b.maxX-origin.x)/dir.x or (dir.x<0 and (b.minX-origin.x)/dir.x or math.huge)
  local ty = dir.y>0 and (b.maxY-origin.y)/dir.y or (dir.y<0 and (b.minY-origin.y)/dir.y or math.huge)
  local exit = math.min(tx, ty)   -- L = min(커서거리, 최대사거리, exit - margin)
  ```
- **MR-A 연계:** 수제작 맵이 방 마커를 들고 옴. 마커 모델/포맷은 본 티켓에서 먼저 정의 → MR-A가 사용. (MR-A가 MR-I에 depends_on)

## 구현 완료 (2026-06-20)
- **CombatPrimitives**: `RegionContains`/`RegionClampRay`(rect 슬랩)/`ClampRayToCurrentRoom`(마커 열거+map.Name 캐시) 추가, `RaycastWallDistance` 삭제.
- **PlayerDash.ComputeDashLength**: `ClampRayToCurrentRoom`(발 기준)로 교체. #3 정합(발 기준 클리어런스).
- **RoomRegionMarker**: `Map/RoomRegionMarker.mlua`(@Component, 순수 태그) + `Models/Map/RoomRegionMarker.model`(model_id=`roomregionmarker`, Transform+**TriggerComponent**+script). 영역 = **TriggerComponent 콜라이더 박스**(BoxSize=가로/세로 월드유닛, ColliderOffset=중심, IsPassive=true→런타임 무충돌, IsLegacy=false). 스프라이트 의존 제거 — 에디터 Property Editor의 초록 박스를 [Edit] 드래그로 사이징(WYSIWYG, 픽셀/Scale 무관).
- region 표현 = 태그 테이블 `{kind="rect",cx,cy,halfW,halfH}` → 다각형 확장 시 분기만 추가.
- **검증(실측)**: 빌드 0에러. 런타임 단위검증 — contains(o/x), clampRight=5.0, clampDown=3.0, clampShort=2, **roomFallback=7(실맵 마커0 폴백)** 전부 통과. 로드 에러 0.
- **버그 수정 (2026-06-20, 첫 배치 테스트)**: 마커가 동작 안 함 → 근본원인 2개:
  1. **영역이 대시 사거리보다 훨씬 큼** — 배치된 영역 39×14.8유닛인데 `DashDistance=4`라 플레이 위치에서 경계에 도달 불가 → 클램프 미발동. **영역은 "대시를 멈추고 싶은 실제 벽/플레이 경계"에 맞춰 타이트하게** 잡아야 함(과대 영역은 무의미).
  2. **스프라이트 크기 의존**(128px=1.28유닛 → Scale≠유닛) → 시각화를 **TriggerComponent 콜라이더 박스로 전환**(사용자 요청). BoxSize가 곧 월드유닛 영역, 스프라이트/Scale 무관. 스프라이트 리소스(`cbf8…`)는 삭제.
  - map02 마커를 콜라이더 구성으로 재배치(placeModel), BoxSize=26×12, Position(2.25,2.5), Scale=1, IsPassive=true, IsLegacy=false.
  - **실측 검증(execute_script, 실제 배치 마커)**: markerCount=1, BoxSize=26×12, passive/legacy 정상, nearRightEdge=2.25(경계 15.25서 정지), center=4(무클램프), nearLeftEdge=1.75, outside=4(폴백), **LWA-3019 경고 없음**. 전부 정확.
- **authoring 규칙(중요)**: 마커 배치 → TriggerComponent **BoxSize = 방 가로·세로(월드유닛)**, Position = 방 중심(에디터 [Edit] 초록 박스 드래그로 사이징). 영역은 대시가 멈춰야 할 경계(=플레이 벽)에 맞춤 — 너무 크게 잡으면 4유닛 대시가 경계에 못 닿아 효과 없음.

## 다음 세션 할 일 (바로 진행 예정) — 멈추는 위치/마진 튜닝
현재 인게임 동작은 "적당히 됨". 대시가 **멈추는 위치/마진**이 거슬려 다듬어야 함 (게임필).
- **조정 knobs**:
  - `GameConstants.DashWallMargin`(현재 `0.4`) — `PlayerDash.ComputeDashLength`에서 클램프 거리에서 빼는 값. 키우면 벽 더 앞에서, 줄이면 벽에 더 붙어 정지.
  - map02 마커 **BoxSize/Position** — "벽"의 실제 위치. 경계가 시각 벽과 어긋나면 BoxSize(26×12)/Position(2.25,2.5)을 미세 조정 (collider [Edit] 초록 박스로).
  - (필요 시) `CombatPrimitives.RegionClampRay` 자체 로직.
- **진행 방법**: play → 끝쪽으로 대시 → 멈춤 지점 vs 벽 관찰 → DashWallMargin / 마커 bounds 튜닝 → 반복. (체감 위주, log보다 눈으로)
- 이 항목 끝나면 MR-I review→done.

## 방향 전환 (2026-06-24) — raycast 콜라이더 재설계 + 조작감 3종
사용자 결정: 클램프 판정을 "가능 영역(감싸는 박스)" 모델에서 **콜라이더 기반 "대시 불가 지역"**으로 전환하고, MSW **네이티브 raycast**(`CollisionSimulator:Raycast`)로 판정. 추가로 조작감 2종.

**확정 사항 (locked):**
- 불가 지역 = MSW 네이티브 raycast로 감지. `_CollisionService:GetSimulator(map):Raycast(group, origin, dir, L)`.
- Raycast는 **충돌 Component만 반환**(거리 없음) → 맞은 콜라이더의 박스 1개로 **OBB(회전 지원) 진입거리** 계산해 정지거리 산정.
- 불가 지역 authoring = **별도 모델**(기존 allow-box RoomRegionMarker와 분리). allow-box(기존 math 포함 클램프)는 공존 가능.
- `PlayerDash.ComputeDashLength` 호출부 시그니처 불변, 내부만 교체.
- **미검증(런타임 프로브 필요):** 기존 TriggerComponent(IsPassive=true) 박스가 raycast에 잡히는지. 안 잡히면 콜라이더 구성(non-passive Trigger / PhysicsCollider / 커스텀 그룹) 재결정.

**3개 작업 항목:**
1. **콜라이더 raycast로 대시 불가지역 판정** (위 핵심).
2. **대시 후 플레이어 안 겹침**: 대시 후 예상 도착 위치를 반투명 표시 + 벽/바닥에 박히지 않게 도착 위치 보정(벽이면 위로/뒤로, 바닥 조준이면 바닥에 붙임).
3. **바닥 대시 조작감**: 바닥에서 아래로 조준 시 raycast만 쓰면 대시가 아예 안 되는 문제 → 마우스 x/y 중 최대가 되도록 각도 보정(접지+하향 조준 게이트).

**진행 순서:** 멀티에이전트 설계 워크플로우(run wf_dadfd919-99b) → 런타임 raycast 프로브 → 설계 승인 → 구현 → 검증.

**보존(이전 구현):** 아래 "구현 완료 (2026-06-20)"의 RoomRegion math 클램프(`RegionContains`/`RegionClampRay`/`ClampRayToCurrentRoom`)는 allow-box 경로로 유지. block 경로만 raycast로 추가.

## 런타임 프로브 결과 (2026-06-24, play map01)
- ✅ 클라이언트에서 `_CollisionService:GetSimulator(map)` + `Raycast` 정상 동작.
- ✅ **passive TriggerComponent(IsPassive=true)도 raycast에 잡힘** → 기존 마커 패턴(스프라이트 無, 콜라이더 박스) 그대로 재사용. non-passive·PhysicsCollider·PhysicsRigidbody 불필요.
- ⚠️ 플레이어 자신이 `TriggerBox` 그룹(비-passive)에 속함 → TriggerBox로 raycast하면 **플레이어 자기 콜라이더에 먼저 맞음**(self-hit). 적/allow박스도 TriggerBox 공유 → 모호.
- ✅ **그룹 필터링이 정확**: 플레이어가 안 속한 그룹으로 마커 group을 바꾸면 발 원점에서 쏴도 마커만 맞고 플레이어엔 안 맞음(PROBE-E, Climbable 대역 검증). 미등록 그룹명은 필터 안 됨(아무거나 맞음) → 실제 등록 그룹 필수.
- `CollisionGroups` 전역 = Default/TriggerBox/HitBox/Interaction/Portal/Climbable. **사용자 결정: 전용 `DashBlock` 그룹 신규 생성**(Maker 프로젝트 설정 > Collision). 블록 마커 `TriggerComponent.CollisionGroup = DashBlock`.

## 최종 구현 스펙 (확정)
**GameConstants** — 추가: `DashBlockGroup="DashBlock"`(string), `DashFloorMinSin=0.2588`(=sin15°). `DashWallMargin`(0.4) 유지(단일 차감).
**CombatPrimitives**:
- `OBBRayEntry(hitComp, origin, dir, maxLen)`: hit 콜라이더의 Transform(WorldPosition/Scale/**WorldZRotation**)+Trigger(BoxSize/ColliderOffset)로 OBB 슬랩 진입거리(tmin) 계산. **회전 박스 지원**(레이를 박스 로컬로 변환). origin이 박스 안/뒤면 maxLen.
- `ClampRayToCurrentRoom`: `result=maxDist` → (1) 기존 allow-box math(포함 시 이탈거리) → (2) **신규** `sim:Raycast(DashBlockGroup, origin, dir, result)` 맞으면 `OBBRayEntry`로 진입거리 → 전부 `min`. `DashWallMargin`은 호출부(`ComputeDashLength`)에서 한 번만 차감(불변).
- `ApplyFloorAimAssist(dir, onGround, facingX)`: onGround AND `dir.y < -DashFloorMinSin`일 때만 dir.y를 -DashFloorMinSin으로 클램프하고 수평성분 재정규화(`hx=sqrt(1-minY²)`). dir.x==0이면 `facingX`로 평탄화. 공중/상향/수평/SideView 불변.
**PlayerDash**: `UpdateAimPreview`·`TryDash`에서 `DirectionTo` 직후 `ApplyFloorAimAssist` 호출(onGround=`RigidbodyComponent:IsOnGround()`, facingX=`MovementComponent:IsFaceLeft()`→±1). 프리뷰·실행 동일 적용.
**모델**: `Models/Map/DashBlockRegion.model`(model_id `dashblockregion`) = Transform + TriggerComponent(IsPassive=true, IsLegacy=false, **CollisionGroup=DashBlock**, BoxSize 기본). script.RoomRegionMarker **미포함**(allow 열거에 안 잡히게). 스프라이트 無(콜라이더 박스 WYSIWYG).
**보류(검토 YAGNI)**: foothold 착지 스냅 / 방향투영 clearance / 착지 고스트(item2 시각)·tint → 실측에서 필요 확인 시 추가. 고스트는 맨 마지막, foot 기준.
**검증**: 그룹 생성 후 refresh → map02에 dashblockregion 1개 배치 → play → 발 원점 raycast 클램프 + 바닥 하향조준 어시스트 실측.

## Verify
- Maker `play` → 대시를 방 경계·바닥 방향으로 쏴서 클램프 정상 + 방 밖 이탈 없음 → `logs` 에러 0. 미authoring 맵 폴백 확인.
- (완료) 기하/열거/폴백 로직은 execute_script 단위검증으로 통과 + 실제 배치 마커로 클램프 확인. **잔여: 멈춤 위치/마진 체감 튜닝(다음 세션) + MR-A 다맵 마커 배치.**
