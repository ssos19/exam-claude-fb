# 작업 계획: 축구공 위치 기반 점유율 추적 — 후속 작업

## Context
- 원본 계획(`docs/plans/docs-requirements-md-parsed-orbit.md`)은 `docs/requirements.md` 작성까지만을 범위로 했다. 코드/DB 스키마/API/UI는 "추후"로 명시적으로 미뤄져 있었다.
- 이후 별도 세션(브랜치 `claude/implementation-plan-9qio0l`)에서 DB 스키마, API, UI, 단위 테스트가 이미 구현되어 `main`에 병합됐다(커밋 `78a9d2a`~`764d338`).
- 하지만 `docs/requirements.md`의 "이번 단계 범위" 절은 여전히 "DB 스키마, API, UI는 아직 구현하지 않는다"고 되어 있어 실제 코드 상태와 어긋난다.
- 이 문서는 (1) 구현 과정에서 암묵적으로 내려진 결정들을 명문화하고(계획 구체화), (2) 문서-코드 불일치를 포함한 남은 작업을 단계별로 계획하며, (3) 체크리스트로 진행 상황을 추적하기 위해 작성한다. 이번 커밋에서는 이 계획 문서 작성까지만 진행하고, 개별 작업 항목의 실행은 이후 순차적으로 체크해 나간다.

## 1. 기존 계획 구체화 — 구현 과정에서 내려진 결정 사항
`docs/requirements.md`에는 "추후 결정"으로 남겨뒀던 항목들이 실제 코드(`lib/teams.js`, `lib/occupancy.js`, `migrations/0002_create_ball_positions.sql`)에서 다음과 같이 확정되어 있다. 문서에는 아직 반영되지 않았다.

- 진영 배정: A팀(Anthro/Ant) = 왼쪽, B팀(Bob/Bike) = 오른쪽 (`lib/teams.js`, 주석에 "임의로 결정된 값"이라 명시됨)
- 좌우 경계값: `position >= 50` 이면 오른쪽, 미만이면 왼쪽 (`SIDE_BOUNDARY = 50`)
- 경계값 자체(`position === 50`)는 오른쪽으로 취급 (테스트로 고정됨)
- 위치 값 범위: 0~100 정수(`TINYINT UNSIGNED`, `CHECK (position BETWEEN 0 AND 100)`)
- 기록 시각(`recorded_at`)은 앱이 아닌 DB의 `DEFAULT CURRENT_TIMESTAMP(3)`로 채움 (앱-DB 간 시각 오차 방지 목적)
- 점유율 계산은 연속된 두 기록 사이의 시간 구간만 누적하며, 마지막 기록 이후의 구간은 계산에서 제외됨(다음 기록이 없어 구간을 알 수 없기 때문)
- 기록이 2건 미만이거나 모든 timestamp가 동일하면 `insufficient_data` 상태를 반환

## 2. 현재 구현 상태 점검

구현 완료:
- [x] DB 스키마 및 마이그레이션 (`migrations/0001`, `0002`, `scripts/migrate.js`)
- [x] 위치 입력/조회 API (`POST /api/positions`, `GET /api/positions`)
- [x] 점유율 조회 API (`GET /api/occupancy`)
- [x] UI (입력 폼, 점유율 요약, 최근 기록 테이블 — `pages/index.js`)
- [x] 점유율 계산 로직 단위 테스트 (`lib/occupancy.test.js`)

미구현/미검증:
- [x] API 핸들러 레벨 테스트 (`pages/api/positions.js`, `pages/api/occupancy.js`)
- [x] 실제 MySQL 연결 기반 수동/통합 검증
- [x] `docs/requirements.md` 최신화 (구현 상태 및 결정 사항 반영)
- [x] `README.md` 설치/실행/마이그레이션 가이드
- [x] 배포 환경 설정 문서화
- [x] API 인증/접근 제어 (현재 완전 공개 상태 — 사용자 결정: 지금은 보류하고 `docs/deploy-checklist.md`에 문서화만)
- [ ] 에러 로깅/모니터링 방안

## 3. 단계별 작업 계획

### Phase 1 — 문서 최신화
- [x] `docs/requirements.md`의 "이번 단계 범위" 절을 실제 구현 상태로 갱신
- [x] 진영 배정·경계값 등 확정된 결정 사항을 `docs/requirements.md`에 반영
- [x] `README.md`에 설치, 환경변수(`.env.local`), 마이그레이션, 실행 방법 추가

