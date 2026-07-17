# syntax=docker/dockerfile:1
# 3단계(deps -> builder -> runner) 멀티스테이지 빌드.
# 목적: 최종 실행 이미지(runner)에는 소스 전체나 개발용 node_modules가 아니라
# Next.js가 "standalone" 모드로 트레이싱해서 뽑아낸 최소 실행 파일만 남긴다.
# 이렇게 하면 이미지 용량이 작아지고, 컨테이너 안에 불필요한 devDependencies나
# 소스코드가 들어가지 않는다.

# ---- 1단계: deps ----
# 목적: 의존성 설치만 전담하는 단계. 소스 코드는 아직 복사하지 않는다.
# package.json / yarn.lock / .yarnrc.yml만 먼저 복사해서 install하면,
# 이후 소스 코드만 바뀌고 의존성은 안 바뀐 경우 Docker가 이 레이어를
# 캐시에서 재사용해 빌드 속도가 빨라진다(레이어 캐싱 최적화).
FROM node:22-alpine AS deps
WORKDIR /app
# package.json의 "packageManager": "yarn@4.5.0" (Yarn Berry)을 사용하기 위해
# corepack을 활성화한다. corepack은 Node 22에 기본 포함되어 있고,
# 이 명령 한 줄로 프로젝트가 지정한 정확한 yarn 버전을 자동으로 받아와 쓴다.
RUN corepack enable
# 의존성 설치에 필요한 파일만 우선 복사한다 (소스 코드 전체가 아님).
# 이렇게 해야 소스만 수정했을 때 "yarn install" 레이어가 캐시로 재사용된다.
COPY package.json yarn.lock .yarnrc.yml ./
# --immutable: yarn.lock을 절대 수정하지 않고, lock 파일과 package.json이
# 어긋나면 설치를 실패시킨다. CI/Docker 빌드처럼 "커밋된 lock 파일 그대로"
# 재현 가능한 설치가 필요한 환경에서 쓰는 표준 옵션이다(로컬 개발 중의
# 일반 "yarn install"과 달리 lock 파일을 임의로 바꾸지 않는다).
RUN yarn install --immutable

# ---- 2단계: builder ----
# 목적: 실제 소스 코드를 넣고 프로덕션 빌드(next build)를 수행하는 단계.
# 이 단계의 결과물(.next, node_modules, scripts/, migrations/ 등)은 이미지에
# 그대로 남지 않고, 아래 3단계(runner)가 필요한 파일만 선택적으로 복사해간다.
# 참고: docker-compose.yml의 "migrate" 서비스는 이 builder 단계를 그대로
# 사용한다 — scripts/migrate.js와 migrations/*.sql이 여기 다 있고,
# runner 단계에는 없기 때문이다(마이그레이션 스크립트는 standalone
# 트레이싱 대상이 아니라서 3단계에 자동으로 포함되지 않는다).
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
# 1단계에서 설치한 node_modules를 그대로 재사용한다(다시 install하지 않음).
COPY --from=deps /app/node_modules ./node_modules
# 이제 나머지 소스 코드 전체를 복사한다. .dockerignore에 정의된
# node_modules, .next, .git, .env* 등은 이 COPY에서 제외된다.
COPY . .
# next.config.mjs에 output: 'standalone'이 설정되어 있어서, 빌드 결과가
# .next/standalone(실행에 필요한 최소 node_modules 포함 서버 코드)과
# .next/static(빌드된 JS/CSS 등 정적 자산)으로 따로 생성된다.
RUN yarn build

# ---- 3단계: runner (최종 실행 이미지) ----
# 목적: 컨테이너로 배포/실행되는 이미지. builder 단계의 산출물 중
# 실행에 꼭 필요한 3가지(public, .next/standalone, .next/static)만
# 골라서 복사하므로, 소스 코드 원본이나 devDependencies가 전혀 남지 않는다.
FROM node:22-alpine AS runner
WORKDIR /app
# Next.js가 프로덕션 최적화 경로로 동작하도록 명시한다.
ENV NODE_ENV=production
# 정적 파일(favicon 등 public/ 아래 파일). 코드에서 직접 참조하는 리소스.
COPY --from=builder /app/public ./public
# standalone 서버 번들: server.js와, 이 앱이 실제로 사용하는 의존성만
# 추려낸(next가 트레이싱한) node_modules를 포함한다. 여기 mysql2도
# 자동으로 포함되어 있음을 빌드 후 확인했다.
COPY --from=builder /app/.next/standalone ./
# standalone 산출물에는 정적 자산(.next/static)이 별도 경로에 있어서
# 빌드 스크립트가 자동으로 복사해주지 않는다 — 그래서 이 줄이 없으면
# 페이지는 뜨지만 CSS/JS가 깨진다. Next.js 공식 문서가 안내하는 필수 단계.
COPY --from=builder /app/.next/static ./.next/static
# 컨테이너가 3000번 포트로 요청을 받는다는 것을 문서화(실제 포트 매핑은
# docker-compose.yml의 ports: "3000:3000"에서 이루어진다. EXPOSE 자체는
# 포트를 열어주지 않고, 사람/도구를 위한 메타데이터일 뿐이다).
EXPOSE 3000
# standalone 빌드가 만들어주는 경량 서버 진입점을 직접 node로 실행한다.
# (next start 대신 이 방식을 쓰는 것이 standalone 모드의 표준 실행법이다.)
CMD ["node", "server.js"]
