# Preview, Production, migration과 rollback

## 환경 분리

- 각 PR Preview는 Production clone이 아닌 비운영 Neon template branch를 사용한다.
- Preview의 Better Auth secret, Google OAuth client, Gemini key, Blob token은 Production과 분리한다.
- 동적 Preview URL의 Google callback 제약 때문에 CI는 fixture 인증을 사용한다.
- Vercel OIDC와 GCP Workload Identity Federation의 audience/subject 조건을 환경별로 제한한다.
- `NEWSORDER_DEV_ADMIN=true`는 fixture의 로컬 미리보기에서만 허용되며 Production schema 검증이 거부한다.

## Vercel 프로젝트 설정

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Node.js: `24.x`
- Build, Install, Output Directory: framework 자동 감지
- Cron 정의: `apps/web/vercel.json`
- 업로드 제외 경계: 저장소 루트 `.vercelignore`

최초 공개 확인은 `NEWSORDER_RUNTIME_MODE=fixture`로 배포할 수 있다. 실제 운영 승격은 아래 필수 secret과 DB migration을 준비한 뒤 `production`으로 변경하며, `NEXT_PUBLIC_APP_URL`은 최종 공개 origin으로 설정한다.

## PR gate

CI는 frozen lockfile, Production 의존성 취약점 audit, format, ESLint, TypeScript, Drizzle metadata, PostgreSQL migration/constraint test, Vitest, production build, Playwright, axe, 현재 tree secret scan을 수행한다. 과거 Git 이력 검사는 보안 maintenance 완료 증거로 별도 요구한다.

## Production 승격

1. 보호된 main의 CI와 격리 Preview를 통과한다.
2. Production DB에서 검증용 branch를 만든다.
3. 최신 사용자 백업 성공 상태와 Blob 존재를 확인한다.
4. 검증 branch에 커밋된 SQL migration을 적용하고 회귀 검사를 실행한다.
5. 승인된 workflow에서 Primary `DATABASE_URL`에 `pnpm db:migrate`를 한 번 실행한다.
6. Vercel Production deployment를 수동 승격한다.
7. `/`, `/today`, 한 레슨의 두 단계, 로그인, 관리자, cron 인증, source link를 smoke test한다.
8. 도메인/cron 전환 시각과 담당자를 기록한다.

금지: Production의 `drizzle-kit push`, 앱 시작 migration, Preview에서 Production DB 사용, backup 확인 없는 destructive migration.

## 7일 rollback

- 기존 서비스와 직전 Vercel deployment를 7일 유지한다.
- 이 기간 schema는 이전 코드와 호환되는 expand/contract 방식만 사용한다.
- rollback 시 신규 cron을 중단하고 이전 cron의 중복 여부를 확인한다.
- P0/P1이면 직전 deployment로 승격하고 migration은 데이터 삭제 없이 호환 경로로 되돌린다.
- 7일간 P0/P1이 없고 수집이 정상일 때만 `legacy-final` tag를 만든 뒤 레거시 CRA/Express와 추적된 루트 `node_modules` 제거를 별도 PR로 수행한다.
