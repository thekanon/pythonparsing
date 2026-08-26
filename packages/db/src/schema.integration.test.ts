import { randomUUID } from "node:crypto";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";

import { createDatabase } from "./client";
import {
  adminAuditLogs,
  articleRevisions,
  articles,
  contentSources,
  dailyLessons,
  stageProgress,
  users,
} from "./schema/index";

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = databaseUrl ? describe : describe.skip;

integration("PostgreSQL schema invariants", () => {
  const database = createDatabase(databaseUrl!, 1);
  const suffix = randomUUID();
  const providerKey = `test-${suffix}`;
  const userId = `test-user-${suffix}`;

  beforeAll(async () => {
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    await database.db.insert(contentSources).values({
      providerKey,
      displayName: "Integration fixture",
      rightsDocumentVersion: "test-v1",
    });
    await database.db.insert(users).values({
      id: userId,
      name: "Integration user",
      email: `${suffix}@example.invalid`,
    });
  });

  afterAll(async () => {
    await database.client.end();
  });

  async function createArticle(externalId: string) {
    const row = await database.db
      .insert(articles)
      .values({
        providerKey,
        externalId,
        canonicalUrl: `https://example.invalid/${externalId}`,
        publishedAt: new Date("2026-08-26T00:00:00Z"),
      })
      .returning({ id: articles.id });
    return row[0]!.id;
  }

  async function createPublishedRevision(
    articleId: string,
    revisionNumber = 1,
  ) {
    const row = await database.db
      .insert(articleRevisions)
      .values({
        articleId,
        revisionNumber,
        englishTitle: "Synthetic title",
        englishExcerpt: "A short synthetic excerpt.",
        koreanTitle: "합성 제목",
        koreanExcerpt: "짧은 합성 발췌문이다.",
        sourceHash: `hash-${suffix}-${revisionNumber}`,
        translationProvider: "fixture",
        translationModel: "fixture-v1",
        verificationModel: "fixture-verifier",
        verificationResult: {
          meaningPreserved: true,
          complete: true,
          noHallucination: true,
          naturalKorean: true,
          safeForLearning: true,
        },
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: articleRevisions.id });
    return row[0]!.id;
  }

  it("enforces the 200-character source excerpt constraint", async () => {
    const articleId = await createArticle(`long-${suffix}`);
    await expect(
      database.db.insert(articleRevisions).values({
        articleId,
        revisionNumber: 1,
        englishTitle: "Synthetic title",
        englishExcerpt: "x".repeat(201),
        koreanTitle: "합성 제목",
        koreanExcerpt: "합성 발췌문",
        sourceHash: `long-hash-${suffix}`,
        translationProvider: "fixture",
        translationModel: "fixture-v1",
        verificationModel: "fixture-verifier",
        status: "published",
      }),
    ).rejects.toThrow();
  });

  it("keeps published revisions immutable while allowing a content-deleting withdrawal", async () => {
    const articleId = await createArticle(`immutable-${suffix}`);
    const revisionId = await createPublishedRevision(articleId);

    await expect(
      database.db
        .update(articleRevisions)
        .set({ koreanTitle: "몰래 바꾼 제목" })
        .where(eq(articleRevisions.id, revisionId)),
    ).rejects.toThrow();

    await expect(
      database.db
        .update(articleRevisions)
        .set({
          englishTitle: null,
          englishExcerpt: null,
          koreanTitle: null,
          koreanExcerpt: null,
          verificationResult: null,
          status: "withdrawn",
          withdrawnAt: new Date(),
        })
        .where(eq(articleRevisions.id, revisionId)),
    ).resolves.toBeDefined();
  });

  it("enforces one ordinal per learning date", async () => {
    const firstArticle = await createArticle(`ordinal-a-${suffix}`);
    const secondArticle = await createArticle(`ordinal-b-${suffix}`);
    const firstRevision = await createPublishedRevision(firstArticle);
    const secondRevision = await createPublishedRevision(secondArticle);
    const year = 2100 + (Number.parseInt(suffix.slice(0, 2), 16) % 100);
    const month = String(
      1 + (Number.parseInt(suffix.slice(2, 4), 16) % 12),
    ).padStart(2, "0");
    const day = String(
      1 + (Number.parseInt(suffix.slice(4, 6), 16) % 28),
    ).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    await database.db.insert(dailyLessons).values({
      learningDate: date,
      ordinal: 1,
      articleRevisionId: firstRevision,
      status: "published",
    });
    await expect(
      database.db.insert(dailyLessons).values({
        learningDate: date,
        ordinal: 1,
        articleRevisionId: secondRevision,
        status: "published",
      }),
    ).rejects.toThrow();
  });

  it("restores progress independently of licensed lesson rows", async () => {
    await expect(
      database.db.insert(stageProgress).values({
        userId,
        lessonId: randomUUID(),
        stage: "title",
        attempts: 2,
        bestPositionScore: 50,
      }),
    ).resolves.toBeDefined();
  });

  it("prevents updates and early deletion of append-only audit records", async () => {
    const row = await database.db
      .insert(adminAuditLogs)
      .values({
        actorId: userId,
        action: "integration.verify",
        targetType: "integration",
        targetId: suffix,
        succeeded: true,
      })
      .returning({ id: adminAuditLogs.id });
    const auditId = row[0]!.id;

    await expect(
      database.db
        .update(adminAuditLogs)
        .set({ succeeded: false })
        .where(eq(adminAuditLogs.id, auditId)),
    ).rejects.toThrow();
    await expect(
      database.db.delete(adminAuditLogs).where(eq(adminAuditLogs.id, auditId)),
    ).rejects.toThrow();
  });
});
