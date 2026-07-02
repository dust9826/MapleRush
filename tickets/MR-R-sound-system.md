---
id: MR-R
title: 사운드 시스템 (SoundManager + 볼륨 + SFX/BGM 배선, 타격음 포함)
status: in-progress
owner: D4LGONA
area: script
touches:
  - RootDesk/MyDesk/Core/HitFeedback.mlua
depends_on: []
branch: "D4LGONA/sound-volume-settings"
created: 2026-07-01
updated: 2026-07-01
---

# 사운드 시스템 (SoundManager + 볼륨 + SFX/BGM 배선, 타격음 포함)

## Goal
게임 전반의 사운드를 중앙 `SoundManager` 경유로 통일한다. 모든 SFX는 `SoundManager.PlaySFX`, 배경음은 `PlayBGM`으로 재생하고 볼륨을 제어한다. 여기에 **MR-Q 타격감의 타격음**을 포함해 실제로 소리가 나도록 마무리한다. (작업은 기존 브랜치 `D4LGONA/sound-volume-settings`에서 진행)

## Acceptance criteria
- [ ] `SoundManager`(SFX/BGM 재생 + 볼륨 API)가 마스터에 통합
- [ ] 모든 게임 SFX가 `SoundManager.PlaySFX` 경유(직접 `_SoundService:PlaySound` 산재 금지), BGM은 `PlayBGM`
- [ ] **타격음(MR-Q) 연결** — 적 타격 시 타격음 1회 재생. `HitFeedback`의 SFX 재생을 SoundManager 경유로 전환하고 타격음 RUID 지정
- [ ] 볼륨 설정이 실제로 SFX/BGM에 반영
- [ ] build/runtime 에러 0

## Subtasks
- [ ] (작업 시작 시 owner가 채움)
- [ ] SoundManager 설계/통합 (기존 sound-volume-settings 브랜치 정리)
- [ ] 타격음 SFX RUID 확보(msw-search) + HitFeedback 연결 (현재 `_SoundService:PlaySound` 직접 호출 → SoundManager 경유로 교체)
- [ ] 기타 핵심 SFX 배선(버튼/공격/획득 등) — 범위 협의

## Notes / decisions
- 관련 메모리 [[sound-volume-architecture]]: 모든 SFX는 SoundManager.PlaySFX 경유(전역 SFX 볼륨 API 없음), 배경음은 PlayBGM.
- **배선 진행(2026-07-02)**: master 머지 후 배선 감사 완료. 이미 걸린 SFX 11종(공격/대시/슬로우/적피격/아이템3/상점/UI클릭 + bgm_title). 이번에 추가 배선:
  - ✅ **스테이지 BGM** — `FloorManager:RequestSelectTheme`에서 `ClientPlayThemeBgm` Client RPC 추가. 키 규칙 `bgm_<themeId>`(orbis/elnath/deepmine). 로비 StopBGM 공백을 채움. 런타임 검증: `theme BGM -> bgm_orbis` 로그 확인.
  - ✅ **플레이어 사망음** — `StageManager:OnPlayerDeath`에서 `ClientPlayerDeathSfx` Client RPC 추가(`sfx_player_death`, 매 사망 1회). 런타임 검증: RUID 해소 + PlaySFXKey 무오류.
  - ✅ **보스 공격음** — `BossController:ResolvePattern`에서 `PlayBossAtkSfx(curPat)` → 패턴 배열 인덱스(1~3)를 atk 번호로 매핑 → Multicast `sfx_boss_<kind>_atk<n>`. BuildPatterns 수정 없이 인덱스 기반(P-O1→atk1 등). 런타임 검증(엘리쟈): 스폰 kind='elija', 패턴 발동, 키 5종 정확 RUID 해소, 에러 0.
  - ✅ **보스 사망음** — `EnemyHealth:Die`의 boss 분기 → BossController.BossKind 읽어 Multicast `sfx_boss_<kind>_death`.
  - ✅ **그로기음** — `GroggyGauge:Charge` 그로기 발동 시 Multicast `sfx_boss_groggy`.
- **⚠️ 능력음 키 불일치(미배선, CSV `todo:map?`)**: CSV 능력음 키는 `sfx_ability_ironbody/chamgong/immovable/manji/spin`(5종)인데, `PlayerAbility.mlua`엔 능력이 `invincible`/`clearProjectiles` 2종만 구현됨. 키가 실제 ability ID와 매칭 안 됨 → 매핑 결정 필요. 억지 배선 금지.
- **⚠️ 적 종족음 미배선(CSV `todo:species`)**: 적 공격/사망음 10종은 종족(픽시/라이오너/…)별 키인데, `EnemyHealth`(EnemyKind=melee/ranged/boss/dummy만)·`EnemyAnimSet`(클립 RUID만)에 **종족 식별 필드가 없음**. 종족 태그 추가(모델 authoring 포함)가 선행돼야 함 — MR-V(신규 적 유형) 연계.
- **⚠️ 스토리 BGM 미배선(CSV `todo`)**: `bgm_story_early/late`는 스토리 일러스트 화면용인데 **스토리 화면 자체가 코드에 없음**(grep 0건). 스토리 인트로 구현 시 배선.
- BGM 생명주기 참고: 게임오버/클리어 시 테마 BGM이 계속 재생됨(타이틀 복귀 미구현) — 필요 시 별도 정비.
- **배선 현황(2026-07-02): wired 27 / todo 17 / off 4** (총 48). SoundTable.csv `#wired` 컬럼에 각 키 상태·호출 위치 표기(런타임 무시되는 `#` 주석 컬럼). todo 17 = 스토리BGM 2 + 적종족음 10 + 능력음 5.
- **MR-Q 연계**: `HitFeedback.mlua`가 현재 `_SoundService:PlaySound(HitSfxId, HitSfxVolume)`로 타격음 훅만 있고 `HitSfxId=""`라 소리 안 남. 이 티켓에서 SoundManager 경유로 바꾸고 타격음 에셋 지정하면 MR-Q 타격음 완성. (MR-Q PR #27은 훅까지만 포함)
- master 기준엔 아직 SoundManager 없음 → 이 티켓/브랜치에서 도입.

## Verify
- Maker `play` → 적 타격 시 타격음 재생 확인, 볼륨 조절 반영 확인, 로그로 SoundManager 경유 확인.
