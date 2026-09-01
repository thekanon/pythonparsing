# Reddit 커뮤니티 주요 토픽 자동 수집

## 동작 범위

- Reddit 지원팀이 OAuth 앱 생성을 일시 중단한 동안 예외적으로 허용한 파싱
  방식으로 공개 RSS를 읽는다.
- 대상은 `Frontend`, `SideProject`, `ChatGPT`, `ObsidianMD` 네 커뮤니티로
  코드에서 고정한다.
- 커뮤니티별 당일 인기 게시물 최대 10개, 전체 최대 18,000자만 설정된 요약 모델에
  전달한다.
- 게시물은 신뢰할 수 없는 입력으로 처리하며 사용자명을 제거한 뒤 모델에
  전달한다.
- 게시물 원문과 사용자명은 DB에 저장하지 않는다. 한국어 토픽 라벨과 요약,
  AI가 새로 작성한 B1-B2 영문 제목과 정확한 제목 번역, 영문 지문과 번역,
  핵심 표현, 단어 뜻, 근거 게시물 수만 저장하고 실행 기록은 30일 뒤 삭제한다.
- 공개 `/reddit`와 `/reddit/{topicId}`에서는 저장된 학습 자료만 읽는다. 페이지
  조회가 Reddit 요청을 추가로 발생시키지 않으며 검색 노출은 `noindex`로 막는다.

## 로컬 저장소와 서버

로컬 운영 서버는 루프백에만 바인딩된 PostgreSQL을 사용한다.

```bash
docker compose -f compose.local.yml up -d
DATABASE_URL=postgresql://newsorder@127.0.0.1:55432/newsorder pnpm db:migrate
```

웹은 PM2의 `newsorder-local-web` 프로세스로 `127.0.0.1:3300`에서 실행하며,
Cloudflare Tunnel이 `newsorder.doowiki.dev`만 이 포트로 전달한다. PostgreSQL
포트는 Tunnel에 등록하지 않는다.

로컬 기본 요약기는 Claude CLI이며 Claude가 사용량 제한을 반환한 경우에만 Codex
CLI의 `gpt-5.6-terra`로 전환한다. 두 CLI는 사용자의 저장된 로컬 로그인을
재사용한다. Reddit 원문은 stdin으로만 전달하고 두 CLI의 세션 저장을 끈다.
Claude는 도구를 전부 비활성화하고, Codex는 빈 임시 작업공간의 읽기 전용
sandbox에서 실행한다. Codex에는 앱의 DB 및 Cron 환경변수를 전달하지 않는다.

필수 값은 다음과 같다.

```text
REDDIT_USER_AGENT=NewsOrder/0.1 personal-study topic collector (https://newsorder.doowiki.dev)
REDDIT_SCRAPER_URL=http://127.0.0.1:3400/api
REDDIT_SUMMARIZER_PROVIDER=claude-then-codex
REDDIT_CLAUDE_MODEL=sonnet
REDDIT_CODEX_MODEL=gpt-5.6-terra
REDDIT_TOPICS_ENABLED=true
```

`DATABASE_URL`, `CRON_SECRET`도 로컬 프로세스에 설정되어 있어야 한다. 전체 앱은
fixture 모드를 유지하면서 Reddit 토픽 수집만 활성화할 수 있다. DB에는
`0006_many_fenris.sql`까지의 migration을 운영 시작 전에 적용한다.

로컬 systemd 사용자 타이머는 KST 기준 07:10부터 한 시간 간격으로 네 작업을
실행한다. 5분 이내의 임의 지연을 추가하며, 부팅 중 놓친 작업을 한꺼번에
재실행하지 않는다.

## 운영 확인

1. `/api/cron/reddit-topics/{community}`를 올바른 Cron Bearer token으로 실행한다.
2. 응답의 `status`가 `succeeded`인지 확인한다.
3. `/admin/reddit-topics`에서 게시물 수, 분석 수, 토픽 수와 원문 링크를 확인한다.
4. `/reddit`에서 카드가 학습 화면으로 이동하고 지문 단어 뜻이 열리는지 확인한다.
5. `failed`이면 Sentry의 `REDDIT_TOPIC_COLLECTION_FAILED` 이벤트와 실행 기록의
   `errorCode`를 확인한다.

## 요청 제한과 정책

- Reddit 비로그인 RSS의 응답 제한을 지키기 위해 네 작업을 서로 다른 UTC
  시간대에 하루 한 번씩 실행한다. 커뮤니티당 Reddit 요청은 정확히 1회다.
- Reddit 지원팀의 별도 승인에 따라 로컬 서버에서 Scrapling의 브라우저 기반
  StealthyFetcher로 공개 목록을 읽는다. 프록시와 CAPTCHA 우회는 사용하지 않고,
  Scrapling 재시도 값은 1(총 1회 시도)로 고정한다.
- Claude와 Codex CLI의 세션 저장을 끈다. Gemini를 선택한 경우 요청은
  `store: false`로 전송한다.
- 수집 대상은 코드의 Reddit 커뮤니티 allowlist로 제한하며 임의 URL 입력을 받지
  않는다.
- OAuth가 다시 제공되거나 Reddit의 허용 조건이 변경되면 파싱을 중단하고 공식
  API 방식으로 전환한다.
- Reddit 지원팀의 허용 이메일과 티켓 번호는 운영 기록에 보관한다.
