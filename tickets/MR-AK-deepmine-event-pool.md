---
id: MR-AK
title: 폐광 테마 이벤트 풀 공백 + 테마 명칭(mine/deepmine) 통일
status: backlog
owner: unassigned
area: mixed
touches: [RootDesk/MyDesk/Event/EventCatalog.mlua, RootDesk/MyDesk/Event/Data/EventTemplates.csv]
depends_on: []
branch: ""
created: 2026-08-02
updated: 2026-08-02
---

# 폐광 테마 이벤트 풀 공백 + 테마 명칭(mine/deepmine) 통일

## Goal

폐광(deepmine) 테마에서도 3번 이벤트 슬롯이 동작하게 하고, 이벤트 데이터의
테마 명칭을 프로젝트 표준(`deepmine`)으로 통일한다. **팀 논의 후 착수** —
MR-AJ 검증 중 발견해 기록만 남겨둔 상태.

## 현상 (2026-08-02 확인)

- `EventCatalog.EligibleEventIds`가 `orbis`/`elnath`만 허용 → 폐광에서는
  **common 이벤트조차 후보 0개** → 3번 슬롯 선택 시 항상 시작 실패 →
  잠금 해제 후 노드 선택 재표시(에러 없는 조용한 복구 경로).
- 명칭 불일치: 이벤트 데이터(`EventTemplates.csv` 32~41행)와
  `EventCatalog.mlua` 검증은 `mine`, 런타임(FloorManager / StageManager /
  GameConstants / ThemeSelect / **SoundTable.csv의 bgm_deepmine**)은 전부
  `deepmine`. `mine`은 이벤트 CSV에만 고립된 신생 명칭.
- 폐광 이벤트 10종(`mine_*`)은 현재 전부 `enabled=false` — 컨텐츠 미검수
  의도인지 확인 필요.

## 제안 (논의 안건)

1. `EventTemplates.csv` `theme_id` 10칸: `mine` → `deepmine`
2. `EventCatalog.mlua` 유효 테마 검증 문자열: `"mine"` → `"deepmine"`
3. `EligibleEventIds` 가드에 `deepmine` 허용 (통일만 해도 common 풀은 즉시 동작)
4. `mine_*` event_id 접두사는 유지 (식별자일 뿐 + 발견기록 저장 키 호환)
5. 폐광 이벤트 `enabled` 플립 여부는 작성자(D4LGONA) 판단

## Acceptance criteria

- [ ] 폐광 테마에서 3번 슬롯 선택 시 common(+검수된 폐광) 이벤트가 정상 추첨된다.
- [ ] 테마 명칭이 코드·데이터 전반에서 `deepmine` 하나로 통일된다.
- [ ] 기존 발견 기록(`eventId|choiceId` 키)이 깨지지 않는다.
- [ ] 오르비스/엘나스 이벤트 추첨 회귀 없음.

## Notes / decisions

- MR-AJ(고정 3번 슬롯 이벤트) 검증 중 발견 — 상세는 해당 티켓 Notes 참조.
