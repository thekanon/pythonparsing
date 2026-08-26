# NewsOrder Next.js 16 리팩터링 실행 계획

| 항목        | 값                                                                  |
| ----------- | ------------------------------------------------------------------- |
| 문서 상태   | 승인된 구현 기준선                                                  |
| 기준일      | 2026-08-26 (Asia/Seoul)                                             |
| 대상 저장소 | `pythonparsing`                                                     |
| 제품 임시명 | NewsOrder                                                           |
| 목표        | 비상업 영어→한국어 뉴스 문장 배열 학습 서비스의 소규모 공개 베타    |
| 예상 기간   | 1인 풀타임 기준 4~6주, 권장 일정 6주                                |
| 결정 기준   | 사용자와 합의한 Q1~Q73                                              |
| 구현 상태   | 시작 전. 이 문서는 계획만 정의하며 코드·인프라 변경을 의미하지 않음 |

> 이 문서는 사용자가 제공한 BBC 승인 이메일을 프로젝트 요구사항의 근거로 사용한다.
> 법률 자문을 제공하거나 BBC의 승인을 독립적으로 보증하는 문서는 아니다.

## 1. 요약

이번 작업은 기존 CRA/Express 애플리케이션을 Next.js로 점진 업그레이드하는 작업이 아니다.
기존 코드와 데이터는 폐기하고, 검증된 제품 규칙만 계승하여 Next.js 16 기반으로 다시 구축한다.

핵심 원칙은 다음과 같다.

1. 보안 정리를 신규 개발보다 먼저 완료한다.
2. BBC 콘텐츠는 승인 범위인 헤드라인과 기사당 최대 200자 발췌만 사용한다.
3. 번역과 Gemini 검수를 모두 통과한 콘텐츠만 공개한다.
4. 학습은 익명으로 시작할 수 있고 로그인은 진도 동기화에만 요구한다.
5. 공개 콘텐츠 캐시와 개인 진도를 명확히 분리한다.
6. 무료 티어 안에서 시작하되 실패·격리·백업을 운영자가 확인할 수 있게 한다.
7. 실제 복원 훈련, 접근성, 성능, 보안 검사를 공개 베타의 출시 조건으로 둔다.

## 2. 현재 프로젝트 분석

### 2.1 현재 기술 상태

- `DuouOLingo/my-app/package.json`은 React 16, CRA 3.4.3, Express, MongoDB, Firebase를 함께 사용한다.
- `DuouOLingo/my-app/src/App.js`는 기사, 번역, 정답, 표시 상태, 사용자 선택을 위치 기반 중첩 배열에 저장한다.
- 클라이언트가 하드코딩된 외부 HTTP 서버 주소로 직접 요청한다.
- 기존 채점은 단어 위치별 부분 점수를 합산한 뒤 두 문장이 모두 80점을 초과해야 통과한다.
- Firebase 인증 상태와 서버 세션 처리의 경계가 불명확하다.
- 드래그 앤 드롭은 마우스와 터치 중심이며 키보드 대체 수단과 스크린리더 안내가 부족하다.
- 테스트는 CRA 기본 예제 수준이며 현재 제품 동작을 검증하지 않는다.

### 2.2 보안 상태

- Firebase Admin 서비스 계정 파일과 외부 번역 키 파일이 Git에 추적되어 있다.
- 비밀값을 참조하는 서버 코드도 현재 트리에 남아 있다.
- 루트 `node_modules` 파일 88개가 Git에 추적되어 있다.
- 키를 현재 트리에서 삭제하는 것만으로는 과거 Git 커밋의 노출이 해결되지 않는다.

### 2.3 재사용 범위

재사용하는 것은 다음 제품 개념뿐이다.

- BBC 뉴스 기반 영어→한국어 학습
- 번역된 어절을 올바른 순서로 배열하는 문제 방식
- 제목과 요약을 함께 학습한다는 제품 의도

다음 항목은 재사용하지 않는다.

- 기존 React 컴포넌트
- Express API와 MongoDB 모델
- Firebase 사용자와 진도
- 기존 수집·번역 데이터
- 기존 CSS와 검정·형광 녹색 디자인
- 기존 번역 키와 서비스 계정

## 3. 목표와 비목표

### 3.1 목표

- 매일 BBC 기사 10건으로 제목·요약 20개 학습 단계를 생성한다.
- 모바일 우선의 접근 가능한 학습 경험을 제공한다.
- 익명 학습과 Google 로그인 진도 동기화를 지원한다.
- 번역 자동 검수, 실패 격리, 신고, 수동 수정, 철회가 가능한 최소 관리자 기능을 제공한다.
- Vercel Preview와 격리된 Neon 브랜치로 PR 단위 검증 환경을 제공한다.
- 사용자·인증·진도에 대한 30일 암호화 백업과 실제 복원 절차를 제공한다.

### 3.2 공개 베타 비목표

- 기존 MongoDB/Firebase 데이터 마이그레이션
- 영어→한국어 이외의 사용자 노출 언어
- 유료 기능, 광고, 후원, 제휴 수익화
- PWA 설치와 오프라인 학습
- 원문 기사 본문 저장 또는 표시
- 사용자 단어 배열 순서의 서버 영구 저장
- 번역 신고 처리 SLA
- BBC 외 공급자의 실제 운영 연동

언어와 공급자 필드는 일반화하되, 공개 베타 구현은 `en → ko`, `BBC` 한 가지로 제한한다.

## 4. 콘텐츠·권리 정책

### 4.1 BBC 사용 조건

- 비상업 교육용 서비스로만 운영한다.
- BBC 헤드라인과 기사당 최대 200자 발췌만 사용한다.
- 기사 원문으로 연결되는 출처 링크를 항상 제공한다.
- NewsOrder가 BBC의 공식·제휴 서비스가 아님을 표시한다.
- 광고, 후원, 구독, 유료 기능을 포함한 모든 수익화를 금지한다.
- 수익화를 검토할 때는 BBC 콘텐츠를 먼저 비활성화하고 별도 승인을 받아야 한다.
- 승인 원본 이메일은 비공개 외부 저장소에 보관한다.
- 저장소에는 개인 정보와 메일 헤더를 제거한 조건 요약만 커밋한다.

