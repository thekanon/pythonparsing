# 공개 베타 출시 체크리스트

## 자동 검증

- [ ] Node `24.19.0`, pnpm `11.24.0`, Next `16.3.3` exact pin
- [ ] frozen lockfile install
- [ ] format, ESLint, TypeScript, Vitest
- [ ] Drizzle check, 빈 PostgreSQL migration, DB constraint tests
- [ ] production build
- [ ] Playwright 핵심 익명 학습과 axe serious/critical 0
- [ ] 현재 tree Gitleaks 0
- [ ] 알려진 Critical/High 취약점 0

## 보안·권리

- [ ] 추적됐던 Firebase/번역 key 공급자 폐기 및 인증 실패 확인
- [ ] 조율된 Git 이력 재작성 후 모든 branch/tag Gitleaks 0
- [ ] 기존 clone/PR 폐기 및 fresh clone 완료
- [ ] BBC 승인 원본 외부 제한 저장, 개인정보 제거 요약만 저장소에 유지
- [ ] 비상업·비제휴·원문 링크·200자 조건 표본 검사
- [ ] Gemini 무료 티어 및 데이터 제품 개선 가능성 고지 확인

## 기능·운영

- [ ] 실제 Google 로그인, 익명 진도 병합, 계정 삭제
- [ ] 관리자 DB 역할, 자기/마지막 관리자 강등 차단
- [ ] 격리 수정·재검수, 신고 처리, 개별 철회, 전체 source kill switch
- [ ] 7일 연속 합격 기사 10건과 20단계
- [ ] 월 450,000자 hard guard
- [ ] Sentry replay 없음과 PII/content scrub 표본 확인
- [ ] 수집 부족·격리 급증·백업 실패·Cron missed 알림 시험
- [ ] Vercel/Neon/Sentry/Gemini/Translation 무료 한도 기록

## 복원·성능·접근성

- [ ] Private Blob AES-GCM 백업의 빈 Neon branch 실제 복원
- [ ] 백업 이후 deletion event 재적용과 session 미복원 확인
- [ ] 모바일 320px 및 200% 확대
- [ ] 탭, 키보드, 포인터, 터치로 두 단계 완료
- [ ] reduced motion, focus 순서, screen reader 안내
- [ ] 모바일 Lighthouse와 bundle budget 통과
- [ ] 출시 후 Speed Insights p75 LCP ≤ 2.5초, INP ≤ 200ms, CLS ≤ 0.1 관찰 계획

## 전환 후

- [ ] 7일 rollback deployment와 기존 서비스 유지
- [ ] 7일간 P0/P1 0
- [ ] `legacy-final` tag
- [ ] 레거시 CRA/Express, 추적된 루트 `node_modules`, 중복 lockfile 제거 별도 PR
