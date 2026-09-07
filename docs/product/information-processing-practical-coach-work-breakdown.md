# 정보처리기사 실기 합격 코치 현재 진행상황과 남은 작업 분할표

- 기준 시각: 2026-09-06 09:41 KST
- 기준 브랜치: `origin/master`
- 기준 커밋: `73e7d5b` (`Harden exam coach WebGPT workflow guardrails (#35)`)
- 목적: 최신 `origin/master` 기준 완료 작업과 남은 작업을 작은 실행 단위로 나눠 다음 작업을 한 단계씩 구현·검증·병합할 수 있게 한다.
- 현재 요약: [현재 현황과 남은 작업](./information-processing-practical-coach-current-status.md)
- 상세 구현 이력: [구현 진행 기록](./information-processing-practical-coach-implementation-status.md)
- 제품 기준: [제품 기획서](./information-processing-practical-coach.md)
- 구축 순서: [실행 로드맵](./roadmap.md)
- 구현 가이드·완료 검증 기록: [D0·W1-W2·S1-S2·C1-C2](./information-processing-practical-coach-next-implementation-guide.md)
- 완료 여부의 단일 기준은 [현재 현황 문서](./information-processing-practical-coach-current-status.md)다. 아래 체크박스와 어긋나면 현재 현황 문서를 따른다.

