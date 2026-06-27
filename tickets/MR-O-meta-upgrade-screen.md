---
id: MR-O
title: 능력치 강화(메타) 화면 — 검토(컷 후보)
status: backlog
owner: unassigned
area: mixed
touches:
  - ui/MetaUpgradeGroup.ui
  - RootDesk/MyDesk/UI/MetaUpgradeController.mlua
depends_on: []
branch: ""
created: 2026-06-26
updated: 2026-06-26
---

# 능력치 강화(메타) 화면 — 검토(컷 후보)

## Goal
메이플 스킬창식 메타 강화 화면(상단 탭 능력치/능력 + [아이콘][강화명][− Lv +] 리스트)을 신규 제작한다. **데모 범위 결정 대상 — 컷 후보.** (UI 설계서 p.11~12, p.15 요약)

## Acceptance criteria
- [ ] 상단 탭(능력치/능력) Button으로 카테고리 전환
- [ ] 능력치 탭: 공격력/목숨/최대대시/대시회복/아이템보관 행 (아이콘+강화명+레벨당 효과)
- [ ] 능력 탭: 금강불괴/참공/부동심/만지일섬/회전베기 행
- [ ] 각 행 Lv(현재/최대) + 요구 점수 Text 표시, 상단 강화 점수 표시
- [ ] − / + 버튼: 점수 소비/환불로 레벨 증감 (신규 로직)
- [ ] 참공 강화 = 영구 공격력↑ (스탯과 합산)
- [ ] 입력 컨텍스트 비전투(로비 하위)

## Subtasks
<착수 시 채움 — 단, 데모 범위 확정 전 착수 보류>
- [ ] 

## Notes / decisions
- 🔴 신규 — UI는 단순(탭+리스트)이나 **레벨/점수 소비 로직이 신규**. 설계서 p.15에서 "검토(컷 후보)"로 명시됨.
- 수치 출처: `meta_upgrade_doc §2`(능력치), `§3`(능력). 참공=영구 공격력(스탯과 합산).
- 로비(MR-L)의 "능력치 강화" 버튼이 이 화면을 엶 — **컷 결정 시 MR-L 버튼도 함께 비활성/숨김**.
- ⏸ **착수 전 데모 범위 결정 필요** — 그 전까진 backlog 유지.
- 출처: `docs/maplerush_UI_ver1.pdf` p.11, p.12, p.15.

## Verify
- (착수 확정 시) Maker `play` → 메타 화면 → 탭 전환·점수 소비/환불로 레벨 증감·참공 영구 공격력 반영 확인.