### Phase 2 — 검증 및 테스트 보강
- [x] `yarn test`로 기존 단위 테스트 통과 확인 (npm install로 대체 — 아래 참고)
- [x] 로컬 MySQL로 `yarn db:migrate` 실행 검증
- [x] `/api/positions` POST/GET 수동 호출 검증 (curl 또는 UI)
- [x] `/api/occupancy` 응답 검증 (기록 2건 미만/이상 케이스 각각)
- [x] 유효성 검사 경계값 테스트 추가 (position 0, 100, 음수, 101, 비정수, limit 범위 초과)
- [x] `yarn lint` 통과 확인 (eslint 직접 실행 — 아래 참고)

**실행 메모**:
- 이 환경에서 `corepack`이 `repo.yarnpkg.com`에 접근할 때 프록시가 조직 정책으로 403을 반환해 `yarn@4.5.0` 바이너리를 받지 못했다. 대신 `npm install --no-save`로 `node_modules`만 채우고(`yarn.lock`은 건드리지 않음), `node_modules/.bin/vitest`·`node_modules/.bin/eslint`를 직접 실행해 검증했다. 실제 CI/개발 환경에서 yarn berry 레지스트리 접근이 가능하면 `yarn test`/`yarn lint`로 동일하게 통과한다.
- 로컬에 `mysql-server` 8.0을 설치해 `football` DB와 전용 사용자(`appuser`)를 만들고, `.env.local`(gitignore됨)을 구성해 `node scripts/migrate.js`로 마이그레이션을 적용·재적용(멱등성 확인)했다.
- `next dev`를 임시 포트(3100)로 띄워 `POST/GET /api/positions`, `GET /api/occupancy`를 curl로 호출: 정상 케이스, 경계값(0, 100), 경계 초과(-1, 101, 50.5, limit 0/501), 잘못된 메서드(405) 모두 문서화된 동작과 일치함을 확인.
- `vitest.config.js`에 `resolve.alias`로 `@/*`를 추가해야 API 핸들러 테스트에서 `@/lib/...` import가 동작함을 발견하고 수정함(`jsconfig.json`은 Next.js 빌드에만 적용되고 vitest에는 별도 설정이 필요했음).
- 새 테스트: `lib/validation.test.js`(12개), `pages/api/positions.test.js`(6개), `pages/api/occupancy.test.js`(4개) — 기존 7개 포함 총 29개 테스트 전부 통과.

### Phase 3 — 안정성/운영 보완
- [x] API 인증/요청 제한 필요 여부 결정 및 반영 — **[결정됨]** 지금은 인증/요청 제한을 추가하지 않는다(내부·데모 용도로 가정). `docs/deploy-checklist.md`에 "공개 인터넷 배포 전 반드시 추가" 경고로 문서화만 함.
- [x] 에러 응답 포맷 일관성 점검 (`ValidationError` vs 500 처리) — 점검 중 405 응답만 plain text이고 나머지는 `{error: ...}` JSON인 불일치를 발견해 수정함 (`pages/api/positions.js`, `pages/api/occupancy.js`).
- [x] DB 커넥션 풀 설정 재검토 (운영 환경 트래픽 기준) — 현재 `connectionLimit: 10`은 저트래픽 기준 적절. 실 트래픽 데이터 없어 값은 유지하고 재조정 필요성만 `docs/deploy-checklist.md`에 기록.
- [x] 배포 전 체크리스트 작성 (환경변수, 마이그레이션 순서, 헬스체크) — `docs/deploy-checklist.md` 신규 작성.

### Phase 4 — 후속 기능 논의 (현재 범위 밖, 우선순위 논의 필요)
- [ ] 점유 이벤트(소유권) 트래킹 도입 여부
- [ ] 위치 기록 수정/삭제 기능 필요 여부
- [ ] 점유율 추이 시각화(차트) 필요 여부
- [x] 다중 경기/세션 구분 필요 여부 — **[구현됨]** 경기(Match) 개념 도입. `matches` 테이블, `ball_positions.match_id`, `/matches/[id]` 페이지, 경기별 API(`/api/matches`, `/api/positions?matchId=`, `/api/occupancy?matchId=`). 여러 경기가 동시에 `in_progress`여도 막지 않아 여러 탭/필드 동시 추적 가능. 자세한 내용은 `docs/requirements.md`의 "경기(Match) 개념" 절 참고.

## 진행 방식 및 검증
- 각 체크박스는 항목을 완료할 때 `[x]`로 갱신하고, 관련 커밋 메시지에 어떤 항목을 완료했는지 명시한다.
- Phase 2의 테스트/마이그레이션 항목은 실제 명령 실행 결과(터미널 출력)로 완료 여부를 확인한다.
- Phase 1 완료 후에는 `docs/requirements.md`와 실제 구현이 일치하는지 다시 검토한다.
- 세션 내 진행 상황은 이 파일의 체크리스트와 별도로 Task 목록(TaskCreate/TaskList)으로도 병행 추적한다.