### 4.2 Gemini 무료 티어 공개

About 페이지에 다음을 명시한다.

- Google Gemini API 무료 티어를 번역 품질 검수에 사용한다.
- 입력 데이터가 Google 제품 개선에 사용될 수 있다.
- Gemini에 전달되는 기사 발췌는 기사당 최대 200자이다.
- 기사 본문 전체는 수집하거나 Gemini에 전달하지 않는다.
- 번역은 기계 번역과 AI 검수를 거친 결과이며 인간 감수를 보장하지 않는다.

### 4.3 철회와 비상 중단

- `content_source.enabled`를 이용해 BBC 전체 공급을 즉시 중단할 수 있게 한다.
- 특정 기사 철회 시 영문 발췌, 한국어 번역, 토큰 데이터를 삭제한다.
- 원문 URL, 철회 tombstone, 기존 사용자 진도는 유지한다.
- 공개 캐시 태그를 즉시 무효화한다.
- 철회 작업은 관리자 감사 로그에 남긴다.

## 5. 기술 기준선

### 5.1 프레임워크와 런타임

- Next.js `16.3.3` 정확한 버전 고정
- Node.js `24.19.0` LTS 고정
- Next.js App Router
- React Server Components 우선
- 상호작용에 필요한 최소 범위만 Client Component 사용
- TypeScript strict mode
- pnpm workspace와 커밋된 lockfile
- Tailwind CSS 4와 제품 전용 design token

Next.js 버전은 2026-08-25 보안 릴리스가 포함된 `16.3.3`보다 낮아지면 안 된다.
구현 시작 시점에 더 높은 16.3 패치가 발표됐다면 보안 공지와 호환성을 확인한 뒤 정확한 버전을 다시 고정한다.

### 5.2 애플리케이션 서비스

- 데이터베이스: Neon PostgreSQL
- ORM/마이그레이션: Drizzle ORM / Drizzle Kit
- 인증: Better Auth + Google OAuth + Admin 플러그인
- 번역: Google Cloud Translation NMT
- 품질 검수: Gemini API `gemini-3.7-flash`
- 호스팅/예약 작업: Vercel Hobby + Vercel Cron
- 오류 추적: Sentry Developer, Session Replay 비활성화
- 페이지 분석: Vercel Web Analytics와 Speed Insights
- 학습 행동 분석: Neon의 일별 집계 카운터
- 백업 저장소: Private Vercel Blob

### 5.3 자격증명 정책

- Google Cloud Translation은 Vercel OIDC와 GCP Workload Identity Federation을 사용한다.
- Google Cloud 장기 서비스 계정 JSON을 새로 만들지 않는다.
- Gemini API 키, Google OAuth client secret, Better Auth secret은 환경별 Vercel secret으로만 저장한다.
- `.env.example`에는 변수 이름과 설명만 기록하고 값은 기록하지 않는다.
- 환경변수는 시작 시 Zod 스키마로 검증한다.

## 6. 목표 아키텍처

```text
Vercel Cron (06:00~06:59 KST)
        │
        ▼
BBC RSS → 정규화·200자 발췌 → Google NMT → Gemini 검수
        │                                  │
        ├──────── 합격 ────────────────────┤
        │                                  ▼
        │                         Neon 공개 콘텐츠
        └──────── 실패 ──────────→ 격리·관리자 큐

사용자 → Next.js App Router
          ├─ 공개 캐시: 오늘/아카이브/레슨 콘텐츠
          ├─ 동적 영역: 세션/개인 진도
          ├─ Better Auth → Neon 인증 테이블
          └─ 관리자 → 재시도/수정/철회/감사 로그

Neon 사용자·인증·진도
        └─ 암호화 논리 백업 → Private Vercel Blob, 30일
```

Next.js가 Express 서버를 완전히 대체한다.
별도 상시 실행 백엔드는 두지 않고 Route Handler와 Server Action을 사용한다.

## 7. 목표 저장소 구조

```text
/
├─ apps/
│  └─ web/
│     ├─ src/app/
│     │  ├─ (public)/
│     │  ├─ admin/
│     │  └─ api/
│     ├─ src/components/
│     ├─ src/features/
│     └─ src/server/
├─ packages/
│  └─ db/
│     ├─ schema/
│     ├─ migrations/
│     └─ restore/
├─ docs/
│  ├─ architecture/
│  ├─ operations/
│  ├─ privacy/
│  └─ bbc-permission-redacted.md
├─ pnpm-workspace.yaml
├─ package.json
└─ pnpm-lock.yaml
```

서버 전용 모듈에는 `server-only` 경계를 적용한다.
클라이언트 번들에 DB, 번역, Gemini, 관리자, 백업 코드를 포함하지 않는다.

## 8. 화면과 라우트

### 8.1 공개 화면

| 경로                  | 기능                            | 검색 정책       |
| --------------------- | ------------------------------- | --------------- |
| `/`                   | 제품 소개와 오늘 학습 진입      | index           |
| `/today`              | 오늘 기사 10건과 진도           | index           |
| `/lessons/[lessonId]` | 제목·요약 두 단계 학습          | noindex, follow |
| `/archive/[date]`     | 날짜별 기사 목록                | index           |
| `/progress`           | 익명 또는 로그인 진도           | noindex         |
| `/settings`           | 로그인, 계정 삭제, 데이터 안내  | noindex         |
| `/about`              | BBC·Gemini·비상업·비제휴 고지   | index           |
| `/privacy`            | 데이터 수집·보존·백업·삭제 정책 | index           |

### 8.2 관리자 화면

| 경로                | 기능                               |
| ------------------- | ---------------------------------- |
| `/admin`            | 최근 수집·격리·백업·신고 상태 요약 |
| `/admin/ingestion`  | 실행 이력, 처리 건수, 실패 사유    |
| `/admin/quarantine` | 격리 번역 재시도, 수정 후 재검수   |
| `/admin/reports`    | 잘못된 번역 신고 검토              |
| `/admin/audit`      | 관리자 작업 이력 조회              |

## 9. 데이터 모델

### 9.1 인증 테이블

Better Auth가 관리한다.

- `user`
- `account`
- `session`
- `verification`
- `rateLimit`

