# TODO / Sentence / pythonparsing

> 칸반 원본: 이 파일의 open task를 읽어 `/home/leedo/project/side/project-kanban`에 표시한다.
> 분석 기준일: 2026-09-07
> 상태 신호: P0/P1 verified; P2 SQL engine decision accepted; application content blocked

이 파일은 이 프로젝트의 현재 남은 작업을 기록한다. 기존 설계서·로드맵·세부 TODO는 보존하며, 작업이 끝나면 해당 항목을 `[x]`로 바꾸고 근거를 남긴다.

## Open queue

- [x] [P1] [VERIFY] E1 주간 SQL/C 미니 테스트를 merge 가능한 단위로 정리 <!-- id=python-assessment; size=M; confidence=direct; tags=assessment,merge; source=pythonparsing/docs/product/information-processing-practical-coach-current-status.md §0 -->

  > 완료 조건: 25분·10문항 평가, 점수·응시 수·응답 시간·개념별 결과와 개인정보 경계를 구현하고 merge 가능한 단위로 검증한다.
  > 구현: `weekly.sql-c.2026.v1` SQL 5개/C 5개 문항, 완료 후에만 결과 공개, runId 멱등 저장, assessment 이벤트의 정규 FSRS 격리, 답안·문항·정답·해설 원문 비저장.
  > 검증: 집중 Vitest 4 files/18 tests 통과; production Playwright 주간 평가 Chromium desktop/mobile 2 tests 통과; 완료 화면 axe serious/critical 0건; 전체 workspace 54 files/274 tests 및 전체 E2E 28 tests도 통과.
  > 원격: PR #37 merged, 원격 `verify`/`secret-scan` 성공.
  > 완료일: 2026-09-07

- [x] [P1] [VERIFY] F3 browser memory state 재생 gate <!-- id=python-browser; size=M; confidence=direct; tags=fsrs,browser; source=pythonparsing/docs/product/information-processing-practical-coach-current-status.md §0 / §4.3 -->

  > 완료 조건: 정규 학습 이벤트 저장·due review·새로고침 전후 오늘 큐 projection을 Chromium desktop/mobile에서 확인한다.
  > 검증: 집중 Vitest 4 files/24 tests 통과; production Playwright Chromium desktop/mobile 2 tests 통과. Hard 등급 이벤트 저장 후 7분 경과 시 due review 1건이 생성되고, reload 전후 큐 표시와 저장 이벤트 projection이 동일했다.
  > 완료일: 2026-09-07

- [x] [P2] [VERIFY] 실제 브라우저/서버 SQL 실행 엔진 도입 여부 결정 <!-- id=python-sql-engine; size=L; confidence=direct; tags=sql,decision; source=pythonparsing/docs/product/information-processing-practical-coach-current-status.md §4.9 -->

  > 결정: 현재 MVP에서는 실제 브라우저/서버 SQL 실행 엔진을 도입하지 않고, 고정 읽기 전용 dataset과 결과 예측형 판정을 유지한다.
  > 근거: SQL 5개 개념·10개 검수 콘텐츠의 결과/절/금지 토큰 채점과 catalog 검증이 이미 결정적으로 동작하며, 실제 실행은 별도 dialect·일회성 read-only sandbox·시간/메모리/행 수 제한·운영 계측·fallback 경계를 먼저 확보해야 한다.
  > 문서: `docs/adr/0005-defer-sql-execution-engine.md`, current-status §4.9.
  > 검증: SQL grading/catalog 집중 Vitest 2 files/23 tests 통과; 전체 workspace 테스트·lint·typecheck·build·Playwright gate도 P0에서 통과.
  > 완료일: 2026-09-07

- [x] [P0] [VERIFY] full verify·Playwright·a11y와 PR/merge 완료 <!-- id=python-ci; size=L; confidence=direct; tags=ci,release; source=pythonparsing/docs/product/information-processing-practical-coach-current-status.md §0 -->

  > 완료 조건: 전체 로컬 gate, production E2E/axe, 원격 CI, PR 병합을 확인한다.
  > 검증: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (54 files/274 tests), `pnpm db:check`, `NEWSORDER_RUNTIME_MODE=fixture pnpm build`, `NEWSORDER_RUNTIME_MODE=fixture pnpm test:e2e` (28 passed; desktop/mobile, axe serious/critical 0).
  > 원격: PR #37 `Add weekly assessments and retry-safe diagnostic sessions` merged, `verify`/`secret-scan` 성공, merge commit `8f39dea56314b08b2e1598756810174c9462d821`.
  > 참고: Node `24.20.0`에서 저장소 요구 `24.19.0` engine warning이 있었고, pnpm `11.24.0`은 일치했다.
  > 완료일: 2026-09-07

- [ ] [P2] [BLOCKED] application 콘텐츠가 없는 상태를 빈 큐로 유지하며 검수 계획 세우기 <!-- id=python-application; size=M; confidence=direct; tags=content,governance; source=pythonparsing/docs/product/information-processing-practical-coach-current-status.md §3 -->

  > 차단: 현재 SQL/C catalog에는 이해·회상 중심의 reviewed 콘텐츠만 있고, 검수된 application 콘텐츠가 없어 오늘 계획에 연결할 대상이 없다.
  > 필요한 결정/외부 의존성: SQL/C application 문항의 범위·dataset·채점 규칙·힌트·권리 metadata를 작성한 뒤 작성자와 다른 검수자의 승인으로 `reviewed` 상태를 만들어야 한다. 근거 없는 placeholder나 예상 점수는 만들지 않는다.
  > 확인: `today-plan.ts`가 `applicationCandidates: []`를 전달하고, 오늘 계획 집중 Vitest 3 files/11 tests가 application 빈 큐·일일 시간 상한·빈 상태 안내를 통과했다. 기존 전체 테스트·lint·typecheck·build·Playwright/axe gate도 통과했다.
  > 재개 조건: 검수된 application 콘텐츠가 catalog에 추가되고 catalog 검증, queue 연결, 개인정보 경계, desktop/mobile E2E와 axe 검증 범위가 확정될 때.

## Maintenance notes

- `DOC` 항목은 원본 문서에 직접 남아 있는 작업이다.
- `INFERRED` 항목은 현재 운영·검증 신호에서 도출한 다음 단계이며, 실행 전에 담당자가 범위를 확정한다.
- 비밀값·토큰·쿠키·원본 입력은 이 파일에 기록하지 않는다.
