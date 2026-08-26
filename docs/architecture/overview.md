# NewsOrder 아키텍처

## 경계

Next.js App Router가 공개 화면과 API를 제공한다. DB·인증·번역·Gemini·관리자·백업 모듈은 `server-only` 경계 안에 있고 클라이언트에는 학습에 필요한 영문과 섞인 token ID/text만 전달한다. 정답 한국어와 canonical position은 서버에 남는다.

공개 콘텐츠 쿼리는 `use cache`와 `content:public`, 날짜, lesson, archive tag를 사용한다. 세션, 진도, 신고, 관리자, 수집 및 백업 상태는 캐시하지 않는다.

## 콘텐츠 흐름

1. Vercel Cron이 매일 21:00 UTC에 KST 학습일을 확정한다.
2. BBC RSS만 읽고 본문 페이지는 가져오지 않는다.
3. HTML/entity/공백/Unicode를 정규화하고 발췌를 200자 이하로 제한한다.
4. Google Cloud Translation NMT가 제목과 발췌만 번역한다.
5. Gemini `gemini-3.7-flash`가 strict JSON schema의 다섯 기준을 평가한다.
6. 애플리케이션 검증과 Gemini가 모두 합격한 최대 10건만 immutable revision으로 공개한다.
7. 실패 항목은 성공 항목과 격리한다. 관리자가 수정한 번역도 동일 검수를 다시 통과해야 한다.

## 데이터 수명

- 게시 revision은 DB trigger로 수정할 수 없다. 변경은 새 revision이다.
- 철회는 영문·한국어·검수 JSON·token을 삭제하고 URL, tombstone, 진도를 유지한다.
- 익명 진도는 브라우저에만 저장하며 콘텐츠와 사용자의 token 순서는 저장하지 않는다.
- 로그인 진도는 DB에 저장하고 idempotency key로 익명 진도를 병합한다.
- 사용자·OAuth 연결 메타데이터·진도·삭제 ledger만 매일 AES-256-GCM으로 백업한다.
- Sentry는 replay, PII, 요청 본문, 헤더, breadcrumb 데이터와 오류 메시지 내용을 제거한다.

## 런타임 모드

- `fixture`: 합성 콘텐츠, 외부 API와 운영 mutation 비활성화
- `production`: Neon, Better Auth, Google NMT, Gemini, Vercel Blob 환경변수를 시작 시 검증
