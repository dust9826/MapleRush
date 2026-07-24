---
id: MR-AH
title: 콤보 시스템 (DMC5식 스타일 랭크 D~SSS + 우측중앙 HUD)
status: done
owner: D4LGONA
area: mixed
touches: [RootDesk/MyDesk/Combo/ComboManager.mlua, RootDesk/MyDesk/UI/ComboHud.mlua, RootDesk/MyDesk/Enemy/EnemyHealth.mlua, RootDesk/MyDesk/Enemy/Boss/GroggyGauge.mlua, RootDesk/MyDesk/Stage/StageManager.mlua, RootDesk/MyDesk/Stage/GameStateManager.mlua, RootDesk/MyDesk/Stage/FloorManager.mlua, RootDesk/MyDesk/Sound/SoundTable.csv, ui/HUD.ui]
depends_on: []
branch: "feat/combo-system"
created: 2026-07-24
updated: 2026-07-24
---

# 콤보 시스템 (DMC5식 스타일 랭크 D~SSS + 우측중앙 HUD)

## Goal
전투 흐름을 끊지 않고 유지한 숙련도를 D~SSS 등급으로 보여 주는 콤보 시스템을 넣는다.
보상·재화·랭킹에 전혀 영향을 주지 않는 순수 과시 지표. 기획서: `docs/MapleRush_Combo_doc.md`.

## Acceptance criteria
- [x] **등급 임계값** 2/5/10/17/25/40/70 → D/C/B/A/S/SS/SSS 정확 표시. SSS 이후 처치수만 증가 (§3)
- [x] **적립**: 일반 적 "사망 확정"(EnemyHealth.Die) 시 +1 / 보스 그로기 "첫 진입" 1회만 +1. 다단히트·광역·상태이벤트 반복 중복집계 없음 (§4.1/4.5/4.6, §8)
- [x] **잔여시간 12초**: 처치·그로기진입마다 12초로 갱신 (§4.2/4.4)
- [x] **정지 구간**: 상점 / 보상·노드 선택 / 맵전환·로딩 / ESC 일시정지 / 사망~전투재개 동안 잔여시간 완전 정지, 재개 시 정지 직전 값부터 (§5)
- [x] **시간 하락**: 전투 중 12초 무처치 → 정확히 한 단계 하락 + 처치수를 새 등급 최소값으로 + 잔여시간 12초 재설정. D/무등급이면 완전 초기화 (§5)
- [x] **사망 하락**: 한 단계 하락(D/무등급은 해제) + 잔여시간 12초 재설정 (§6)
- [x] **런 종료 초기화**: 게임오버 / 전층클리어 / 런 포기 / 새 런 시작 시 전부 0. 영구저장 없음 (§6)
- [x] **HUD 우측중앙**: 등급(D 이상) / `N KILLS`(첫 처치 후) / 12초 게이지(첫 처치 후). 기존 HP·스테이지·스킬 UI 미가림 (§7)
- [x] **연출**: 등급 상승 시 1회 확대·반동+효과음 / 사망 하락 `COMBO DOWN` / 시간 하락 `STYLE DOWN` / 잔여 25% 이하 게이지만 펄스 / 완전 초기화 시 축소·페이드아웃 (§7)
- [x] **비침습**: 공격력·재화·드롭·랭킹 어디에도 콤보가 반영되지 않음 (§9)

## Subtasks
- [x] `Combo/ComboManager.mlua` (@Logic, 서버권위 상태머신 + @Sync 표시상태 + 연출 이벤트 시리얼)
- [x] 훅 배선: EnemyHealth.Die / GroggyGauge.Charge / StageManager.OnPlayerDeath·GameOver·RequestAbandonToLobby / GameStateManager.StartRun / FloorManager.GameClear
- [x] `ui/HUD.ui` ComboPanel(우측중앙) + `UI/ComboHud.mlua` 컨트롤러 + 바인딩 주입
- [x] SoundTable.csv 콤보 효과음 키 등록
- [x] 빌드 clean(에러 0, LIA-1114 Info만) + 런타임 검증 PASS (execute_script)