`user`에는 관리자 역할 필드를 포함한다.
첫 관리자는 `BOOTSTRAP_ADMIN_EMAIL`과 일치하는 Google 계정이 처음 로그인할 때 한 번만 승격한다.
관리자가 존재한 뒤에는 DB 역할을 권한의 기준으로 사용한다.

### 9.2 콘텐츠 테이블

#### `content_source`

- provider key
- 표시 이름
- source language / target language
- 활성 상태
- 비상업 요구 여부
- 권리 조건 문서 버전

#### `article`

- 내부 ID
- provider key
- RSS GUID 또는 외부 ID
- canonical URL
- 원문 게시 시각
- 최초 발견 시각
- 철회 상태

고유 제약은 `(provider_key, external_id)`에 둔다.
GUID가 없을 때만 canonical URL을 외부 ID로 사용한다.

#### `article_revision`

- article ID
- revision number
- 영문 제목
- 영문 발췌
- 한국어 제목 번역
- 한국어 발췌 번역
- 원문 hash
- 번역 공급자와 모델
- 검수 모델의 정확한 ID
- 검수 결과 JSON
- 상태
- 생성·공개·철회 시각

게시된 revision은 수정하지 않는다.
게시 후 텍스트 변경이나 번역 수정이 필요하면 새 revision을 만든다.

#### `daily_lesson`

- 학습 날짜 `Asia/Seoul`
- 표시 순서 1~10
- article revision ID
- 공개 상태

`(learning_date, ordinal)`을 고유하게 제한한다.

#### `lesson_token`

- revision ID
- 단계 `title | excerpt`
- 임의 token ID
- canonical position
- token text

철회 시 관련 token을 삭제한다.

### 9.3 학습·운영 테이블

#### `stage_progress`

- user ID
- lesson ID
- 단계
- 시도 수
- 최고 위치 일치 점수
- 완료 시각
- 도움 사용 여부
- 최근 시도 시각

`(user_id, lesson_id, stage)`를 고유하게 제한한다.
사용자가 배치한 전체 token ID 순서는 저장하지 않는다.

#### `translation_report`

- 신고자 user ID
- revision ID
- 신고 유형
- 상태 `open | resolved | dismissed`
- 생성·처리 시각
- 처리 관리자

자유 입력은 베타 범위에서 제외하여 불필요한 개인 정보 저장을 방지한다.
동일 사용자가 동일 revision에 여러 열린 신고를 만들 수 없게 한다.

#### `ingestion_run` / `ingestion_item`

- 실행 날짜와 상태
- 시작·종료 시각
- 발견·번역·합격·격리·공개 건수
- 항목별 처리 단계
- 재시도 횟수와 다음 시도 시각
- 정규화된 오류 코드

오류 메시지에는 기사 전문, 번역 전문, API 키를 기록하지 않는다.

#### `admin_audit_log`

- actor ID
- action
- target type / ID
- 수행 시각
- 성공 여부
- 변경 전·후 hash

본문 전체는 기록하지 않고 1년간 보존한다.

#### `learning_event_daily`

- 날짜
- 이벤트 이름
- 익명/로그인 구분
- 집계 수

사용자 ID, IP, 단어 순서, 기사 텍스트를 저장하지 않는다.

#### `deletion_event`

- HMAC 처리한 내부 user ID
- 삭제 요청 시각
- 만료 시각

백업 최대 보존 기간보다 긴 35일 동안 유지하고 복원 시 탈퇴 계정을 재삭제한다.

## 10. 콘텐츠 수집·번역·검수 흐름

### 10.1 예약 실행

- Vercel Cron 표현식: `0 21 * * *` UTC
- 목표 시각: 매일 06:00 KST
- Hobby의 시간 단위 정밀도를 고려한 실제 범위: 06:00~06:59 KST
- 실행 날짜는 작업 시작 시점의 `Asia/Seoul` 날짜로 결정한다.
- `(provider, learning_date)` idempotency 제약으로 중복 실행을 막는다.
- Cron 요청은 `CRON_SECRET`으로 검증한다.

### 10.2 처리 단계

```text
discovered
  → normalized
  → translated
  → verifying
  → approved
  → published

각 단계 실패
  → retrying (최대 3회)
  → quarantined

published
  → withdrawn
```

1. BBC RSS를 읽는다.
2. 기사 본문 URL을 가져오거나 스크래핑하지 않는다.
3. HTML entity와 태그를 제거하고 Unicode NFC로 정규화한다.
4. RSS GUID 또는 URL과 hash로 신규·변경 항목을 구분한다.
5. 발췌는 200자 이내 완전한 문장까지만 선택한다.
6. 완전한 문장이 없으면 단어 경계에서 자르고 말줄임표를 포함해 200자를 넘지 않게 한다.
7. 후보 20~30건을 준비해 품질 검수에 합격한 10건을 선택한다.
8. Google NMT에 제목과 최대 200자 발췌만 전달한다.
9. Gemini에 영문·한국어 쌍과 검수 기준만 전달한다.
10. 애플리케이션 검증과 Gemini 검수를 모두 통과한 항목만 공개한다.
11. 10건을 채우지 못하면 합격 항목만 공개하고 운영 경고를 발생시킨다.

### 10.3 Gemini 합격 조건

모델은 `gemini-3.7-flash`로 고정한다.
응답은 JSON Schema로 제한하고 Zod로 다시 검증한다.

다음 값이 모두 `true`여야 합격한다.

- `meaningPreserved`
- `complete`
- `noHallucination`
- `naturalKorean`
- `safeForLearning`

추가 애플리케이션 검증:

- 필수 필드 존재
- 예상하지 않은 추가 필드 없음
- 영문·한국어 결과가 비어 있지 않음
- 원문과 번역의 언어가 명백히 뒤바뀌지 않음
- 발췌가 200자를 넘지 않음
- 저장하려는 원문이 Gemini에 보낸 원문과 동일함

JSON 형식이 맞더라도 의미가 틀릴 수 있으므로 LLM 결과만으로 검증을 끝내지 않는다.

### 10.4 실패와 관리자 수정

