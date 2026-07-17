# exam-claude-fb
축구공 모니터링

축구공 위치 기반 점유율 추적 앱. 요구사항은 [docs/requirements.md](docs/requirements.md), 후속 작업 계획은 [docs/plans/ball-position-tracking-work-plan.md](docs/plans/ball-position-tracking-work-plan.md), 배포 전 체크리스트는 [docs/deploy-checklist.md](docs/deploy-checklist.md) 참고.

## 설치

```bash
yarn install
```

## 환경변수

`.env.example`을 `.env.local`로 복사한 뒤 값을 채운다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `DB_HOST` | MySQL 호스트 |
| `DB_PORT` | MySQL 포트 (기본 3306) |
| `DB_USER` | MySQL 사용자 |
| `DB_PASSWORD` | MySQL 비밀번호 |
| `DB_NAME` | 사용할 데이터베이스 이름 |

## 마이그레이션

`migrations/` 아래 SQL을 순서대로 적용한다 (이미 적용된 파일은 건너뜀).

```bash
yarn db:migrate
```

## 실행

```bash
yarn dev      # 개발 서버
yarn build    # 프로덕션 빌드
yarn start    # 프로덕션 서버 실행
```

## 테스트 / 린트

```bash
yarn test     # 단위 테스트 (vitest)
yarn lint     # eslint
```
