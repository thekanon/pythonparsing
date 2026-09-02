# 정보처리기사 실기 합격 코치 현재 현황과 남은 작업

- 기준 시각: 2026-09-02 22:29 KST
- 기준 브랜치: `master`
- 기준 커밋: `2b007a2c5b81980df60bab13175dad0eb715cbc0`
- 목적: 지금까지 실제로 `master`에 병합된 결과와 앞으로 남은 구현을 한 문서에서 확인한다.
- 상세 구현 이력: [구현 진행 기록](./information-processing-practical-coach-implementation-status.md)
- 세부 체크리스트: [작업 분할표](./information-processing-practical-coach-work-breakdown.md)
- 제품 기준: [제품 기획서](./information-processing-practical-coach.md)
- 전체 구축 순서: [실행 로드맵](./roadmap.md)

## 1. 한눈에 보는 현재 상태

개인 MVP의 기반 코어와 진단·커리큘럼·준비도 화면까지는 실제 `master`에 들어갔다. 아직 실제 FSRS 라이브러리와 정규 학습 세션이 연결되지 않았으므로, 현재 제품은 **진단과 근거 확인은 가능하지만 실제 기억 일정에 따라 매일 학습하는 단계는 아직 아니다.**

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
| FSRS dependency 정책 | 완료 | `ts-fsrs@5.4.1` 고정, package/lockfile 변경 경로와 관리자 절차 확정 |
| 실제 FSRS package/lockfile | 차단 | Web Git writer가 `pnpm-lock.yaml` 수정 불가 |
| 실제 FSRS 어댑터 | 대기 | dependency 병합 뒤 구현 가능 |
| 정규 학습 세션 UI | 미구현 | 채점·힌트·이벤트 코어는 있으나 실제 문제 풀이 화면 미연결 |
| 실제 오늘 계획 UI | 미구현 | 실제 memory state와 reviewed 콘텐츠 연결 필요 |

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
- 실제 FSRS가 없으므로 복습 부채도 `0건`으로 가장하지 않고 `FSRS 연결 후 측정`으로 표시한다.
- 합격 확률이나 근거 없는 종합 점수를 만들지 않는다.

### 2.10 FSRS dependency 정책

- 실제 FSRS 구현체는 `ts-fsrs@5.4.1`로 고정했다.
- 목표 기억률은 `request_retention: 0.9`를 사용한다.
- Web Git writer는 보호 경로인 `pnpm-lock.yaml`을 수정할 수 없음을 재확인했다.
- 따라서 dependency 추가는 저장소 관리자 또는 lockfile 수정이 허용된 일반 Git 작업 경로에서 package와 lockfile을 같은 변경으로 먼저 병합해야 한다.

관리자 실행 명령:

```bash
pnpm --filter @newsorder/web add --save-exact ts-fsrs@5.4.1
pnpm install --frozen-lockfile
```

이 변경에서는 `apps/web/package.json`과 `pnpm-lock.yaml`이 반드시 같은 PR에 포함돼야 한다.

## 3. 현재 핵심 차단점

현재 가장 큰 차단점은 **실제 FSRS dependency가 아직 `master`의 package/lockfile에 없다는 것**이다.

이 때문에 다음 값은 아직 실제값으로 계산할 수 없다.

- 카드별 실제 `dueAt`
- FSRS stability와 difficulty
- 기억 위험도
- 실제 복습 부채
- 정규 회상 카드의 다음 복습 시각

임시 자체 수식이나 FSRS 비슷한 간이 알고리즘으로 우회하지 않는다.

## 4. 남은 작업과 실행 순서

### 4.1 F1 마무리 — package/lockfile 반영

가장 먼저 저장소 관리자 경로에서 다음을 완료해야 한다.

