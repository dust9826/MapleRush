# 회귀(Regression) 연출 — 눈뜨기 전환 · Design Spec

- 날짜: 2026-07-04
- 상태: **Confirmed (구현 진행)**
- 관련 티켓: MR-AE (death-regression-vignette)
- 브랜치: `feat/MR-AE-regression-vignette`

> 이 스펙은 원래 grand 초안(묘비 낙하 + 텍스트 회귀 씬 + 매 사망마다)을 **사용자 확정에 따라 축소**한 것이다. 묘비/텍스트 씬/매-사망 트리거는 **스코프에서 제외**한다.

## 목표 (Goal)

게임 한 판이 종료되는 순간(목숨 0 사망 = 게임오버, 또는 게임 승리 = 게임클리어) 화면에서, 플레이어가 **`다시 도전` 또는 `로비로`** 버튼을 누르면 "회귀(다시 태어남)" 시네마틱을 재생한다:

**게임오버/클리어 화면 → 눈 감고(암전) → 눈 뜨면 회귀 이미지 → 홀드 → 다시 눈 감고(암전) → 눈 뜨면 목적지(재시작 게임 / 로비)**

= 비네팅(iris)이 **닫혔다 열림 × 2회**(더블 블링크). 두 블링크 사이에 "회귀 이미지"가 드러난다. 커버가 검은 순간 뒤에서 실제 목적지 로드를 수행해 이중 페이드가 안 보이게 한다.

## 스코프

| 포함 | 제외 |
|---|---|
| 게임오버/클리어 × `다시도전`/`로비로` = **4개 버튼 핸들러** 트리거 | 매 사망(부활) 시 연출 — 기존 검정 페이드(`FadeOverlay`) 유지 |
| 회귀 이미지 1장 풀스크린 + 더블 블링크 비네팅 | 묘비(tombstone) 낙하 |
| restart/lobby 동일 연출(목적지 로드만 다름) | 텍스트 타자기 회귀 씬(CutsceneController) |

## 비네팅 방식 결정 — 방사형 텍스처 오버레이 (확정)

- **기각**: 카메라 포스트프로세스 비네팅(`SlowMotion.mlua`의 `cam:ChangeMaterial(MatVignette)`). 이유 (1) on/off 바이너리라 서서히 열림 애니메이션 불가, (2) **카메라 포스트프로세스는 UI 오버레이에 적용 안 됨** — 카메라가 그리는 "게임 월드"만 어둡게 하고, UI로 띄운 회귀 이미지 위에는 비네팅이 걸리지 않는다.
- **채택**: 회귀 이미지와 **같은 UI 레이어에서 합성**되는 방사형 비네팅 텍스처 오버레이. `FadeOverlay`/`FlashGroup` 풀스크린 오버레이 패턴 그대로 확장.

## 아키텍처

### 새 에셋 2개
1. **회귀 이미지**: RUID `93cefac9728c4911a9309bcdf96a516a` → `SpriteGUIRendererComponent.ImageRUID`. (적용 시 정상 sprite/image RUID 인지 확인; animationclip/skeleton이면 `thumbnail://` 프리픽스.)
2. **방사형 비네팅 텍스처**: 중앙 소프트 투명 원(iris) → 사방 검정, 화면보다 충분히 큰 정사각 PNG. `msw-painter`로 방사형 그라디언트 생성 후 계정/그룹 리소스로 업로드 → RUID 확보. (업로드 스프라이트가 런타임 `unavailable`일 수 있음 — 확보 후 play에서 실제 렌더 확인.)

### 새 UI: `ui/RegressionGroup.ui` (UIBuilder 전용)
최상위 displayOrder(로비·게임오버·클리어 패널보다 위)의 풀스크린 UIGroup, 초기 비활성. 3레이어(뒤→앞):

| 엔티티 | 컴포넌트 | 역할 |
|---|---|---|
| `Illust` | `SpriteGUIRendererComponent` (스트레치 풀스크린) | 회귀 이미지. alpha 토글(회귀 표시 구간만 1, 그 외 0=투명하여 뒤 화면 비침) |
| `BlackFill` | `SpriteGUIRendererComponent` (검정, 풀스크린) | 완전 암전 보장. alpha = (1 − openness) |
| `Vignette` | `SpriteGUIRendererComponent` (방사형 텍스처, 스트레치+scale) | 소프트 iris 가장자리. scale = openness에 따라 `VignetteClosedScale`→`VignetteOpenScale` 보간 |

> `BlackFill`이 암전을 보장하고 `Vignette`가 부드러운 원형 경계를 얹는 2중 구성. openness 하나로 둘 다 구동.

### 새 스크립트: `RootDesk/MyDesk/UI/RegressionOverlay.mlua` (@Component, ClientOnly)
`FadeOverlay`와 동형(자기등록 + `OnUpdate` 구동). `RegressionGroup` 루트에 부착.

- `OnBeginPlay`: `_StageManager.regressionOverlay = self` 자기등록, 그룹 숨김.
- 진입점 `method void Play(string mode)` — `mode` = `"restart"` | `"lobby"`. (ClientOnly)
- `OnUpdate(delta)`: 비트 상태머신. `phase`(문자열) + `phaseT`(경과) 진행. openness 계산 → `BlackFill`/`Vignette`/`Illust` 반영.

