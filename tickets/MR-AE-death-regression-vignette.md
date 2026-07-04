---
id: MR-AE
title: 죽음→회귀 연출 (묘비 낙하 + 비네팅 전환 + 회귀 씬)
status: todo
owner: unassigned
area: mixed
touches:
  - RootDesk/MyDesk/Stage/StageManager.mlua
  - RootDesk/MyDesk/UI/FadeOverlay.mlua
  - RootDesk/MyDesk/Cutscene/CutsceneController.mlua
  - RootDesk/MyDesk/Core/GameConstants.mlua
  - RootDesk/MyDesk/Models/
  - ui/FlashGroup.ui
depends_on: []
branch: ""
created: 2026-07-04
updated: 2026-07-04
---

# 죽음→회귀 연출 (묘비 낙하 + 비네팅 전환 + 회귀 씬)

## Goal
플레이어 사망 시 "시간이 되감기는(회귀)" 시네마틱을 넣는다: 묘비 낙하 → 비네팅으로 화면 조여들며 암전 → 밝아지며 회귀 씬 → 다시 암전 → 밝아지며 스테이지 재시작. 현행 밋밋한 검정 알파 페이드(`FadeOverlay`)를 비네팅 전환으로 격상.

## 스펙
- 설계 문서: `docs/superpowers/specs/2026-07-04-death-regression-vignette-design.md` (draft — 오픈 퀘스천 확정 후 진행)
- **비네팅 방법 확인 완료**: 네이티브 `ShaderType.Vignette=56` 셰이더 존재. Option A(셰이더 머티리얼 + `_MaterialService:ChangeMaterialProperty` ClientOnly, 권장) / Option B(방사형 비네팅 텍스처 오버레이, `FadeOverlay` 패턴 폴백).

## Acceptance criteria
- [ ] 사망 시 묘비가 사망 지점에 낙하 연출
- [ ] 비네팅이 가장자리부터 조여들며 암전 → 밝아짐(2회: 회귀 씬 전후)
- [ ] 회귀 씬 표시(내용/시간/스킵은 오픈 퀘스천 확정에 따름)
- [ ] 연출 후 스테이지가 깨끗하게 재시작 (입력 억제/grace 정상)
- [ ] 짧은 연출 각 비트에 `log()` 증거 + play 스크린샷 검증

## Subtasks
<owner가 착수 시 작성. 스펙의 오픈 퀘스천부터 확정.>
- [ ] 오픈 퀘스천 확정 (트리거 범위: 매 사망 vs 게임오버만 / 회귀 씬 내용 / 비네팅 스펙 / 묘비 에셋·despawn / 멀티플레이 규칙)
- [ ] 비네팅 방법 A vs B 최종 결정 (`references/material.md` 정독 후 Vignette 셰이더 property·적용 대상 검증)
- [ ] 묘비 `.model` + 스프라이트(msw-search/painter) + 낙하 tween
- [ ] VignetteOverlay (FadeOverlay 일반화) + 회귀 씬 표시기
- [ ] StageManager 사망 타이머 체인에 시퀀스 삽입 + GameConstants 튜너블
- [ ] play 검증 (각 비트 로그+스크린샷)

## Notes / decisions
- **재사용**: `StageManager.OnPlayerDeath`(hold→ToBlack→ResetStage→FromBlack 체인 이미 존재), `FadeOverlay`(ToBlack/FromBlack, ScreenFadeDuration), `CutsceneController`(회귀 씬 패턴, 인트로 7씬이 이미 "회귀가 시작된다").
- 오픈 퀘스천 6종은 스펙 문서 참조.

## Verify
- Maker `play` → 사망 유도 → 묘비 낙하 → 비네팅 조여듦/열림 2회 → 회귀 씬 → 재시작 → `logs` 에러 0. 각 비트 log() 증거.