- 외부 API 실패는 같은 실행 안에서 최대 3회 지수 백오프로 재시도한다.
- 계속 실패하면 성공 항목에는 영향을 주지 않고 해당 항목만 격리한다.
- 동일 Google NMT 호출을 무한 반복하지 않는다.
- 관리자는 격리 번역을 직접 수정할 수 있다.
- 수정된 번역은 Gemini와 애플리케이션 검증을 다시 통과해야 공개할 수 있다.
- 이미 공개된 번역을 수정할 때는 기존 revision을 바꾸지 않고 새 revision을 만든다.

## 11. 학습 상호작용

### 11.1 레슨 단위

- 기사 한 건이 레슨 한 건이다.
- 1단계는 제목, 2단계는 발췌 요약이다.
- 매일 기사 10건이므로 총 20단계를 제공한다.

### 11.2 한국어 토큰화

- Unicode NFC 정규화
- 앞뒤 공백 제거
- 연속 공백 축소
- 공백 기준 어절 분리
- 문장부호는 앞 어절에 유지
- 각 token에 임의 ID 부여
- Fisher-Yates 셔플 사용

중복 단어는 token ID로 조작 상태를 구분한다.
채점 시에는 사용자가 만든 token text 순서와 정답 text 순서를 비교하여 동일 단어끼리 자리만 바뀐 경우 오답 처리하지 않는다.

### 11.3 입력 방법과 접근성

- token 탭/클릭: 정답 영역으로 이동
- 선택 token 탭/클릭: 후보 영역으로 복귀
- 포인터/터치 드래그: 순서 변경
- 키보드: 선택, 제거, 앞·뒤 이동을 동일하게 제공
- 포커스 표시를 항상 유지
- 이동 결과를 ARIA live region으로 안내
- 오답 위치를 색상만으로 전달하지 않음
- `prefers-reduced-motion` 지원
- 최소 터치 목표 44×44 CSS px

드래그는 편의 기능이며 탭과 키보드만으로 모든 학습을 완료할 수 있어야 한다.

### 11.4 채점과 피드백

- 통과 기준은 정규화된 전체 token 순서의 완전 일치이다.
- 위치 일치율은 피드백과 최고점 계산에만 사용한다.
- 부분 일치로 레슨을 완료 처리하지 않는다.
- 시도 횟수는 제한하지 않는다.
- 3회 오답 후 정답 보기 버튼을 제공한다.
- 정답을 본 단계는 `helped=true`로 완료 처리한다.
- token 배열은 채점 요청 중에만 사용하고 로그·DB에 저장하지 않는다.

## 12. 인증과 진도

### 12.1 인증

- 학습 시작에는 로그인이 필요하지 않다.
- Google OAuth는 기기 간 진도 동기화에만 필요하다.
- 이메일/비밀번호 인증은 공개 베타에서 제공하지 않는다.
- 관리자와 변경 작업은 서버에서 실제 세션과 DB 역할을 검증한다.
- `proxy.ts`의 cookie 존재 확인만으로 권한을 허용하지 않는다.

### 12.2 익명 진도

익명 진도는 versioned local storage 형식으로 저장한다.

- lesson ID
- 단계별 완료 여부
- 시도 수
- 최고점
- 도움 사용 여부
- 최근 시각

콘텐츠 전문과 token 배열은 저장하지 않는다.

### 12.3 로그인 병합

로그인 후 서버 트랜잭션에서 다음 규칙을 적용한다.

- 완료 여부: 합집합
- 최고점: 최댓값
- 시도 수: 정책상 허용하는 상한 안에서 합산
- 최근 시각: 최신값
- 도움 사용: 어느 한쪽이라도 사용했으면 `true`

병합 요청에는 idempotency ID를 부여해 중복 실행해도 결과가 변하지 않게 한다.
클라이언트 값을 신뢰하지 않고 존재하는 lesson과 허용 범위를 검증한다.

### 12.4 진도 화면

- 전체 완료 단계 수
- 현재 연속 학습일
- 최근 7일/30일 완료량
- 최고 점수
- 도움을 사용한 완료 수

## 13. 캐시 전략

`next.config.ts`에서 `cacheComponents: true`를 사용한다.

### 13.1 캐시 대상

- 오늘 기사 목록
- 날짜 아카이브
- 공개된 lesson 콘텐츠
- 공개 메타데이터

`'use cache'`, `cacheLife`, `cacheTag`를 사용한다.

권장 tag:

- `lessons:today`
- `lessons:date:{yyyy-mm-dd}`
- `lesson:{lessonId}`
- `archive`

### 13.2 캐시 금지 대상

- 세션
- 개인 진도
- 관리자 데이터
- 신고 상태
- 수집·백업 실행 상태

공개 캐시 함수에 user ID, cookie, header를 전달하지 않는다.
공개 콘텐츠와 개인 진도가 한 화면에 필요하면 공개 shell은 캐시하고 개인 영역은 `<Suspense>` 아래에서 동적으로 읽는다.

### 13.3 무효화

- 매일 새 콘텐츠 공개
- 새 revision 공개
- 기사 철회
- 관리자 비공개 처리

위 이벤트 후 관련 tag를 `updateTag` 또는 목적에 맞는 revalidation API로 무효화한다.

## 14. 관리자와 운영

### 14.1 관리자 기능

- 최근 수집 실행 상태
- 공개·격리·실패 건수
- 격리 항목 상세
- 외부 API 재시도
- 번역 수동 수정 후 Gemini 재검수
- 공개 취소와 콘텐츠 철회
- 신고 처리
- 관리자 역할 변경
- 최근 백업 상태
- 감사 로그 조회

### 14.2 감사 로그

다음 작업을 1년간 append-only로 기록한다.

- 번역 수정
- 재시도
- 공개·비공개
- 철회·삭제
- 신고 처리
- 관리자 역할 변경

본문 전체 대신 변경 전·후 hash를 저장한다.

### 14.3 신고 정책

- 로그인 사용자만 신고 가능
- 신고가 자동 비공개로 이어지지 않음
- 정해진 대응 시간 없음
- 관리자 화면에 미처리 건수와 오래된 신고를 표시

이 정책은 오역이 장기간 공개될 수 있는 잔여 위험을 의도적으로 수용한다.

