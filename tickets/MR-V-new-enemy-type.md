---
id: MR-V
title: 신규 적 유형 추가 (EnemyAnimSet 다양화 — 모델 추가로 잡몹 1종+)
status: in-progress
owner: dust9826
area: mixed
touches:
  - RootDesk/MyDesk/Models/Enemies/
  - RootDesk/MyDesk/Enemy/EnemyAnimSet.mlua
  - RootDesk/MyDesk/Enemy/EnemyMelee.mlua
  - RootDesk/MyDesk/Stage/StageManager.mlua
depends_on: [MR-U]
branch: ""
created: 2026-07-01
updated: 2026-07-02
---

# 신규 적 유형 추가 (EnemyAnimSet 다양화 — 모델 추가로 잡몹 1종+)

## Goal
MR-U(EnemyAnimSet)가 만든 "외형이 다른 몬스터를 **모델만 추가해 다양화**" 경로를 실제로 한 번 태워, 기존 근접/원거리와 외형(클립)이 다른 **신규 잡몹 1종 이상**을 추가한다. AI 로직 재작성 없이 모델 복사 + AnimSet 인스펙터 값 교체 + 스폰 풀 등록만으로 끝나는지 검증(= MR-U 설계 목표의 실사용 확인).

## 배경
- MR-U로 잡몹 클립이 `GameConstants` 하드코딩 → `EnemyAnimSet`(모델별 idle/run/attack/skill/groggy/hit/die `@Sync string` 인스펙터 필드)로 이관됨. 같은 AI(Melee/Ranged)라도 모델마다 다른 클립 렌더 가능.
- 따라서 신규 적 = 기존 `MeleeEnemy.model`/`RangedEnemy.model` 복사 → EnemyAnimSet 필드에 새 스프라이트 RUID 세팅 → 스폰 풀에 등록. (AI .mlua 수정 불필요가 기대치.)

## Acceptance criteria
- [ ] 추가할 적 1종 컨셉 확정(근접/원거리 중 택1 + 외형 스프라이트). (스프라이트는 msw-search로 idle/run/attack/hit/die 클립 RUID 확보)
- [ ] `RootDesk/MyDesk/Models/Enemies/`에 신규 적 `.model` 추가(ModelBuilder, 기존 잡몹 모델 복제 베이스). EnemyAnimSet 필드에 신규 클립 RUID 주입.
- [ ] 스폰/스테이지 풀에 신규 적 등록 → 일반 스테이지에서 등장.
- [ ] **AI .mlua(EnemyMelee/EnemyRanged) 수정 없이** 동작(다양화가 모델/인스펙터만으로 됨을 확인). 부득이 수정 시 사유 기록.
- [ ] 빌드 0에러. play 실측: 신규 적이 기존 적과 **다른 외형 클립**으로 stand/move/attack/hit/die 렌더, 피격·사망·HIT 상태 정상.

## Subtasks
- [x] 적 컨셉·스프라이트 확정 (msw-search) — 원시멧돼지 `mob/9830000.img`, "접촉 데미지 집요 추격 돌진형"
- [x] 모델 복제 + EnemyAnimSet 값 세팅 (ModelBuilder) — `Models/Enemies/ChargerEnemy.model`(model_id=chargerenemy), EnemyMelee→EnemyCharger 스왑, 멧돼지 stand/move/attack1/hit/die 클립 주입
- [x] EnemyCharger.mlua 작성 (접촉 데미지 + 상시 추격 AI)
- [x] 스폰 풀 등록 — StageManager.PrepareStages 판별(script.EnemyCharger→chargerenemy) + RollComposition 믹스(원35%/돌25%/근40%)
- [x] play 실측 (스폰·추격·접촉판정·클립·빌드 0에러) — ✅ 아래 검증 결과
- [ ] 실제 런 플로우(로비→노드→스테이지) 등장 + 게임필 튜닝(ChaseSpeed/LungeClipDist/접촉 공정성) — 라이브(MR-E 결)
- [ ] (선택) 순수 "모델복사 무AI변경" 다양화 검증용 잡몹 별도 1종

