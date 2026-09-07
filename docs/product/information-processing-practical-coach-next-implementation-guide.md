# 정보처리기사 실기 코치 구현 가이드 및 완료 검증 기록 (D0 · W1-W2 · S1-S2 · C1-C2)

- 작성 시각: 2026-09-06 09:41 KST
- 기준 브랜치: `origin/master`
- 기준 커밋: `73e7d5b` (`Harden exam coach WebGPT workflow guardrails (#35)`)
- 목적: D0~C2 구현에 사용한 파일·계약·순서를 보존하고, 완료 후 남은 검증 항목을 연결한다.
- 현재 상태: [현재 현황과 남은 작업](./information-processing-practical-coach-current-status.md)
- 체크리스트: [작업 분할표](./information-processing-practical-coach-work-breakdown.md)
- 제품 기준: [제품 기획서](./information-processing-practical-coach.md)

이 문서의 D0~C2 구현은 `origin/master`에 병합됐다. 아래 세부 내용은 구현 계약과 검증 근거를 보존한 기록이며, 새로 남은 작업은 [현재 현황과 남은 작업](./information-processing-practical-coach-current-status.md)의 4.8 이후 절을 기준으로 한다. 작업 분할표가 **무엇을** 해야 하는지라면, 이 문서는 **현재 코드에서 어디를 어떻게** 건드렸는지를 기록한다.

---

## 0. 작업 순서 요약 및 상태

| 순서 | 코드 | 내용                                    | 코드 변경                                   | 상태                       |
| ---- | ---- | --------------------------------------- | ------------------------------------------- | -------------------------- |
| 1    | D0   | 문서 기준 정보를 `origin/master`로 정정 | 문서만                                      | 완료                       |
| 2    | W1   | 취약 개념 집계 코어                     | `core/weakness.ts`                          | 완료                       |
| 3    | W2   | 취약 개념 → 행동 연결 UI·라우팅         | `/exam-coach/weakness`, `learn` 라우팅 확장 | 완료                       |
| 4    | S1   | SQL 개념별 검수 콘텐츠 확보             | `content/2026/sql/*`, catalog               | 완료                       |
| 5    | S2   | 고정 데이터셋·결과 동등성·오류 분류     | schema/grading 확장                         | 완료                       |
| 6    | C1   | C 개념별 검수 콘텐츠 확보 (실행기 없이) | `content/2026/c/*`, catalog                 | 완료                       |
| 7    | C2   | 제한 실행기 경계                        | ADR + Sandbox 경계                          | 구현 완료, 운영 smoke 대기 |

W1~W2와 S1/C1은 서로 의존하지 않으므로 병렬 진행했던 작업이다. 현재는 S1/C1 콘텐츠가 병합되어 W2의 동형·유사 문제 이동도 `variantGroupId` 기반으로 동작한다. C2는 안전한 미가용 fallback까지 구현됐고, 실제 운영 Sandbox 성공 smoke만 남아 있다.

---

## 1. 모든 작업에 공통으로 적용되는 계약

아래는 이미 코드와 테스트로 고정된 계약이다. 새 코드가 이것을 우회하면 안 된다.

1. **근거 없으면 측정 없음.** 데이터가 0건일 때 `0%`나 `0건`으로 표시하지 않고 `측정 없음`으로 표시한다. (`exam-coach-readiness-report.tsx`의 `formatMetric` / `formatEvidenceDate` 패턴을 재사용한다.)
2. **이벤트가 source of truth.** 최종 카드 상태를 저장하지 않는다. 화면은 항상 `loadLocalLearningEvents` → `rebuildMemoryStateFromEvents`로 재계산한다. (`core/memory-replay.ts`)
3. **assessment 격리.** `mode === "assessment"` 이벤트는 FSRS 기억 일정에 반영하지 않는다. 진단 이벤트의 `fsrsVersion`은 실제로 `"pending-adapter"`로 저장돼 있으므로, 새 집계 코드가 assessment 이벤트에 대해 adapter를 resolve하려 하면 `resolveTsFsrsAdapter`가 버전 불일치로 throw한다. 반드시 replay 이전에 걸러낸다.
4. **답안 원문 미저장.** `LearningEvent`에 학습자가 입력한 SQL·코드·서술 원문을 넣지 않는다. 오류 유형처럼 **분류 코드**만 저장한다(4.4 참고).
5. **`reviewed`만 정규 큐.** `draft` 콘텐츠는 오늘 큐·취약점 추천 어디에도 등장하지 않는다. (`listReviewedLearningContent`)
6. **합격 확률·근거 없는 종합 점수 금지.** 취약도 역시 단일 점수로 환산해 "합격 가능성"처럼 보이게 하지 않는다.
7. **첫 제출 전 힌트·정답·실행 결과 비공개.**

