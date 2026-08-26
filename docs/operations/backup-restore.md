# 사용자 데이터 백업과 복원 훈련

## 백업

매일 21:30 UTC Cron이 repeatable-read transaction에서 사용자·역할, OAuth provider/account 연결 메타데이터, 단계 진도, 삭제 이벤트를 export한다. OAuth token, session, 인증 token, 콘텐츠, 분석 집계는 제외한다.

`BACKUP_ENCRYPTION_KEY`는 base64 인코딩된 임의 32바이트 값이다. Blob token과 분리된 Vercel secret 및 외부 비밀번호 관리자에 복구 사본을 보관한다.

```bash
openssl rand -base64 32
```

암호화 envelope는 AES-256-GCM, 12바이트 IV, authentication tag를 사용한다. manifest는 schema/migration 버전, 테이블별 row count, payload checksum을 포함한다. Private Blob은 30일을 초과하면 삭제한다.

## 복원 준비

1. Production을 변경하지 말고 빈 임시 Neon branch를 만든다.
2. 복원할 private Blob을 접근 제한 환경으로 내려받고 파일 권한을 제한한다.
3. 백업 생성 이후의 `deletion_event`를 신뢰 가능한 DB/사고 ledger에서 JSON으로 export한다. JSON 각 행은 `userIdHmac`, `requestedAt`, `expiresAt`만 포함한다.
4. 별도 채널에서 정확한 `BACKUP_ENCRYPTION_KEY`와 `DELETION_EVENT_HMAC_KEY`를 준비한다.
5. 대상 URL이 임시 branch인지 두 명이 확인한다.

supplemental 삭제 ledger 예시 쿼리의 시작 시각은 복원할 payload의 `createdAt`으로 바꾼다.

```sql
select coalesce(json_agg(json_build_object(
  'userIdHmac', user_id_hmac,
  'requestedAt', requested_at,
  'expiresAt', expires_at
)), '[]'::json)
from deletion_event
where requested_at > timestamptz 'BACKUP_CREATED_AT';
```

## 빈 branch 복원

```bash
DATABASE_URL='TEMPORARY_BRANCH_URL' pnpm db:migrate

DATABASE_URL_TARGET='TEMPORARY_BRANCH_URL' \
BACKUP_ENCRYPTION_KEY='BASE64_KEY_FROM_SECRET_STORE' \
DELETION_EVENT_HMAC_KEY='HMAC_KEY_FROM_SECRET_STORE' \
pnpm restore -- --file /restricted/path/backup.json.enc \
  --deletions-file /restricted/path/deletion-events.json
```

CLI는 다음을 transaction 안에서 확인한다.

- 대상 user table이 비어 있음
- envelope 인증, payload checksum, manifest row count
- timestamp를 DB `Date` 값으로 재수화
- 네 테이블 insert 후 실제 row count
- 백업 내부와 supplemental 삭제 HMAC을 사용한 탈퇴 계정 재삭제
- session 미복원

## 훈련 합격 기준

- CLI checksum과 supplemental 삭제 수를 기록한다.
- 사용자/계정/진도 표본과 관리자 역할을 확인한다.
- 삭제 이벤트 대상 사용자가 존재하지 않음을 확인한다.
- 로그인은 새 session으로 다시 해야 함을 확인한다.
- 임시 branch와 내려받은 백업 파일을 승인된 방식으로 폐기한다.
- 공개 전 1회, 공개 후 월 1회 수행 일시·담당자·결과를 기록한다.
