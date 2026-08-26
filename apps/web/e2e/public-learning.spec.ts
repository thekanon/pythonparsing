import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("public home and today pages have no serious or critical axe violations", async ({
  page,
}) => {
  for (const path of ["/", "/today"]) {
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
});

test("a keyboard-only learner can place and reorder title tokens", async ({
  page,
}) => {
  await page.goto("/today");
  const start = page.getByRole("link", { name: /1번 학습 시작/u });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/lessons\/2026-08-26-fixture-01$/u);

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
  await page.keyboard.press("Delete");
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
