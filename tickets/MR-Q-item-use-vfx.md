---
id: MR-Q
title: 연막/섬광 아이템 사용 이펙트 (풀스크린 플래시 + 연막 파티클)
status: review
owner: dust9826
area: mixed
touches:
  - RootDesk/MyDesk/Stage/BattlefieldFx.mlua
  - RootDesk/MyDesk/UI/FlashOverlay.mlua
  - RootDesk/MyDesk/Core/GameConstants.mlua
  - ui/
depends_on: []
branch: "feat/item-effects"
created: 2026-06-28
updated: 2026-06-28
---

# 연막/섬광 아이템 사용 이펙트 (풀스크린 플래시 + 연막 파티클)

## Goal
연막탄/섬광탄이 기능(서버 은신·기절 플래그)은 동작하나 **클라 시각 이펙트가 전혀 없어** 사용 피드백이 없었다(특히 섬광은 "번쩍"이 핵심인데 0). 두 아이템에 시각 이펙트를 붙여 사용감을 준다. (rock은 투사체 스프라이트가 있어 제외.)

## Acceptance criteria
- [x] 섬광탄: 풀스크린 백색 플래시(전 UI 위) → 페이드아웃
- [x] 연막탄: 시작 버스트 1회 + 지속 연막(SmokeDuration) → 자동 제거
- [x] 서버 권위(ActivateStun/ActivateSmoke)에서 클라 이펙트로 정상 디스패치
- [x] build 0에러 + play 실측

## Subtasks
- [x] GameConstants: FlashFadeTime/FlashPeakAlpha + SmokeEffect 버스트/루프 RUID + scale
- [x] FlashOverlay.mlua(@Component) — 풀스크린 흰 스프라이트에 부착, BattlefieldFx 레지스트리 등록, alpha 페이드(OnUpdate)
- [x] FlashGroup (UIBuilder) — 풀스크린 흰 스프라이트(stretch, alpha0, raycast off) + FlashOverlay 부착, displayOrder 100
- [x] BattlefieldFx: @ExecSpace(Client) ClientSmokeFx/ClientFlashFx + ActivateSmoke/ActivateStun에서 호출
- [x] refresh → build → play 실측(스크린샷 + 서버→클라 로그)

## Notes / decisions
- 이펙트는 클라 전용(EffectService/SpriteGUIRenderer) → 서버 ServerOnly에서 `@ExecSpace("Client")` 메서드 호출로 브로드캐스트. 실측으로 동작 확인(STUN active → FlashOverlay.Play ← ClientFlashFx).
- 연막 RUID 2종(기획 지정): 시작 1회 `2c39569f…` / 지속 루프 `8e5ca7e1…`. 루프 serial 잡아 SmokeDuration 후 RemoveEffect.
- 섬광은 화면 전체 플래시라 월드 파티클 대신 UI 오버레이(FlashGroup, order 100)로 — 모든 HUD/팝업 위에 덮임.
- **PR #12** (`feat/item-effects → chore/ticket-system`, 커밋 `e23b8db`). PR #11 위에 **스택**(diff=아이템 커밋만). #11 머지 후 base를 master로 재타겟.
- 로드 스킬: msw-combat-system(§4 이펙트) + msw-ui-system(FlashGroup 오버레이/UIBuilder).
- 단일 플레이어 런 전제([[single-player-run-assumption]]) — 클라 브로드캐스트 대상 1인.

## 튜닝 노브 (후속, 선택)
- `SmokeEffectScale`(3.0) — 실측상 화면 넓게 깔림. 국소화하려면 축소.
- `FlashFadeTime`(0.35) / `FlashPeakAlpha`(0.9) — 섬광 지속·세기.

## Verify
- Maker play → 섬광 사용 시 풀스크린 백색 플래시, 연막 사용 시 안개 헤이즈. (스크립트 직접 발동 + 서버 ActivateStun 경로 로그로 검증 완료.)
