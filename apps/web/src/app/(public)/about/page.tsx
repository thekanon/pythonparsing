import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 안내",
  description:
    "Sentence의 BBC·Reddit·퍼블릭 도메인 콘텐츠 범위와 비상업 운영 원칙을 안내합니다.",
};

export default function AboutPage() {
  return (
    <div className="page-shell">
      <h1 className="page-title">서비스와 콘텐츠 운영 원칙</h1>
      <p className="lede mt-5">
        Sentence는 영어 뉴스와 공개 토픽, 고전 소설을 짧게 읽고 자연스러운
        한국어 어순을 연습하는 비상업 교육 서비스입니다.
      </p>

      <article className="prose-policy mt-12">
        <h2>BBC 콘텐츠 사용 범위</h2>
        <p>
          BBC의 헤드라인과 기사당 최대 200자 발췌만 사용합니다. 기사 본문 전체를
          수집하거나 표시하지 않으며, 모든 학습 콘텐츠에서 BBC 원문으로 연결되는
          출처 링크를 제공합니다.
        </p>
        <p>
          이 서비스는 BBC의 공식 서비스 또는 제휴 서비스가 아닙니다. BBC
          콘텐츠가 사용되는 동안 광고, 후원, 구독, 유료 기능을 포함한 모든
          수익화를 하지 않습니다.
        </p>

        <h2>번역과 Gemini 검수</h2>
        <p>
          영어 제목과 최대 200자 발췌는 Google Cloud Translation NMT로 한국어
          번역을 생성합니다. 이어서 Google Gemini API 무료 티어의{" "}
          <code>gemini-3.7-flash</code>를 사용해 의미 보존, 완전성, 환각 여부,
          자연스러운 한국어, 학습 안전성을 검수합니다.
        </p>
        <ul>
          <li>Gemini에 전달되는 기사 발췌는 기사당 최대 200자입니다.</li>
          <li>기사 본문 전체는 수집하거나 Gemini에 전달하지 않습니다.</li>
          <li>
            무료 티어 입력 데이터는 Google 제품 개선에 사용될 수 있습니다.
          </li>
          <li>
            번역은 기계 번역과 AI 검수를 거치며 인간 감수를 보장하지 않습니다.
          </li>
        </ul>

        <h2>퍼블릭 도메인 고전 소설</h2>
        <p>
          저작권 보호기간이 만료된 오래된 영어 원문에서 짧은 구절을 골라 학습
          자료로 제공합니다. 현재는 Jean Webster의 <i>Daddy-Long-Legs</i>와 L.
          Frank Baum의 <i>The Wonderful Wizard of Oz</i>를 제공합니다.
        </p>
        <p>
          영어 원문의 확인 경로로 Project Gutenberg 링크를 표시합니다. 한국어
          문장은 Sentence가 원문에서 새로 번역했으며 현대 번역본, 해설, 삽화는
          복제하지 않습니다.
        </p>

        <h2>검수 실패와 철회</h2>
        <p>
          다섯 가지 Gemini 검수 항목과 애플리케이션 검증을 모두 통과한 콘텐츠만
          공개합니다. 실패한 항목은 격리되며 관리자가 수정한 뒤에도 다시 같은
          검수를 통과해야 합니다.
        </p>
        <p>
          BBC 사용 승인이 철회되거나 특정 기사를 내려야 할 때는 공급자 전체를
          즉시 비활성화하거나 해당 기사 원문 발췌, 번역, 토큰을 삭제합니다. 출처
          URL과 철회 기록, 기존 사용자의 진도만 남깁니다.
        </p>

        <h2>번역 신고</h2>
        <p>
          로그인 사용자는 정해진 유형으로 번역 문제를 신고할 수 있습니다. 신고가
          콘텐츠를 자동으로 비공개 처리하지 않으며, 공개 베타에는 정해진 처리
          시간이 없습니다.
        </p>
      </article>

      <div className="mt-12 border-t border-[var(--line)] pt-8">
        <Link href="/today" className="button button-primary">
          오늘 학습 시작
        </Link>
      </div>
    </div>
  );
}
