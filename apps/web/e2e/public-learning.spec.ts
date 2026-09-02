import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("public home and today pages have no serious or critical axe violations", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/today",
    "/reddit",
    "/books",
    "/exam-coach/curriculum",
    "/exam-coach/report",
  ]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  }
});

// prettier-ignore
test("an exam coach guest completes baseline and followup diagnostics", async ({
  page,
}) => {
  await page.goto("/exam-coach");
  await expect(
    page.getByRole("heading", { name: "정보처리기사 실기 합격 코치" }),
  ).toBeVisible();

  await page.getByLabel("시험 예정일").fill("2026-12-20");
  await page.getByLabel("하루 학습 가능 시간(분)").fill("60");
  await page.getByRole("button", { name: "설정 저장" }).click();
  await expect(
    page.getByText("현재 설정: 2026-12-20까지 하루 60분"),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);

  await page.getByRole("button", { name: "기준선 진단 시작" }).click();
  for (const answer of [
    "SELECT name FROM employees WHERE dept = '개발';",
    "SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id;",
    "SELECT users.name, tickets.title FROM users JOIN tickets ON users.id = tickets.user_id;",
    "5",
    "16",
    "10",
  ]) {
    await page.getByLabel("답안").fill(answer);
    await page
      .getByRole("button", { name: /답안 제출 후 다음|진단 완료/u })
      .click();
  }

  await expect(page.getByText("6 / 6")).toBeVisible();
  const stored = await page.evaluate(() => ({
    events: localStorage.getItem("exam-coach:v1:learning-events"),
    runs: localStorage.getItem("exam-coach:v1:diagnostic-runs"),
  }));
  const persisted = `${stored.events}\n${stored.runs}`;
  expect(persisted).not.toContain(
    "SELECT name FROM employees WHERE dept = '개발';",
  );
  expect(persisted).not.toContain('"answer"');
  expect(persisted).not.toContain('"explanation"');
  expect(persisted).not.toContain('"prompt"');

  await page
    .getByRole("link", { name: "종료 동형 진단과 비교 보기" })
    .click();
  await expect(
    page.getByRole("heading", { name: "기준선과 종료 진단 비교" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "종료 동형 진단 시작" }).click();

  for (const answer of [
    "SELECT name FROM members WHERE team = 'QA';",
    "SELECT product_id, SUM(quantity) AS total FROM sales GROUP BY product_id;",
    "SELECT authors.name, books.title FROM authors JOIN books ON authors.id = books.author_id;",
    "10",
    "20",
    "7",
  ]) {
    await page.getByLabel("답안").fill(answer);
    await page
      .getByRole("button", { name: /답안 제출 후 다음|종료 진단 완료/u })
      .click();
  }

  await expect(
    page.getByRole("heading", { name: "실제 측정 변화" }),
  ).toBeVisible();
  await expect(page.getByText("0%p")).toBeVisible();
  await expect(page.getByText("정답 유지")).toHaveCount(6);

  const followupAccessibility = await new AxeBuilder({ page }).analyze();
  expect(
    followupAccessibility.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);

  const followupStored = await page.evaluate(() => ({
    events: localStorage.getItem("exam-coach:v1:learning-events"),
    runs: localStorage.getItem("exam-coach:v1:diagnostic-runs"),
  }));
  const followupPersisted = `${followupStored.events}\n${followupStored.runs}`;
  expect(followupPersisted).not.toContain(
    "SELECT name FROM members WHERE team = 'QA';",
  );
});

test("a public-domain book card opens a word-order lesson", async ({
  page,
}) => {
  await page.goto("/books");
  await expect(
    page.getByRole("heading", { name: "가벼운 고전 소설로 영어 공부" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "작품 읽기" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Daddy-Long-Legs" }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /1번 A Perfectly Awful Day 영어 학습 시작/u })
    .click();
  await expect(page).toHaveURL(
    /\/books\/daddy-long-legs\/daddy-long-legs-opening-01$/u,
  );
  await expect(page.getByText("본문", { exact: true })).toBeVisible();
  await expect(page.getByText("한국어 번역 보기")).toBeVisible();
  await expect(page.getByRole("heading", { name: "핵심 표현" })).toBeVisible();

  await page
    .getByRole("article")
    .getByRole("button", { name: "Perfectly 뜻 보기" })
    .dblclick();
  await expect(page.getByText("완전히, 정말", { exact: true })).toBeVisible();
});

test("a public-domain book can be read from the opening to the final section", async ({
  page,
}) => {
  await page.goto("/books/daddy-long-legs");
  await page.getByRole("link", { name: "처음부터 읽기" }).first().click();

  await expect(page).toHaveURL(
    /\/books\/daddy-long-legs\/read\/blue-wednesday$/u,
  );
  await expect(
    page.getByRole("heading", { name: "Blue Wednesday" }),
  ).toBeVisible();
  await expect(page.getByText("1/89 · 약 2,106단어")).toBeVisible();
  await expect(page.locator(".book-reader-copy p").first()).toContainText(
    "The first Wednesday in every month",
  );

  const stored = await page.evaluate(() =>
    localStorage.getItem("newsorder.book-reading.v1"),
  );
  expect(stored).toContain('"sectionSlug":"blue-wednesday"');

  await page.getByRole("link", { name: "다음 구획" }).click();
  await expect(page).toHaveURL(/\/read\/letter-001$/u);
  await expect(page.getByText("2/89", { exact: false })).toBeVisible();
});

test("book structure practice keeps the sentence, candidates, and slots together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/books/daddy-long-legs/practice/blue-wednesday");

  const sentence = page.locator("#lesson-stage-title");
  const candidates = page.getByRole("group", {
    name: "먼저 고를 영어 어구",
  });
  const slots = page.getByRole("list", { name: "문장 성분 자리" });
  await expect(sentence).toBeVisible();
  await expect(candidates).toBeVisible();
  await expect(slots).toBeVisible();

  const sentenceBox = await sentence.boundingBox();
  const candidateBox = await candidates.boundingBox();
  const slotBox = await slots.boundingBox();
  expect(sentenceBox).not.toBeNull();
  expect(candidateBox).not.toBeNull();
  expect(slotBox).not.toBeNull();
  expect(sentenceBox!.y + sentenceBox!.height).toBeLessThanOrEqual(728);
  expect(candidateBox!.y + candidateBox!.height).toBeLessThanOrEqual(728);
  expect(slotBox!.y + slotBox!.height).toBeLessThanOrEqual(728);

  const desktopLayout = await page.evaluate(() => {
    const english = document.querySelector("#lesson-stage-title");
    const candidateGroup = document.querySelector(
      "[role=group][aria-labelledby=structure-candidate-title]",
    );
    const slotList = document.querySelector('[aria-label="문장 성분 자리"]');
    const follows = (first: Element | null, second: Element | null) =>
      Boolean(
        first &&
        second &&
        first.compareDocumentPosition(second) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    return {
      noHorizontalOverflow:
        document.documentElement.scrollWidth <= window.innerWidth + 1,
      learningOrder:
        follows(english, candidateGroup) && follows(candidateGroup, slotList),
      mainLandmarks: document.querySelectorAll("main").length,
    };
  });
  expect(desktopLayout).toEqual({
    noHorizontalOverflow: true,
    learningOrder: true,
    mainLandmarks: 1,
  });

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(candidates).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("clicking a lesson card opens the lesson", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("link", { name: /1번 학습 시작/u });

  await card
    .getByRole("heading", {
      name: "Coastal towns test new flood warning systems",
    })
    .click();

  await expect(page).toHaveURL(/\/lessons\/\d{4}-\d{2}-\d{2}-fixture-01$/u);
});

test("double-clicking an English word shows its Korean meaning", async ({
  page,
}) => {
  await page.goto("/today");
  await page.getByRole("link", { name: /1번 학습 시작/u }).click();

  await page.getByRole("button", { name: "Coastal 뜻 보기" }).dblclick();

  await expect(page.getByText("해안의", { exact: true })).toBeVisible();
});

test("a Reddit topic card opens a word-order learning page", async ({
  page,
}) => {
  await page.goto("/reddit");
  await expect(
    page.getByRole("heading", { name: "Reddit 주요 토픽으로 영어 공부" }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /영어 학습 시작/u })
    .first()
    .click();

  await expect(page).toHaveURL(/\/reddit\/[a-z0-9-]+$/u);
  await expect(page.getByText("제목", { exact: true })).toBeVisible();
  await expect(page.getByText("지문", { exact: true })).toBeVisible();
  await expect(page.getByText("영문 제목", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "순서 확인" })).toBeDisabled();
  await expect(page.getByRole("list", { name: "후보 어절" })).toBeVisible();
  await expect(page.getByText("한국어 번역 보기")).toBeVisible();
  await expect(page.getByRole("heading", { name: "핵심 표현" })).toBeVisible();
});

test("an anonymous learner completes both stages and keeps content out of local storage", async ({
  page,
}) => {
  await page.goto("/today");
  await page.getByRole("link", { name: /1번 학습 시작/u }).click();

  for (const token of [
    "해안",
    "도시들이",
    "새로운",
    "홍수",
    "경보",
    "시스템을",
    "시험한다",
  ]) {
    await page
      .getByRole("button", { name: `${token} 어절을 내 문장으로 이동` })
      .click();
  }
  await page.getByRole("button", { name: "순서 확인" }).click();
  await expect(page.getByText("정확한 순서입니다.")).toBeVisible();
  await page.getByRole("button", { name: /발췌 단계로/u }).click();

  for (const token of [
    "주민들은",
    "계절성",
    "폭풍이",
    "해안에",
    "도달하기",
    "전",
    "더",
    "빠른",
    "경보를",
    "시험하는",
    "이른",
    "아침",
    "훈련에",
    "참여했다.",
  ]) {
    await page
      .getByRole("button", { name: `${token} 어절을 내 문장으로 이동` })
      .click();
  }
  await page.getByRole("button", { name: "순서 확인" }).click();
  await expect(page.getByText("정확한 순서입니다.")).toBeVisible();

  const stored = await page.evaluate(() =>
    localStorage.getItem("newsorder.progress.v1"),
  );
  expect(stored).toContain('"completedAt"');
  expect(stored).not.toContain("주민들은");
  expect(stored).not.toContain("tokenIds");

  await page.reload();
  await expect(page.getByText("완료한 단계입니다.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "해안 어절을 내 문장으로 이동" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "다시 풀기" }).click();
  await expect(
    page.getByRole("button", { name: "해안 어절을 내 문장으로 이동" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /2\/2 발췌 완료/u }).click();
  await expect(page.getByText("영문 발췌", { exact: true })).toBeVisible();
});

test("a keyboard-only learner can place and reorder title tokens", async ({
  page,
}) => {
  await page.goto("/today");
  const start = page.getByRole("link", { name: /1번 학습 시작/u });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/lessons\/\d{4}-\d{2}-\d{2}-fixture-01$/u);

  const coastCandidate = page.getByRole("button", {
    name: "해안 어절을 내 문장으로 이동",
  });
  await expect(coastCandidate).toBeVisible();
  const candidateLabels = await page
    .getByRole("button", { name: /어절을 내 문장으로 이동/u })
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label") ?? ""),
    );
  const coastIndex = candidateLabels.indexOf("해안 어절을 내 문장으로 이동");
  expect(coastIndex).toBeGreaterThanOrEqual(0);
  const adjacentCandidateLabel =
    candidateLabels[coastIndex + 1] ?? candidateLabels[coastIndex - 1];
  if (!adjacentCandidateLabel) {
    throw new Error("Expected another candidate after selecting 해안.");
  }

  await coastCandidate.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: adjacentCandidateLabel, exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: /1번째 어절 해안/u }).click();
  await expect(coastCandidate).toBeVisible();
  await coastCandidate.click();

  for (const token of [
    "도시들이",
    "새로운",
    "홍수",
    "경보",
    "시스템을",
    "시험한다",
  ]) {
    const candidate = page.getByRole("button", {
      name: `${token} 어절을 내 문장으로 이동`,
    });
    await candidate.focus();
    await page.keyboard.press("Enter");
  }

  const submit = page.getByRole("button", { name: "순서 확인" });
  await expect(submit).toBeFocused();

  const last = page.getByRole("button", { name: /7번째 어절 시험한다/u });
  await last.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  const returnedCandidate = page.getByRole("button", {
    name: "시험한다 어절을 내 문장으로 이동",
  });
  await expect(returnedCandidate).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(submit).toBeFocused();

  const first = page.getByRole("button", { name: /1번째 어절 해안/u });
  await first.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: /2번째 어절 해안/u }),
  ).toBeFocused();
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(
    page.getByRole("button", { name: /1번째 어절 해안/u }),
  ).toBeFocused();

  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("정확한 순서입니다.")).toBeVisible();
});

