# 노출 자격증명 및 Git 이력 정리 runbook

이 작업은 원격 branch/tag를 강제 갱신하고 모든 기존 clone을 무효화한다. 담당자, 저장소 관리자, maintenance 시간을 확정하기 전에는 실행하지 않는다. 현재 작업 트리 삭제만으로 과거 커밋의 노출은 해결되지 않는다.

## 확인된 추적 경로

- `DuouOLingo/my-app/src/api/trans/key.json`
- `DuouOLingo/my-app/src/firebase/bbcnews-ee071-firebase-adminsdk-7nueo-6eb0f7aa53.json`
- `DuouOLingo/my-app/src/server.js` — 과거 Papago/Naver client ID와 secret 문자열 포함

현재 작업 트리의 `server.js`는 Naver 자격증명을 환경변수로만 읽고 Firebase Admin에는 Application Default Credentials를 사용한다. 그러나 과거 커밋에 남은 문자열은 공급자 폐기와 전체 이력 재작성 전까지 노출된 것으로 취급한다.

## 1. 공급자에서 먼저 폐기

1. Firebase Admin/Google Cloud 서비스 계정, 기존 번역 API key, Naver Papago client ID/secret을 목록화한다.
2. Google Cloud/Firebase와 Naver Cloud 콘솔에서 노출된 자격증명을 모두 폐기한다.
3. 기존 자격증명 각각으로 인증이 실패하는지 별도 안전한 환경에서 확인한다.
4. 관련 OAuth, MongoDB, 배포 환경 secret도 동일 시기 노출 여부를 확인하고 필요 시 회전한다.
5. 새 장기 서비스 계정 JSON은 만들지 않는다. Translation은 Vercel OIDC와 GCP WIF를 사용한다.

폐기 완료 전에 이력 재작성을 시작하면 유효한 key가 다른 clone에 남을 수 있다.

## 2. 실행 전 read-only 확인

```bash
git remote -v
git branch --all
git tag --list
git log --all --name-only -- DuouOLingo/my-app/src/api/trans/key.json
git log --all --name-only -- DuouOLingo/my-app/src/firebase/bbcnews-ee071-firebase-adminsdk-7nueo-6eb0f7aa53.json
git log --all --name-only -- DuouOLingo/my-app/src/server.js
```

명령을 복사하기 전에 경로와 대상 저장소를 다시 확인한다.

## 3. 격리 mirror와 이력 재작성

1. 접근 제한·암호화된 임시 저장소에 `git clone --mirror`로 보존본을 만든다.
2. 작업용 fresh mirror를 별도로 만든다.
3. 최신 `git-filter-repo`의 서명/출처를 확인해 설치한다.
4. 작업용 mirror에서 정확한 두 경로를 `--invert-paths`로 모든 ref에서 제거한다.
5. 실제 secret 문자열이 다른 파일에 복제됐는지 검사하고, 발견 시 보안 저장소에서 자동 생성한 replacement expressions 파일로 추가 정리한다. secret 원문을 shell history, 명령 인수, 문서에 직접 입력하지 않는다.
6. 모든 branch/tag에서 Gitleaks 전체 이력 검사를 실행한다.
7. 두 파일의 `git log --all --name-only` 결과가 비어 있는지 확인한다.

예시 형태이며 실제 mirror 경로와 원격은 담당자가 검증한 뒤 사용한다.

```bash
git filter-repo --invert-paths \
  --path DuouOLingo/my-app/src/api/trans/key.json \
  --path DuouOLingo/my-app/src/firebase/bbcnews-ee071-firebase-adminsdk-7nueo-6eb0f7aa53.json
```

## 4. 원격 전환

1. branch 보호를 maintenance 동안 계획된 방식으로 조정한다.
2. 저장소 쓰기를 일시 중단한다.
3. 검증된 mirror의 branch와 tag를 원격에 강제 갱신한다.
4. branch 보호와 required checks를 복원한다.
5. 기존 clone, fork, 캐시, 열려 있는 PR을 폐기하고 fresh clone을 요구한다.
6. 호스팅 제공자의 secret scanning 결과와 폐기 key 인증 실패를 다시 확인한다.
7. 암호화 mirror는 정해진 사고 보존 정책에 따라 접근 제한 보관 또는 안전하게 폐기한다.

## 완료 증거

- 공급자별 key ID, 폐기 시각, 확인 담당자
- 폐기 key 인증 실패 결과
- 재작성 전 mirror checksum/위치
- 갱신한 branch/tag 목록
- 전체 이력 Gitleaks 결과
- fresh clone에서 현재 트리와 전체 이력 재검사 결과