## 15. 분석과 관측성

### 15.1 Vercel

- Web Analytics: 페이지뷰와 방문 경로
- Speed Insights: 실제 성능 지표
- Hobby에서는 custom event를 사용하지 않는다.

### 15.2 Neon 일별 집계

집계 가능한 이벤트 예:

- `lesson_started`
- `stage_submitted`
- `stage_completed`
- `answer_viewed`
- `report_created`

개별 사용자를 추적하지 않고 날짜·이벤트·익명/로그인 구분의 count만 저장한다.

### 15.3 Sentry

- 서버·브라우저 오류 추적
- 수집 실패 알림
- 격리 비율 급증 알림
- 일일 10건 미달 알림
- 백업 실패·누락 알림
- Cron missed/failed check-in
- release와 environment 구분

금지:

- Session Replay
- 사용자 이메일 전송
- 요청 본문 전송
- BBC 기사/번역 전문 전송
- token 배치 순서 전송

## 16. 백업과 계정 삭제

### 16.1 백업 범위

매일 다음 데이터를 논리 백업한다.

- 사용자와 관리자 역할
- Google OAuth account 연결
- 학습 진도
- 삭제 이벤트

다음 데이터는 백업하지 않는다.

- BBC 콘텐츠와 번역: 재수집 가능
- session과 verification token: 복원 후 재로그인
- rate limit 데이터
- 일별 분석 집계
- Sentry 이벤트

### 16.2 백업 형식

- 일관된 DB transaction에서 export
- schema/migration version
- 테이블별 row count
- payload checksum
- AES-256-GCM 암호화
- Private Vercel Blob 업로드
- 30일을 초과한 blob 삭제

`BACKUP_ENCRYPTION_KEY`는 Blob과 분리된 Vercel secret에 저장하고 외부 비밀번호 관리 도구에도 복구용 사본을 둔다.

### 16.3 복원

- 복원은 운영 앱의 자동 경로로 제공하지 않는다.
- 로컬 또는 제한된 운영 CLI가 임시 Neon 브랜치에 복원한다.
- row count와 checksum을 확인한다.
- 백업 이후 발생한 deletion event를 다시 적용한다.
- session은 복원하지 않고 사용자에게 재로그인을 요구한다.
- 공개 전 최소 1회 실제 복원을 완료한다.
- 공개 후 월 1회 임시 브랜치 복원 훈련을 권장한다.

### 16.4 계정 삭제

삭제 transaction:

1. 모든 session 폐기
2. progress 삭제
3. account 연결 삭제
4. user 삭제
5. 신고자의 식별자를 제거
6. HMAC 삭제 이벤트 기록

운영 DB에서는 즉시 사라지고 기존 백업에서는 최대 30일 후 제거된다.
이 동작을 Settings와 Privacy 페이지에 명시한다.

## 17. 보안 정리 계획

이 단계는 신규 개발의 선행 조건이다.

1. Firebase Admin, Google Cloud, 번역 API, OAuth, MongoDB 관련 자격증명을 목록화한다.
2. 노출된 키를 공급자 콘솔에서 먼저 폐기한다.
3. 폐기된 키로 인증이 실패하는지 확인한다.
4. 저장소의 임시 암호화 mirror를 만든다.
5. 정확한 대상 경로와 문자열을 read-only 검사로 확정한다.
6. `git filter-repo`로 민감 파일과 문자열을 모든 branch/tag에서 제거한다.
7. 원격 branch/tag를 조율된 maintenance window에 강제 갱신한다.
8. 기존 clone과 열려 있는 PR을 폐기하고 다시 clone한다.
9. 전체 Git 기록에 secret scanner를 실행한다.
10. 검증 후 민감 정보가 포함된 임시 mirror를 안전하게 폐기한다.
11. 새 `main` branch 보호와 GitHub secret scanning을 활성화한다.

Git 기록 정리는 commit SHA를 변경하는 파괴적 작업이다.
실제 실행 직전에는 대상 경로, 원격, 백업 위치를 다시 확인해야 한다.

## 18. 환경과 Preview 격리

### 18.1 Local

- 로컬 PostgreSQL
- 로컬 fixture RSS/번역/Gemini 응답
- 개인 개발용 Google 인증은 ADC 또는 전용 개발 설정

### 18.2 PR Preview

- PR별 Vercel Preview
- PR별 Neon branch
- Production DB가 아닌 별도 비운영 Neon template branch에서 생성
- synthetic user와 fixture 콘텐츠만 포함
- Preview secret은 Production secret과 분리

Production에서 직접 branch를 만들면 실제 사용자와 진도가 Preview에 복제될 수 있으므로 금지한다.

동적 Preview URL은 Google OAuth callback 제약이 있으므로 CI E2E는 테스트 전용 session fixture를 사용한다.
실제 Google OAuth smoke test는 보호된 고정 Release Preview alias에서 수행한다.

### 18.3 Production

- Production Vercel project/environment
- Production Neon primary branch
- Production 전용 Google OAuth와 Gemini key
- Vercel OIDC subject에 Production environment 제약 적용

## 19. DB 마이그레이션 정책

- Drizzle TypeScript schema를 source of truth로 사용한다.
- `drizzle-kit generate`로 SQL migration을 생성한다.
- SQL과 snapshot을 PR에 커밋한다.
- Preview Neon branch에 migration을 적용해 통합/E2E를 실행한다.
- `drizzle-kit push`를 Production에 사용하지 않는다.
- 앱 시작 시 자동 migration을 실행하지 않는다.
- Production migration은 별도의 승인된 workflow에서 한 번만 실행한다.
- migration 전 사용자·인증·진도 백업을 확인한다.
- 롤백 기간에는 expand/contract migration을 사용한다.
- 컬럼·테이블 삭제는 최소 7일 뒤 별도 migration으로 수행한다.

## 20. CI/CD와 배포

### 20.1 PR 필수 검사

1. lockfile 일관성
2. format 검사
3. ESLint
4. TypeScript
5. Vitest unit test
6. PostgreSQL integration test
7. Drizzle migration drift/check
8. Playwright E2E
9. axe 접근성 검사
10. secret scan
11. production build

