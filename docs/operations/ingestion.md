# 수집·격리·공급 중단 운영

## 정상 기준

- 매일 06:00~06:59 KST 한 번 실행
- RSS 후보 20~30건에서 합격 10건, 제목·발췌 20단계 공개
- 발췌는 Unicode 200자 이하
- NMT와 Gemini strict gate 모두 합격
- 월 번역 문자 450,000 hard guard 이하

## 경고 확인

- `INSUFFICIENT_APPROVED_CONTENT`: 합격분만 공개하고 격리 원인을 확인한다.
- `TRANSLATION_QUOTA_GUARD`: 자동 유료 전환 없이 그 달 호출을 중단한다.
- `NMT_*`, `GEMINI_*`, `EXTERNAL_SERVICE_FAILURE`: 외부 상태와 환경별 quota를 확인한다. 로그에 본문이나 key를 추가하지 않는다.
- backup/ingestion Cron의 500 응답과 Sentry monitor missed 상태를 함께 확인한다.

## 격리 처리

1. `/admin/quarantine`에서 정규화 오류 코드와 영문 제목/최대 200자 발췌를 확인한다.
2. 한국어 제목·발췌를 수정한다.
3. 재검수를 실행한다. 앱 검증과 Gemini 다섯 기준이 하나라도 실패하면 공개되지 않는다.
4. 합격하면 새 revision과 token이 생성되고 해당 날짜의 비어 있는 ordinal에 공개된다.
5. 작업 성공/실패는 내용 대신 전후 hash로 감사 로그에 남는다.

## 신고와 철회

- 신고는 자동 비공개가 아니며 `/admin/reports`에서 원문과 비교한다.
- 해결/기각 처리 후 필요하면 revision을 철회한다.
- 철회는 영문·한국어·검수 JSON·token을 삭제하고 원문 URL, tombstone, 진도를 유지한다.
- 철회 후 `content:public`, lesson, 날짜, archive cache tag가 무효화되는지 확인한다.

## BBC 전체 중단

권리 이슈나 승인 철회 시 `/admin`의 공급원 즉시 중단을 사용한다. `content_source.enabled=false`는 새 수집과 공개 쿼리를 함께 차단하고 전체 공개 콘텐츠 cache tag를 무효화한다. 복구는 권리 담당자 승인 후에만 수행한다.