- [ ] `ts-fsrs@5.4.1` 공급망 정책 통과를 실제 dependency 변경 PR에서 확인
- [ ] `apps/web/package.json`과 `pnpm-lock.yaml`을 같은 변경으로 반영
- [ ] `pnpm install --frozen-lockfile` 후 lockfile 추가 변경이 없는지 확인
- [ ] 전체 CI 통과 후 `master` 병합

### 4.2 F2 — 실제 FSRS 어댑터

dependency 병합 직후 진행한다.

- [ ] 기존 `FsrsAdapter` 계약에 `ts-fsrs` 연결
- [ ] 목표 기억률 `0.9` 고정
- [ ] 최대 interval 정책 고정
- [ ] `Again / Hard / Good / Easy` → FSRS Rating 매핑
- [ ] 신규 카드 첫 review 계산
- [ ] 기존 카드 다음 review 계산
- [ ] 구현 버전을 `fsrsVersion`으로 기록
- [ ] 버전·카드 ID·상태 불일치 거부

완료 조건: 정규 첫 제출 이벤트 하나를 실제 FSRS 상태와 `dueAt`으로 계산할 수 있어야 한다.

### 4.3 F3 — 이벤트 재생으로 memory state 복원

- [ ] 이벤트 로그만으로 같은 `MemoryState`를 재구성
- [ ] 같은 `eventId` 멱등 처리와 충돌 거부 유지
- [ ] `occurredAt` 순 재생
- [ ] assessment·첫 제출이 아닌 이벤트 제외
- [ ] 이벤트별 `fsrsVersion` resolver 적용
- [ ] 여러 FSRS 버전 이력 재생 테스트
- [ ] 새로고침 전후 동일한 memory state 확인

### 4.4 L1 — 실제 학습 콘텐츠 확정

- [ ] 현재 SQL/C 샘플 콘텐츠 목록화
- [ ] 공식 영역·concept ID·선수지식 검토
- [ ] grading·힌트·해설·정답 검토
- [ ] 작성자와 다른 검수자 승인
- [ ] `reviewed` 콘텐츠만 정규 큐에서 선택
- [ ] `draft` 콘텐츠가 오늘 큐에 들어가지 않는 테스트

### 4.5 L2~L3 — 정규 학습 세션

- [ ] 전용 학습 route 추가
- [ ] reviewed 문제·이해 자료 렌더링
- [ ] 첫 제출 전 힌트·정답 비공개
- [ ] 첫 제출 규칙 기반 채점
- [ ] 오답 시 교정 흐름
- [ ] 독립 정답 시 `Hard / Good / Easy` 선택
- [ ] 오답·도움 사용 시 `Again` 강제
- [ ] response time/help level/mode를 `LearningEvent`로 저장
- [ ] 답안 원문이 이벤트에 저장되지 않는지 E2E 확인
- [ ] 이벤트 저장 직후 FSRS memory state 재계산

### 4.6 Q1~Q3 — 실제 오늘 계획

- [ ] 저장 이벤트에서 모든 카드 memory state 재계산
- [ ] 실제 due review 후보 생성
- [ ] mastered concept 집합 생성
- [ ] reviewed 신규·적용 후보 생성
- [ ] 저장된 `dailyMinutes`를 실제 시간 예산으로 사용
- [ ] `복습 → 신규 → 적용` 실제 항목 표시
- [ ] 항목 클릭 시 정규 학습 세션으로 이동
- [ ] 완료 뒤 큐 즉시 재계산
- [ ] 15분 / 45분 / 60분 시간 예산 회귀 테스트

### 4.7 P1~P2 — 시험일까지 계획과 놓친 날 복구

- [ ] 시험일까지 남은 일수와 총 가용 시간 계산
- [ ] due review와 신규 학습량 분리
- [ ] 다음 7일 계획 미리보기
- [ ] 전날 미수행 감지
- [ ] 미완료 복습을 신규보다 우선
- [ ] 누적 부채 전체를 하루에 강제하지 않기
- [ ] 신규 학습량을 다음 며칠로 재분배
- [ ] 시험 임박 시 복습·적용 비중 확대

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
