# 정보처리기사 실기 합격 코치 현재 현황과 남은 작업

- 기준 시각: 2026-09-06 09:41 KST
- 기준 브랜치: `origin/master`
- 기준 코드: `73e7d5b` (`Harden exam coach WebGPT workflow guardrails (#35)`)
- 목적: 최신 `origin/master`에 병합된 코드와 테스트로 확인된 완료 범위와 앞으로 남은 구현을 한 문서에서 확인한다.
- 상세 구현 이력: [구현 진행 기록](./information-processing-practical-coach-implementation-status.md)
- 세부 체크리스트: [작업 분할표](./information-processing-practical-coach-work-breakdown.md)
- 구현 가이드·완료 검증 기록: [D0·W1-W2·S1-S2·C1-C2](./information-processing-practical-coach-next-implementation-guide.md)
- WebGPT 진행 회고: [WebGPT 시행착오 기록](./information-processing-practical-coach-webgpt-retrospective.md)
- 제품 기준: [제품 기획서](./information-processing-practical-coach.md)
- 전체 구축 순서: [실행 로드맵](./roadmap.md)

## 0. 2026-09-07 작업 트리 진행 메모 (미병합)

이 절은 `origin/master` 병합 완료 범위와 별개인 현재 작업 트리 기록이다. 아래
변경은 구현과 집중 검증까지 끝났지만 아직 커밋·push·PR·병합되지 않았으므로,
이 문서의 기존 병합 완료 체크를 바꾸지 않는다.

| 작업                          | 작업 트리 상태        | 확인 결과                                                                                                                                                       |
| ----------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F3 브라우저 memory state 재생 | 검증 완료·미병합      | 정규 학습 이벤트 저장 뒤 due review가 생기는 시각으로 이동하고, 새로고침 전후 오늘 큐 표시와 저장 이벤트 projection이 동일함을 Chromium desktop/mobile에서 확인 |
| E1 주간 SQL/C 미니 테스트     | 구현·검증 완료·미병합 | `/exam-coach/weekly`, 25분·10문항 고정 v1 세트, 점수·응시 수·총 응답시간·10개 개념별 결과 저장                                                                  |
| 평가 개인정보 경계            | 검증 완료·미병합      | 제출 답안·문항·정답·해설을 localStorage에 저장하지 않고 완료 요약과 불변 assessment 이벤트만 저장                                                               |
| assessment/FSRS 격리          | 검증 완료·미병합      | 주간 평가 이벤트가 모두 `mode: "assessment"`이며 regular FSRS adapter를 호출하거나 memory state를 만들지 않음                                                   |

E1 작업 트리 구현의 세부 범위:

- `weekly.sql-c.2026.v1` 세트가 SQL 5개와 C 5개 개념을 각각 한 번씩 다룬다.
- Zod 콘텐츠 계약과 committed JSON Schema에 `weekly` assessment form을 함께
  반영했다.
- 기존 완료 진단 이력 저장소를 확장해 완료된 주간 실행만 저장하고, 동일
  `runId` 재시도는 멱등 처리하며 충돌 payload와 다른 learner 데이터는 거부한다.
- 평가 중에는 정답·힌트·문항별 결과를 공개하지 않고, 모든 문항 완료 후에만
  최근 주간 결과와 개념별 결과를 표시한다.
- 홈 메뉴에서 `/exam-coach/weekly`로 이동할 수 있고 해당 페이지는 `noindex`다.

검증 기록:

- 집중 Vitest: 5 files, 21 tests 통과
- 전체 web Vitest: 49 files, 214 tests 통과
- ESLint, TypeScript `tsc --noEmit`, Next.js production build 통과
- F3 + E1 집중 Playwright: Chromium desktop/mobile 합계 4 tests 통과
- E1 완료 화면 axe serious/critical 위반 0건
- 실행 환경의 Node `24.20.0`은 저장소 요구 `24.19.0`과 달라 engine warning이
  있었지만 위 검증은 모두 통과했다.
- Playwright web server에서 기존 `/exam-coach/learn`의 blocking prerender 경고가
  출력됐지만 이번 집중 smoke와 production build는 통과했다.

WebGPT 실행은 새 제출 없이 기존 동일 작업의 Oracle run
`20260906T031015Z-56150294babf` (`oracle-pythonpars-56150294ba`)만 복구하려 했다.
해당 run은 `post-submit-provider-incomplete`, `safe_for_fresh_run: false`였고 exact
live recovery dry-run도 `BROWSER_IDENTITY_RECEIPT_REQUIRED`로 거부됐다. 중복 제출을
피하기 위해 새 WebGPT prompt는 보내지 않았으며, 이후 구현·검증은 로컬에서
진행했다.

