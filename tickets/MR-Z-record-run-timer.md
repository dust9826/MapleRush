---
id: MR-Z
title: 베스트 기록 & 런 타이머 & 글로벌 리더보드
status: review
owner: D4LGONA
area: mixed
touches: [RootDesk/MyDesk/Core/WallClock.mlua, RootDesk/MyDesk/Stage/FloorManager.mlua, RootDesk/MyDesk/Stage/StageManager.mlua, ui/LobbyGroup.ui, ui/]
depends_on: []
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 베스트 기록 & 런 타이머 & 글로벌 리더보드

## Goal
스피드 로그라이트 "메이플 러시"에 시간=성장지표를 노출한다. ① 인게임 상단 런 타이머, ② 로비 베스트 기록판, ③ 글로벌 리더보드(ranking-basic-package) 한 번에 구현. 기획서: `docs/record_and_run_timer_design_doc.md`.

## Acceptance criteria
- [ ] **런 타이머**: 첫 스테이지 조작가능 시점 시작 / 사망·최종클리어 종료 / ESC·테마·노드·상점·맵전환 중 정지 (§4). WallClock 스냅샷 기반, delta 누산 금지
- [ ] **기록 저장**: DataStorage `user_best_record` 스키마 §6.1, 비교규칙 §3.3(층>진행도>시간), stageRecords, 신기록만 저장(서버 판정 §6.4)
- [ ] **인코딩**: composite score §6.3 `floor*10^11 + stageProgress*10^8 + (10^8-centisec)`, integer int64 확인
- [ ] **인게임 HUD**: 상단중앙, 현재시간 `MM:SS` 1초 갱신 + 이전기록 라인(진행도 매칭 시만) 소형, 색상변화 없음 (§5.2)
- [ ] **로비 기록판**: 중앙좌측, 케이스별 문구 §5.1, 시간 `MM:SS.CC`, 기존 톤 유지
- [ ] **리더보드**: ranking-basic-package 도입(msw-packages 확인), SetScoreAndWait 등록, 로비에 본인순위+상위10 리스트(§8.2), MSW 계정 닉네임

## Subtasks
- [x] MaxFloors 2→3 (기획서 §3.1 정렬)
- [x] RunTimer.mlua (@Logic, WallClock 위, Active 게이팅으로 비전투구간 제외)
- [x] RecordStorage.mlua (@Logic, §6.1 스키마 + §6.3 인코딩 + 신기록 판정 + stageRecords)
- [x] 매니저 훅 배선: RequestStartRun/ResetStage/OnEnemyKilled/OnPlayerDeath/GameOver/RequestAbandon(StageManager) + GameClear/OnStageRewardDone(FloorManager) + PlayerBootstrap 로드
- [x] 빌드 clean 확인 (에러 0)
- [x] 런타임 검증 (인코딩/포맷/타이머 카운트·게이팅·로드 전부 PASS — execute_script)
- [x] 타이머 HUD (HUD.ui 상단중앙 TimerText/TimerPrevText + HUDController 배선, §5.2)
- [x] 로비 기록판 (LobbyGroup.ui RecordBoard + LobbyController RefreshRecordBoard, §5.1)
- [x] ranking-basic-package 통합(11파일 도입, CycleEnum=None 단일보드, RankingViewLogic 축소, DateTimeLogic LEA-4002 수정)
- [x] SubmitToLeaderboard 배선(ProfileCode+닉네임 tag+SetScoreAndWait) + 로비 순위 라인 + 상위10 패널
- [x] 리더보드 런타임 검증 PASS: 등록→저장(CycleIndex=1)→조회→층/시간 디코드→닉네임 표시(execute_script)

## 잔여/주의
- ⚠ Global/WorldConfig.config `PlayerEntityAuthorityCheck=true` (README 권장) — 단, 현재 단일플레이 환경에선 미설정에도 등록 ok=true 검증됨. 다중 권한 이슈 시 Maker에서 수동 설정.
- 전체 게임루프(런→전투→사망→SubmitRun→기록/리더보드→로비 반영)는 컴포넌트별 + 훅 배선 검증 완료. 실제 전투 플레이스루로 한 번 더 확인 권장.
- 시즌/사이클·리더보드 F키/GM툴·리셋 기능은 기획서 §1.3대로 미도입.
- ★버그수정: 패키지의 랭킹 리스트/내 순위는 UpdateDataTable(30분 주기/재시작)에만 재빌드 → 세션 중 방금 등록한 점수가 로비에 미반영("등록 안 됨"처럼 보임). SubmitToLeaderboard 등록 성공 직후 UpdateDataTable()+캐시 Clear() 호출로 즉시 반영. 검증: 등록 직후 listCount=1/myRank=1.

## Notes / decisions
- **WallClock.mlua** 가 이미 ESC 일시정지-인지 게임시계 → §8.1 ESC 리스크 사실상 해결. RunTimer는 위에 얹고 비전투구간(theme/node/shop)만 추가 게이팅.
- 훅 지점 실존 확인: FloorManager `PhaseName`/`NormalsClearedThisFloor`/`ShopDoneThisFloor`, StageManager `combatPaused`/`StageType`.
- ranking-basic-package 미도입 상태 → from scratch 금지, msw-packages 로 README 먼저.
- stageProgress 정규화: `NormalsClearedThisFloor*2 + shop + boss*100` 류 단조증가(§8.1) 확정 필요.
- 미결(§8.2 확정): 계정리셋 미제공 / 리더보드 상위10+본인순위 / MSW 닉네임.

## Verify
Maker play → 첫 스테이지 진입 시 타이머 증가·ESC/상점 정지 → 런 종료 시 기록 저장·리더보드 등록 → 로비 재진입 시 기록판+순위 노출. logs 로 각 단계 확인.