test("the answer remains locked until three incorrect attempts and records help", async ({
  page,
}) => {
  await page.goto("/today");
  await page.getByRole("link", { name: /1번 학습 시작/u }).click();

  for (const token of [
    "도시들이",
    "새로운",
    "홍수",
    "경보",
    "시스템을",
    "시험한다",
    "해안",
  ]) {
    await page
      .getByRole("button", { name: `${token} 어절을 내 문장으로 이동` })
      .click();
  }

  await expect(page.getByRole("button", { name: "정답 보기" })).toHaveCount(0);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.getByRole("button", { name: "순서 확인" }).click();
    await expect(
      page.getByText(`문장 일치율 0점 · ${attempt}회 시도`),
    ).toBeVisible();
    await expect(
      page.getByText("빨간 밑줄로 표시한 어절을 다시 배치해 보세요."),
    ).toBeVisible();
    await expect(page.locator('span[data-incorrect="true"]')).toHaveCount(7);
    await expect(
      page.getByRole("button", { name: /순서가 맞지 않아 오류로 표시됨/u }),
    ).toHaveCount(7);
    if (attempt === 1) {
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
    }
  }

  await page.getByRole("button", { name: "정답 보기" }).click();
  await expect(page.getByText("정답을 확인해 완료했습니다.")).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("newsorder.progress.v1"),
  );
  expect(stored).toContain('"helped":true');
});

test("admin routes reject a fixture visitor without a development-admin session", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "관리자 권한이 필요합니다" }),
  ).toBeVisible();
});
