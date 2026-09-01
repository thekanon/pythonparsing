# 고전 소설 전체 문장 배열 데이터

`Daddy-Long-Legs`, `The Wonderful Wizard of Oz`,
`Alice’s Adventures in Wonderland`, `Strange Case of Dr Jekyll and Mr Hyde`의
Project Gutenberg 원문은 저장소에 포함되며, 문장 배열용 한국어 번역도 빌드 전에
정적 JSON으로 생성한다.
서비스 요청 중에는 Claude나 Codex CLI를 실행하지 않는다.

```bash
pnpm --filter @newsorder/web books:exercises
```

생성기는 문단마다 영어 문장을 분리하고 Claude CLI Sonnet으로 먼저 번역한다.
Claude가 사용량 제한을 명시적으로 반환할 때만 Codex CLI의
`gpt-5.6-terra`로 전환한다. 두 CLI 모두 세션 저장과 도구 사용을 끄며, 원문은
표준 입력으로만 전달한다. 실행 중 결과는 운영체제 임시 디렉터리의
`newsorder-book-exercise-cache.json`에 저장되므로 중단 후 같은 명령으로
재개할 수 있다.

Claude 사용량 제한으로 전환된 작업을 프로세스 재시작 후에도 Codex로 계속
처리해야 할 때는 `--provider=codex`를 추가한다.

공식 Google Cloud Translation Advanced(v3)로 남은 작업을 처리하려면
`GOOGLE_CLOUD_PROJECT`와 Application Default Credentials를 준비한 뒤 다음처럼
실행한다.

```bash
pnpm --filter @newsorder/web books:exercises -- --provider=google
```

Google 응답은 요청한 문장 순서에 맞춰 다시 ID를 결합하며, 응답 수와 한국어
포함 여부를 다른 공급자와 똑같이 검증한다.

CLI 실행 파일은 기존 Reddit 수집 설정과 같은 `REDDIT_CLAUDE_CLI_PATH`,
`REDDIT_CODEX_CLI_PATH`를 따르며, 값이 없으면 각각 `claude`, `codex`를
사용한다. 결과 파일은 다음 위치에 생성된다.

- `apps/web/src/features/books/exercises/daddy-long-legs.json`
- `apps/web/src/features/books/exercises/the-wonderful-wizard-of-oz.json`
- `apps/web/src/features/books/exercises/alice-in-wonderland.json`
- `apps/web/src/features/books/exercises/dr-jekyll-and-mr-hyde.json`

생성 후 `pnpm test`, `pnpm typecheck`, `pnpm build`로 문장 수, 고유 ID,
한국어 누락, 전체 136개 구간의 정적 경로 생성을 확인한다.

## 문법 가이드 파일

배열 학습용 문법 가이드는 API가 아닌 로그인된 Claude CLI Sonnet으로 먼저 미리
생성한다. Claude가 사용량 제한을 명시적으로 반환할 때만 Codex CLI의
`gpt-5.6-terra`로 전환한다. 실행 중 도구와 세션 저장은 비활성화되며, 서비스
요청 중에는 두 CLI를 실행하지 않는다. 기본 실행 대상은 `지킬 박사와 하이드`
1장이다.

```bash
pnpm --filter @newsorder/web books:grammar-pilot
```

다른 작품이나 구간은 책과 구간 slug를 명시한다. 예를 들어 키다리 아저씨의 첫
구간 `Blue Wednesday`는 다음과 같이 생성한다.

```bash
pnpm --filter @newsorder/web books:grammar-pilot -- \
  --book=daddy-long-legs --section=blue-wednesday
```

Claude 사용량 제한으로 중단된 작업을 Codex로 재개하려면 `--provider=codex`를
추가한다. 각 문장에는 실제 생성에 사용한 CLI가 기록된다.

완료된 배치는 결과 JSON에 즉시 저장되므로 중단 후 같은 명령으로 이어서 생성할
수 있다. 결과는 다음 파일에 기록된다.

- `apps/web/src/features/books/grammar-guides/dr-jekyll-and-mr-hyde-chapter-01.json`
- `apps/web/src/features/books/grammar-guides/daddy-long-legs-blue-wednesday.json`
- `apps/web/src/features/books/grammar-guides/daddy-long-legs-letter-001.json`
- `apps/web/src/features/books/grammar-guides/daddy-long-legs-letter-002.json`