아직 남은 마감 작업은 전체 Playwright gate, 전체 diff 검토, 커밋·push·PR·병합
여부 결정이다. 실제 4주·8주 개인 검증, 운영 C Sandbox 성공 smoke, O1~~O5,
M1~~M6는 여전히 미완료다.

### 후속 통합 검증: 2026-09-07

앞의 미커밋 메모는 당시 기록이다. 후속 작업에서 F3/E1과 평가 세션 리팩토링을
커밋으로 보존하고 최신 master를 통합했다. 전체 web 테스트 274개, 별도
PostgreSQL 통합 테스트 5개, 기본 Playwright 28개와 axe 검사, format/lint/
typecheck/Drizzle/audit/build가 통과했다. E2E는 build 후 production 서버를
검사하며 콘텐츠 확장에 영향을 받지 않도록 F3 대상 카드를 명시한다.
기존 체크박스는 위에 명시한 master 기준을 유지한다. 상세 근거와 외부 인증
블로커는 [구현 기록 9절](./information-processing-practical-coach-implementation-status.md#9-2026-09-07-최신-master-통합과-전체-게이트-복구)을 따른다.

### P0 전체 검증 및 병합 완료: 2026-09-07

P0 마감 조건을 다시 실행하고 원격 병합 결과를 확인했다.

- `pnpm install --frozen-lockfile`, format, workspace lint, TypeScript, Drizzle
  check가 통과했다.
- 전체 workspace 테스트는 54 files / 274 tests 통과했다. DB 통합 테스트는
  별도 테스트 DB가 필요한 5개가 설정 없이 skip되는 기존 계약을 유지한다.
- `NEWSORDER_RUNTIME_MODE=fixture pnpm build`가 통과했다.
- production server 기반 Playwright는 Chromium desktop/mobile 28개가 모두
  통과했고, axe serious/critical 위반은 0건이었다. 이 결과에는 F3 새로고침,
  기준선·종료·주간 평가 흐름이 포함된다.
- PR #37의 원격 `verify`와 `secret-scan`이 성공했고, PR은
  `8f39dea56314b08b2e1598756810174c9462d821`로 `master`에 병합됐다.
- E1 주간 SQL/C 미니 테스트는 PR #37에 포함되어 `master`에 병합됐다. 고정
  `weekly.sql-c.2026.v1` 세트의 SQL 5개·C 5개 문항, 완료 후 결과 공개,
  점수·응답 문항·총 응답시간·개념별 결과, 답안 원문 비저장,
  assessment/정규 FSRS 격리와 runId 멱등 저장을 검증했다. production
  Playwright 주간 평가 desktop/mobile 2개와 완료 화면 axe 검사가 통과했다.
- F3 브라우저 memory state 재생도 production Playwright Chromium
  desktop/mobile에서 통과했다. 정규 학습 이벤트 저장 후 due review를 만들고,
  새로고침 전후 오늘 큐 표시와 localStorage 이벤트 projection이 동일했다.
- 실행 Node는 `24.20.0`으로 저장소 요구 `24.19.0`과 달라 engine warning이
  있었지만 검증 결과에는 영향을 주지 않았다.

## 1. 한눈에 보는 현재 상태

개인 MVP의 기반 코어와 진단·커리큘럼·준비도 화면에 더해 실제 `ts-fsrs` 어댑터, 이벤트 기반 memory state 재생, 검수 콘텐츠 catalog, 정규 학습 세션, 오늘 계획, 시험일까지 계획·놓친 날 복구, 취약점 화면, SQL 결과 채점, C 제한 실행 경계까지 `origin/master`에 병합됐다. 현재 게스트 흐름은 **정규 문제 풀이 → 불변 이벤트 저장 → FSRS 기억 일정 재계산 → 취약점·오늘 계획 갱신**까지 연결됐다. 다만 C 실행의 실제 운영 성공 경로와 8주 학습 효과 검증은 아직 남아 있다.

<!-- prettier-ignore -->
| 영역 | 상태 | 현재 결과 |
| --- | --- | --- |
| 공식 범위·개념 그래프 | 완료 | 2026 Q-Net 12개 영역, SQL·C 10개 개념과 선수지식 그래프 |
| 콘텐츠 계약 | 완료 | Zod/JSON Schema, 검수 상태, 버전·기억 이력 승계 계약 |
| 채점·교정 코어 | 완료 | `exact` / `keywords` / `sql`, 첫 제출, 교정, 점진적 힌트 |
| 학습 이벤트 | 완료 | 불변 `LearningEvent`, 멱등 저장, 충돌 거부, 시간순 재생 경계 |
| 오늘 큐 코어 | 완료 | 만기 복습 → 신규 → 적용, 시간 예산, 선수지식, 복습 부채 억제 |
| 기준선 진단 | 완료 | `/exam-coach`, SQL·C 6문항, 로컬 설정·진단 저장 |
| 종료 동형 진단 | 완료 | `/exam-coach/followup`, 정확도·시간·기술쌍 변화 비교 |
| 공식 커리큘럼 | 완료 | `/exam-coach/curriculum`, 공식 12개 영역과 현재 SQL·C 범위 분리 |
| 준비도 리포트 | 완료 | `/exam-coach/report`, 진단 근거 기반 SQL·C 준비도와 데이터 부재 구분 |
| FSRS dependency 정책 | 완료 | `ts-fsrs@5.4.1` 고정 정책 유지 |
| 실제 FSRS package/lockfile | 코드 반영 완료 | `apps/web/package.json`과 `pnpm-lock.yaml`에 `ts-fsrs@5.4.1` 고정, frozen install 확인 |
| 실제 FSRS 어댑터 | 완료 | FSRS-6 기반 Rating 매핑, 목표 기억률 0.9, 최대 interval, 상태 검증 구현 |
| 이벤트 → memory state 재생 | 완료 | 시간순·멱등·충돌 거부·assessment/비최초 제출 제외·버전 resolver 적용 |
| L1 실제 학습 콘텐츠 | 완료 | SQL/C sample catalog, 명시적 review metadata, `reviewed` 전용 정규 신규 후보 선택 |
| 정규 학습 세션 UI | 완료 | `/exam-coach/learn`, 첫 제출·교정·도움·회상 등급·불변 이벤트 저장·FSRS 재계산을 컴포넌트 테스트로 확인 |
| 실제 오늘 계획 UI | 완료 | 저장 이벤트에서 memory state를 재생하고 due review → reviewed new 순으로 시간 예산 큐를 표시, focus/visibility 재계산 확인 |
| 시험일까지 계획·복구 요약 | 완료 | 시험일까지 남은 일수·총 가용 시간·reviewed 커버리지·due 부채·복습/신규 예산과 7일 미리보기, 로컬 이벤트 근거 미수행 추정·부채 이월을 일일 상한 안에서 계산 |
| 취약점 집계·행동 연결 | 완료 | 개념별 반복 실패·도움 의존·적용 실패·review debt 집계, 취약점 보드, 카드별 학습 이동, 동형·선수 개념 빈 상태 |
| SQL 수직 범위·결과 채점 | 완료 | SQL 5개 개념, 검수 콘텐츠 10개, 고정 dataset, 결과 행·열 동등성·금지문·오류 유형 판정 |
| C 수직 범위 | 완료 | C 5개 개념, 검수 콘텐츠 10개, 실행 결과 예측·상태 추적·코드 완성·짧은 작성 |
| 제한 C 실행 경계 | 구현 완료·운영 검증 대기 | Accepted ADR, 일회성 Vercel Sandbox, deny-all 네트워크·자원 상한·실패 fallback; 운영 Sandbox 성공 smoke 필요 |

## 2. 지금까지 완료한 주요 작업

### 2.1 제품·도메인 경계

- 기존 영어 학습 기능과 정보처리기사 실기 코치의 학습 데이터 경계를 분리했다.
- 별도 workspace를 새로 만들지 않고 `apps/web/src/features/exam-coach` 아래에 제품 코어를 구성했다.
- 게스트 데이터는 기존 서비스와 다른 `exam-coach:v1:*` localStorage namespace를 사용한다.
- 사용자가 작성한 SQL·코드·서술 답안 원문은 장기 학습 이벤트에 저장하지 않는 원칙을 고정했다.

### 2.2 공식 범위와 SQL·C 개념 그래프

- 2026 Q-Net 정보처리기사 실기 12개 공식 영역 레지스트리를 추가했다.
- 개인 MVP 범위는 `SQL 응용`과 `프로그래밍 언어 활용`로 한정했다.
- SQL 5개, C 5개 개념의 선수지식 그래프를 정의했다.
- `/exam-coach/curriculum`에서 공식 범위와 현재 개인 검증 범위를 분리해 표시한다.

### 2.3 콘텐츠·검수 계약

- 콘텐츠의 런타임 Zod 스키마와 JSON Schema를 만들었다.
- `draft`와 `reviewed` 상태를 구분한다.
- 작성자와 다른 검수자가 승인해야 `reviewed`가 될 수 있는 계약을 추가했다.
- 콘텐츠 개정 시 버전을 올리고 기존 검수 승인과 기억 이력 승계 결정을 다시 검토하도록 했다.

### 2.4 채점·첫 제출·교정 흐름

- `exact`, `keywords`, `sql` 규칙 기반 채점 엔진을 구현했다.
- SQL 필수 절과 금지 변경 토큰을 검사한다.
- 첫 제출 전 힌트·정답·해설을 공개하지 않는 계약을 고정했다.
- 첫 제출 오답 뒤에는 `개념 단서 → 구조 힌트 → 구체적 힌트 → 해설·정답` 순서로 도움을 연다.
- 교정 제출이 최초 정오를 덮어쓰지 않는다.
- 오답 또는 도움 사용 후 정답은 FSRS 입력에서 반드시 `Again`으로 처리한다.

### 2.5 불변 학습 이벤트와 재생 경계

- 장기 저장 단위를 최종 카드 상태가 아니라 불변 `LearningEvent`로 정의했다.
- 같은 `eventId`의 동일 payload 재전송은 한 번만 반영한다.
- 같은 ID의 다른 payload는 충돌로 거부한다.
- 이벤트는 `occurredAt` 순으로 결정적으로 재생한다.
- `assessment` 이벤트와 첫 제출이 아닌 이벤트는 정규 기억 일정에서 제외하도록 계약했다.
- 이벤트별 `fsrsVersion` resolver 경계를 이미 마련했다.

### 2.6 오늘 큐 코어

- 만기 복습을 신규 학습보다 먼저 배치한다.
- 복습 부채가 시간 예산 안에 다 들어가지 않으면 신규·적용 활동을 억제한다.
- 신규·적용 활동은 선수지식이 충족된 경우에만 열린다.
- `복습 → 신규 → 적용` 순서를 유지한다.
- 큐 결과에서 사용 시간, 남은 시간, 만기 복습 수, 밀린 복습 수를 계산할 수 있다.

### 2.7 게스트 설정과 기준선 진단

- `/exam-coach`에서 시험 예정일과 하루 학습 가능 시간을 저장할 수 있다.
- SQL·C 6문항 기준선 진단을 수행한다.
- 진단 중에는 정답·힌트·문항별 채점 결과를 공개하지 않는다.
- 완료된 진단만 진단 이력으로 저장한다.
- 제출 답안 원문·정답·해설은 localStorage에 저장하지 않는다.

### 2.8 종료 동형 진단

- `/exam-coach/followup`에 기준선과 동형인 다른 6문항을 연결했다.
- 기준선이 없으면 종료 진단을 시작하지 못하도록 했다.
- 기준선 대비 정확도 변화, 총 응답시간 변화, 기술쌍별 정오 변화를 표시한다.
- 이를 합격 확률로 변환하지 않는다.

### 2.9 준비도 리포트

- `/exam-coach/report`를 추가했다.
- 기준선·종료 진단의 `assessment` 이벤트를 콘텐츠 ID와 버전에 맞춰 개념 근거로 다시 펼친다.
- 알려지지 않은 assessment ID나 다른 버전은 제외한다.
- SQL·C 10개 개념을 고정 분모로 사용한다.
- 데이터가 없으면 `0%`가 아니라 `측정 없음`으로 표시한다.
- 준비도 리포트 UI는 아직 replay된 실제 memory state와 연결되지 않았으므로 복습 부채를 `0건`으로 가장하지 않고 현재의 `FSRS 연결 후 측정` 안내를 유지한다.
- 합격 확률이나 근거 없는 종합 점수를 만들지 않는다.

### 2.10 실제 FSRS dependency와 어댑터

- 실제 FSRS 구현체는 `ts-fsrs@5.4.1`로 package와 lockfile에 고정돼 있다.
- 목표 기억률은 `request_retention: 0.9`, 최대 interval은 36,500일로 고정했다.
- `Again / Hard / Good / Easy`를 실제 FSRS Rating으로 매핑하고 신규 카드와 기존 카드의 다음 상태를 계산한다.
- 저장된 FSRS 상태의 버전·카드 ID·dueAt·stability·difficulty 불일치를 거부한다.
- `pnpm install --frozen-lockfile`에서 추가 lockfile 변경 없이 설치됨을 확인했다.

### 2.11 이벤트 재생으로 memory state 복원

- 같은 `eventId`의 동일 재전송은 한 번만 반영하고 payload 충돌은 거부한다.
- 이벤트를 `occurredAt` 순으로 정규화한 뒤 첫 제출인 정규 학습 이벤트만 FSRS에 반영한다.
- assessment와 교정 제출은 memory scheduling에서 제외한다.
- 이벤트마다 기록된 `fsrsVersion`으로 adapter를 해석하며 여러 버전 이력도 순서대로 재생한다.
- 코어 테스트는 이벤트 로그에서 동일 상태를 결정적으로 복원하는 경계를 검증하고, Today 컴포넌트 테스트는 mount와 window focus 복귀 시 저장 이벤트를 다시 읽어 큐를 재계산하는 흐름을 확인한다. 실제 브라우저 새로고침 Playwright smoke는 아직 별도 확인이 필요하다.

### 2.12 L1 실제 학습 콘텐츠 확정

- SQL 10개와 C 10개의 검수 콘텐츠를 코드 catalog로 등록해 소비자가 JSON 경로를 직접 읽지 않게 했다. 각 영역의 5개 개념마다 이해·회상 중심의 동형 콘텐츠를 2개씩 확보했다.
- catalog 로딩 시 2026 공식 영역, concept ID, concept domain, 선수지식 그래프, grading, 힌트, 해설 계약을 함께 검증한다.
- 모든 공개 후보는 작성자와 다른 검수자, 검수 시각, `reviewedVersion === version`, 전체 검수 체크리스트를 명시한다.
- `draft`는 review metadata 없이도 유효한 콘텐츠로 유지된다.
- 정규 신규 후보 생성기는 `reviewStatus: "reviewed"`만 통과시키며, draft가 오늘 큐 후보에 들어가지 않는 테스트를 추가했다.

### 2.13 P1~P2 시험일까지 계획과 놓친 날 복구

- 저장된 `examDate`, `dailyMinutes`, 설정 갱신 시각과 같은 불변 학습 이벤트를 사용해 시험일까지 남은 달력 일수와 총 가용 시간을 계산한다.
- 과거 시험일은 음수 계획으로 만들지 않고 `past-exam-date` 상태로 표시하며, 비정상 달력 날짜는 `invalid-exam-date`로 거부한다.
- `reviewed` catalog 중 memory state가 있는 콘텐츠를 학습 커버리지로 계산하고, 아직 memory가 없는 검수 콘텐츠·개념 수와 예상 신규 학습 시간을 별도로 계산한다.
- replay된 memory state의 `dueAt <= now` 항목을 현재 복습 부채 건수·분으로 집계하고, 시험일까지의 가용 시간을 복습/신규 예산으로 분리한다. 시험이 14일·7일·3일 이내로 가까워질수록 복습 예산 비중을 단계적으로 높인다.
- 다음 최대 7일 미리보기는 하루 `dailyMinutes`를 넘지 않으며, 현재 due 부채가 남아 있으면 신규보다 먼저 배치하고 하루에 담지 못한 부채는 다음 날로 이월한다.
- 별도 완료 체크 이력을 만들지 않았다. 대신 설정 저장 뒤 완전히 지난 날짜 중 assessment가 아닌 학습 이벤트가 없는 날을 **로컬 기록 기준 미수행 추정**으로 표시하므로, 실제 사용자의 모든 활동을 안다고 과장하지 않는다.
- 별도 검수 application 콘텐츠가 없으므로 시험 임박 정책은 복습 비중 강화로만 표현하고 application 항목이나 합격 확률·예상 점수를 만들지 않는다.
- P1/P2 코어 및 게스트 컴포넌트 테스트를 추가했고, 지정 Vitest 명령은 프로젝트 설정상 전체 47개 테스트 파일/210개 테스트로 확장 실행되어 모두 통과했다.

### 2.14 취약점 집계와 행동 연결

- `weakness.ts`가 정규 학습·진단 evidence를 개념별로 합치고 반복 회상 실패, 도움 의존, 적용 실패, review debt를 별도 signal로 집계한다.
- 취약점 보드는 근거 없는 개념을 `측정 없음`으로 표시하고, 단일 취약도 점수나 합격 확률을 만들지 않는다.
- 만기 복습은 카드별 학습 화면으로, 동형 문제는 `variantGroupId` 기반 검수 콘텐츠로, 선수지식 결손은 선행 개념 또는 커리큘럼으로 연결한다.
- 동형·적용 콘텐츠가 없을 때는 임의의 대체 활동을 만들지 않고 명시적 빈 상태를 표시한다.

### 2.15 SQL 수직 범위와 결과 채점

- SQL 5개 개념에 대해 테이블·행·열, `SELECT / FROM`, `WHERE`, `GROUP BY / HAVING`, `JOIN` 콘텐츠를 확보했다.
- `employees-v1` 고정 읽기 전용 dataset과 `datasetId` 검증을 추가했다. 기존 dataset을 수정하지 않고 변경 시 새 버전을 만든다.
- 결과 행·열 동등성, `NULL`, 중복 행, `ORDER BY` 순서, 금지 변경문을 판정하며 `syntax`·`scope`·`condition`·`join`·`aggregate`·`forbidden` 오류 유형을 분류한다.
- 오류 유형은 답안 원문 대신 분류 코드로만 이벤트에 남기고, 기존 localStorage envelope와의 호환성 테스트를 유지한다.

### 2.16 C 수직 범위와 제한 실행 경계

- C 5개 개념에 대해 값·타입, 연산자·식, 제어 흐름, 배열, 포인터의 실행 결과 예측·상태 추적·코드 완성·짧은 작성 콘텐츠를 확보했다.
- `docs/adr/0004-restricted-code-execution-boundary.md`를 Accepted로 확정하고, C 실행은 일회성 격리 Sandbox·deny-all 네트워크·CPU/메모리/출력/프로세스 상한 안에서만 허용한다.
- 첫 제출 전 실행 결과를 숨기고, 실행기 장애·미가용·상한 초과는 오답으로 기록하지 않으며 설명·회상 fallback을 유지한다.
- 로컬 smoke에서는 Vercel Sandbox 인증과 C toolchain 부재로 `sandbox-unavailable` 경로만 확인됐다. 실제 운영 Sandbox 성공 실행은 별도 외부 환경 검증이 필요하다.

## 3. 현재 핵심 차단점

최신 `origin/master` 기준으로 기존 **FSRS dependency 차단점과 W1~~W2·S1~~S2·C1~C2 구현 차단점은 해소됐다.** 실제 `dueAt`, stability, difficulty와 다음 복습 상태를 계산할 수 있고, 취약점 보드와 SQL/C 수직 콘텐츠도 병합됐다.

PR #33의 최종 `secret-scan`과 `verify`는 통과했다. 이전 `a7d401b` 기준에 기록했던 전체 Playwright 실패는 과거 검증 기록이므로 현재 차단점으로 취급하지 않는다. 이후 코드 변경에서는 동일 게이트를 다시 실행해 증거를 갱신한다.

현재 남은 핵심은 제품을 실제 개인 검증과 공개 운영에 견딜 수 있게 만드는 일이다. C 제한 실행은 안전한 미가용 fallback까지 구현됐지만, 실제 Vercel Sandbox와 C toolchain을 사용한 성공 실행 smoke는 아직 확인하지 않았다. 별도 검수 application 콘텐츠가 없으므로 unsupported placeholder를 만들지 않고 오늘 계획과 시험일까지 계획 모두에서 application 항목을 임의 생성하지 않는다.

현재 남은 제품 연결 작업:

- 실제 브라우저 새로고침 전후 동일한 memory state 통합 확인
- E1~E3 주간·중간·종료 평가와 8주 개인 검증
- O1~O5 오프라인·동기화·백업/복구 기반
- M1~M6 콘텐츠 운영·접근성·오류 계측
- C 실행의 운영 Sandbox 성공 smoke와 무료 한도·관찰성 확인
- [공개 베타 출시 체크리스트](../operations/release-checklist.md)의 외부 서비스·권리·보안·성능 검증

Application 콘텐츠는 현재 검수본이 없으므로 오늘 계획과 시험일까지 계획에서
빈 큐로 유지한다. 새 application 문항의 범위·dataset·채점 규칙·힌트·권리
metadata를 작성하고 독립 검수자가 `reviewed` 승인하기 전에는 placeholder,
예상 점수, 임의 적용 활동을 만들지 않는다. 재개 조건은 검수 콘텐츠 추가 후
catalog·queue·개인정보 경계·desktop/mobile E2E·axe 검증을 완료하는 것이다.

## 4. 남은 작업과 실행 순서

### 4.1 F1 마무리 — package/lockfile 반영

- [x] `ts-fsrs@5.4.1` 공급망 정책 통과가 PR #33 최종 `secret-scan`/`verify` 기록으로 확인됨
- [x] `apps/web/package.json`과 `pnpm-lock.yaml`에 `ts-fsrs@5.4.1`을 함께 반영
- [x] `pnpm install --frozen-lockfile` 후 lockfile 추가 변경이 없는지 확인
- [x] 전체 CI 통과와 `master` 병합 여부 확인 — PR #33이 `6bcee08`로, 후속 guardrail이 `73e7d5b`로 반영

### 4.2 F2 — 실제 FSRS 어댑터

- [x] 기존 `FsrsAdapter` 계약에 `ts-fsrs` 연결
- [x] 목표 기억률 `0.9` 고정
- [x] 최대 interval 정책 고정
- [x] `Again / Hard / Good / Easy` → FSRS Rating 매핑
- [x] 신규 카드 첫 review 계산
- [x] 기존 카드 다음 review 계산
- [x] 구현 버전을 `fsrsVersion`으로 기록
- [x] 버전·카드 ID·상태 불일치 거부

완료 조건인 정규 첫 제출 이벤트 하나를 실제 FSRS 상태와 `dueAt`으로 계산하는 테스트가 존재한다.

### 4.3 F3 — 이벤트 재생으로 memory state 복원

- [x] 이벤트 로그만으로 같은 `MemoryState`를 결정적으로 재구성
- [x] 같은 `eventId` 멱등 처리와 충돌 거부 유지
- [x] `occurredAt` 순 재생
- [x] assessment·첫 제출이 아닌 이벤트 제외
- [x] 이벤트별 `fsrsVersion` resolver 적용
- [x] 여러 FSRS 버전 이력 재생 테스트
- [x] 실제 브라우저 새로고침 전후 동일한 memory state 통합 확인

### 4.4 L1 — 실제 학습 콘텐츠 확정

- [x] 현재 SQL/C 샘플 콘텐츠 코드 catalog 목록화
- [x] 공식 영역·concept ID·선수지식 검토 및 catalog 교차 검증
- [x] grading·힌트·해설·정답 검토
- [x] 작성자와 다른 검수자 승인 metadata 기록
- [x] `reviewed` 콘텐츠만 정규 신규 큐 후보에서 선택
- [x] `draft` 콘텐츠가 오늘 큐에 들어가지 않는 테스트

### 4.5 L2~L3 — 정규 학습 세션

- [x] 전용 학습 route 추가
- [x] reviewed 문제·이해 자료 렌더링
- [x] 첫 제출 전 힌트·정답 비공개
- [x] 첫 제출 규칙 기반 채점
- [x] 오답 시 교정 흐름
- [x] 독립 정답 시 `Hard / Good / Easy` 선택
- [x] 오답·도움 사용 시 `Again` 강제
- [x] response time/help level/mode를 `LearningEvent`로 저장
- [x] 답안 원문이 이벤트에 저장되지 않는지 컴포넌트 테스트 확인
- [x] 이벤트 저장 직후 FSRS memory state 재계산

### 4.6 Q1~Q3 — 실제 오늘 계획

- [x] 저장 이벤트에서 catalog 카드 memory state 재계산
- [x] 현재 시각 기준 실제 due review 후보 생성
- [x] 독립 첫 제출 정답·무도움·non-Again 근거로 mastered concept 집합 생성
- [x] `reviewed` 신규 후보 생성, 별도 application 콘텐츠 부재 시 빈 큐 유지
- [x] 저장된 `dailyMinutes`를 실제 시간 예산으로 사용
- [x] `복습 → 신규 → 적용` 큐 순서와 실제 항목 표시
- [x] regular content 항목 클릭 시 정규 학습 세션으로 이동
- [x] mount/focus/visibility 복귀 시 저장 이벤트에서 큐 재계산
- [x] 15분 / 45분 / 60분 시간 예산 회귀 테스트

### 4.7 P1~P2 — 시험일까지 계획과 놓친 날 복구

- [x] 시험일까지 남은 일수와 총 가용 시간 계산
- [x] reviewed 커버리지·남은 신규 콘텐츠/개념량과 due review 부채 분리
- [x] 복습/신규 시간 예산 분리, 시험 임박 시 복습 비중 단계적 확대
- [x] 다음 최대 7일 계획 미리보기와 일일 `dailyMinutes` 상한 유지
- [x] 과거/비정상 시험일을 음수 계획 없이 명시적 상태로 처리
- [x] 설정 저장 뒤 완전히 지난 날의 정규 학습 이벤트 부재를 로컬 근거 미수행으로 추정
- [x] 미완료 복습을 신규보다 우선 배치
- [x] 하루 상한을 넘는 누적 복습 부채를 다음 날로 이월
- [x] 신규 학습 시간을 부채 회복 뒤 남는 일일 예산으로 후속 날짜에 분산
- [x] 별도 검수 application 콘텐츠가 없어 application 항목은 만들지 않고 복습 강조만 적용

### 4.8 W1~W2 — 취약점 화면

- [x] 독립 회상 반복 실패 집계
- [x] 도움 의존 반복 집계
- [x] 적용·평가 반복 실패 집계
- [x] FSRS review debt 집계
- [x] 취약 개념을 우선 복습 후보로 연결
- [x] 같은 문제 반복 대신 동형·유사 문제 제공
- [x] 선수지식 결손이면 선행 개념으로 이동
- [x] 적용 콘텐츠가 없을 때 명시적 빈 상태 유지

### 4.9 S1~S2 — SQL 수직 범위 확대

- [x] 테이블·행·열
- [x] `SELECT / FROM`
- [x] `WHERE`
- [x] `GROUP BY / HAVING`
- [x] `JOIN`
- [x] 이해 → 회상 → 적용 콘텐츠 확보
- [x] 고정 읽기 전용 데이터셋과 결과 예측형 SQL 문제
- [x] 결과 행·열 동등성 판정과 오류 유형 분류
- [x] `NULL`, 중복 행, `ORDER BY`, 금지 변경문 판정
- [x] 실제 브라우저/서버 SQL 실행 엔진 도입 여부 결정 — 현재 MVP에서는 도입하지 않고 결과 예측형 판정을 유지 ([ADR 0005](../adr/0005-defer-sql-execution-engine.md))
- [ ] 주간 SQL 미니 테스트

### 4.10 C1~C2 — C 수직 범위 확대

- [x] 값과 타입
- [x] 연산자와 식
- [x] 제어 흐름
- [x] 배열
- [x] 포인터
- [x] 이해 → 회상 → 적용 콘텐츠 확보
- [x] 실행 결과 예측·상태 추적·코드 완성·짧은 작성

- [x] 첫 제출과 실행 후 수정 답 구분
- [x] 제한된 컴파일/테스트 실행 경계와 자원 상한
- [x] 네트워크·호스트 파일·위험 기능 차단
- [x] 실행기 장애·미가용 시 설명·회상 fallback
- [ ] 운영 Vercel Sandbox와 C toolchain을 사용한 성공 실행 smoke

### 4.11 E1~E3 — 평가와 8주 개인 검증

- [x] 20~30분 주간 SQL/C 미니 테스트
- [x] 점수·총 응답시간·개념별 결과 저장
- [ ] 4주차 중간 동형 평가와 콘텐츠·채점 규칙 검토
- [ ] 8주차 `/exam-coach/followup` 실행 및 기준선 대비 변화 분석
- [ ] 7일 이상 지연 회상, 실제 회상률·목표 90%, review debt 분석

### 4.12 O1~O5 — 오프라인·동기화·백업

- [ ] Service Worker, IndexedDB, offline due review/event queue
- [ ] 재연결 멱등 업로드·부분 실패 재시도·시계 오차 처리
- [ ] 여러 기기 이벤트 병합과 memory state 덮어쓰기 방지
- [ ] 게스트→계정 연결, 삭제·내보내기, 이벤트·설정·진단 백업/복구

### 4.13 M1~M6 — 운영·안전·접근성

- [ ] 콘텐츠 오류 신고·출제 중지·개정 버전 처리
- [ ] keyboard-only, focus, 스크린리더, 모바일 320px/200% 확대
- [ ] 취약점·정규 학습 흐름의 axe serious/critical 0 유지
- [ ] 저장/비저장 데이터와 외부 AI 전송 고지 확인
- [ ] 채점·FSRS·저장·동기화 오류 계측
- [ ] 개인정보 없는 로그 계약

### 4.14 공개 베타 외부 검증

- [ ] 자격증명 폐기·Git 이력 정리·fresh clone
- [ ] 실제 Google 로그인·계정 삭제·관리자 권한 흐름
- [ ] 권리·비제휴·원문 링크·보존 정책 표본 검사
- [ ] Private Blob 백업의 빈 Neon branch 복원과 deletion event 재적용
- [ ] 무료 한도, Sentry scrub, 수집/백업 실패 알림, rollback deployment 확인