**openness 구동식**: `BlackFill.Color = Color(0,0,0, 1 - openness)`; `Vignette` scale = lerp(closed, open, openness); (선택) `Vignette` alpha도 openness와 함께 페이드해 완전 열림 시 잔여 링 제거.

### 타임라인 (mode 무관, 비트4의 로드 대상만 분기)

| # | phase | 동작 | 지속 |
|---|---|---|---|
| 0 | (start) | 그룹 켬. 입력 차단(연출 컨텍스트). `Illust` alpha=0. openness=1(현재 화면이 그대로 보임) | 즉시 |
| 1 | `close1` | openness 1→0 (암전). 진입 시 호출자 패널은 이미 숨김 | `RegressionBlinkCloseDuration`(~0.5s) |
| 2 | `open1` | `Illust` alpha=1(회귀 이미지). openness 0→1 → 회귀 이미지 드러남 | `RegressionBlinkOpenDuration`(~0.7s) |
| 3 | `hold` | 회귀 이미지 유지 | `RegressionHoldDuration`(~0.8s) |
| 4 | `close2` | openness 1→0 (암전). **암전 완료 시 목적지 로드**: restart→`_StageManager:RequestRestartRun()` / lobby→로비 Root Enable + `_SelectBackdrop:ShowLoading(false)` + `_SoundManager:PlayBGMKey("bgm_title")`. `Illust` alpha=0 | `RegressionBlinkCloseDuration`(~0.5s) |
| 5 | `open2` | openness 0→1 → 목적지(재시작 게임/로비) 드러남 | `RegressionBlinkOpenDuration`(~0.7s) |
| 6 | (end) | 그룹 끔. `_InputRouter:SetContext(restart→"Combat" / lobby→"Lobby")` | 즉시 |

- 목적지 로드가 비트4의 검은 순간에 수행되므로 스테이지 자체 검정 페이드(`ClientStageReset`의 `FromBlack`)는 우리 오버레이(상위 레이어)가 가려 이중 페이드 미노출.
- close/open 각 방향 지속시간은 상수로 분리(감기 빠르게/뜨기 느리게 등 튜닝 여지). 초안: 감기 0.5s / 뜨기 0.7s / 홀드 0.8s → 총 ≈ 2.9s.

### 트리거 배선 (4개 핸들러 수정)
`GameOverController.OnRestartClick/OnLobbyClick`, `GameClearController.OnRestartClick/OnLobbyClick`를 수정:

```
(기존) 패널 숨김 → 즉시 restart/lobby 액션
(변경) 패널 숨김 → _StageManager.regressionOverlay:Play("restart"|"lobby")
```

실제 restart/lobby 로드와 최종 `SetContext`는 **오버레이가** 비트4/비트6에서 수행(중복 제거). 게임오버는 `_InputRouter` 컨텍스트가 팝업 상태이므로, 오버레이가 최종 컨텍스트를 확정.

`regressionOverlay`가 아직 미등록(nil)인 경우 폴백: 오버레이 없이 기존처럼 즉시 액션(안전). 핸들러에 nil 가드.

### GameConstants 신규 튜너블
`RegressionImageRUID`(문자열; 하드코드 대신 상수), `RegressionBlinkCloseDuration`, `RegressionBlinkOpenDuration`, `RegressionHoldDuration`, `VignetteClosedScale`, `VignetteOpenScale`. (기존 `ScreenFadeDuration` 등과 별개로 회귀 전용 상수.)

## 오케스트레이션/엣지

- **입력 억제**: 연출 동안 `_InputRouter`를 비-전투 컨텍스트로 두고, 종료 시 목적지 컨텍스트 확정. 더블 클릭/재진입 방지: `Play` 진입 시 이미 재생 중이면 무시(가드 플래그).
- **멀티플레이**: 현 코드 전제(1인 1런, 게임오버/클리어는 로컬 클라 UI). 오버레이도 로컬 클라 전용 — 서버 호출은 `RequestRestartRun`(기존 Server RPC)뿐.
- **슬로우/타임스케일**: 연출은 `delta`(실시간) 기반. 종료 시 `_UtilLogic:SetClientTimeScale(1.0)` 확인(restart 경로는 `ResetStage`가 이미 처리).

## 검증 계획

- `play` → 게임오버 유도(사망/치트) → `다시도전` 클릭 → 각 비트 `log()`(`close1`/`open1`/`hold`/`close2`/`open2`/end 진입) + 스크린샷(암전→회귀이미지→암전→재시작 화면) 확인. `로비로`도 동일.
- 짧은 비트라 스크린샷 미스 대비 각 phase 진입 `log()` 필수(verify-checklist Step 2b). 필요 시 홀드/블링크 시간을 검증 라운드에서만 늘림.
- 회귀 이미지·비네팅 텍스처 RUID가 실제 렌더되는지(업로드 스프라이트 `unavailable` 함정) play에서 눈으로 확인.

## 재사용 자산

- `FadeOverlay.mlua` — 자기등록(`_StageManager.fadeOverlay=self`) + `OnUpdate` alpha 램프 패턴. `RegressionOverlay`의 베이스.
- `GameOverController` / `GameClearController` — 4개 버튼 핸들러가 트리거 지점.
- `StageManager.RequestRestartRun`(Server RPC) / 로비 복귀 3종(`lobby.Enable` + `_SelectBackdrop:ShowLoading(false)` + `bgm_title`).
- `_GameConstants` — 튜너블 상수 홈.