## Notes / decisions
- 🔗 MR-U(EnemyAnimSet, done): 본 티켓의 토대. 다양화 = "모델 복사" 패턴(메모리 session-2026-07-01-enemy-animset).
- 🔗 MR-G(적 AI FSM 정비): AI 로직 자체 변경이 필요해지면 거기로. 본 티켓은 **로직 무변경 다양화**가 원칙.
- 🔗 MR-A(맵 다양화): 적 다양화와 함께 1층 콘텐츠 폭을 넓히는 결.
- ⚠ 스폰 풀 등록 위치(StageManager/FloorManager 등)는 착수 시 실제 코드 확인 후 확정.

## Verify
- 단계별 execute_script + play 실측: 신규 적 스폰 → 외형 클립이 기존과 다름 / 피격(hit)·사망(die)·HIT 공격중단 정상 / 빌드 로그 0에러. msw-scripting verify-checklist 준수.

## 세션 착수 (2026-07-02, @dust9826) — 몸통박치기(돌진) 잡몹
- **확정 컨셉**: 신규 잡몹 = **몸통박치기(돌진) 근접형**. 기존 MeleeEnemy(제자리 공격)와 달리 플레이어를 향해 **돌진(charge)해 몸통으로 박는** 공격.
- ⚠ **MR-V 원칙(AI 무변경) 예외**: 돌진은 새 공격 행동이라 순수 "모델복사+클립스왑"으로 안 됨 → EnemyMelee에 돌진 분기(또는 신규 AI) **소폭 추가 필요**. 순수 다양화 검증은 별개 잡몹으로 유지, 이 몬스터는 "다양화 + 신규행동 1종" 파일럿. AI 로직이 커지면 🔗 MR-G로 분리.
- **작업 순서(사용자 지정)**: ① **animClip 연결(모델+클립 배선)부터** → ② 접촉 데미지·추격 AI → ③ 스폰 풀 등록 → ④ play 실측.

### 컨셉 확정 (2026-07-02, 사용자)
- **정체성 = "집요 추격 + 접촉 데미지 돌진형 잡몹"**:
  - **닿으면 데미지**: 별도 windup 텔레그래프 없이 **몸 히트박스가 플레이어 hurtbox와 겹치면 즉시 피격**(1피격 즉사 전제). 다중히트 방지 쿨.
  - **몸박(몸통박치기)**: 공격 = 몸통 접촉 자체. 빠르게 다가가 박는 느낌.
  - **계속 다가감**: 감지 게이팅 최소, 상시 플레이어 추격(집요). 낭떠러지 정지는 유지.
- **스프라이트 = 원시멧돼지** `mob/9830000.img` (멧돼지=돌진 정석). 클립: idle←stand `5fc8d2ff1ced4b9ab38969187bf7d626` / run←move `2a8509df55ad4c27a9573be732fcbc97` / attack←attack1 `41e1fe7c43074a53b27afbd40d20baa1` / hit←hit1 `dcb17b03bff841aebd06e668efea19ad` / die←die1 `aed5a633fd7047d69a0427e5873f9045`. (전부 animationclip; SpriteRUID 스왑 = 기존 Pattern A 동일)
- **AI 결정**: 기존 `EnemyMelee` 수정 대신 **전용 컴포넌트 신규**(예: `EnemyCharger`) — windup/attackRadius/cooldown 불필요, 접촉판정+상시추격만. 기존 근접 적 회귀 위험 0. Chase/StopMove/PlayClip 패턴은 EnemyMelee 참고.
- 클립셋은 `EnemyAnimSet` 컴포넌트에 인스펙터 필드로 주입(모델에 부착).

