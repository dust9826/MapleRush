---
id: MR-R
title: 사운드 시스템 (SoundManager + 볼륨 + SFX/BGM 배선, 타격음 포함)
status: review
owner: D4LGONA
area: script
touches:
  - RootDesk/MyDesk/Sound/SoundManager.mlua
  - RootDesk/MyDesk/Sound/SoundTable.userdataset
  - RootDesk/MyDesk/Sound/SoundTable.csv
  - RootDesk/MyDesk/Stage/FloorManager.mlua
  - RootDesk/MyDesk/Stage/StageManager.mlua
  - RootDesk/MyDesk/Enemy/EnemyHealth.mlua
  - RootDesk/MyDesk/Enemy/Boss/BossController.mlua
  - RootDesk/MyDesk/Enemy/Boss/GroggyGauge.mlua
  - RootDesk/MyDesk/UI/LobbyController.mlua
depends_on: []
branch: "D4LGONA/sound-volume-settings"
created: 2026-07-01
updated: 2026-07-02
---

# 사운드 시스템 (SoundManager + 볼륨 + SFX/BGM 배선, 타격음 포함)

## Goal
게임 전반의 사운드를 중앙 `SoundManager` 경유로 통일한다. 모든 SFX는 `SoundManager.PlaySFX`, 배경음은 `PlayBGM`으로 재생하고 볼륨을 제어한다. 여기에 **MR-Q 타격감의 타격음**을 포함해 실제로 소리가 나도록 마무리한다. (작업은 기존 브랜치 `D4LGONA/sound-volume-settings`에서 진행)

## Acceptance criteria
- [x] `SoundManager`(SFX/BGM 재생 + 볼륨 API)가 마스터에 통합
- [x] 모든 게임 SFX가 `SoundManager` 경유(직접 `_SoundService:PlaySound` 산재 없음 — SoundManager 내부 1곳뿐), BGM은 `PlayBGM`
- [x] **타격음(MR-Q) 연결** — 적 피격 시 `sfx_enemy_hit` 재생(`EnemyHealth.PlayHitEffect` → SoundManager 경유)
- [x] 볼륨 설정이 실제로 SFX/BGM에 반영 (로비 슬라이더 → SetBgm/SetSfxVolume)
- [x] build/runtime 에러 0

> ⚠️ **범위 정의**: MR-R = "사운드 시스템 + 지금 이벤트 훅이 있는 소리들의 배선". CSV엔 준비됐으나 **다른 작업 선행이 필요한 17종은 MR-R 범위 밖**(아래 후속 참조). 수용 기준은 시스템 완성 + 배선 가능분 완료 기준으로 충족.

## Subtasks
- [x] SoundManager 설계/통합 (SoundTable UserDataSet 외부화 — 키 기반 재생 + 프리로드 + 전역 UI 클릭 후킹)
- [x] 타격음(MR-Q) SoundManager 경유 연결
- [x] 핵심 SFX 배선: 공격/대시/슬로우/아이템3/상점/UI클릭
- [x] BGM 배선: 타이틀 + 스테이지 3테마(`bgm_<theme>`)
- [x] 플레이어 사망음 + 보스 공격/사망/그로기음
- [x] 볼륨 슬라이더 연동 + 이중 재생 정리
- [x] SoundTable.csv `#wired` 컬럼로 배선 현황 문서화

## 후속 (MR-R 범위 밖 — 선행 작업 필요) → **[[MR-R2]]** 로 이관
잔여 사운드 17종은 후속 티켓 **MR-R2**(사운드 잔여 배선)에서 다룬다.
- **적 종족음 10종** (`todo:species`) → MR-V(신규 적 유형)에서 종족 태그 추가 후 배선.
- **능력음 5종** (`todo:map?`) → 능력 2종↔키 5종 매핑 결정 필요.
- **스토리 BGM 2종** (`todo`) → 스토리 인트로 화면 구현 필요.

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
