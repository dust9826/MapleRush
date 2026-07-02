---
id: MR-R2
title: 사운드 잔여 배선 (적 종족음 / 능력음 / 스토리 BGM)
status: todo
owner: unassigned
area: script
touches:
  - RootDesk/MyDesk/Sound/SoundTable.csv
  - RootDesk/MyDesk/Enemy/EnemyHealth.mlua
  - RootDesk/MyDesk/Enemy/EnemyMelee.mlua
  - RootDesk/MyDesk/Enemy/EnemyRanged.mlua
  - RootDesk/MyDesk/Player/PlayerAbility.mlua
depends_on: []
branch: ""
created: 2026-07-02
updated: 2026-07-02
---

# 사운드 잔여 배선 (적 종족음 / 능력음 / 스토리 BGM)

## Goal
MR-R(사운드 시스템)에서 **다른 작업 선행이 필요해 못 배선한 사운드 17종**을 마저 연결한다. CSV(SoundTable)엔 키·RUID가 이미 준비돼 있어(`#wired`=todo), 각 선행 작업이 풀리면 재생 호출만 붙이면 된다. (MR-R 후속)

## Acceptance criteria
- [ ] **적 종족음 10종** — 적 공격/사망 시 종족별 키(`sfx_atk_<species>` / `sfx_death_<species>`) 재생. `#wired`가 `wired:*`로 갱신.
- [ ] **능력음 5종** — 능력 발동 시 `sfx_ability_<id>` 재생. (`PlayerAbility`)
- [ ] **스토리 BGM 2종** — 스토리 일러스트 화면 전환에 맞춰 `bgm_story_early`/`bgm_story_late` 재생.
- [ ] SoundTable.csv `#wired` 컬럼을 실제 배선 위치로 갱신, todo 잔여 0(비활성 `off` 제외).
- [ ] build/runtime 에러 0.

## Subtasks
<owner가 착수 시 채움>
- [ ] (적 종족음) 종족 태그 소스 확정 → 공격/사망 시점에서 종족 키 조회·재생
- [ ] (능력음) 능력↔키 매핑 확정 → `RequestUseAbility`에서 재생
- [ ] (스토리 BGM) 스토리 화면 전환 훅에 `PlayBGMKey` 연결

## Notes / decisions
- 관련: [[sound-volume-architecture]] · MR-R(사운드 시스템, PR #30). 배선 방식은 MR-R과 동일 — `_SoundManager:PlaySFXKey/PlayBGMKey(key)`, 서버 이벤트는 Multicast/Client RPC 경유(잡몹 피격음·보스음 참고).
- **항목별 선행(막힌 이유) — 서로 독립이라 부분 진행 가능**:
  - **적 종족음(10)**: `EnemyHealth`엔 `EnemyKind`(melee/ranged/boss/dummy)만 있고 **종족(픽시/라이오너/페페/화이트팽/주니어불독/부기) 식별 필드가 없음**. `EnemyAnimSet`도 클립 RUID만. → **MR-V(신규 적 유형)** 에서 종족 태그(모델/컴포넌트)가 생기면 배선. ⛔ 사실상 MR-V 선행.
  - **능력음(5)**: `PlayerAbility.mlua`엔 능력이 `invincible`/`clearProjectiles` **2종만** 구현 ↔ CSV 키는 `ironbody/chamgong/immovable/manji/spin` 5종. **매핑 결정 필요**(2종에 어느 키를 붙일지, 또는 능력 5종 구현). 억지 배선 금지.
  - **스토리 BGM(2)**: 스토리 일러스트 **화면 자체가 코드에 없음**(grep 0건). 스토리 인트로 화면 구현이 선행.
- `depends_on`은 비워둠 — 3항목이 각기 다른 선행에 묶여 티켓 단위로 하드 블록하기 애매. 적 종족음만 실질적으로 **MR-V 선행**.
- 참고(비활성 `off` 4종, 작업 아님): `sfx_atk_pepe`/`sfx_atk_jrbulldog`(접촉형=무음), `sfx_boss_snowman_atk3`(에셋 없음), `sfx_theme_select`(후순위).

## Verify
- Maker `play` → 각 이벤트(적 공격/사망, 능력 발동, 스토리 화면 전환) 시 해당 키 재생 확인(로그로 RUID 해소 + 무오류), SoundTable `#wired` 갱신.