## 검증 결과 (2026-07-24, execute_script)
- TEST-A 임계값: `1:- 2:D 4:D 5:C 9:C 10:B 16:B 17:A 24:A 25:S 39:S 40:SS 69:SS 70:SSS 999:SSS`
- TEST-B 5처치 → count=5 grade=C remain=11.97 / 등급상승 이벤트는 2·5에서만 1회씩
- TEST-C 보스 처치 미집계(count 유지) / TEST-D 보스 그로기 +1
- TEST-E 사망 하락 S→A(count 17, remain 12 재설정) / TEST-F D에서 사망 → 완전 해제(0/'')
- TEST-G 시간 소진 B→C(count 5, remain 12 재설정) / TEST-J D에서 시간 소진 → 완전 초기화
- TEST-H 비전투 2초 정지: remain 11.699 → 11.699 (delta 0.000) / TEST-I 재개 1초 → 10.704
- TEST-L ESC(서버 게임시계 정지) 2초: 11.464 → 11.464, 재개 1초 후 10.454
- TEST-M 클라 미러 5.102 → 4.087(1초), HUD 실엔티티 `enable=true grade='D' kills='2 KILLS' fill=0.341`
- 미검증(수동): 실제 화면 스크린샷(연출 룩앤필). 로직·바인딩·값 반영은 전부 로그로 확인됨.

## 리뷰에서 잡은 버그 (PR #100, 410ba6a)
`Count`와 `LastEvent`가 별개 @Sync라 클라 도착 순서가 보장되지 않는다. 실측 결과 `Count`(0)가 먼저 와서
`ComboHud.OnUpdate`가 그 프레임에 패널을 꺼버렸고, 뒤늦게 온 하락 이벤트의 문구가 화면에 영영 안 보였다
(+ `eventText` 영구 잔류 → 다음 콤보 시작 시 지난 문구가 스쳐 보임).
→ **완전 해제 케이스에서 `COMBO DOWN`/`STYLE DOWN`이 전혀 동작하지 않던 상태.** 한 단계 하락은 정상이었다.

수정: `count<=0` 프레임에 즉시 숨기지 않고 문구 표시 시간만큼 대기 후 페이드아웃 + `HidePanel()`에서 잔류 문구 정리.
실측: `0.60~1.60s enable=true event='COMBO DOWN'` → `1.80s alpha=0.91` → `2.20s enable=false event=''`.

**교훈**: 서로 다른 @Sync 프로퍼티에 걸친 클라 연출은 도착 순서를 가정하면 안 된다.
값(Count)과 연출 트리거(LastEvent)가 분리돼 있으면, 값 쪽 분기가 연출을 앞질러 지워버릴 수 있다.

## 후속 후보 (비차단)
- `ComboHud.gaugeTrack` 바인딩 미사용 — 트랙 색 동적 변경 계획 없으면 정리
- 콤보 효과음 RUID 확보 시 `SoundTable.csv`의 `sfx_combo_up` / `_up_high` / `_down` 채우기 (코드 수정 0)

## Notes / decisions
- **시계**: `WallClock:ServerNow()` 기반 스냅샷 차분(만료시각 `expireAt`). ESC 일시정지는 WallClock이 서버 시계를 얼리므로 자동 처리 — 별도 훅 불필요.
- **전투 활성 게이팅**: `_RunTimer.Running and _RunTimer.Active`를 폴링해 ticking을 결정.
  RunTimer.Active는 이미 "전투 스테이지 진입=true / 스테이지 클리어·사망·상점·보상=false"로 배선돼 있어
  기획서 §5의 정지 구간 목록과 정확히 일치한다 → StageManager 곳곳을 고치지 않고 단일 진입점으로 해결.
- **중복집계 방지**: 처치는 `EnemyHealth.Die`(IsDead 가드로 1회 보장), 보스는 `GroggyGauge.Charge`에서
  IsGroggy가 false→true로 넘어가는 그 지점(이미 그로기 중엔 early-return이라 재진입 없음).
- **보스 처치**: 보스 사망은 콤보 +1 대상이 아니다(§4.1 "일반 적"). 보스 기여는 그로기 진입뿐.
- **HUD 라이브 게이지**: RunTimer와 동일 패턴 — 서버가 `RemainingAtSync` + `SyncSerial`을 동기화하고
  클라는 `WallClock:Now()` 세그먼트로 미러(클라 ESC 정지도 자동 반영).
- 콤보 효과음 RUID는 미확보 → SoundTable에 키만 등록하고 `enabled=FALSE`(무음). RUID 확보 시 CSV만 채우면 됨.

## Verify
Maker play → 전투에서 연속 처치로 D→C→B 등급 상승 로그·HUD 확인 → 12초 방치 시 한 단계 하락(STYLE DOWN) →
상점/ESC에서 게이지 정지 → 사망 시 한 단계 하락(COMBO DOWN) → 게임오버 후 새 런에서 0부터. logs로 각 단계 확인.
