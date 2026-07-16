# Plan: docs/requirements.md 작성

## Context
저장소(`exam-claude-fb`)는 현재 README 한 줄만 있는 빈 상태다. 사용자는 "축구공 위치 기반 점유율 추적" 프로젝트의 요구사항을 정리한 문서만 우선 작성하고자 하며, 코드/DB 스키마/API/UI 구현은 이후 단계로 미룬다. 목표는 사용자가 제공한 내용을 그대로 `docs/requirements.md`에 정리하고 커밋하는 것.

## 작업 내용
1. `docs/` 디렉토리를 생성하고 `docs/requirements.md` 파일을 작성한다.
2. 문서 내용은 사용자가 제공한 스펙을 그대로 구조화한다 (섹션 재배열 없이, 다음 항목 포함):
   - 프로젝트 개요 (축구공 위치 기반 점유율 추적)
   - 환경: Node.js, Next.js / MySQL(mysql2)
   - 도메인 규칙: 1차원(좌/우) 위치, 두 팀(A팀=Anthro/별칭 Ant, B팀=Bob/별칭 Bike), 각 팀이 좌/우 중 한쪽 진영 담당(배정은 추후 결정)
   - 데이터 입력 방식: 수동 단건 입력(폼 또는 API), 상세 스펙은 이번 단계에서 미정
   - 공격 점유율 정의: 공이 상대 진영에 머문 시간 비율 (A팀 공격 점유율 = 공이 B팀 진영에 있던 시간 / 전체 추적 시간), 점유 이벤트(소유권)는 범위 밖
   - 이번 단계 범위: 문서 작성/커밋까지만, DB 스키마/API/UI 미구현
3. 코드, DB 스키마, API/UI 관련 내용은 작성하지 않는다 (범위 외).
4. `git add docs/requirements.md` 후 커밋 메시지 `"docs: add initial requirements for ball position tracking"`로 커밋한다.
5. `git push -u origin claude/ball-position-requirements-s6xuw4`로 푸시한다.

## 검증
- `git log -1 --stat`으로 커밋에 `docs/requirements.md` 한 파일만 포함되었는지 확인.
- 파일 내용을 다시 읽어 사용자가 제공한 6개 섹션이 누락 없이 반영됐는지 확인.