Next.js 16의 `next build`는 lint를 자동 실행하지 않으므로 lint를 독립 필수 검사로 둔다.

### 20.2 Production 승격

```text
보호된 main 병합
→ Production DB에서 검증용 branch 생성
→ migration과 회귀 테스트
→ 최신 사용자 백업 확인
→ Primary DB에 명시적 migration
→ Production deployment 수동 승격
→ smoke test
→ 도메인 전환
```

### 20.3 롤백과 레거시 제거

- 전환 후 7일 동안 기존 서비스와 직전 Vercel deployment를 롤백 경로로 유지한다.
- DB schema는 이 기간 동안 이전 코드와 호환되게 유지한다.
- Cron 설정은 rollback runbook에서 별도로 확인한다.
- P0/P1 장애가 없으면 정리된 Git 기록 위에 `legacy-final` tag를 만든다.
- 기존 `DuouOLingo/my-app`, 루트 `node_modules`, 중복 lockfile을 main에서 제거한다.
- Python 실험 파일은 신규 앱에서 사용되지 않는지 별도로 확인한 뒤 제거 범위를 확정한다.
- 권리 문서와 운영 runbook은 유지한다.

## 21. 테스트 전략

### 21.1 Vitest 단위 테스트

- 200자 Unicode 계산
- 완전한 문장 발췌와 fallback 절단
- HTML/Unicode 정규화
- 한국어 어절 token화
- 중복 token
- Fisher-Yates 셔플
- 정확 순서 채점
- 3회 오답과 도움 완료
- 익명/서버 진도 병합
- Gemini Zod schema와 all-true gate
- 수정 후 재검수
- 백업 암호화·복호화
- deletion event 재적용

### 21.2 DB/Route 통합 테스트

- 고유 제약과 CHECK 제약
- revision 불변성
- publish transaction
- 중복 Cron idempotency
- 권한 없는 관리자 작업 거부
- 신고 중복 방지
- 계정 삭제 transaction
- backup manifest와 checksum

### 21.3 Playwright E2E

- 익명 제목·요약 완료
- 탭 전용 학습
- 키보드 전용 학습
- 포인터/터치 drag reorder
- 3회 오답 후 정답 보기
- 익명 진도 로그인 병합
- 진행 화면
- 신고 생성
- 관리자 격리 수정·재검수
- 기사 철회 후 공개 콘텐츠 제거
- 계정 삭제

외부 API는 CI에서 fixture로 대체한다.
Release Preview에서만 실제 BBC, Translation, Gemini smoke test를 수행한다.

## 22. 접근성과 성능 기준

### 22.1 접근성

- WCAG 2.2 AA
- 키보드만으로 모든 핵심 동작 완료
- axe serious/critical violation 0
- focus 순서와 focus visibility 검증
- screen reader 이동 안내
- 200% 확대와 좁은 모바일 viewport 검증
- 색상 외 상태 표현 제공
- reduced motion 지원

### 22.2 성능

운영 p75 목표:

- LCP ≤ 2.5초
- INP ≤ 200ms
- CLS ≤ 0.1

신규 서비스는 출시 전에 충분한 field data가 없으므로 다음과 같이 나눈다.

- 출시 전 gate: 모바일 Lighthouse, bundle budget, scripted interaction latency
- 출시 후 SLO: Speed Insights의 실제 p75 Core Web Vitals

개인 진도를 위해 공개 콘텐츠 전체를 동적 렌더링하지 않는다.
학습 상호작용 Client Component는 lesson 영역에만 제한한다.

## 23. 비용과 무료 티어 보호

- 매일 기사 10건, 제목과 최대 200자 발췌만 번역한다.
- Google NMT 요청 문자를 DB에서 월별 집계한다.
- 월 450,000자에 도달하면 자동 호출을 중단하고 경고하여 500,000자 무료 구간을 넘지 않게 한다.
- Gemini model ID와 요청 수를 실행 로그에 기록한다.
- Gemini 무료 quota가 소진되면 검수되지 않은 항목은 공개하지 않는다.
- Vercel, Neon, Sentry 한도를 관리자 runbook에 기록한다.
- 유료 fallback이나 자동 plan upgrade는 구현하지 않는다.

## 24. 의존성 업데이트

- Dependabot을 주 1회 실행한다.
- 보안 패치는 우선 검토하고 전체 CI 통과 후 병합한다.
- 일반 의존성은 월 1회 묶어서 검토한다.
- Next.js/React 보안 공지는 별도 구독한다.
- major upgrade는 자동 병합하지 않는다.
- lockfile 없는 배포를 금지한다.

## 25. 6주 실행 일정

| 기간       | 주요 작업                                                                    | 종료 조건                                     |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| 선행 1~2일 | 키 폐기, Git 기록 정리, clone 재설정, branch 보호                            | 기존 키 인증 실패, 전체 기록 secret scan 통과 |
| 1주차      | pnpm workspace, Next 16.3.3, Node 24, Tailwind, CI, Neon/Drizzle/Better Auth | Local/Preview build 및 schema/auth 골격 통과  |
| 2주차      | BBC 어댑터, 200자 처리, NMT, Gemini, revision/격리                           | Preview에서 검증된 기사 10건 생성             |
| 3주차      | 모바일 UI, 두 단계 학습, 접근 가능한 token 조작, 익명 진도/병합              | 핵심 학습·병합 E2E 통과                       |
| 4주차      | 관리자, 신고, 수정·재검수, 철회, About/Privacy, 감사 로그                    | 관리자 권한·철회·신고 시나리오 통과           |
| 5주차      | 백업/복원, 삭제 재적용, Sentry, 분석, 보안·성능·접근성 강화                  | 빈 Neon branch 실제 복원과 장애 알림 확인     |
| 6주차      | Release Preview, 수동 Production 승격, 도메인 전환, 7일 관찰                 | P0/P1 0, 정상 일일 수집 후 legacy 제거        |

### 25.1 권장 PR 단위

1. `security/rewrite-history` — maintenance 작업, 일반 PR 외 별도 수행
2. `chore/workspace-foundation`
3. `feat/database-auth`
4. `feat/content-ingestion`
5. `feat/lesson-experience`
6. `feat/progress-sync`
7. `feat/admin-operations`
8. `feat/backup-observability`
9. `release/public-beta`