### 구현 완료 (2026-07-02, @dust9826)
- **신규 파일**: `Enemy/EnemyCharger.mlua`(@Component), `Models/Enemies/ChargerEnemy.model`(model_id=chargerenemy, EnemyMelee→EnemyCharger 스왑 + 멧돼지 클립).
- **AI 요지**: 상시 추격(ChaseSpeed=2.8 인스펙터), 몸 hurtbox∩플레이어 hurtbox 겹치면 `PlayerHit:RequestHit`(접촉=즉사, RequestHit이 i-frame·0.2s중복·즉사 처리). windup/텔레그래프 없음. grace/stun/smoke/hit경직·낭떠러지정지 EnemyMelee와 동일. MapleTile·SideView 양 모드. 근접(가로≤LungeClipDist 1.4)이면 attack(돌진)클립, 밖이면 run.
- **스폰 등록**: `StageManager.PrepareStages`(script.EnemyCharger→chargerenemy) + `RollComposition` 랜덤 풀(원35%/돌25%/근40%).
- **검증(execute_script, play map01)**: 스폰 OK(3컴포넌트, kind=charger HP=30) / **x=4→0.06 ~4유닛 추격**(집요) / 근접 시 클립 attack1 전환 / **contactOverlap=true**(RequestHit 경로) / 빌드 0에러·charger 런타임에러 0. (로비 StageActive=false라 즉사만 미발동)
- **⚠ 잔여(라이브·MR-E 결)**: 실제 런 플로우 등장 확인 + 게임필 튜닝(ChaseSpeed/LungeClipDist/접촉판정=HitComponent BoxSize는 머쉬맘 복제값 0.548×0.539 → 멧돼지 실루엣 맞게 조정 여지). 미커밋.

### ★ 변종 스폰 버그 픽스 (2026-07-03, @dust9826)
- **증상**: 사용자가 MeleeEnemy 복제 변종(MeleeEnemy_Lioner/WhiteFang, RangedEnemy_Boogie/Pixie — 클립·수치만 다름, GUID model_id)을 테마맵 Stage에 배치했는데, 인게임에선 **기존 베이스(머쉬맘) 모습으로 스폰**됨. ("EnemyAnimSet 안 바뀜"의 진짜 원인)
- **근본원인**: `StageManager.PrepareStages`가 마커의 스폰 모델을 **컴포넌트 타입으로 추론**(`script.EnemyMelee`→무조건 `meleeenemy`)해서, 배치된 실제 변종 modelId를 버리고 베이스로 납작하게 스폰. (마커 인스턴스 override는 SpawnByModelId 재스폰 경로에서 소실)
- **수정**: `PrepareStages`가 **마커의 실제 model을 이름으로 해석**해 그 모델을 스폰.
  - 신규 `ResolveMarkerModel(e)`: `_EntryService:GetModelIdByName(e.Name)` 우선 → 끝 `_<숫자>` 접미사 제거 재조회(`string.match`) → 실패 시 컴포넌트 타입 베이스 폴백. (엔티티 이름=모델명 규약. 맵 데이터로 확인: MeleeEnemy_Lioner 마커 name=모델명)
  - 신규 `BareModelId(id)`: GetModelIdByName은 `model://<id>` 반환 → `SpawnByModelId`용 bare id로 정규화(코드베이스 통일). ※SpawnByModelId는 두 형태 다 수용 실측.
- **검증(execute_script, play)**: 이름→id 해석 9케이스 정확(변종 GUID direct/접미사 strip/베이스/charger/폴백) / SpawnByModelId(변종 GUID) → 변종 자기 스프라이트로 스폰(sprite=e350c40d≠머쉬맘) / ResolveMarkerModel end-to-end 5케이스 전부 bare id 정확 / 빌드 0에러·0경고. **미커밋.**
- 비고: play 중 로그가 수백만 자로 폭주(기존 이슈, DrawGizmo 브로드캐스트 추정) — 검증은 saved log grep으로 우회. MR-D 정리 후보.

