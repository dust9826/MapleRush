---
id: MR-AM
title: WebView HTML 인트로 컷신 실험 (Pages 호스팅 + 키 브릿지 + 자동 종료)
status: done
owner: dust9826
area: mixed
depends_on: []
touches: [ui/WebViewTestGroup.ui, RootDesk/MyDesk/Cutscene/WebCutsceneController.mlua]
branch: feat/webview-cutscene
created: 2026-08-04
updated: 2026-08-04
---

# WebView HTML 인트로 컷신 실험

## Goal

HTML 캔버스 컷신(Maple Words 스토리, 카메라 줌·패닝/이펙트 연출판)을 MSW 안에서
`WebViewComponent`로 그대로 실행한다. 영상 등 웹 콘텐츠 삽입 가능성 검증 겸.

## 구성

- **호스팅**: WebView `Url`은 https만 허용 → 저장소 `gh-pages` 브랜치로 GitHub Pages 배포.
  `https://dust9826.github.io/MapleRush/cutscene/index.html?v=4&embed=1`
  (`?embed=1` = 하단 컨트롤바 숨김 + 종료 리다이렉트 활성. 페이지 원본은 배포 브랜치에만 있음)
- **`ui/WebViewTestGroup.ui`** (displayOrder 900): 고정 1920×1080 패널 + WebViewComponent
  (ClickingEnabled=true, ScrollingEnabled=false, HoveringEnabled=false)
- **`Cutscene/WebCutsceneController.mlua`** (ClientOnly): 키보드가 WebView로 전달되지 않으므로
  게임에서 키를 받아 페이지 클릭 존으로 변환 —
  ESC=스킵(닫기) / Space=중앙 클릭(일시정지) / ←→=이전·다음 존 클릭.
  종료 감지 = 페이지가 끝나면 `end.html`로 이동 → `WebLoadCompleteEvent` 2회차에 자동 닫기
  (이벤트에 URL 필드 없음 → 로드 횟수 카운트). 폴백 90초 타이머.

## Acceptance criteria (전부 라이브 검증 PASS, 2026-08-04)

- [x] 플레이 진입 시 컷신 풀스크린 자동재생
- [x] ESC 스킵 / Space 일시정지 / ←→ 장면 이동
- [x] 컷신 종료 시 자동 닫힘 (`closed reason=finished` 로그 + 로비 노출 확인)
- [x] 하단 컨트롤 바 미노출 (embed 모드)
- [x] build/runtime 오류 0

## Notes / 남은 결정

- **정식 채택 여부 팀 논의 필요.** 현재 같은 스토리의 네이티브 인트로
  (`Cutscene/CutsceneController.mlua`)와 공존 — 둘 다 게임 시작 시 재생되고 ESC가 둘 다 스킵.
  채택 시: ① 네이티브 컷신 비활성화 ② 종료/스킵→로비 인계를 웹뷰 컨트롤러로 이전
  ③ 스토리 BGM은 게임 쪽 재생 유지.
- 네트워크 필수(오프라인이면 빈 화면) / JS↔mlua 브릿지 없음 / 컷신 이미지 5장은 임시 대체본
  (1~5.jpg 원본 확보 시 gh-pages `cutscene/assets/`에 추가 후 index.html 매핑 복원).
