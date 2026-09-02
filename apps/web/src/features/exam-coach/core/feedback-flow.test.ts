import { describe, expect, it } from "vitest";

import sqlSample from "../content/2026/sql/select-basics.json";
import {
  createLearningEventFromSession,
  revealNextHelp,
  startPracticeSession,
  submitCorrection,
  submitFirstResponse,
} from "./feedback-flow";

// prettier-ignore
describe("exam coach feedback flow", () => {
  it("locks help until the first submission", () => {
    const session = startPracticeSession(sqlSample, "card-sql-select");

    expect(() => revealNextHelp(session, sqlSample)).toThrow(/first submission/);
    expect(() => submitCorrection(session, sqlSample, "SELECT")).toThrow(
      /first submission/,
    );
  });

  it("records an immutable first result without response text", () => {
    const session = startPracticeSession(sqlSample, "card-sql-select");
    const submitted = submitFirstResponse(
      session,
      sqlSample,
      "FROM",
      "2026-09-02T04:00:00.000Z",
      1800,
    );

    expect(submitted.firstSubmission?.result.correct).toBe(false);
    expect(submitted.firstSubmission?.responseTimeMs).toBe(1800);

    const serialized = JSON.stringify(submitted);
    expect(serialized).not.toContain('"submittedResponse"');
    expect(serialized).not.toContain('"FROM"');

    expect(() =>
      submitFirstResponse(
        submitted,
        sqlSample,
        "SELECT",
        "2026-09-02T04:00:01.000Z",
        2000,
      ),
    ).toThrow(/already recorded/);
  });

  it("reveals progressive help in the required order", () => {
    let session = submitFirstResponse(
      startPracticeSession(sqlSample, "card-sql-select"),
      sqlSample,
      "FROM",
      "2026-09-02T04:00:00.000Z",
      1800,
    );

    const level1 = revealNextHelp(session, sqlSample);
    session = level1.session;
    const level2 = revealNextHelp(session, sqlSample);
    session = level2.session;
    const level3 = revealNextHelp(session, sqlSample);
    session = level3.session;
    const level4 = revealNextHelp(session, sqlSample);
    session = level4.session;

    expect(level1.disclosure).toMatchObject({
      level: 1,
      kind: "concept-clue",
    });
    expect(level2.disclosure).toMatchObject({
      level: 2,
      kind: "structure-hint",
    });
    expect(level3.disclosure).toMatchObject({
      level: 3,
      kind: "specific-hint",
    });
    expect(level4.disclosure).toEqual({
      level: 4,
      kind: "solution",
      explanation: sqlSample.explanation,
      answer: sqlSample.answer,
    });
    expect(session.helpLevel).toBe(4);
    expect(() => revealNextHelp(session, sqlSample)).toThrow(
      /already been revealed/,
    );
  });

  it("keeps corrections separate from the first result", () => {
    const first = submitFirstResponse(
      startPracticeSession(sqlSample, "card-sql-select"),
      sqlSample,
      "FROM",
      "2026-09-02T04:00:00.000Z",
      1800,
    );
    const correction = submitCorrection(first, sqlSample, "SELECT");

    expect(correction.result.correct).toBe(true);
    expect(correction.session.correctionAttempts).toBe(1);
    expect(correction.session.firstSubmission?.result.correct).toBe(false);

    const serialized = JSON.stringify(correction.session);
    expect(serialized).not.toContain('"SELECT"');
  });

  it("preserves independent success and its recall rating", () => {
    const session = submitFirstResponse(
      startPracticeSession(sqlSample, "card-sql-select"),
      sqlSample,
      "SELECT",
      "2026-09-02T04:00:00.000Z",
      900,
    );

    expect(() => revealNextHelp(session, sqlSample)).toThrow(
      /only available after/,
    );

    const event = createLearningEventFromSession(
      session,
      eventContext(),
      "Good",
    );
    expect(event).toMatchObject({
      correct: true,
      rating: "Good",
      helpLevel: 0,
      firstSubmission: true,
      responseTimeMs: 900,
    });

    expect(() =>
      createLearningEventFromSession(session, eventContext(), "Again"),
    ).toThrow(/Hard, Good, or Easy/);
  });

  it("forces failed or helped attempts to Again", () => {
    let session = submitFirstResponse(
      startPracticeSession(sqlSample, "card-sql-select"),
      sqlSample,
      "FROM",
      "2026-09-02T04:00:00.000Z",
      1800,
    );
    session = revealNextHelp(session, sqlSample).session;

    const event = createLearningEventFromSession(
      session,
      eventContext(),
      "Easy",
    );
    expect(event).toMatchObject({
      correct: false,
      rating: "Again",
      helpLevel: 1,
      occurredAt: "2026-09-02T04:00:00.000Z",
    });
  });

  it("rejects a different content version", () => {
    const session = startPracticeSession(sqlSample, "card-sql-select");
    const revised = { ...sqlSample, version: 2 };

    expect(() =>
      submitFirstResponse(
        session,
        revised,
        "SELECT",
        "2026-09-02T04:00:00.000Z",
        900,
      ),
    ).toThrow(/does not match practice session version/);
  });
});

function eventContext() {
  return {
    eventId: "event-feedback-1",
    learnerId: "guest-a",
    fsrsVersion: "pending-adapter",
    mode: "recall" as const,
  };
}
