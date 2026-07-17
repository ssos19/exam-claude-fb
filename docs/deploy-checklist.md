# 배포 전 체크리스트

## 환경변수
- [ ] `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`을 배포 환경(플랫폼 시크릿/환경변수)에 설정했다.
- [ ] `NODE_ENV=production`이 설정되어 있다 (Next.js `next start` 기준).
- [ ] `.env.local`을 저장소에 커밋하지 않았다 (`.gitignore`에 이미 포함됨).

## 마이그레이션
- [ ] 배포 대상 MySQL 인스턴스에 접속 가능한지 확인했다.
- [ ] 애플리케이션 배포 이전에 `node scripts/migrate.js` (`yarn db:migrate`)를 실행해 스키마를 최신 상태로 맞췄다.
- [ ] `migrations/` 아래 SQL이 순서대로(파일명 오름차순) 적용되는지 확인했다 (스크립트가 `schema_migrations` 테이블로 자동 추적/스킵함).
- [ ] 마이그레이션 실패 시 롤백 절차가 없다는 점을 인지했다 — 현재는 전진(forward-only) 마이그레이션만 지원한다. 실패 시 수동 복구가 필요하다.

## 빌드/실행
- [ ] `yarn build`가 에러 없이 통과한다.
- [ ] `yarn start`로 프로덕션 서버가 정상 기동하는지 확인했다.
- [ ] `yarn lint`, `yarn test`가 배포 전 CI에서 통과한다.

## 헬스체크
- [ ] 별도의 `/api/healthz` 같은 헬스체크 엔드포인트는 아직 없다. 배포 플랫폼의 헬스체크는 우선 `GET /`(홈페이지, DB 조회 포함) 또는 `GET /api/occupancy`로 대체할 수 있다.
- [ ] 배포 직후 `GET /api/occupancy`를 호출해 DB 연결이 정상인지 확인한다 (연결 실패 시 500 반환).

## 알려진 제약 (문서화만, 이번 단계에서는 미조치)
- **API 인증 없음**: `POST /api/positions`를 포함한 모든 API가 인증 없이 공개되어 있다. 내부/데모 용도로 가정하고 이번 단계에서는 인증을 추가하지 않기로 결정했다. **공개 인터넷에 배포한다면 반드시 인증 또는 접근 제어를 먼저 추가해야 한다.**
- **요청 제한(rate limit) 없음**: 남용/폭주에 대한 보호가 없다. 배포 환경(리버스 프록시, API 게이트웨이 등)에서 제한을 걸거나, 추후 애플리케이션 레벨에서 추가해야 한다.

## DB 커넥션 풀 설정 검토
- 현재 `lib/db.js`: `connectionLimit: 10`, `queueLimit: 0`(무제한 대기), `waitForConnections: true`.
- 저트래픽 데모/내부용 앱 기준으로는 적절한 기본값이다.
- 실제 운영 트래픽 규모가 정해지면 `connectionLimit`을 MySQL `max_connections` 및 예상 동시 요청 수에 맞춰 재조정해야 한다. 이번 단계에서는 실제 트래픽 데이터가 없어 값을 바꾸지 않고 검토만 완료했다.
