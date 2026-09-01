# Sentence

Sentence는 영어 뉴스, Reddit 주요 토픽, 퍼블릭 도메인 고전을 문장 배열로 학습하는 비상업 공개 베타입니다. BBC의 공식 또는 제휴 서비스가 아닙니다.

> 문장으로 읽는 영어 · https://sentence.doowiki.dev

이 저장소의 신규 애플리케이션은 Next.js 16 App Router와 pnpm workspace로 구성됩니다. 기존 `DuouOLingo/my-app`은 전환 후 7일 rollback 기간이 끝날 때까지 보존합니다.

## 로컬 실행

필수 버전은 Node.js `24.19.0`, pnpm `11.24.0`입니다.

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

기본 `NEWSORDER_RUNTIME_MODE=fixture`에서는 DB나 외부 API 없이 합성 콘텐츠 10건으로 전체 공개 학습 흐름을 확인할 수 있습니다. 합성 콘텐츠는 BBC 콘텐츠가 아닙니다.

## 주요 명령

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm db:check
pnpm build
pnpm test:e2e
```

Production migration은 앱 시작이나 `drizzle-kit push`로 실행하지 않습니다. 승인된 환경에서 `DATABASE_URL`을 지정한 뒤 `pnpm db:migrate`를 한 번만 실행합니다.

## 구조

- `apps/web`: Next.js 웹 앱, Route Handler, 수집·번역·관리자·백업 서비스
- `packages/db`: Drizzle schema/migration과 제한된 복원 CLI
- `docs/architecture`: 시스템 및 데이터 경계
- `docs/operations`: 보안, 배포, 수집, 백업·복원 runbook
- `docs/privacy`: 저장 데이터 목록

구현 기준은 [Next.js 리팩터링 실행 계획](docs/nextjs-refactor-plan.md)입니다.

## 출시 전 필수 외부 작업

현재 트리에서는 추적되던 자격증명 파일과 레거시 서버의 하드코딩된 Naver 자격증명을 제거했지만, 과거 Git 이력은 별도 maintenance 작업 없이는 정리되지 않습니다. Google/Firebase와 Naver 공급자 콘솔에서 노출 자격증명을 먼저 폐기한 뒤 [보안 사고 정리 runbook](docs/operations/security-incident.md)에 따라 mirror, `git filter-repo`, 원격 갱신, 전체 이력 secret scan을 수행해야 합니다.

운영 전에는 [출시 체크리스트](docs/operations/release-checklist.md)의 외부 검증 항목까지 완료해야 합니다.
