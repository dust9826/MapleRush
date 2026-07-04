---
id: MR-AE
title: 죽음→회귀 연출 (묘비 낙하 + 비네팅 전환 + 회귀 씬)
status: review
owner: dust9826
area: mixed
touches:
  - RootDesk/MyDesk/UI/RegressionOverlay.mlua
  - RootDesk/MyDesk/UI/GameOverController.mlua
  - RootDesk/MyDesk/UI/GameClearController.mlua
  - RootDesk/MyDesk/Core/GameConstants.mlua
  - ui/RegressionGroup.ui
depends_on: []
branch: "feat/MR-AE-regression-vignette"
created: 2026-07-04
updated: 2026-07-04
---

# 죽음→회귀 연출 (묘비 낙하 + 비네팅 전환 + 회귀 씬)

## Goal
플레이어 사망 시 "시간이 되감기는(회귀)" 시네마틱을 넣는다: 묘비 낙하 → 비네팅으로 화면 조여들며 암전 → 밝아지며 회귀 씬 → 다시 암전 → 밝아지며 스테이지 재시작. 현행 밋밋한 검정 알파 페이드(`FadeOverlay`)를 비네팅 전환으로 격상.

## 스펙
- 설계 문서: `docs/superpowers/specs/2026-07-04-death-regression-vignette-design.md` (**Confirmed**)
- **스코프 확정(축소)**: 게임오버/클리어 화면의 `다시도전`/`로비로` 버튼 트리거 전용. 묘비·텍스트 회귀 씬·매-사망 트리거는 제외.
- **연출 확정**: 회귀 이미지(`93cefac9728c4911a9309bcdf96a516a`) 풀스크린 + 더블 블링크 비네팅(감고 뜨면 회귀 이미지 → 홀드 → 감고 뜨면 목적지).
- **비네팅 방식 확정**: 방사형 비네팅 텍스처 오버레이(UI 레이어 합성). 카메라 포스트프로세스는 UI에 안 걸려 기각.

## Acceptance criteria
- [x] 4개 버튼 핸들러 → 오버레이 `Play()` 위임 (Play 경로 런타임 검증; 실제 마우스클릭은 빌드검증)
- [x] 더블 블링크: 감기1→뜨기1(회귀 이미지)→홀드→감기2→뜨기2(목적지)
- [x] 비네팅이 원형(iris)으로 닫혔다 열림(RadialGradient Intensity) + 암전(BlackFill/iris≈0)
- [x] restart→새 런 / lobby→로비 복귀 (lobby 런타임 검증, 컨텍스트 확정)
- [x] 목적지 로드가 암전(감김) 뒤 수행(close2 end DoLoad) → 이중 페이드 미노출
- [x] 각 비트 `log()` 증거 + play 스크린샷 검증

## Subtasks
- [x] 회귀 이미지 RUID 렌더 확인(fullscreen OK) + 방사형 비네팅 텍스처 생성(msw-painter)
- [x] `ui/RegressionGroup.ui` (UIBuilder): Illust/BlackFill/Vignette 3레이어 풀스크린, 최상위 displayOrder
- [x] `RegressionOverlay.mlua`: 자기등록 + `Play(mode)` + OnUpdate 5비트 상태머신(openness 구동)
- [x] GameConstants 튜너블(블링크/홀드 시간, 비네팅 scale, 이미지 RUID)
- [x] 4개 버튼 핸들러 배선(즉시 액션 → 오버레이 Play, nil 가드 폴백) + 로드/컨텍스트 오버레이로 이관
- [x] play 검증 완료: 오버레이 등록(mat=true)·회귀 이미지 fullscreen·방사형 비네팅 iris(스크린샷)·5비트 시퀀스(close1/open1/hold/close2/DoLoad/open2/finished) 로그·에러0. lobby 경로 검증(restart 경로는 동일 DoLoad 패턴).

## 비네팅 방식 최종 = RadialGradient 셰이더 (업로드 텍스처 트랩 회피)

⛔ **MCP 업로드 스프라이트 런타임 unavailable 트랩 확정**(계정→blank quad / 그룹→완료콜 에러) → 업로드 텍스처 방식 폐기.
✅ **채택: `RadialGradient`(ColorEffect) 셰이더 머티리얼** `RootDesk/MyDesk/Materials/RegressionVignetteMat.material`(InColor 투명중앙/OutColor 검정/IsUIMaterial=true). 회귀 이미지(Illust)에 `ChangeMaterial` 후 `_MaterialService:ChangeMaterialProperty(matId,{Intensity=x})`로 iris 반경 애니메이션(닫힘≈0.02 핀포인트 / 열림 3.0 클린). 해상도 독립·소프트, 에셋 업로드 0.
- 참고: `Vignette`(Screen) 셰이더는 카메라 전용이라 UI에 안 걸려 기각. RadialGradient는 GUI 스프라이트 MaterialId로 동작 확인.
- 미사용 잔재: `docs/superpowers/assets/regression-vignette.png`, 업로드 스프라이트 RUID(account dad51.../group e9e934...) — 코드 미참조.

## Notes / decisions
- **재사용**: `StageManager.OnPlayerDeath`(hold→ToBlack→ResetStage→FromBlack 체인 이미 존재), `FadeOverlay`(ToBlack/FromBlack, ScreenFadeDuration), `CutsceneController`(회귀 씬 패턴, 인트로 7씬이 이미 "회귀가 시작된다").
- 오픈 퀘스천 6종은 스펙 문서 참조.

## Verify
- Maker `play` → 사망 유도 → 묘비 낙하 → 비네팅 조여듦/열림 2회 → 회귀 씬 → 재시작 → `logs` 에러 0. 각 비트 log() 증거.
