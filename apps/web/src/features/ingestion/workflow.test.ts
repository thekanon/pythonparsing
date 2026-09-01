import type {
  RssCandidate,
  TranslationAdapter,
  VerificationAdapter,
} from "./types";
import { prepareIngestionBatch } from "./workflow";

function candidate(id: string): RssCandidate {
  return {
    externalId: id,
    canonicalUrl: `https://example.com/${id}`,
    publishedAt: new Date("2026-08-26T00:00:00Z"),
    englishTitle: `News title ${id}`,
    englishExcerpt: "A complete short excerpt for a synthetic test article.",
    sourceHash: `hash-${id}`,
  };
}

const approvedGate = {
  meaningPreserved: true,
  complete: true,
  noHallucination: true,
  naturalKorean: true,
  safeForLearning: true,
} as const;

const verifier: VerificationAdapter = {
  model: "fixture-verifier",
  verify: vi.fn(async () => approvedGate),
};

describe("ingestion workflow", () => {
  it("retries external work at most three total attempts and then publishes", async () => {
    let calls = 0;
    const translator: TranslationAdapter = {
      translate: vi.fn(async () => {
        calls += 1;
        if (calls < 3) throw new Error("TEMPORARY_FAILURE");
        return {
          koreanTitle: "합성 뉴스 제목",
          koreanExcerpt: "합성 테스트 기사를 위한 완전한 짧은 발췌문이다.",
          provider: "fixture",
          model: "fixture-v1",
          characterCount: 70,
        };
      }),
    };
    const wait = vi.fn(async () => undefined);

    const batch = await prepareIngestionBatch(
      [candidate("a")],
      translator,
      verifier,
      {
        targetCount: 1,
        retryDelaysMs: [10, 20],
        wait,
      },
    );

    expect(calls).toBe(3);
    expect(wait).toHaveBeenNthCalledWith(1, 10);
    expect(wait).toHaveBeenNthCalledWith(2, 20);
    expect(batch.approved).toHaveLength(1);
    expect(batch.quarantined).toHaveLength(0);
  });

  it("isolates a failed item and continues processing successful candidates", async () => {
    const translator: TranslationAdapter = {
      translate: vi.fn(async (item) => {
        if (item.externalId === "bad") throw new Error("NMT_UNAVAILABLE");
        return {
          koreanTitle: "정상 합성 제목",
          koreanExcerpt: "정상 합성 번역 발췌문이다.",
          provider: "fixture",
          model: "fixture-v1",
          characterCount: 50,
        };
      }),
    };

    const batch = await prepareIngestionBatch(
      [candidate("bad"), candidate("good")],
      translator,
      verifier,
      { targetCount: 1, retryDelaysMs: [0, 0], wait: async () => undefined },
    );

    expect(batch.approved.map((item) => item.externalId)).toEqual(["good"]);
    expect(batch.quarantined).toHaveLength(1);
    expect(batch.quarantined[0]).toMatchObject({
      errorCode: "NMT_UNAVAILABLE",
      retries: 2,
      candidate: { externalId: "bad" },
    });
  });

  it("stops before translation when the monthly hard guard would be crossed", async () => {
    const translator: TranslationAdapter = { translate: vi.fn() };
    const batch = await prepareIngestionBatch(
      [candidate("quota")],
      translator,
      verifier,
      {
        maximumCharacters: 1,
        wait: async () => undefined,
      },
    );
    expect(translator.translate).not.toHaveBeenCalled();
    expect(batch.quarantined[0]?.errorCode).toBe("TRANSLATION_QUOTA_GUARD");
  });
});