> 2026-09-07 작업 트리 메모: F3 브라우저 새로고침 smoke와 E1 25분 주간
> SQL/C 미니 테스트가 구현·집중 검증됐다. 아직 미커밋·미병합이므로 아래
> `origin/master` 기준 체크박스는 변경하지 않는다. 구현 파일·검증·WebGPT 복구
> 차단 기록은 [현재 현황 문서](./information-processing-practical-coach-current-status.md#0-2026-09-07-작업-트리-진행-메모-미병합)와
> [구현 진행 기록](./information-processing-practical-coach-implementation-status.md#7-2026-09-07-f3-브라우저-확인과-e1-주간-평가-작업-트리)을 따른다.

## 1. 현재 상태

### 1.1 `origin/master` 병합 완료

<!-- prettier-ignore -->
| 영역 | 상태 | 현재 결과 |
| --- | --- | --- |
| 오늘 큐 코어 | 완료 | 만기 복습 → 신규 → 적용 순서와 복습 부채 억제 규칙, PR #21 |
| 게스트 시작/기준선 진단 | 완료 | `/exam-coach`, 시험일·하루 시간 설정, SQL·C 기준선 6문항, PR #22 |
| 종료 동형 진단 | 완료 | `/exam-coach/followup`, 기준선 대비 정확도·시간·기술쌍 변화 비교, PR #24 |
| 공식 커리큘럼 지도 | 완료 | `/exam-coach/curriculum`, 공식 12개 영역과 현재 SQL·C 범위 구분, PR #25 |
| 준비도 리포트 | 완료 | `/exam-coach/report`, 진단 근거 기반 SQL·C 준비도와 데이터 부재 구분, PR #27 |
| 준비도 코어 | 완료 | `MasteryEvidence`, 영역별 커버리지·회상·적용·평가·복습 부채 집계 계약 |
| 정규 학습 세션 UI | 완료 | `/exam-coach/learn`, 첫 제출·교정·도움·이벤트 저장·FSRS 재계산, PR #30 |
| 실제 FSRS | 완료 | `ts-fsrs@5.4.1`, 실제 상태 계산·이벤트 재생, PR #30 |
| 취약점 화면·행동 연결 | 완료 | 개념별 signal 집계, 복습·동형·선수 개념 링크, PR #33 |
| SQL 수직 범위·결과 채점 | 완료 | 5개 개념·10개 콘텐츠, 고정 dataset, 결과 동등성·오류 유형, PR #33 |
| C 수직 범위·제한 실행 | 구현 완료·운영 검증 대기 | 5개 개념·10개 콘텐츠, Accepted ADR, 격리 Sandbox·fallback, PR #33 |

이미 저장소에 있는 주요 기반:

- 2026 Q-Net 공식 12개 영역 레지스트리
- SQL·C 10개 개념 선수지식 그래프
- SQL·C 기준선/종료 동형 진단 세트
- 콘텐츠 Zod/JSON Schema와 검수 상태 계약
- 작성자와 검수자를 분리하는 승인 계약
- 게스트 ID와 `exam-coach:v1:*` 로컬 저장 경계
- 불변 `LearningEvent` 저장, 중복 제거, 충돌 거부, 시간순 재생 계약
- `exact` / `keywords` / `sql` 규칙 기반 채점
- 첫 제출, 교정 제출, 점진적 힌트 계약
- 오답·도움 사용 시 `Again` 강제 규칙
- `Again / Hard / Good / Easy` FSRS 입력 경계
- assessment와 정규 FSRS 기억 일정 격리
- 오늘 큐의 시간 예산·선수지식·복습 우선 계약
- 개념별 `MasteryEvidence`와 준비도 리포트 코어

### 1.2 과거 문서에 남아 있던 준비도 리포트 기록

이 절은 2026-09-02 재기동 전의 작업 메모다. 준비도 리포트는 이후 PR #27로 완료됐으므로 현재 상태 판단에는 사용하지 않는다.

재기동 전 `/exam-coach/report` 준비도 리포트 구현을 진행했지만, **당시 기록 기준으로** 원격 브랜치와 PR에는 게시되지 않았다. 당시 원격 저장소에서 `origin/chatgpt/exam-coach-readiness-report`를 찾지 못해 **초안 설계는 남아 있으나 코드 변경은 `master`에 없는 상태**로 판단했다. 이후 준비도 리포트는 PR #27로 병합됐으므로 현재 상태 판단에는 이 과거 결론을 사용하지 않는다.

복원 범위:

- 진단 `assessment` 이벤트를 SQL·C 개념별 `MasteryEvidence`로 재확장
- SQL·C 10개 개념을 고정 분모로 사용하는 준비도 집계
- 최근 완료 진단 점수와 SQL/C 영역별 근거 표시
- 개념별 직접 진단 근거와 최근 근거 시점 표시
- 데이터가 없을 때 `0%` 대신 `측정 없음` 표시
- FSRS 미연결 상태에서 복습 부채를 `0건`으로 가장하지 않고 `FSRS 연결 후 측정`으로 표시
- `/exam-coach/report`, 시작 화면 링크, 단위 테스트, E2E, axe 검사

재기동 전에 확인했던 수정점:

- `diagnostic-readiness.ts` 문법 오류 제거
- 준비도 리포트 TSX Prettier 정리
- unit/typecheck/build/Playwright/axe 전체 검증

## 2. 우선순위와 의존 관계

> R0부터 C2까지의 구현 상태는 최신 `origin/master`와 [현재 현황 문서](./information-processing-practical-coach-current-status.md)를 기준으로 판단한다. 위 1.2의 재기동 전 기록은 과거 메모다.

1. **브라우저 memory state 통합 확인** — 새로고침 전후 동일 상태 smoke
2. **E1~E3 주간·중간·종료 평가와 8주 검증**
3. **O1~O5 오프라인·동기화·백업/복구**
4. **M1~M6 운영·안전·접근성·계측**
5. **C 실행 운영 Sandbox 성공 smoke** — Vercel 인증과 C toolchain 필요
6. **공개 베타 외부 검증** — [출시 체크리스트](../operations/release-checklist.md)
7. **SQL 실행 엔진 도입 여부 결정과 주간 평가 연결**

W1~~W2, S1~~S2, C1~C2는 `origin/master`에 구현됐지만, 개인 검증 데이터와 운영 외부 증거가 쌓이기 전에는 제품 검증 완료로 간주하지 않는다.

## 3. R0 — 준비도 리포트 복원

### R0.1 코어

- [x] 기준선/종료 진단 문항 ID와 콘텐츠 버전을 개념 ID 목록에 결정적으로 연결
- [x] `assessment` 이벤트만 진단 근거로 받기
- [x] 알려지지 않은 콘텐츠 ID 또는 버전은 제외
- [x] 다중 개념 문항을 개념별 evidence ID로 확장
- [x] SQL·C 10개 개념을 준비도 분모로 고정

### R0.2 UI

- [x] `/exam-coach/report`와 noindex metadata 추가
- [x] 시작 화면에 `준비도 리포트` 링크 추가
- [x] 근거가 있는 개념 수를 `N / 10`으로 표시
- [x] 최근 완료 진단의 실제 점수 표시
- [x] SQL/C 영역별 진단 근거 표시
- [x] 개념별 진단 근거 횟수와 최근 근거 표시
- [x] 독립 회상/적용 데이터가 없으면 `측정 없음`
- [x] FSRS가 없으면 복습 부채를 `FSRS 연결 후 측정`으로 표시
- [x] 합격 확률 또는 근거 없는 종합 점수를 만들지 않기

### R0.3 테스트와 병합

- [x] 빈 데이터에서 `0%`가 아닌 `측정 없음` 확인
- [x] 기준선 이벤트에서 예상 개념만 근거가 생기는지 확인
- [x] 알려지지 않은 assessment ID/버전 제외 확인
- [x] 진단 점수를 concept evidence로 중복 집계하지 않는지 확인
- [x] `/exam-coach/report` axe serious/critical 0건
- [x] format/lint/unit/typecheck/Drizzle/build/Playwright 전체 통과
- [x] 최신 `master` 기준 PR 생성 및 squash merge — PR #27

## 4. F1 — FSRS 의존성 정책 해결 (완료)

- [x] `apps/web` 외부 의존성 추가 시 package/lockfile 변경 경로 확인
- [x] Git writer의 `pnpm-lock.yaml` 변경 허용 여부 재확인
- [x] 불가능하면 저장소 관리자용 dependency 변경 절차 지정
- [x] 유지보수되는 FSRS 구현체와 고정 버전 선정 — `ts-fsrs@5.4.1`
- [x] 공급망 정책 통과 확인 — PR #33 최종 `secret-scan`/`verify`
- [x] 목표 기억률 `0.9` 지원 확인 — `request_retention: 0.9`
- [x] package와 lockfile을 같은 변경으로 반영
- [x] clean install 뒤 lockfile 무변경 확인

### F1 dependency 변경 절차 (완료된 절차 기록)

FSRS 라이브러리 버전이 확정되면 Web Git writer가 아닌 저장소 관리자 또는 `pnpm-lock.yaml` 수정이 허용된 일반 Git 작업 경로에서 package와 lockfile을 하나의 변경으로 처리한다.

1. 최신 `master`에서 작업 브랜치를 만든다.
2. 저장소 루트에서 `pnpm --filter @newsorder/web add --save-exact ts-fsrs@5.4.1`을 실행한다.
3. `apps/web/package.json`과 `pnpm-lock.yaml`이 같은 변경에 포함됐는지 확인하고 `pnpm install --frozen-lockfile`로 선언과 lockfile의 일치를 검증한다.
4. 공급망 검사와 전체 CI를 통과시킨 뒤 package/lockfile 변경을 먼저 `master`에 병합한다.
5. 이후 Web Git writer는 갱신된 `master`에서 F2 실제 어댑터 구현을 진행한다.

package만 먼저 바꾸고 lockfile을 나중에 갱신하는 분할 변경은 허용하지 않는다.

금지사항:

- 임시 자체 수식으로 FSRS를 흉내 내지 않는다.
- 제품 문서의 FSRS 계약을 만족하지 않는 간이 알고리즘으로 우회하지 않는다.

## 5. F2 — 실제 FSRS 어댑터 (완료)

- [x] 기존 `FsrsAdapter` 계약에 실제 라이브러리 연결
- [x] 목표 기억률 `0.9` 고정
- [x] 최대 interval 정책 확정
- [x] `Again / Hard / Good / Easy`를 FSRS Rating으로 매핑
- [x] 신규 카드 첫 review 계산
- [x] 기존 카드 다음 review 계산
- [x] 구현 버전을 `fsrsVersion`으로 기록
- [x] 버전/카드 ID/상태 불일치 거부

완료 조건: 정규 첫 제출 이벤트 하나를 실제 FSRS 상태와 `dueAt`으로 계산할 수 있다.

## 6. F3 — 이벤트 재생으로 기억 상태 복원 (브라우저 통합 확인만 남음)

- [x] 동일 `eventId` 재전송은 한 번만 반영
- [x] 동일 ID의 다른 payload는 충돌로 거부
- [x] `occurredAt` 순으로 재생
- [x] `assessment`와 첫 제출이 아닌 이벤트 제외
- [x] 이벤트별 `fsrsVersion` resolver 사용
- [x] 여러 FSRS 버전 이력 재생 테스트
- [x] 이벤트가 없으면 memory state를 `null`로 유지
- [ ] 새로고침 전후 동일한 memory state 확인

완료 조건: 최종 카드 상태를 source of truth로 저장하지 않고 이벤트 로그만으로 동일 상태를 복원한다.

## 7. L1 — 실제 학습 콘텐츠 확정 (완료)

- [x] SQL/C 샘플 콘텐츠 목록화
- [x] 공식 영역·concept ID·선수지식 확인
- [x] grading·힌트·해설·정답 확인
- [x] 작성자와 다른 검수자 승인
- [x] `reviewed`만 정규 큐에 허용
- [x] `draft`가 오늘 큐에 들어가지 않는 테스트

## 8. L2 — 정규 학습 화면

- [x] 전용 학습 route와 reviewed 콘텐츠 로드
- [x] 목표·이해 자료·문제 입력 UI
- [x] 첫 제출 전 힌트·정답·해설 비공개
- [x] 첫 제출 시 규칙 기반 채점
- [x] 제출 답안 원문 장기 저장 금지
- [x] 정답이면 회상 평가, 오답이면 교정 단계
- [x] 교정 제출이 최초 정오를 덮어쓰지 않기
- [x] 콘텐츠 버전 변경 중 세션 제출 거부

## 9. L3 — 도움·회상 등급·이벤트

- [x] 개념 단서 → 구조 힌트 → 구체적 힌트 → 해설·정답 순서
- [x] 한 번에 도움 한 단계만 공개
- [x] 독립 첫 제출 정답에는 도움 흐름 미개방
- [x] 독립 정답에 `Hard / Good / Easy` UI
- [x] 오답 또는 도움 사용은 무조건 `Again`
- [x] response time/help level/mode 기록
- [x] 불변 `LearningEvent` 저장
- [x] 이벤트에 답안 원문이 없는지 컴포넌트 테스트 확인
- [x] 저장 직후 FSRS memory state 재계산

완료 조건: 게스트가 SQL 또는 C 학습 단위 하나를 시작부터 기억 일정 기록까지 끝낼 수 있다.

## 10. Q1 — 실제 오늘 큐 입력

- [x] 이벤트에서 catalog 카드 memory state 재계산
- [x] 현재 시각 기준 due review 후보 생성
- [x] 독립 첫 제출 정답·무도움·non-Again evidence에서 mastered concept 집합 생성
- [x] reviewed 신규 후보 생성
- [x] 별도 application 콘텐츠 계약 부재를 확인하고 빈 application 큐 유지
- [x] 예상 소요시간·중요도·커리큘럼 순서 입력 확정

## 11. Q2 — 오늘 계획 UI

- [x] `dailyMinutes`를 실제 시간 예산으로 사용
- [x] 실제 queue 항목 표시, application 부재는 빈 상태로 명시
- [x] `복습 → 신규 → 적용` 순서 유지
- [x] 항목 예상 소요시간과 정규 학습 이동 링크
- [x] due review가 밀리면 신규·적용 억제 이유 표시
- [x] mount/focus/visibility 복귀 시 저장 이벤트에서 큐 재계산
- [x] 사용 시간·남은 시간·미뤄진 due 수 표시

## 12. Q3 — 시간 예산 테스트

- [x] 15분
- [x] 45분
- [x] 60분
- [x] due review가 예산을 초과할 때 신규 억제
- [x] review 완료 뒤 신규 허용
- [x] 신규 뒤 시간이 남으면 적용 허용
- [x] 총 예상 시간이 예산을 넘지 않음

## 13. P1 — 시험일까지 목표 계획

- [x] 시험일까지 남은 일수 계산
- [x] 하루 가능 시간으로 총 가용 시간 계산
- [x] reviewed 커버리지와 남은 신규 콘텐츠·개념량 계산
- [x] replay된 memory state에서 현재 due review 부채 계산
- [x] 신규/복습 예산 분리
- [x] 시험 14일·7일·3일 이내에 복습 예산 비중을 단계적으로 확대
- [x] 다음 최대 7일 계획 미리보기
- [x] 각 미리보기 날짜의 복습/신규/합계 분과 부채 이월 note 표시
- [x] 과거/비정상 시험일을 음수 계획 없이 명시적 상태로 검증
- [x] 계획을 합격 확률이나 예상 점수처럼 표현하지 않기

## 14. P2 — 놓친 날 복구

- [x] 설정 저장 뒤 완전히 지난 날짜 중 정규 학습 이벤트가 없는 날을 로컬 근거 미수행으로 추정
- [x] assessment 이벤트는 미수행 감지의 정규 학습 근거에서 제외
- [x] 미완료 review를 신규보다 우선
- [x] 누적 부채 전체를 하루에 강제하지 않고 `dailyMinutes` 상한까지만 배치
- [x] 하루에 담지 못한 due 부채를 다음 날짜로 이월
- [x] 신규 학습량을 부채 회복 뒤 남는 일일 예산으로 다음 며칠에 분산
- [x] 하루 시간 상한 유지
- [x] 시험 임박 시 검수된 application이 없는 현재 범위에서는 application을 만들지 않고 복습 비중만 확대
- [x] 여러 날 미수행·큰 due 부채에서도 7일 미리보기와 일일 상한으로 유한한 계획 유지

## 15. W1/W2 — 취약점 화면과 행동 (완료)

- [x] 독립 회상 반복 실패 집계
- [x] 도움 의존 반복 집계
- [x] 적용·평가 반복 실패 집계
- [x] FSRS 연결 후 review debt 집계
- [x] 최신 근거 시각·횟수 표시
- [x] 근거가 없으면 `측정 없음`
- [x] 취약 개념을 복습 후보로 연결
- [x] 같은 문제 대신 동형·유사 문항 제공
- [x] 선수지식 결손이면 선행 개념으로 이동
- [x] 적용 실패 시 검수 콘텐츠 부재를 명시

## 16. S1/S2 — SQL 수직 범위 (핵심 구현 완료, 평가만 남음)

- [x] 테이블·행·열
- [x] `SELECT / FROM`
- [x] `WHERE`
- [x] `GROUP BY / HAVING`
- [x] `JOIN`
- [x] 각 개념 이해 → 회상 → 적용 콘텐츠
- [x] 고정 읽기 전용 데이터셋
- [x] 결과 예측·절 완성·전체 쿼리 작성
- [x] 결과 행·열 동등성 판정
- [x] 금지 변경 SQL 차단
- [x] 구문/조건/조인/집계 오류 분류
- [x] 첫 제출 전 실행 결과 비공개
- [ ] 주간 SQL 미니 테스트

## 17. C1/C2 — C 언어 수직 범위 (핵심 구현 완료, 운영 smoke만 남음)

- [x] 값과 타입
- [x] 연산자와 식
- [x] 제어 흐름
- [x] 배열
- [x] 포인터
- [x] 각 개념 이해 → 회상 → 적용 콘텐츠
- [x] 실행 결과 예측·상태 추적표·빈 코드·짧은 작성
- [x] 첫 제출과 실행 후 수정 답 구분
- [x] 제한된 컴파일/테스트 실행 경계
- [x] CPU·메모리·출력 상한
- [x] 네트워크·호스트 파일·위험 기능 차단
- [x] 실행기 장애 시 설명·회상 fallback
- [ ] 운영 Vercel Sandbox와 C toolchain 성공 실행 smoke
- [ ] 주간 C 미니 테스트

## 18. E1~E3 — 평가와 8주 검증

- [ ] 20~30분 주간 SQL/C 미니 테스트
- [x] assessment와 정규 FSRS 격리
- [ ] 점수·총 응답시간·개념별 결과 저장
- [ ] 4주차 중간 동형 평가 정책 확정
- [ ] 복습량·카드 분할·채점 규칙 검토
- [ ] 콘텐츠 개정 시 버전/이력 승계 기록
- [ ] 8주차 `/exam-coach/followup` 실행
- [ ] 기준선 대비 정확도·시간·기술쌍 변화
- [ ] 7일 이상 지연 회상 코호트 분석
- [ ] 실제 회상률과 목표 90% 비교
- [ ] review debt 중앙값·최댓값·회복시간 분석
- [ ] 합격 확률이 아닌 관찰 지표로 다음 단계 판단

## 19. O1~O5 — 오프라인·동기화·백업

- [ ] Service Worker와 오프라인 대상 정책
- [ ] 짧은 학습 단위와 due review 캐시
- [ ] IndexedDB 오프라인 이벤트 큐
- [ ] 재연결 시 멱등 업로드와 부분 실패 재시도
- [ ] payload 충돌·시계 오차·부분 업로드 테스트
- [ ] 여러 기기 이벤트 합치기
- [ ] 마지막 쓰기/최고 점수로 memory state 덮어쓰기 금지
- [ ] 게스트→계정 연결 데이터 경계
- [ ] 삭제·내보내기 범위
- [ ] 이벤트/설정/진단 이력 백업·복구

## 20. M1~M6 — 운영·안전·접근성

- [ ] 콘텐츠 오류 신고와 버전 식별
- [ ] 심각 오류 버전 즉시 출제 중지
- [ ] 개정 시 새 버전·검수 초기화·이력 승계 결정
- [ ] keyboard-only 핵심 흐름
- [ ] focus/스크롤 영역/동적 결과 접근성
- [ ] 스크린리더 기준선·정규 학습 완료
- [ ] axe serious/critical 0 유지
- [ ] 저장/비저장 데이터 목록 문서화
- [ ] 외부 AI 교정 시 별도 동의와 최소 전송
- [ ] 채점/FSRS/저장/동기화 오류 계측
- [ ] 개인정보 없는 로그 계약

## 21. 개인 MVP 최종 게이트

- [ ] SQL 이해 → 회상 → 적용 → 주간 평가 연결
- [ ] C 이해 → 회상 → 적용 → 주간 평가 연결
- [x] 목표 기억률 90% 실제 FSRS 동작
- [x] 이벤트 재생으로 memory state 복원 코어
- [ ] 브라우저 새로고침 전후 memory state 동일성
- [x] 오늘 큐 15/45/60분 안정 동작
- [x] 놓친 날 복구 계획이 시간 상한 유지
- [ ] 기준선·주간·종료 평가가 FSRS와 격리되고 8주 검증 완료
- [ ] C 운영 Sandbox 성공 smoke