### 리네임 Charger→Chaser + idle 재생 + 기즈모 토글 (2026-07-03, @dust9826)
- **정체성 재정의(사용자)**: 이 적은 돌진/차지가 아니라 **"플레이어를 향해 상시 이동만, 닿으면 즉사(접촉 데미지), 연막 안 플레이어는 못 찾음"** → "Charger" 부정확 → **Chaser로 리네임**.
- **리네임 일괄**(동작 불변): 스크립트 `EnemyCharger`→`EnemyChaser`(+codeblock 재생성) / 모델 `ChargerEnemy`→`ChaserEnemy`(id `chargerenemy`→`chaserenemy`) + 변종 2종 `ChaserEnemy_JuniorBulldog`/`ChaserEnemy_Pepe`(GUID id 유지) / `StageManager` 컴포넌트체크·RollComposition·ResolveMarkerModel 폴백 / EnemyKind·HitSource 태그 "chaser". 맵 마커 0건이라 맵 편집 불필요. 잔존 "charger" 참조 0.
- **idle 즉시 재생**: 3적(Melee/Ranged/Chaser) OnBeginPlay에서 `currentClip=""` 후 `PlayClip(idle)` → 스폰 즉시 idle 애니 0프레임 재생(모델 SpriteRUID≠idle이어도 강제).
- **DashBlock 기즈모 토글**: `GameConstants.DashGizmoDrawBlocks=false`(신규) + `PlayerDashGizmo.DrawBlocks` 게이팅 → 빨간 블록 박스만 숨김(대시 사거리/레이 유지).
- **검증**: 빌드 0에러/0경고 / chaserenemy+변종2 스폰 → `script.EnemyChaser` 부착·EnemyCharger 제거·kind=chaser·각자 sprite·에러0 / idle 스폰 즉시 세팅. **미커밋.**

### 테마별 잡몹 스킨 (2026-07-03, @dust9826)
- **요구(사용자)**: 테마별로 melee/ranged 슬롯을 지정 변종으로 대체. **오르비스** melee=MeleeEnemy_Lioner/ranged=RangedEnemy_Pixie / **엘나스** melee=MeleeEnemy_WhiteFang/ranged=ChaserEnemy_Pepe / **폐광(deepmine)** melee=ChaserEnemy_JuniorBulldog/ranged=RangedEnemy_Boogie. (원문 3번째 테마 "엘나스" 오타→deepmine으로 해석)
- **구현(맵 편집 아님, 코드 스킨)**: `StageManager.ThemeSkinModel(e)` — 마커의 AI 컴포넌트로 슬롯 판별(EnemyMelee=근접/EnemyRanged=원거리), `_FloorManager.CurrentTheme`별 지정 모델명을 `GetModelIdByName`으로 해석. `PrepareStages`가 스폰 모델 결정 시 ThemeSkinModel 우선(nil이면 ResolveMarkerModel 폴백). 배치된 base·변종 마커 전부 자동 적용, 맵 편집 불필요.
- **검증(execute_script)**: 3테마×2슬롯 전부 정확(orbis Lioner/Pixie, elnath WhiteFang/Pepe, deepmine JuniorBulldog/Boogie). 빌드 0에러/0경고. **미커밋.**
- 비고: 슬롯 판별은 AI 컴포넌트 기준이라, 원거리 슬롯에 Chaser(Pepe)를 넣으면 그 자리에 **추적형이 스폰**됨(사용자 의도대로). 마커 위치(x,y)만 사용.

### Chaser 공격 애니 제거 (2026-07-03, @dust9826)
- Chaser는 공격이 없는데 근접(LungeClipDist) 시 `attack` 클립을 재생하던 분기가 있었음 → **제거**. 이동 중엔 항상 `run` 클립만. `LungeClipDist` 프로퍼티·`dx` 로컬 정리.
- 검증(play): 플레이어 바로 옆(dx=0.05)에서도 sprite=run(2a8509df), attack 아님. 빌드 0에러/0경고. **미커밋.**
