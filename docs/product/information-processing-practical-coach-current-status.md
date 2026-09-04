# 정보처리기사 실기 합격 코치 현재 현황과 남은 작업

- 기준 시각: 2026-09-04 17:36 KST
- 기준 브랜치: `master`
- 기준 코드: `a7d401b` (`Add information processing practical coach learning flow (#30)`)
- 목적: `master`에 병합된 코드와 테스트로 확인된 완료 범위와 앞으로 남은 구현을 한 문서에서 확인한다.
- 상세 구현 이력: [구현 진행 기록](./information-processing-practical-coach-implementation-status.md)
- 세부 체크리스트: [작업 분할표](./information-processing-practical-coach-work-breakdown.md)
- 다음 구현 가이드: [D0·W1-W2·S1-S2·C1-C2 구현 가이드](./information-processing-practical-coach-next-implementation-guide.md)
- 제품 기준: [제품 기획서](./information-processing-practical-coach.md)
- 전체 구축 순서: [실행 로드맵](./roadmap.md)

## 1. 한눈에 보는 현재 상태

개인 MVP의 기반 코어와 진단·커리큘럼·준비도 화면에 더해 실제 `ts-fsrs` 어댑터, 이벤트 기반 memory state 재생, L1 검수 콘텐츠 catalog, `L2~L3` 정규 학습 세션, `Q1~Q3` 저장 이벤트 기반 오늘 계획 UI, `P1~P2` 시험일까지 계획·놓친 날 복구 요약까지 코드와 테스트로 확인했다. 현재 게스트 흐름은 **정규 문제 풀이 → 불변 이벤트 저장 → FSRS 기억 일정 재계산 → `/exam-coach` 복귀/포커스 시 오늘 계획·시험일까지 계획 재계산**까지 연결됐다.

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

- SQL `sql.select.001`과 C `c.control-flow.001`를 코드 catalog로 등록해 소비자가 JSON 경로를 직접 읽지 않게 했다.
- catalog 로딩 시 2026 공식 영역, concept ID, concept domain, 선수지식 그래프, grading, 힌트, 해설 계약을 함께 검증한다.
- 두 샘플은 작성자와 다른 `codex-l1-review` 검수자, 검수 시각, `reviewedVersion === version`, 전체 검수 체크리스트를 명시했다.
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

## 3. 현재 핵심 차단점

이 작업 브랜치 기준으로 기존 **FSRS dependency 차단점은 해소됐다.** 실제 `dueAt`, stability, difficulty와 다음 복습 상태를 코어에서 계산할 수 있고, L1 콘텐츠 catalog도 `reviewed` 콘텐츠만 정규 신규 후보로 내보낸다.

정규 학습 세션, 실제 오늘 계획, `P1~P2` 시험일까지 계획과 놓친 날 복구 요약까지 연결됐다. 현재 다음 제품 작업은 **`W1~W2` 취약점 화면과 행동 연결**이며, 이후 SQL/C 수직 범위를 확대한다. 별도 application 검수 콘텐츠는 아직 없으므로 unsupported placeholder를 만들지 않고 오늘 계획과 시험일까지 계획 모두에서 application 항목을 임의 생성하지 않는다.

검증 차단점은 전체 Playwright/axe gate다. L1에 직접 닿는 exam-coach diagnostic E2E는 통과했지만, 전체 `pnpm test:e2e`는 기존 public-learning/book/reddit/admin 흐름에서 실패한다. 첫 구체 실패는 `e2e/public-learning.spec.ts:293`의 word-order flow에서 `정확한 순서입니다.` 피드백이 보이지 않는 문제였고, 이후 여러 실패는 dev server `ERR_CONNECTION_REFUSED`로 이어졌다. 이 실패는 이번 L1 catalog 코드 경로 밖이지만, 전체 CI/merge 완료 증거로는 아직 사용할 수 없다.

현재 남은 제품 연결 작업:

- W1~W2 취약점 화면과 행동 연결
- S1~S2 SQL 수직 범위 확대
- C1~C2 C 언어 수직 범위 확대
- 전체 Playwright/axe gate의 기존 unrelated 실패는 별도 해결 필요

## 4. 남은 작업과 실행 순서

### 4.1 F1 마무리 — package/lockfile 반영

- [ ] `ts-fsrs@5.4.1` 공급망 정책 통과가 별도 PR/CI 기록으로 확인됐는지 검증
- [x] `apps/web/package.json`과 `pnpm-lock.yaml`에 `ts-fsrs@5.4.1`을 함께 반영
- [x] `pnpm install --frozen-lockfile` 후 lockfile 추가 변경이 없는지 확인
- [x] 전체 CI 통과와 `master` 병합 여부 확인 — PR #30이 `a7d401b`로 squash merge

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
- [ ] 실제 브라우저 새로고침 전후 동일한 memory state 통합 확인

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

- [ ] 독립 회상 반복 실패 집계
- [ ] 도움 의존 반복 집계
- [ ] 적용·평가 반복 실패 집계
- [ ] FSRS review debt 집계
- [ ] 취약 개념을 우선 복습 후보로 연결
- [ ] 같은 문제 반복 대신 동형·유사 문제 제공
- [ ] 선수지식 결손이면 선행 개념으로 이동

### 4.9 S1~S2 — SQL 수직 범위 확대

- [ ] 테이블·행·열
- [ ] `SELECT / FROM`
- [ ] `WHERE`
- [ ] `GROUP BY / HAVING`
- [ ] `JOIN`
- [ ] 이해 → 회상 → 적용 콘텐츠 확보
- [ ] 고정 읽기 전용 데이터셋과 실행형 SQL 문제
- [ ] 결과 행·열 동등성 판정과 오류 유형 분류
- [ ] 주간 SQL 미니 테스트

### 4.10 C1~C2 — C 수직 범위 확대

- [ ] 값과 타입
- [ ] 연산자와 식
- [ ] 제어 흐름
- [ ] 배열
- [ ] 포인터
- [ ] 이해 → 회상 → 적용 콘텐츠 확보
- [ ] 실행 결과 예측·상태 추적·코드 완성·짧은 작성
