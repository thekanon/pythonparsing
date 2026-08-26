import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { Noto_Serif_KR } from "next/font/google";

import { getLessonsForDate } from "@/server/queries/content";
import { getCachedKstToday } from "@/server/queries/current-date";

import styles from "./page.module.css";

const editorial = Noto_Serif_KR({
  variable: "--font-editorial",
  display: "swap",
  preload: false,
});

const learningSteps = [
  {
    number: "01",
    title: "영문을 먼저 읽습니다",
    description: "제목과 최대 200자의 짧은 발췌에서 문장의 뼈대를 찾습니다.",
  },
  {
    number: "02",
    title: "어절을 직접 옮깁니다",
    description: "흩어진 한국어 어절을 탭하거나 키보드로 움직여 뜻을 잇습니다.",
  },
  {
    number: "03",
    title: "순서 전체를 확인합니다",
    description: "모든 어절이 제자리를 찾았을 때만 한 문장을 완료합니다.",
  },
  {
    number: "04",
    title: "내일도 이어서 읽습니다",
    description: "로그인 없이 시작하고, 원할 때 계정에 진도를 동기화합니다.",
  },
];

const photoTokens = ["문장의", "뜻을", "읽고", "어절을", "직접", "배열해요"];
const exerciseTokens = [
  "새로운",
  "해안",
  "경보",
  "도시들이",
  "시스템을",
  "시험한다",
  "홍수",
];

