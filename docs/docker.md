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
- 위 `docker compose up --build`는 **프로덕션 빌드**를 실행하는 것이다(핫 리로드 없음). 코드를 수정한 뒤 반영하려면 다시 `docker compose up --build`로 이미지를 재빌드해야 한다.
- `mysql` 컨테이너는 호스트의 `3307` 포트로도 노출되어 있어, 필요하면 로컬 MySQL 클라이언트로 `127.0.0.1:3307`에 직접 접속해 데이터를 확인할 수 있다.

## 개발 모드로 실행하기 (선택, 핫 리로드)

위 `docker compose up --build`는 프로덕션 빌드라 코드를 고쳐도 바로 반영되지 않는다. 코드를 수정하면서 바로바로 확인하고 싶다면 두 가지 방법이 있다.

### 방법 A — 로컬에 Node/Yarn이 설치되어 있을 때 (권장, 더 빠름)

MySQL만 Docker로 띄우고, 앱은 로컬에서 직접 `yarn dev`로 돌린다.

```bash
# 1) DB만 백그라운드로 기동
docker compose up -d mysql

# 2) 최초 1회 스키마 적용 (schema_migrations로 추적되므로 재실행해도 안전)
docker compose run --rm migrate

# 3) .env.local 준비 (.env.example과 다르다 — 아래 표 참고)
#    프로젝트 루트에 아래 내용으로 .env.local 파일을 만든다.

# 4) 로컬에서 앱 실행
yarn install
yarn dev
```

`.env.local` 내용 (docker-compose가 `mysql`을 호스트의 **3307**번 포트로 노출하므로, `.env.example`의 3306과 다르다):

```
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=appuser
DB_PASSWORD=apppass
DB_NAME=football
```

`http://localhost:3000`에서 확인하면 되고, 코드를 고치면 즉시 반영된다(진짜 `next dev` 핫 리로드).

### 방법 B — Docker 컨테이너 안에서 dev 모드 (Node를 로컬에 안 깔고 싶을 때)

`docker-compose.yml`에 `app-dev`라는 서비스를 추가해뒀다. 이건 `profiles: ["dev"]`로 묶여 있어서 **평소 `docker compose up` / `up --build`로는 절대 뜨지 않는다** — 명시적으로 켤 때만 동작하는 옵션이다. 소스 코드를 컨테이너에 그대로 마운트해서 `next dev`를 돌리는 방식이라 코드 수정이 바로 반영된다.

```bash
docker compose up -d mysql
docker compose run --rm migrate
docker compose --profile dev up app-dev
```

**주의**: 마지막 명령에 반드시 `app-dev`처럼 서비스 이름을 명시해야 한다. `docker compose --profile dev up`처럼 서비스 이름 없이 실행하면 프로덕션용 `app`까지 같이 뜨려고 해서 **3000번 포트가 충돌**한다(둘 다 3000번을 쓰기 때문). `app`(프로덕션)과 `app-dev`(개발)는 동시에 띄우지 말 것.

방법 A와 B 둘 다 코드 수정 즉시 반영이라는 결과는 같다. 로컬에 Node가 이미 있다면 A가 더 가볍고 빠르고, Windows에 아무것도 깔고 싶지 않다면 B를 쓰면 된다.
