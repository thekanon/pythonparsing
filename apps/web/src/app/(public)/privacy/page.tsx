import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리 안내",
  description:
    "Sentence가 수집하고 보존하거나 저장하지 않는 데이터를 설명합니다.",
};

export default function PrivacyPage() {
  return (
    <div className="page-shell">
      <h1 className="page-title">개인정보 처리 안내</h1>
      <p className="lede mt-5">최종 업데이트: 2026년 8월 26일</p>

      <article className="prose-policy mt-12">
        <h2>익명 학습</h2>
        <p>
          로그인하지 않아도 학습할 수 있습니다. 이때 레슨 ID, 단계별 완료 여부,
          시도 수, 최고 위치 일치 점수, 도움 사용 여부, 최근 학습 시각을 버전이
          지정된 브라우저 저장소에 보관합니다.
        </p>
        <p>
          기사 내용과 사용자가 배열한 전체 어절 ID 순서는 브라우저 저장소에
          보관하지 않습니다.
        </p>

        <h2>Google 로그인</h2>
        <p>
          기기 간 진도 동기화를 선택하면 Google OAuth를 사용합니다. 이름, 이메일
          주소, 프로필 이미지, OAuth 계정 연결, 서버 진도를 Neon PostgreSQL에
          저장합니다. 이메일과 비밀번호 로그인은 제공하지 않습니다.
        </p>
        <p>
          로그인 시 익명 진도와 서버 진도는 완료 합집합, 최고점 최댓값, 제한된
          시도 수 합산, 최신 활동 시각, 도움 사용 합집합 규칙으로 한 번만
          병합됩니다.
        </p>

        <h2>학습 분석과 오류 기록</h2>
        <p>
          학습 행동은 날짜, 이벤트 이름, 익명 또는 로그인 구분의 일별 합계로만
          저장합니다. 사용자 ID, IP 주소, 어절 순서, 기사 텍스트는 분석 테이블에
          저장하지 않습니다.
        </p>
        <p>
          Vercel Web Analytics와 Speed Insights로 페이지 방문과 성능을
          확인합니다. Sentry Session Replay는 사용하지 않으며 사용자 이메일,
          요청 본문, 기사나 번역 전문, 어절 배치 순서를 오류 이벤트에 보내지
          않습니다.
        </p>

        <h2>번역 신고</h2>
        <p>
          로그인 사용자는 부정확함, 부자연스러움, 누락, 학습 부적합 중 하나를
          선택해 신고할 수 있습니다. 자유 입력은 받지 않습니다. 신고자 계정이
          삭제되면 신고 기록에서 식별자를 제거합니다.
        </p>

        <h2>보존과 암호화 백업</h2>
        <p>
          계정과 진도는 사용자가 계정을 삭제할 때까지 보관합니다. 사용자, Google
          OAuth 연결, 진도, 삭제 이벤트는 매일 AES-256-GCM으로 암호화해 Private
          Vercel Blob에 논리 백업하며 30일 뒤 삭제합니다.
        </p>
        <p>
          관리자 감사 로그는 본문 대신 변경 전후 해시를 저장하고 1년 동안
          보관합니다. BBC 콘텐츠와 번역, 세션, 분석 합계는 사용자 데이터 백업에
          포함하지 않습니다.
        </p>

        <h2>계정 삭제</h2>
        <p>
          설정에서 계정을 직접 삭제할 수 있습니다. 운영 데이터베이스의 세션,
          진도, OAuth 연결, 사용자 계정은 즉시 삭제됩니다. 기존 암호화
          백업에서는 최대 30일 뒤 사라지며, 35일간 보관하는 HMAC 삭제 이벤트를
          이용해 복원 과정에서도 탈퇴 계정을 다시 삭제합니다.
        </p>

        <h2>문의와 변경</h2>
        <p>
          공개 베타 연락처는 배포 전에 운영자가 추가해야 합니다. 콘텐츠 공급자,
          보존 기간, 인증 또는 분석 방식이 바뀌면 이 안내의 날짜와 내용을
          갱신합니다.
        </p>
      </article>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-[var(--line)] pt-8">
        <Link href="/settings" className="button button-primary">
          데이터 설정
        </Link>
        <Link href="/about" className="button button-secondary">
          콘텐츠 정책
        </Link>
      </div>
    </div>
  );
}