한 PR에서 스키마, UI, 운영 기능을 모두 변경하지 않는다.
각 PR은 독립적인 검증 항목과 rollback 가능 범위를 가진다.

## 26. 출시 완료 조건

다음 조건을 모두 충족해야 완료로 본다.

- [ ] Next.js 16.3.3 이상 검증된 16.3 보안 패치와 Node 24 LTS 사용
- [ ] 7일 연속 매일 검수 합격 기사 10건, 총 20단계 생성
- [ ] 모든 BBC 발췌가 기사당 200자 이하
- [ ] 모든 콘텐츠에 BBC 출처와 원문 링크 표시
- [ ] 비상업·비제휴·Gemini 무료 티어 고지 완료
- [ ] 익명 학습, Google 로그인, 진도 병합 정상 작동
- [ ] 계정 삭제와 30일 백업 정책 정상 작동
- [ ] 검수 실패 콘텐츠가 공개되지 않음
- [ ] 격리·수정·재검수·신고·철회·감사 기능 정상 작동
- [ ] 탭·키보드·포인터·터치 학습 흐름 통과
- [ ] CI 전체 통과
- [ ] axe serious/critical violation 0
- [ ] 출시 전 성능 budget 통과
- [ ] Critical/High 알려진 취약점 0
- [ ] 암호화 백업을 빈 Neon branch에 실제 복원
- [ ] 수집·격리 급증·백업 실패 알림 검증
- [ ] 현재 트리와 전체 Git 기록에서 폐기 대상 비밀값 제거
- [ ] Production 전환 후 7일간 P0/P1 장애 0
- [ ] `legacy-final` tag 후 기존 CRA/Express 앱 제거

## 27. 위험 등록부

| 위험                           | 영향                    | 완화                                                         | 수용 여부 |
| ------------------------------ | ----------------------- | ------------------------------------------------------------ | --------- |
| Gemini가 오역을 합격시킴       | 잘못된 학습 정답 공개   | 다중 boolean gate, 앱 검증, 신고·수정·재검수                 | 수용      |
| 신고 SLA 없음                  | 신고된 오역 장기 잔존   | 관리자 미처리/노후 신고 표시                                 | 수용      |
| BBC 승인 철회                  | 콘텐츠 제공 중단        | source kill switch, 일괄 철회 절차                           | 완화      |
| 무료 API quota/정책 변경       | 일일 콘텐츠 부족        | 사용량 hard guard, 격리, 알림, 유료 자동 전환 금지           | 수용      |
| Vercel Hobby Cron 시각 편차    | 정확히 06:00에 미게시   | 06:00~06:59 범위 안내, 날짜 중심 UI                          | 수용      |
| 일일 합격 10건 미달            | 콘텐츠 부족             | 후보 20~30건, 성공 항목만 공개, 경고                         | 수용      |
| Neon Free PITR 부족            | 사용자 데이터 영구 손실 | 일일 암호화 논리 백업, 복원 훈련                             | 완화      |
| 백업 키 분실                   | 백업 복원 불가          | 분리 env와 외부 password manager 사본                        | 완화      |
| Preview에 운영 데이터 복제     | 개인정보 노출           | 별도 비운영 template branch                                  | 차단      |
| Git history rewrite 오류       | history/remote 손상     | 키 선폐기, 임시 암호화 mirror, 대상 검증, maintenance window | 완화      |
| 자동 공개 파이프라인 장기 실행 | 함수 timeout            | batch 호출, 제한된 retry, item 상태 저장                     | 완화      |

## 28. 결정 추적표 Q1~Q73