export default async function HomePage() {
  const today = await getCachedKstToday();
  const lessons = await getLessonsForDate(today);
  const lessonCount = lessons.length;
  const stageCount = lessonCount * 2;
  const displayDate = today.replaceAll("-", ".");

  return (
    <div className={`${styles.home} ${editorial.variable}`}>
      <section className={`${styles.hero} site-shell`}>
        <div className={styles.issueRail}>
          <p>NewsOrder daily exercise</p>
          <time dateTime={today}>{displayDate}</time>
          <p>
            {String(lessonCount).padStart(2, "0")} news / {stageCount} sentences
          </p>
        </div>

        <div className={styles.heroLead}>
          <div className={styles.heroHeading}>
            <p className={styles.kicker}>
              <span aria-hidden="true" />
              매일 도착하는 문장 훈련
            </p>
            <h1 className={styles.heroTitle}>
              <span>뉴스를 읽기 전에,</span>
              <span className={styles.titleIndent}>문장을 먼저</span>
              <span className={styles.titleAccent}>완성하세요.</span>
            </h1>
          </div>

          <div className={styles.heroIntro}>
            <p>
              영어를 읽고 흩어진 한국어 어절을 배열합니다. 번역을 외우는 대신,
              문장의 의미와 자연스러운 어순을 손으로 익힙니다.
            </p>
            <div className={styles.heroActions}>
              <Link
                href="/today"
                className={`button button-primary ${styles.primaryAction}`}
              >
                오늘 학습 시작
                <ArrowRight aria-hidden="true" size={18} weight="bold" />
              </Link>
              <Link href="/about" className={styles.textAction}>
                운영 원칙 읽기
              </Link>
            </div>
            <p className={styles.startNote}>
              로그인 없이 시작 · 완료 기록은 이 브라우저에 저장
            </p>
          </div>
        </div>

        <figure className={styles.heroFigure}>
          <Image
            src="/images/newsorder-study-desk.png"
            alt="문장을 이루는 어절 카드와 연필, 신문 형태의 종이가 놓인 학습 책상"
            width={1448}
            height={1086}
            preload
            sizes="(max-width: 767px) calc(100vw - 2rem), 76rem"
            className={styles.heroImage}
          />
          <div className={styles.photoTokens} aria-hidden="true">
            {photoTokens.map((token) => (
              <span key={token}>{token}</span>
            ))}
          </div>
          <figcaption className={styles.heroCaption}>
            <span>Today&apos;s practice</span>
            <strong>
              {lessonCount}개의 뉴스 · {stageCount}개의 문장
            </strong>
          </figcaption>
        </figure>
      </section>

      <section className={styles.method} aria-labelledby="method-title">
        <div className="site-shell">
          <header className={styles.sectionIntro}>
            <p className={styles.sectionIndex}>01 / 읽는 방식</p>
            <h2 id="method-title" className={styles.sectionTitle}>
              눈으로만 읽지 않고,
              <span>손으로 순서를 찾습니다.</span>
            </h2>
            <p className={styles.sectionDescription}>
              네 단계면 충분합니다. 설명을 길게 읽기보다 한 문장을 끝까지
              완성하는 데 집중합니다.
            </p>
          </header>

          <div className={styles.methodBody}>
            <ol className={styles.stepList}>
              {learningSteps.map((step) => (
                <li key={step.number}>
                  <span className={styles.stepNumber}>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <figure className={styles.exerciseSheet}>
              <header className={styles.sheetHeader}>
                <span>Sentence desk</span>
                <span>Title / 01</span>
              </header>
              <div className={styles.sheetPrompt}>
                <p>English title</p>
                <blockquote lang="en">
                  Coastal towns test new flood warning systems
                </blockquote>
              </div>
              <div className={styles.sheetWork}>
                <p>어절을 순서대로 옮겨 보세요</p>
                <ul aria-label="어절 배열 학습 예시">
                  {exerciseTokens.map((token) => (
                    <li key={token}>{token}</li>
                  ))}
                </ul>
              </div>
              <figcaption>
                위치 일치율은 힌트일 뿐, 문장 전체가 맞아야 완료됩니다.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className={styles.policy} aria-labelledby="policy-title">
        <div className="site-shell">
          <header className={styles.policyHeader}>
            <p className={styles.sectionIndex}>02 / 공개 기준</p>
            <h2 id="policy-title" className={styles.sectionTitle}>
              원문은 짧게.
              <span>공개 기준은 엄격하게.</span>
            </h2>
          </header>

          <div className={styles.policyBody}>
            <article className={styles.leadStat}>
              <p className={styles.statValue}>200</p>
              <h3>자 이내의 발췌만 사용합니다.</h3>
              <p>
                기사 본문 전체는 수집하지 않습니다. 학습에 필요한 제목과 짧은
                발췌만 다룹니다.
              </p>
            </article>

            <div className={styles.policyNotes}>
              <article>
                <p className={styles.noteMeta}>10 / daily</p>
                <h3>하루 열 개 기사</h3>
                <p>한 번에 부담 없는 분량으로 매일 새로운 문장을 만납니다.</p>
              </article>
              <article>
                <p className={styles.noteMeta}>2× review</p>
                <h3>번역과 검수, 두 번의 확인</h3>
                <p>기계 번역과 Gemini 검수를 모두 통과한 문장만 공개합니다.</p>
              </article>
              <Link href="/about" className={styles.policyLink}>
                콘텐츠 정책 자세히
                <ArrowRight aria-hidden="true" size={18} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <div className={`${styles.closingInner} site-shell`}>
          <div className={styles.closingMeta}>
            <span aria-hidden="true" />
            <p>Now available</p>
            <time dateTime={today}>{displayDate}</time>
          </div>
          <div className={styles.closingBody}>
            <h2 id="closing-title">
              {lessonCount > 0 ? (
                <>
                  오늘의 뉴스 <strong>{lessonCount}개가</strong>
                  <span>이미 섞여 있습니다.</span>
                </>
              ) : (
                <>
                  다음 학습 문장을
                  <span>준비하고 있습니다.</span>
                </>
              )}
            </h2>
            <div>
              <p>
                로그인 없이 바로 시작할 수 있습니다. 첫 문장을 완성하는 데에는
                몇 분이면 충분합니다.
              </p>
              <Link
                href="/today"
                className={`button button-primary ${styles.closingAction}`}
              >
                학습 목록 열기
                <ArrowRight aria-hidden="true" size={20} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
