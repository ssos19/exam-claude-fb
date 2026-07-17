# Docker로 실행하기 (Windows 노트북 등)

앱(Next.js)과 MySQL을 Docker로 한 번에 띄워서 로컬에서 확인할 수 있다.

## 준비물
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 (Windows는 WSL2 백엔드 권장, 설치 시 기본으로 활성화됨)
- 이 저장소를 clone 또는 다운로드

## 실행

프로젝트 루트에서 (Windows PowerShell / cmd / WSL 터미널 모두 동일):

```bash
docker compose up --build
```

최초 실행 시 다음 순서로 동작한다:
1. `mysql` 컨테이너가 뜨고 헬스체크를 통과할 때까지 대기
2. `migrate` 컨테이너가 `node scripts/migrate.js`로 스키마를 적용하고 종료
3. `app` 컨테이너가 빌드된 Next.js 앱을 3000번 포트로 기동

브라우저에서 `http://localhost:3000` 접속하면 앱을 확인할 수 있다.

## 중지 / 초기화

```bash
docker compose down        # 컨테이너 중지 (DB 데이터는 유지)
docker compose down -v     # 컨테이너 + DB 볼륨까지 완전히 삭제 (데이터 초기화)
```

## 참고
- `docker-compose.yml`의 DB 계정/비밀번호(`appuser` / `apppass`, root `rootpass`)는 로컬 확인용 기본값이다. 실제 배포에는 절대 그대로 쓰지 말 것 — 배포 관련 사항은 [docs/deploy-checklist.md](deploy-checklist.md) 참고.
- 코드를 수정한 뒤 반영하려면 다시 `docker compose up --build`로 이미지를 재빌드해야 한다 (핫 리로드 없음 — 프로덕션 빌드 방식이기 때문).
- `mysql` 컨테이너는 호스트의 `3307` 포트로도 노출되어 있어, 필요하면 로컬 MySQL 클라이언트로 `127.0.0.1:3307`에 직접 접속해 데이터를 확인할 수 있다.
