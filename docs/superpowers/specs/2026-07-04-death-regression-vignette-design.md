# 죽음 → 회귀(Regression) 연출 + 비네팅 전환 — Design Spec

- 날짜: 2026-07-04
- 상태: **Draft (스펙만 — 구현은 다음 세션)**
- 관련 티켓: MR-AE (death-regression-vignette)

## 목표 (Goal)

플레이어 사망 시 "시간이 되감기는(회귀)" 느낌의 시네마틱 전환을 넣는다. 현재는 밋밋한 **풀스크린 검정 알파 페이드**(`FadeOverlay`)만 있는데, 이를 **비네팅(화면 가장자리부터 조여드는) 전환**으로 격상하고, 묘비 낙하 + 회귀 씬을 사이에 끼운다.

사용자가 묘사한 시퀀스:

1. 플레이어 사망 → **묘비(tombstone)** 가 떨어진다.
2. **비네팅**이 조여들며 화면이 어두워진다(→ 검정).
3. 다시 밝아지며 **회귀 씬**이 나온다.
4. 비네팅이 다시 조여들며 어두워진다.
5. 다시 밝아지며 **게임(스테이지) 재시작**.

## 현재 코드 자산 (재사용 대상)

| 자산 | 역할 | 재사용 |
|---|---|---|
| `Stage/StageManager.mlua` `OnPlayerDeath` / `GameOver` / `ResetStage` | 사망 → (목숨>0)부활 / (목숨0)게임오버 → 재시작 오케스트레이션. 이미 `hold → ClientFadeToBlack → ResetStage → FromBlack` 타이머 체인 존재 | 시퀀스 오케스트레이션의 뼈대 |
| `UI/FadeOverlay.mlua` (FlashGroup의 풀스크린 검정 `SpriteGUIRendererComponent`) | `ToBlack()`/`FromBlack()`/`SetAlpha()` — dir·alpha를 `OnUpdate`로 선형 보간, `_GameConstants.ScreenFadeDuration` 사용 | 비네팅 오버레이의 베이스 패턴(그대로 확장) |
| `Cutscene/CutsceneController.mlua` | 인트로 7씬(이미지+타자기 텍스트, ESC 스킵). **7씬이 이미 "회귀가 시작된다"** | 회귀 씬을 위한 단일-이미지 씬 컨트롤러 패턴 참고/축소 재사용 |
| `_GameConstants` (`DeathFadeHold`, `ScreenFadeDuration`, `FallRespawnDuration`, `StageEndDelay`) | 사망 연출 타이밍 튜너블 | 여기에 회귀 씬/묘비 타이밍 상수 추가 |
| `_SoundManager:PlaySFXKey("sfx_player_death")` | 사망 효과음(이미 재생) | 회귀 SFX/전환음 추가 지점 |

## 비네팅 구현 방법 — "확인" 결과

MSW에 **네이티브 비네팅 셰이더 존재**: `ShaderType.Vignette = 56` ("Applies a vignette effect"). 관련 후보: `RadialGradient = 7`, `LensDistortion = 55`, `RadialBlur = 61`.

### Option A — 네이티브 Vignette 셰이더 머티리얼 (권장, 프로토타입 우선)

- 풀스크린 UI 스프라이트(또는 FlashGroup 검정 패널)에 `Vignette` 셰이더 머티리얼을 적용.
- 매 프레임 `_MaterialService:ChangeMaterialProperty(...)` (**ClientOnly**)로 비네팅 강도/반경을 `ScreenFadeDuration` 동안 애니메이션 → 가장자리부터 실제로 조여드는 진짜 비네팅.
- 장점: "회귀하는 것 같은" 조여듦이 셰이더로 자연스러움, 에셋 불필요.
- 리스크: **구현 시 `references/material.md` 정독 필요** — Vignette 셰이더의 정확한 property 이름/범위, UI 렌더러 vs 카메라 포스트프로세스 적용 가능 여부를 빌드 타임에 검증. (셰이더 property는 암기 말고 `mlua_Document_Retriever`/`mlua_API_Retriever`로 조회)

### Option B — 방사형 비네팅 텍스처 오버레이 (폴백)