### 검증 명령

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test                 # vitest, 현재 전부 통과
pnpm build
pnpm test:e2e             # PR #33 최종 verify 통과, 이후 변경마다 재실행
```

> `a7d401b` 시점에 기록된 `e2e/public-learning.spec.ts:293` word-order 실패와 `ERR_CONNECTION_REFUSED`는 과거 검증 기록이다. PR #33의 최종 `secret-scan`/`verify`는 통과했으며, 다음 코드 변경부터는 전체 게이트 결과를 새 증거로 갱신한다.

---

## 2. D0 — 문서 기준 정보 정리 (완료)

`information-processing-practical-coach-current-status.md`의 기준을 최신 `origin/master`로 갱신했다. D0~C2의 구현 결과는 PR #33과 후속 PR #35에 반영됐다.

- 기준 브랜치: `origin/master`
- 기준 코드: `73e7d5b` (`Harden exam coach WebGPT workflow guardrails (#35)`)
- F1~~F3, L1~~L3, Q1~~Q3, P1~~P2, W1~~W2, S1~~S2, C1~C2의 상태를 최신 병합 결과에 맞춰 갱신했다.
- 실제 브라우저 새로고침 smoke, 주간 평가, 오프라인/동기화, 운영 외부 검증은 구현 완료와 별도의 남은 작업으로 분리했다.

문서 기준과 완료 상태의 단일 기준은 [현재 현황과 남은 작업](./information-processing-practical-coach-current-status.md)이다.

---

## 3. W1~W2 — 취약점 화면과 행동 연결 (완료)

### 3.1 이미 있는 것 / 없는 것

**구현된 것**

- `core/mastery.ts`에 `WeaknessSignal`(`repeated-recall-failure` / `assistance-dependence` / `application-failure` / `review-debt`)과 `buildConceptMasterySummary`가 이미 구현돼 있고 테스트도 있다.
- `core/memory-replay.ts`의 `rebuildMemoryStateFromEvents`로 카드별 실제 `dueAt`을 계산할 수 있다.
- `core/today-plan.ts`의 `deriveMasteredConceptIds`로 "독립·무도움·non-Again 첫 제출 정답" 기준 숙달 개념 집합을 얻을 수 있다.
- `core/learning-engine.ts`의 `SQL_CONCEPTS` / `C_CONCEPTS`에 선수지식 그래프가 있다.

**구현 결과**

- 정규 학습 이벤트를 catalog 콘텐츠의 `conceptIds`에 맞춰 `MasteryEvidence`로 변환한다.
- 개념 단위 signal, 근거 시각·횟수, due 카드, 선수지식 결손을 `WeaknessBoard`로 집계한다.
- 취약 개념에서 복습 카드·동형 문제·선수 개념으로 이동한다.
- `/exam-coach/learn?content=<contentId>`로 검수된 특정 카드를 선택한다.

### 3.2 W1 — 집계 코어 (`core/weakness.ts`, 완료)

`apps/web/src/features/exam-coach/core/weakness.ts`를 추가하고 `core/index.ts`에 export했다. 구현 계약은 아래와 같다.

```ts
export interface ConceptWeaknessEntry {
  conceptId: string;
  conceptTitle: string;
  domainId: OfficialDomainId;
  signals: readonly WeaknessSignal[]; // core/mastery.ts 재사용
  hasEvidence: boolean; // false면 화면에서 "측정 없음"
  latestEvidenceAt: string | null;
  dueCardIds: readonly string[]; // 지금 복습 만기인 카드
  prerequisiteGapConceptIds: readonly string[];
}

export interface WeaknessBoard {
  generatedAt: string;
  conceptCount: number;
  conceptsWithEvidence: number;
  entries: readonly ConceptWeaknessEntry[]; // 취약도 정렬, 근거 없는 개념도 포함
}

export function buildWeaknessBoard(input: {
  events: readonly LearningEvent[];
  now: string;
  content?: readonly ContentItem[];
  resolveAdapter?: FsrsAdapterResolver;
}): WeaknessBoard;
```

구현 절차:

1. `content = input.content ?? listLearningContent()`로 catalog를 읽는다. **집계 분모는 `SQL_CONCEPTS + C_CONCEPTS` 10개 개념 고정**이다(준비도 리포트와 동일 기준). catalog에 콘텐츠가 없는 개념도 entry로 남기고 `hasEvidence: false`로 둔다.
2. 정규 학습 evidence를 만든다.
   - `event.mode === "assessment"`인 이벤트는 제외한다.
   - `contentId`로 catalog 항목을 찾고, `event.cardId === item.id && event.contentVersion === item.version`인 이벤트만 인정한다. 버전이 다르면 제외한다(`deriveMasteredConceptIds`와 동일한 방어).
   - `masteryEvidenceForConceptsFromLearningEvent(event, item.conceptIds)`로 개념별 evidence를 만든다.
3. 진단 evidence는 `diagnosticMasteryEvidenceFromEvents(events)`를 그대로 합친다. 두 결과를 합친 뒤 `canonicalizeMasteryEvidence`로 중복을 제거한다. evidenceId가 `${eventId}:${conceptId}`이므로 두 경로가 같은 이벤트를 중복 집계하지 않는다.
4. 카드별 memory는 catalog 항목마다 `rebuildMemoryStateFromEvents(events, item.id, resolveAdapter)`로 계산하고, `null`이 아닌 것만 `ConceptCardMemory[]`로 만든다. 개념 매핑은 `item.conceptIds[0]`이 아니라 **`item.conceptIds` 전체**에 연결한다(취약점 화면은 개념 관점이므로 다중 개념 카드를 한 개념에만 귀속시키면 근거가 사라진다).
5. 개념마다 `buildConceptMasterySummary(conceptId, evidence, cardMemories, now)`를 호출해 `weaknesses`를 얻는다.
6. 선수지식 결손: 해당 개념의 `prerequisites` 중 `deriveMasteredConceptIds(events, content)`에 없는 것을 `prerequisiteGapConceptIds`로 채운다.
7. 정렬: `review-debt` 건수 → 반복 회상 실패 건수 → 적용 실패 건수 → 도움 의존 건수 → 커리큘럼 순서. 단일 취약도 점수를 만들지 않는다.

#### 적용한 결정 — `assistance-dependence`의 정의

기존 `core/mastery.ts`의 signal은 `!item.independent`인 evidence를 전부 세므로, **교정 제출(비-첫 제출)까지 "도움 의존"으로 집계될 수 있다.** 요구사항의 "도움 의존"은 힌트 사용을 뜻하므로 별도 집계가 필요했다.

적용: `core/mastery.ts`의 기존 signal은 유지하고, `weakness.ts`에서 **`helpLevel > 0`인 첫 제출 이벤트만** 별도 집계한다. 이 결정은 코드 주석과 테스트로 고정했다.

임계값은 기존과 동일하게 `>= 2`를 유지하고, 임계값의 근거(“1회는 정상 학습 과정”)를 주석으로 남긴다.

### 3.3 W2 — 행동 연결

#### 3.3.1 복습 후보로 이동

취약 개념의 `dueCardIds`가 있으면 해당 카드의 학습 화면으로 직접 보낸다. 취약점 훈련이 만기 복습을 **대신하지 않는다**는 기획 원칙에 따라, 취약점 화면의 1순위 행동은 항상 "만기 복습 먼저"다. 오늘 계획(`/exam-coach`)의 큐 순서를 취약도로 재정렬하지 않는다.

#### 3.3.2 `/exam-coach/learn` 라우팅 확장 (완료)

`apps/web/src/app/(public)/exam-coach/learn/page.tsx`에 `?content=<contentId>`를 추가했다.

- `content` 파라미터가 있으면 `listReviewedLearningContent()`에서 `item.id`로 찾는다.
- 없거나 검수되지 않은 ID면 조용히 첫 항목으로 대체하지 말고, 현재의 "학습할 검수 콘텐츠가 없습니다" 계열의 명시적 상태를 보여준다.
- `?unit=` 동작은 하위호환으로 유지한다(`content`가 우선).
- `key={`${selected.id}:${selected.version}`}`는 그대로 유지한다.

#### 3.3.3 동형·유사 문제 (완료)

정규 학습용 `variantGroupId`를 schema에 추가했다. `assessmentMetadataSchema`의 `pairId`는 진단 전용으로 유지한다.

`contentItemSchema`에 선택 필드 `variantGroupId: nonEmptyString.optional()`을 추가하고, 커밋된 JSON Schema 사본도 함께 갱신했다.

- 같은 `variantGroupId`를 가진 검수 콘텐츠는 같은 목표를 다른 표현·자료·조건으로 묻는 문항으로 간주한다.
- 동형 문제 추천은 `variantGroupId`가 같고 `id`가 다른 **검수된** 콘텐츠만 대상으로 한다.
- 후보가 없으면 "동형 문제 없음"으로 표시한다. **같은 카드를 다시 풀게 하는 링크로 대체하지 않는다.**
- **`content/schema/content-item.schema.json`을 같은 변경에서 손으로 갱신해야 한다.** 이 파일은 자동 생성물이 아니라 커밋된 사본이고, `core.test.ts`의 "keeps the committed JSON Schema aligned with the Zod structure" 테스트가 Zod의 `required`와 property 키 집합을 이 사본과 대조한다. Zod에만 필드를 추가하면 그 테스트가 실패한다.

같은 `variantGroupId`를 붙인 문항을 SQL/C 각 개념에 대해 확보했고, W2는 검수된 동형 후보와 명시적 빈 상태를 연결한다.

#### 3.3.4 선수 개념으로 이동

`prerequisiteGapConceptIds`가 비어 있지 않으면 선행 개념을 먼저 제시한다. 선행 개념에 검수 콘텐츠가 있으면 그 콘텐츠로 링크하고, 없으면 `/exam-coach/curriculum`으로 보내고 "해당 개념의 검수 콘텐츠가 아직 없습니다"를 표시한다.

#### 3.3.5 적용 실패 재연결

`application-failure` signal이 있어도 현재 catalog에는 application 콘텐츠가 없다. 오늘 계획이 빈 application 큐를 유지하는 것과 동일하게, 취약점 화면도 **application 활동을 임의로 만들지 않고** "적용 콘텐츠 준비 중"으로 표시한다.

### 3.4 화면

- 신규 route: `apps/web/src/app/(public)/exam-coach/weakness/page.tsx`
  - `metadata.robots = { index: false, follow: false }` (다른 exam-coach 화면과 동일)
- 신규 컴포넌트: `components/exam-coach-weakness-board.tsx` (`"use client"`)
  - 데이터 로딩은 `exam-coach-readiness-report.tsx`의 패턴을 따른다: `useEffect` + `window.setTimeout(..., 0)` + `getOrCreateGuestId` + try/catch로 로딩·에러·준비 3상태.
  - `/exam-coach`와 `/exam-coach/report`에서 이 화면으로 가는 링크를 추가한다.
- 표시 항목(개념 카드마다)
  - 개념명, 영역(SQL 응용 / C 언어)
  - signal별 **횟수와 최신 근거 시각** — 근거 없으면 `측정 없음`
  - 복습 부채 건수와 가장 빠른 `dueAt`
  - 행동 버튼: `만기 복습하기` / `동형 문제 풀기` / `선행 개념 보기` — 대상이 없으면 버튼 대신 비활성 안내 문구

### 3.5 테스트 체크리스트 (완료)

- [x] `weakness.test.ts`: 이벤트 0건이면 모든 개념 `hasEvidence: false`, 어떤 signal도 만들지 않음
- [x] 독립 회상 실패 2회 → `repeated-recall-failure` 발생, 1회면 미발생
- [x] `helpLevel > 0` 첫 제출 2회 → 도움 의존 발생, 교정 제출만 2회면 **미발생**
- [x] 만기 카드 존재 시 `review-debt` 건수와 `dueCardIds` 일치
- [x] assessment 이벤트만 있을 때 replay가 adapter를 resolve하지 않고 `review-debt`가 0
- [x] 콘텐츠 버전이 다른 이벤트는 근거에서 제외
- [x] 다중 개념 콘텐츠의 근거가 모든 개념에 반영
- [x] 선수 개념 미숙달 시 `prerequisiteGapConceptIds`에 포함, 숙달 후 제거
- [x] 컴포넌트 테스트: 근거 없음 → `측정 없음`, 동형 후보 없음 → "동형 문제 없음"
- [x] `learn?content=` 라우팅: 유효 ID는 해당 카드, 미검수/미지의 ID는 명시적 빈 상태
- [x] `/exam-coach/weakness` axe serious/critical 0건

### 3.6 완료 조건 확인

취약 개념 하나를 클릭했을 때 (1) 만기 복습 카드, (2) 동형 문제 또는 명시적 부재, (3) 선수 개념 결손 중 하나로 **실제 이동**할 수 있고, 근거가 없는 개념은 `0%`가 아니라 `측정 없음`으로 남는다.

---

## 4. S1~S2 — SQL 수직 범위 확대 (핵심 구현 완료)

### 4.1 범위

개념 5개(`sql-table-row-column`, `sql-select`, `sql-where`, `sql-group`, `sql-join`)는 이미 `learning-engine.ts`에 정의돼 있다. **개념 그래프를 다시 만들 필요는 없다.** 이번 작업의 본체는 개념마다 이해 → 회상 → 적용 콘텐츠를 확보하고, SQL 판정을 결과 기반으로 확장하는 것이다.

현재 SQL catalog에는 5개 개념을 대상으로 한 검수 콘텐츠 10개와 `sql-employees-v1` dataset이 등록돼 있다.

### 4.2 콘텐츠 추가 절차 (S1)

콘텐츠 하나를 추가할 때마다 다음을 지킨다.

1. `apps/web/src/features/exam-coach/content/2026/sql/<slug>.json` 생성.
2. `core/content-catalog.ts`의 `LEARNING_CONTENT_CODES`에 코드를 추가하고 `LEARNING_CONTENT_CATALOG`에 import·등록한다. catalog는 **모듈 로드 시점에 검증**하므로, 계약을 어기면 앱이 즉시 throw한다.
3. `validateCatalogContentItem`이 강제하는 제약을 먼저 확인한다. 실수하기 쉬운 순서로:
   - `officialYear`는 반드시 `2026`.
   - `knowledgeType`은 `assessment`가 아니어야 한다.
   - `hints`(conceptClue / structureHint / specificHint) **필수**.
   - `conceptIds`·`prerequisites` 각각 중복 금지.
   - **`prerequisites`는 `conceptIds`가 가리키는 개념들의 `prerequisites` 합집합과 정확히 일치해야 한다.** 임의로 더 넣거나 빼면 실패한다. 예: `sql-join`을 다루면 `prerequisites`는 `["sql-select"]`다.
   - concept의 `domainId`와 콘텐츠의 `domainId`가 일치해야 한다.
4. 검수 metadata: `reviewStatus: "reviewed"`, `review.reviewer`는 `author`와 달라야 하고, `review.reviewedVersion === version`, `review.reviewedAt`은 유효한 date-time, 체크리스트 5항목 전부 `true`.
5. 동형 문항은 같은 `variantGroupId`를 부여한다(3.3.3에서 schema 확장 후). 개념마다 **최소 2문항**을 목표로 한다 — 그래야 W2의 동형 이동이 실제로 동작한다.
6. `NewQueueCandidate`의 `curriculumOrder`는 `conceptIds[0]`의 개념 그래프 순서에서 자동 결정된다. 콘텐츠 순서를 바꾸고 싶으면 개념 순서를 바꾸는 것이 아니라 콘텐츠의 대표 개념을 바꾼다.

권장 분할: 개념 1개 = PR 1개 (S1.1 테이블·행·열 → S1.2 SELECT/FROM → S1.3 WHERE → S1.4 GROUP BY/HAVING → S1.5 JOIN).

### 4.3 고정 읽기 전용 데이터셋 (S2)

- 위치: `content/2026/sql/datasets/<datasetId>.json`
- 구조: `{ datasetId, description, tables: [{ name, columns: [{ name, type }], rows: [[...]] }] }`
- **행 순서를 결정적으로 고정**하고, 데이터셋을 변경하면 새 `datasetId`를 만든다. 기존 데이터셋을 제자리에서 수정하면 과거 이벤트의 근거가 조용히 달라진다.
- 콘텐츠에서 데이터셋을 참조하려면 `contentItemSchema`가 `.strict()`이므로 `datasetId: nonEmptyString.optional()` 필드 추가가 필요하다. catalog 검증에 "참조한 `datasetId`가 실제로 존재하는가"를 추가한다.
- 데이터 변경문(`INSERT`/`UPDATE`/`DELETE`)은 `grading.forbiddenSqlTokens`로 차단한다. 읽기 전용 원칙을 문서가 아니라 채점 규칙으로 강제한다.

### 4.4 결과 동등성 판정과 오류 분류 (S2)

`gradeSql`은 필수 절 포함 판정과 기대 결과표의 결과 동등성 판정을 분리해 지원한다. 실제 SQL 엔진을 실행하는 방식은 아직 도입하지 않았다.

#### 실행 방식 결정 — 결과 예측형 판정 선택

| 옵션                  | 내용                                                         | 비용                                                   |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| A. 실제 SQL 엔진 도입 | 브라우저/서버 내 SQL 엔진 의존성 추가                        | 새 외부 의존성 → F1과 동일한 공급망·lockfile 절차 필요 |
| B. 기대 결과표 명시   | 콘텐츠에 기대 결과 행·열을 적고, 학습자는 결과를 예측해 제출 | 의존성 0, 실행형 문제는 못 만듦                        |

**B를 선택했다.** 결과 예측형 문항과 기존 절 기반 판정 조합으로 개념 5개를 덮고, 실제 SQL 엔진 도입 여부는 별도 결정으로 남긴다.

#### 동등성 규칙 (어느 옵션이든 동일)

- 열: 이름 집합과 **순서** 모두 비교한다(SQL 결과의 열 순서는 의미가 있다).
- 행: 문제가 `ORDER BY`를 요구하지 않으면 순서를 무시하고 **multiset**(중복 포함)으로 비교한다. 요구하면 순서까지 비교한다.
- `NULL`은 값으로 취급해 동등 비교한다(SQL의 `NULL != NULL`을 판정에 끌어오지 않는다).
- 숫자·문자열 표기는 정규화 후 비교한다. 부동소수는 콘텐츠에서 사용하지 않는 것을 권장한다.
- **필수 조건 검사와 결과 동등성 검사를 분리**한다. 결과만 우연히 맞고 요구한 절을 쓰지 않은 답을 정답 처리하지 않는다. 반대로 문자열 완전 일치에 의존하지도 않는다.

#### 오류 유형 분류

taxonomy를 코어에 고정한다: `syntax` | `scope` | `condition` | `join` | `aggregate` | `forbidden`.

- `GradingResult`에 `errorKinds: readonly SqlErrorKind[]`를 추가한다(정답이면 빈 배열).
- 분류 근거는 이미 `GradingResult`에 있는 `missingRequirements` / `forbiddenMatches`에서 결정적으로 유도한다. **학습자 답안 원문을 새로 저장하지 않는다.**
- W1의 "적용 문제의 동일 오류 유형"과 연결하려면 오류 유형을 이벤트에 남겨야 한다. `LearningEvent`에 `errorKinds?: readonly string[]` 선택 필드를 추가하고, `validateLearningEvent`와 `sameLearningEvent`(멱등·충돌 비교)에 함께 반영한다. **`local-store.ts`의 영속 envelope는 `schemaVersion: 1`이므로, 선택 필드를 추가할 때 기존 저장 데이터가 여전히 읽히는지 테스트로 확인한다.**

### 4.5 테스트 체크리스트 (핵심 구현 완료)

- [x] 새 콘텐츠마다 catalog 검증 통과 (`content-catalog.test.ts`)
- [x] `prerequisites` 불일치 콘텐츠가 명확한 오류로 거부되는지
- [x] 데이터셋 참조가 깨진 콘텐츠 거부
- [x] 행 순서 무시 / `ORDER BY` 요구 시 순서 비교
- [x] 열 순서 불일치는 오답
- [x] 중복 행 개수 차이는 오답
- [x] `NULL` 포함 결과 동등 비교
- [x] 데이터 변경문이 `forbidden`으로 분류
- [x] 오류 유형 회귀 테스트
- [x] 첫 제출 전 실행 결과·기대 결과가 화면에 노출되지 않는 컴포넌트 테스트

---

## 5. C1~C2 — C 언어 수직 범위 확대 (구현 완료, 운영 smoke 대기)

### 5.1 C1 — 실행기 없이 확보 가능한 범위

개념 5개(`c-value-type`, `c-operator`, `c-control-flow`, `c-array`, `c-pointer`)는 정의돼 있고, 현재 catalog에는 개념당 2개씩 총 10개의 검수 콘텐츠가 등록돼 있다.

**중요: C1은 실행기 없이 완료할 수 있다.** 다음 문항 유형은 기존 `exact` / `keywords` 채점으로 판정 가능하다.

| 유형           | 내용                                     | 채점                                         |
| -------------- | ---------------------------------------- | -------------------------------------------- |
| 실행 결과 예측 | 코드를 주고 출력을 묻는다                | `exact` (`acceptedAnswers`에 허용 표기 나열) |
| 상태 추적      | 특정 시점의 변수·배열·포인터 값을 묻는다 | `exact`                                      |
| 코드 완성      | 빈칸에 들어갈 식·문장을 묻는다           | `exact` 또는 `keywords`                      |
| 짧은 작성      | 3~5줄 코드를 쓰게 한다                   | `keywords` (필수 요소만 검사)                |

콘텐츠 추가 절차는 4.2와 동일하다(`domainId`는 `programming-language`). 개념마다 최소 2문항, 동형 문항에는 같은 `variantGroupId`.

`exact` 채점은 `normalizePlainText`로 NFKC·공백 정규화·소문자화까지만 한다. C 출력은 대소문자와 공백이 의미를 가질 수 있으므로, **대소문자를 구분해야 하는 문항은 `exact`에 의존하지 말고 `acceptedAnswers`에 모든 허용 표기를 명시하거나 문항을 대소문자 무관하게 설계한다.** 이 한계를 콘텐츠 검수 체크리스트에 넣는다.

### 5.2 C2 — 제한 실행기 (ADR 승인 및 구현 완료)

실행기 경계는 `docs/adr/0004-restricted-code-execution-boundary.md`에서 Accepted로 승인됐고, 구현은 `origin/master`에 병합됐다. 실제 운영 Sandbox 성공 실행 smoke는 아직 남아 있다.

구현 위치: `apps/web/src/features/exam-coach/server/c-execution.ts`, `apps/web/src/app/api/exam-coach/c/run/route.ts`

ADR이 답해야 하는 질문:

1. **실행 위치** — 로컬 개인 검증용과 공개 베타용을 분리한다. 기획서는 공개 베타에 격리 샌드박스를 요구한다.
2. **위협 모델** — 학습자가 임의 C 코드를 제출한다는 전제. 컴파일러 자체의 공격면, 무한 루프, fork bomb, 메모리 고갈, 디스크 쓰기, 네트워크 접근.
3. **강제할 상한** — 벽시계 시간, CPU 시간, 메모리, 출력 바이트, 프로세스 수, 파일 디스크립터. 각 상한의 구체적 수치를 ADR에 적는다.
4. **차단 대상** — 네트워크 전면 차단, 호스트 파일시스템 접근 금지, 일회성 파일시스템, 실행 후 폐기.
5. **첫 제출 계약** — 학습자는 실행 **전에** 결과를 예측해 첫 제출한다. 실행 결과는 첫 제출 이후에만 보여준다. 실행 결과로 최초 정오를 덮어쓰지 않는다.
6. **실패 fallback** — 실행기가 죽거나 상한에 걸리면 학습을 막지 않고 설명·회상 문항으로 대체한다. 실행 실패를 오답으로 기록하지 않는다.
7. **이벤트 기록** — 실행 여부와 실패 사유 분류만 남기고, 제출 코드 원문은 남기지 않는다.

ADR 승인 전에는 C2 관련 코드를 병합하지 않는 원칙을 지켰다. C1 콘텐츠와 C2 안전 경계는 완료됐고, 운영 자격증명·toolchain을 준비한 성공 smoke만 남아 있다.

---

## 6. PR 분할과 게이트

| PR   | 범위                                                   | 게이트                     | 상태                       |
| ---- | ------------------------------------------------------ | -------------------------- | -------------------------- |
| D0   | 문서 기준 정정만                                       | format:check               | 완료                       |
| W1   | `core/weakness.ts` + 단위 테스트                       | format/lint/typecheck/test | 완료                       |
| W2-a | `learn?content=` 라우팅 + `variantGroupId` schema 확장 | 전체 + 기존 콘텐츠 회귀    | 완료                       |
| W2-b | `/exam-coach/weakness` 화면 + 링크                     | 전체 + axe                 | 완료                       |
| S1.x | SQL 개념별 콘텐츠 (개념당 1 PR)                        | 전체                       | 완료                       |
| S2-a | 데이터셋 + `datasetId` schema                          | 전체                       | 완료                       |
| S2-b | 결과 동등성 판정 + 오류 분류 + 이벤트 필드             | 전체 + 저장 호환성 테스트  | 완료                       |
| C1.x | C 개념별 콘텐츠 (개념당 1 PR)                          | 전체                       | 완료                       |
| C2-0 | 실행기 ADR (문서만)                                    | format:check               | 완료                       |
| C2   | 제한 C 실행 경계                                       | build + smoke              | 구현 완료, 운영 smoke 대기 |

`master`에 직접 push하지 않는다. 각 PR은 최신 `master`에서 분기한다. 현재 남은 E/O/M 작업은 [현재 현황 문서](./information-processing-practical-coach-current-status.md)와 [출시 체크리스트](../operations/release-checklist.md)에서 관리한다.

---

## 7. 현재 남은 작업 요약

구현 순서 문서의 다음 대상은 아래와 같다.

1. 실제 브라우저 새로고침 전후 memory state 동일성 smoke
2. 주간·중간·종료 평가와 8주 개인 검증
3. 오프라인·동기화·백업/복구
4. 콘텐츠 운영·접근성·오류 계측
5. 운영 Vercel Sandbox 성공 실행과 공개 베타 외부 검증

세부 체크박스와 출시 전 증거는 [현재 현황과 남은 작업](./information-processing-practical-coach-current-status.md) 및 [출시 체크리스트](../operations/release-checklist.md)를 갱신한다.

---

## 8. 하지 않을 것

- 취약도를 단일 점수로 합쳐 합격 확률처럼 보이게 하는 것
- 근거가 없는 개념을 `0%` 또는 `복습 부채 0건`으로 표시하는 것
- 검수되지 않은(`draft`) 콘텐츠를 취약점 추천·오늘 큐에 넣는 것
- 동형 문제가 없을 때 같은 카드를 다시 풀게 하고 "동형 문제"라고 부르는 것
- application 검수 콘텐츠가 없는데 application 활동 항목을 만들어내는 것
- 학습자 답안 원문(SQL·C 코드·서술)을 이벤트나 localStorage에 남기는 것
- 보안 설계 승인 전에 코드 실행기를 붙이는 것
- 오늘 큐의 `복습 → 신규 → 적용` 순서를 취약도로 재정렬하는 것
