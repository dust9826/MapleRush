---
id: MR-R
title: 맵 레지스트리 데이터셋 (테마×종류 랜덤 MapID 선택)
status: review
owner: dust9826
area: mixed
touches:
  - RootDesk/MyDesk/Core/GameConstants.mlua
  - RootDesk/MyDesk/Stage/StageManager.mlua
  - RootDesk/MyDesk/Stage/FloorManager.mlua
  - RootDesk/MyDesk/Data/
depends_on: []
branch: ""
created: 2026-06-29
updated: 2026-06-29
---

# 맵 레지스트리 데이터셋 (테마×종류 랜덤 MapID 선택)

## Goal
하드코딩된 맵 id(`MapNormal=map02`/`MapBoss=map03`/`MapShop=map04`/`NormalMapChoice`)를 **데이터 테이블 기반 레지스트리**로 교체한다. 기획자가 만든 맵들을 표로 등록해 두고, **(선택된 테마 × 스테이지 종류)** 조합에서 **랜덤 번호**로 MapID를 골라 로드한다. 테마 3개(오르비스·엘나스·폐광) 지원.

## 데이터 모델
표 컬럼: **테마(theme) / 종류(type) / 번호(index) / MapID**
- `theme`: `theme1`/`theme2`/`theme3` (오르비스/엘나스/폐광)
- `type`: `normal`(전투) / `shop`(상점) / `boss`(보스)
- `index`: 같은 (theme,type) 안에서의 변형 번호 (1..N)
- `MapID`: 실제 맵 id (예: map02)

흐름: 테마 선택 → 다음 스테이지 종류(progression이 결정: 전투/상점/보스) → **(theme,type)에 해당하는 행들 중 랜덤 1개 → MapID** → 맵 로드.

## Acceptance criteria
- [ ] 맵 레지스트리를 **데이터로 authoring**(기획자 편집 가능) — 테마/종류/번호/MapID 표. UserDataSet(`.userdataset`+`.csv`) 또는 동등 데이터 소스
- [ ] 로더/셀렉터: `(theme, type)` → 매칭 행 중 **랜덤 MapID** 반환 (직전 맵 중복 방지는 옵션). 매칭 0행이면 안전 폴백
- [ ] `StageManager`/`FloorManager`가 하드코딩(`MapIdForStage`/`MapNormal`/`NormalMapChoice`) 대신 셀렉터 사용
- [ ] 테마 3개 × 종류 3개 표 구조로 동작 (초기 시드는 현재 map02/03/04로 채워 회귀 없게)
- [ ] 실측: 테마 선택 후 전투/상점/보스 맵이 레지스트리에서 로드되고, 같은 종류라도 행이 여러 개면 랜덤으로 바뀜

## Subtasks
- [x] 데이터 소스 방식 확정 → **UserDataSet CSV**(MSW 네이티브 공식 테이블). 가중치 필요 시 droptable-resolver-package가 공식 대안(현재 균등 랜덤이라 불요).
- [x] 데이터셋 작성: `Data/MapRegistry.userdataset`+`.csv` (컬럼 theme/type/index/mapId, 시드 9행=3테마×3종류, map02/03/04)
- [x] 셀렉터: `MapRegistry.mlua` @Logic `PickMapId(theme, stageType)` — GetRowCount/GetCell 매칭 수집 → `_UtilLogic:RandomIntegerRange` 균등 랜덤, 매칭0 폴백
- [x] StageManager 통합: `StartStage`가 `_MapRegistry:PickMapId(_FloorManager.CurrentTheme, stageType)`로 선택 후 `CurrentMapId` 저장, `GetMap`이 그 값 사용(재해석 X)
- [x] 회귀 검증(시드가 기존 맵 가리킴 → 동작 불변)

## Notes / decisions
- 🔗 **MR-A**(일반맵 다양화·랜덤풀)와 한 쌍: MR-R = **선택 메커니즘/데이터 레이어**, MR-A = **실제 수제작 맵 + 행 채우기**. MR-A의 "StageManager 랜덤 선택" 항목을 MR-R이 일반화해 흡수 가능 → 진행 시 MR-A 범위 재조정.
- 🔗 **MR-M**(3테마): theme 차원을 공유. 테마 선택 UI는 MR-M, 테마→맵 매핑은 MR-R.
- ⚠️ `MapNormal`/`NormalMapChoice`는 MR-S 스파이크 잔재 — MR-D 정리와 충돌 주의(원복 후 작업 권장).
- 데이터 소스: 프로젝트가 데이터 외부화 지향(MR-F)이라 **UserDataSet CSV** 후보. 단순하면 @Logic 테이블도 가능 — 착수 시 1개 질문으로 확정.
- 종류 결정(progression)은 기존 FloorManager 로직 재사용(일반 N회→상점→보스).

## Verify
- ✅ **단위(execute_script, server)**: 데이터셋 rows=9 로드, pick(theme1,normal/shop/boss)=map02/04/03, pick(theme2,normal)=map02, 잘못된 테마→폴백 map02. 빌드 0에러.
- ✅ **엔드투엔드**: `RequestSelectTheme("theme1")`→`RequestSelectNode(1)`→`StageManager.StartStage`에서 `[MapRegistry](theme1,normal)→map02` 호출(스택트레이스 확인), `CurrentMapId=map02` 저장, 적 4기 스폰 정상.
- **잔여(검토)**: 같은 (theme,type) 행이 1개뿐이라 시각적 랜덤 전환은 미확인 — **MR-A가 (theme,type)당 맵 여러 개를 추가하면** 행 복수→랜덤이 체감됨. 랜덤 로직 자체는 검증됨(RandomIntegerRange).
- 비고: `MapNormal/MapBoss/MapShop/MapIdForStage`는 폴백 경로로만 남음. `NormalMapChoice` 등 MR-S 잔재 정리는 MR-D.