- 중심 투명 → 가장자리 검정인 **방사형 비네팅 PNG**를 풀스크린 `SpriteGUIRendererComponent`로 깔고, `FadeOverlay`와 동일하게 alpha(+옵션 scale)만 애니메이션.
- 에셋: `msw-search`로 방사형 그라디언트/비네팅 찾거나 `msw-painter`로 생성.
- 장점: 셰이더 리스크 0, 기존 `FadeOverlay` 패턴 그대로. 단점: 조여듦이 alpha/scale 근사라 셰이더보다 덜 "진짜".

### Option C — 현행 유지 (baseline)

- 지금의 평면 검정 알파 페이드. 비네팅 아님. 비교 기준선.

> **권장 진행**: A를 먼저 시도 → MSW에서 Vignette 셰이더를 UI/카메라에 매 프레임 구동 불가로 판명되면 B로 폴백.

## 오케스트레이션 설계 (초안)

기존 `StageManager` 사망 타이머 체인을 확장한다. 새 컴포넌트로 **`VignetteOverlay`**(FadeOverlay를 일반화: mode = flat|vignette, close/open + intensity 구동)와 **회귀 씬 표시기**(CutsceneController 축소판, 단일 이미지)를 둔다.

사망 시퀀스(클라, 죽은 유저 기준 — 현재 per-uid RPC 패턴 유지):

```
OnPlayerDeath
  → (hold)            죽은 모습 정지 텀 + 묘비 낙하(tween fall) + 사망 SFX
  → VignetteClose     비네팅 조여듦 → 검정            (ScreenFadeDuration)
  → [분기]
       목숨>0 or 게임오버든 회귀 연출을 태울지 여부 결정(오픈 퀘스천)
  → RegressionScene   비네팅 열림 + 회귀 씬 표시(hold) (RegressionSceneHold)
  → VignetteClose     다시 검정
  → ResetStage/Restart + VignetteOpen  밝아지며 스테이지 시작
```

타이밍은 전부 `_GameConstants` 튜너블(신규: `RegressionSceneHold`, `TombstoneFallTime`, 기존 `DeathFadeHold`/`ScreenFadeDuration` 재사용).

## 묘비(Tombstone)

- 신규 `.model`(`Models/MapObjects/Tombstone.model`) = Transform + SpriteRenderer. 스프라이트는 `msw-search`(메이플 묘비/RIP) 또는 `msw-painter`.
- 사망 지점 위에서 `_TweenLogic`로 낙하 + 살짝 바운스. 회귀/재시작 시 despawn(또는 다음 스테이지 리셋에서 제거).
- 서버 스폰(`SpawnByModelId`, parent=CurrentMap) + Multicast 연출 or 클라 전용 연출(밸런스 무관 시각물이라 클라 전용도 가능) — 구현 시 결정.

## 오픈 퀘스천 (다음 세션에 확정)

1. **트리거 범위**: 회귀 연출을 **매 사망(목숨 차감 부활)**마다? 아니면 **게임오버(목숨0) → 재시작**에서만? ("게임 재시작"이라 후자 뉘앙스지만 "묘비 떨어지고"는 매 사망 느낌 — 확정 필요).
2. **회귀 씬 내용**: 인트로 7씬("회귀가 시작된다") 이미지/텍스트 재사용? 신규 아트? 표시 시간·스킵 가능 여부.
3. **비네팅 스펙**: 색/모양/강도, 타이밍 커브(선형 vs ease-in), 조여드는 반경 범위.
4. **묘비**: 스프라이트 에셋, 낙하 연출, 착지 위치, despawn 시점.
5. **멀티플레이**: 현재 사망 페이드는 죽은 유저 클라 per-uid, 게임오버는 대표 1 클라. 회귀 연출도 동일 규칙으로?
6. **입력/타이머**: 연출 동안 입력 억제(`_InputRouter` 컨텍스트) + `combatGraceUntil` 연장 규칙 재확인.

## 검증 계획 (구현 시)

- `play` → 사망 유도 → 묘비 낙하 → 비네팅 조여듦/열림 2회 → 회귀 씬 → 재시작까지 로그+스크린샷으로 각 비트 확인.
- 비네팅은 짧은 연출이라 `log()`를 각 비트 진입/종료에 심어 스크린샷 미스에도 실행 증거 확보(verify-checklist Step 2b).
- Option A 채택 시 `_MaterialService` 호출이 ClientOnly인지, 서버에서 안 부르는지 확인.

## 비고

- 구현은 **다음 세션**. 이 스펙은 draft이며 오픈 퀘스천 확정 후 writing-plans로 계획화.