| Q   | 확정 결정                                                                          |
| --- | ---------------------------------------------------------------------------------- |
| Q1  | BBC 뉴스 학습 제품 핵심을 리팩터링 대상으로 지정                                   |
| Q2  | 소규모 공개 베타                                                                   |
| Q3  | 기존 MongoDB 뉴스·사용자·진도 폐기                                                 |
| Q4  | 기존 앱과 분리한 그린필드 구축 후 전환                                             |
| Q5  | Vercel + 관리형 DB + 예약 작업                                                     |
| Q6  | 최신 기능보다 최신 보안 패치가 적용된 안정 버전 우선                               |
| Q7  | 4~6주 production-capable beta 계획                                                 |
| Q8  | 콘텐츠 공급자 경계와 약관 확인 구조                                                |
| Q9  | 사용자 UI는 영어→한국어, 내부 필드는 일반화                                        |
| Q10 | Neon PostgreSQL + Drizzle                                                          |
| Q11 | 익명 학습, 로그인은 동기화 시 요구                                                 |
| Q12 | 탭 token + drag/keyboard 순서 변경                                                 |
| Q13 | 기계 번역 자동 공개를 기본으로 하되 이후 Gemini hard gate로 제한                   |
| Q14 | 무료 티어 우선                                                                     |
| Q15 | 기존 검정·형광 녹색 UI를 유지하지 않고 전면 모바일 재설계                          |
| Q16 | 사용자 제공 BBC 서면 승인 범위 적용                                                |
| Q17 | Better Auth + Google OAuth                                                         |
| Q18 | Google Cloud Translation NMT 직접 사용                                             |
| Q19 | Gemini LLM 품질 검수                                                               |
| Q20 | 기사 한 건 = 제목·요약 두 단계 레슨                                                |
| Q21 | 익명/서버 진도는 완료 합집합, 최고점 최대, 최근 시각 최신으로 병합                 |
| Q22 | 정규화된 정확 token 순서로 완료 판정                                               |
| Q23 | 계정 삭제 전까지 사용자 데이터 보존, self-service 삭제                             |
| Q24 | 초기 광고 허용안은 Q34에서 폐기                                                    |
| Q25 | BBC의 Gemini 무료 티어 부분 발췌 사용 답신을 근거로 사용                           |
| Q26 | 하루 기사 10건, 총 20단계                                                          |
| Q27 | 200자 안 완전한 문장, fallback은 단어 경계와 말줄임표                              |
| Q28 | 한국어 공백 어절 token, 문장부호 결합, 중복 ID                                     |
| Q29 | 무제한 시도, 오답 피드백, 3회 후 정답, 도움 완료 표시                              |
| Q30 | GUID/URL + hash, 게시 revision 불변                                                |
| Q31 | 랜딩·날짜 목록 index, lesson noindex                                               |
| Q32 | 공개 베타 PWA/offline 제외                                                         |
| Q33 | 집계 이벤트만 수집                                                                 |
| Q34 | BBC 콘텐츠 사용 중 모든 수익화 금지                                                |
| Q35 | About에 Gemini free tier·제품 개선 사용·200자 제한 표시                            |
| Q36 | 수집 실행, 격리, 재시도, 비공개 중심 최소 관리자 기능                              |
| Q37 | 시도 수·최고점·완료·도움만 저장, 전체 token 순서 미저장                            |
| Q38 | 랜딩, 오늘, lesson, archive, progress, settings, admin 제공                        |
| Q39 | 집계 분석 도구 사용, Q48에서 구체화                                                |
| Q40 | 루트 pnpm workspace와 `apps/web`, parity 후 legacy 제거                            |
| Q41 | BBC 발췌와 번역을 철회 전까지 무기한 공개 보존                                     |
| Q42 | 완료량, streak, 7/30일, 최고점, 도움 사용 지표                                     |
| Q43 | `gemini-3.7-flash` 정확한 안정 모델 고정                                           |
| Q44 | DB 관리자 역할, 첫 관리자 env bootstrap, 감사 로그                                 |
| Q45 | Cache Components, 공개 cached/tagged, 개인 dynamic                                 |
| Q46 | Tailwind CSS 4 + 접근 가능한 primitive + design token                              |
| Q47 | Vitest, Route/DB integration, Playwright E2E                                       |
| Q48 | Vercel pageview/speed + Neon 일별 학습 카운터                                      |
| Q49 | Sentry Developer, replay 없음, PII/content scrub                                   |
| Q50 | Neon 6시간 PITR 단독안은 Q51에서 폐기                                              |
| Q51 | 사용자·인증·진도 일일 별도 백업                                                    |
| Q52 | 철회 시 콘텐츠·번역·token 삭제, URL/tombstone/progress 유지                        |
| Q53 | 다섯 boolean all-true + JSON/Zod 검증 hard gate                                    |
| Q54 | 불합격 번역은 관리자 수정 후 Gemini 재평가                                         |
| Q55 | 최대 3회 재시도, 이후 격리, 성공 항목 계속 처리                                    |
| Q56 | 관리자 감사 로그 append-only 1년, hash만 저장                                      |
| Q57 | SQL migration 커밋, Preview 검증, 명시적 Production migrate                        |
| Q58 | 기존 키 즉시 폐기, 신규 scoped credential만 사용                                   |
| Q59 | WCAG 2.2 AA, keyboard, axe, Core Web Vitals gate                                   |
| Q60 | 로그인 사용자의 번역 신고와 관리자 큐, 자동 비공개 없음                            |
| Q61 | 매일 AES-GCM 논리 백업을 Private Vercel Blob에 30일 보존                           |
| Q62 | Local + PR Vercel Preview/Neon branch + Production                                 |
| Q63 | 번역 신고 대응 SLA 없음                                                            |
| Q64 | Better Auth Neon DB rate limit과 DB 고유 제약, Redis 없음                          |
| Q65 | 주간 Dependabot, 보안 우선, 월간 일반 업데이트 검토                                |
| Q66 | BBC 원본 이메일 외부 비공개 보관, redacted 문서만 커밋                             |
| Q67 | Sentry 수집·격리·백업 알림과 관리자 최근 상태 표시                                 |
| Q68 | NewsOrder 임시명과 BBC 비제휴 문구                                                 |
| Q69 | 매일 06:00 KST 수집 시작                                                           |
| Q70 | 운영 데이터 즉시 삭제, 백업 30일 만료, 복원 시 삭제 재적용                         |
| Q71 | 키 폐기 후 `git filter-repo`로 민감 기록 제거와 원격 강제 갱신                     |
| Q72 | 보호 main → CI/Preview → 명시적 migration → 수동 승격 → 7일 rollback → legacy 제거 |
| Q73 | 보안·권리·운영·복원·접근성·성능을 포함한 완료 기준 확정                            |

## 29. 공식 참고 자료

- [Next.js August 2026 Security Release](https://nextjs.org/blog/august-2026-security-release)
- [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- [Next.js Installation and Runtime Requirements](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js Cache Components](https://nextjs.org/docs/app/getting-started/partial-prerendering)
- [Node.js Release Status](https://nodejs.org/en/about/previous-releases)
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next)
- [Better Auth Database Rate Limit](https://better-auth.com/docs/concepts/rate-limit)
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin)
- [Drizzle Generate](https://orm.drizzle.team/docs/drizzle-kit-generate)
- [Drizzle Migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate)
- [Neon Vercel Preview Branches](https://neon.com/blog/neon-vercel-native-integration)
- [Neon Pricing and Restore Window](https://neon.com/pricing)
- [Vercel Cron Usage and Precision](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Private Blob](https://vercel.com/docs/vercel-blob/private-storage)
- [Vercel OIDC for GCP](https://vercel.com/docs/oidc/gcp)
- [Google Cloud Translation Pricing](https://cloud.google.com/products/translate/pricing)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini API Pricing and Data Use](https://ai.google.dev/gemini-api/docs/pricing)
- [Vercel Analytics Limits](https://vercel.com/docs/analytics/limits-and-pricing)
- [Core Web Vitals](https://web.dev/articles/vitals)

## 30. 변경 관리

이 문서는 Q1~Q73의 승인된 기준선이다.

다음 변경은 문서의 결정 로그와 영향 범위를 함께 갱신해야 한다.

- BBC 승인 조건 또는 콘텐츠 공급자 변경
- 수익화 도입
- 번역/Gemini 공급자 변경
- 사용자 데이터 보존 기간 변경
- 자동 비공개 또는 신고 SLA 도입
- DB/인증/배포 플랫폼 변경
- 공개 베타 완료 기준 완화

일반 구현 세부사항은 이 기준선을 위반하지 않는 범위에서 ADR 또는 PR 설명으로 결정한다.
