# 정보처리기사 실기 코치 WebGPT 진행 시행착오 기록

- 작성 시각: 2026-09-04 KST
- 대상 작업: D0 · W1 · W2 · S1 · S2 · C1 · C2
- 기준 PR: [#33 Expand exam coach weakness and vertical content](https://github.com/thekanon/pythonparsing/pull/33)
- 목적: 문서 기반 구현을 WebGPT 중심으로 진행하면서 실제로 막힌 지점과 다음 WebGPT 작업에서 반복하지 않을 절차를 남긴다.

## 1. 최종 결과

PR #33은 `master`에 squash merge됐다.

- `origin/master`: `6bcee08` (`Expand exam coach weakness and vertical content (#33)`)
- PR 최종 CI: `secret-scan` 성공, `verify` 성공
- WebGPT 작업 단위별 브랜치 커밋:
  - `f9061fa` W1 — 취약점 집계 코어
  - `7374f79` W2 — 취약점 보드 UI
  - `b8db43d` S1 — SQL 검수 콘텐츠 확장
  - `c31f678` S2 — SQL dataset/result grading/errorKinds
  - `abfe8ba` C1 — C 검수 콘텐츠 확장
  - `cbd0a32` C2-0 — 제한 C 실행 보안 ADR
  - `1df6c26` C2 — 제한 C 실행 경계

주의: 저장소 정책상 PR은 squash merge만 허용했다. 따라서 `master`에는 위 커밋들이 개별 커밋으로 남지 않고 `6bcee08` 하나로 합쳐졌다. “WebGPT 대화 1개당 1커밋” 추적은 작업 브랜치 기준으로 보존됐다.

## 2. 작업 루트와 DevSpace 등록 문제

### 발생

처음에는 로컬 원본 경로인 `/data/project/side/pythonparsing`을 WebGPT/Oracle DevSpace 루트로 쓰려 했다. Oracle은 해당 루트를 열지 못하고 다음 조건에서 실패했다.

- DevSpace `allowedRoots`에 정확한 프로젝트 루트가 등록되어 있지 않음
- parent/child/similar root 대체가 금지됨

### 조치

DevSpace에 등록된 정확한 루트인 `/home/leedo/orca/workspaces/pythonparsing/shiner`를 작업 루트로 사용했다. `/data/project/side/pythonparsing`의 D0 문서 커밋을 브랜치로 넘긴 뒤 `shiner`에서 WebGPT 작업을 이어 갔다.

### 다음 규칙

WebGPT 작업 전에 먼저 확인할 것:

1. 실제 작업 루트가 DevSpace `allowedRoots`와 **문자열 기준으로 정확히 일치**하는가.
2. 미션 파일도 같은 루트 아래에 있는가.
3. Oracle dry-run이 같은 루트를 가리키는가.
4. 실패 시 parent/child/root 우회 대신 DevSpace 등록 루트를 고친다.

## 3. WebGPT 첫 시도 실패와 재시도 기준

### 발생

C2 ADR 첫 WebGPT 실행은 workspace 자체는 열렸지만 `AGENTS.md` 읽기 단계에서 `codex.read`가 두 차례 `mcp_network_error: Connection failed`로 실패했다. WebGPT는 적용 지침을 읽지 못했으므로 미션을 실행하지 않고 `TASK_OUTCOME: BLOCKED`로 종료했다.

### 조치

같은 미션을 그대로 재시도했다. 두 번째 실행은 정상적으로 `AGENTS.md`와 미션을 읽고 ADR 문서만 작성했다.

### 다음 규칙

- 지침 파일을 읽지 못한 WebGPT 결과는 구현 결과로 취급하지 않는다.
- 실패 원인이 일시적인 DevSpace/MCP 네트워크 오류이고 미션이 전혀 실행되지 않았으면, 같은 미션 bytes로 한 번 재시도한다.
- 실패한 대화는 커밋 단위로 세지 않는다. 성공한 WebGPT 실행만 “대화 1개당 1커밋” 대상으로 삼는다.

## 4. CI `pnpm audit` 일시 장애

### 발생

PR #33 최초 CI와 1차 재실행은 `verify` job의 `pnpm audit --prod --audit-level high`에서 멈췄다.

관찰된 실패:

- npm registry bulk advisories 요청 timeout
- 한 번은 HTTP 503 포함
- formatting/lint/typecheck/test/build 단계까지 도달하지 못함

### 조치

로컬에서 같은 명령을 실행해 `No known vulnerabilities found`를 확인했다. 이후 새 커밋이 올라간 PR CI에서는 같은 audit 단계가 통과했다.

### 다음 규칙

- CI audit 실패가 registry timeout/503이면 코드 실패로 단정하지 않는다.
- 로컬 audit로 현재 lockfile 상태를 확인한다.
- PR CI를 재실행하거나 다음 커밋 후 재확인한다.
- 최종 보고에는 “처음 실패했지만 registry 장애였고 최종 CI는 통과”처럼 원인과 최종 상태를 분리해서 적는다.

## 5. dev server 실행 명령 차이

### 발생

`apps/web`에서 `pnpm dev -- --port 3013`을 사용했을 때 Next가 `--port`를 프로젝트 디렉터리 인수처럼 해석했다.

### 조치

다음 명령으로 고정했다.

```bash
pnpm exec next dev --port 3013
```

C2 smoke는 같은 방식으로 다른 포트(`3015`)를 사용했다.

### 다음 규칙

Next dev server smoke는 `pnpm dev -- --port` 대신 `pnpm exec next dev --port <port>`를 사용한다.

## 6. dev server가 `next-env.d.ts`를 변경함

### 발생

브라우저 smoke를 위해 Next dev server를 켜면 `apps/web/next-env.d.ts`가 자동 갱신됐다. 이 파일 변경은 기능 변경이 아니며 커밋에 포함하면 잡음이 된다.

### 조치

각 smoke 이후 dev server를 중지하고 아래 파일을 되돌렸다.

```bash
git checkout -- apps/web/next-env.d.ts
```

### 다음 규칙

- dev server smoke 뒤에는 항상 `git status --short`를 확인한다.
- `next-env.d.ts`만 자동 변경됐으면 커밋 전에 되돌린다.

## 7. Next Cache Components와 Route Segment `runtime` 충돌

### 발생

C2 구현에서 `/api/exam-coach/c/run` route handler에 `export const runtime = "nodejs";`를 넣었다. `pnpm build`에서 Next 16 Cache Components 설정과 충돌했다.

실패 요지:

```text
Route segment config "runtime" is not compatible with `nextConfig.cacheComponents`. Please remove it.
```

### 조치

`export const runtime = "nodejs";`를 제거했다. route는 `@/features/exam-coach/server/c-execution`을 import하고, 해당 서버 모듈은 `server-only`를 import하므로 클라이언트 번들 경계에는 들어가지 않는다.

### 다음 규칙

- 이 프로젝트에서 Route Handler에 `runtime` segment config를 추가하기 전에 Cache Components 호환성을 확인한다.
- Node 전용 서버 코드는 `server-only`와 서버 경로 분리로 경계를 잡고, 빌드로 검증한다.

## 8. Prettier는 작은 수동 수정 뒤에도 다시 돌린다

### 발생

C2 route의 `runtime` 줄을 제거한 뒤 빈 줄 정리가 맞지 않아 `pnpm format:check`가 실패했다.

### 조치

해당 파일만 Prettier로 정리했다.

```bash
pnpm exec prettier --write apps/web/src/app/api/exam-coach/c/run/route.ts
```

### 다음 규칙

WebGPT가 검증을 통과했다고 보고했더라도, 로컬에서 한 줄이라도 수정하면 다시 `format:check`와 `git diff --check`를 실행한다.

## 9. C2는 실제 성공 실행보다 안전한 미가용 경로가 먼저 중요했다

### 발생

로컬 smoke 환경에는 Vercel Sandbox 인증·C toolchain image가 공개 실행용으로 준비되어 있지 않았다. C2 route는 실제 성공 실행 대신 `sandbox-unavailable`을 반환했다.

### 조치

이 상태를 실패로 숨기지 않았다. UI에서 첫 제출 이후에만 C 실행 패널을 열고, 샌드박스 미가용을 “샌드박스 사용 불가”로 표시했다. 기존 설명·회상·교정 흐름은 계속 가능했다.

브라우저 smoke에서 확인한 것:

- 첫 제출 전 C 실행 버튼과 출력이 없음
- 첫 제출 후 C 실행 패널이 나타남
- 샌드박스 미가용 fallback이 표시됨
- `Good` 저장 뒤 `localStorage`에 C source/output marker가 남지 않음

### 다음 규칙

- 샌드박스 자원이 없을 때 fake success를 만들지 않는다.
- 로컬 검증은 “성공 실행”과 “미가용 fallback”을 분리한다.
- 운영 성공 실행 검증은 Vercel OIDC/token, project ID, C toolchain image가 준비된 뒤 별도 smoke로 수행한다.

## 10. 보안 ADR 승인 없이는 C2를 시작하지 않는다

### 발생

가이드는 C2에 대해 “ADR 승인 전 실행기 코드 병합 금지”를 명시했다. 사용자가 “나머지 작업 진행”을 요청했더라도, 이는 보안 승인으로 해석할 수 없었다.

### 조치

먼저 WebGPT로 `docs/adr/0004-restricted-code-execution-boundary.md`를 작성하고 `Proposed` 상태로 커밋했다. 이후 사용자에게 명시 승인 질문을 했고, 사용자가 “ADR 승인 후 C2 구현”을 선택한 뒤 ADR을 `accepted`로 바꾸고 C2 구현을 시작했다.

### 다음 규칙

- 문서가 명시 승인을 요구하면 일반적인 “계속 진행”은 충분하지 않다.
- 승인 전에는 구현 미션을 만들지 않는다.
- 승인 커밋과 구현 커밋은 분리한다.

## 11. WebGPT 결과는 그대로 신뢰하지 않고 로컬 게이트로 닫는다

### 발생

WebGPT는 각 작업에서 자체 검증 결과를 보고했지만, 실제 최종 품질은 로컬 controller가 다시 확인해야 했다. 실제로 C2에서는 WebGPT 이후 로컬 `pnpm build`가 `runtime` segment config 문제를 잡았다.

### 조치

각 WebGPT 구현 후 로컬에서 다음 중 필요한 게이트를 실행했다.

- focused Vitest
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- `pnpm build`
- 브라우저 smoke
- PR CI

### 다음 규칙

WebGPT는 구현 작성자다. 완료 판정자는 로컬 검증과 PR CI다.

## 12. 다음 WebGPT 작업 절차 체크리스트

1. 작업 문서에서 선행 조건과 금지 조건을 먼저 읽는다.
2. DevSpace 등록 루트와 실제 git 작업 루트를 일치시킨다.
3. 미션 파일은 작업 루트 아래 `.codex-tmp/oracle-missions/`에 둔다.
4. Oracle dry-run으로 mode, root, mission SHA, action authority를 확인한다.
5. 성공한 WebGPT 실행 하나가 끝나면 로컬에서 diff를 검토한다.
6. WebGPT가 보고한 검증을 그대로 믿지 않고 로컬 focused gate를 실행한다.
7. UI 변경은 실제 dev server와 browser smoke로 확인한다.
8. dev server 종료 후 `next-env.d.ts` 자동 변경을 되돌린다.
9. 한 WebGPT 대화 결과를 한 커밋으로 묶는다.
10. PR CI가 registry/network 오류로 실패하면 원인을 분리해 재실행한다.
11. 저장소 merge 정책을 먼저 확인한다. 이 저장소는 rebase/merge commit이 막혀 있고 squash merge만 통과했다.
12. `master`에 남는 커밋 구조와 작업 브랜치의 추적 커밋 구조가 다를 수 있음을 보고에 명시한다.
