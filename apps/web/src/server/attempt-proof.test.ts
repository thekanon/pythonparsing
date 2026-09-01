import {
  createAttemptProof,
  verifyAttemptProof,
} from "./services/attempt-proof";

describe("anonymous attempt proofs", () => {
  it("increments a signed proof up to the answer threshold", () => {
    let proof: string | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      proof = createAttemptProof(proof, "lesson-1", "title");
      expect(verifyAttemptProof(proof, "lesson-1", "title")).toBe(attempt);
    }
  });

  it("rejects tampering and reuse for another stage", () => {
    const proof = createAttemptProof(undefined, "lesson-1", "title");
    expect(verifyAttemptProof(`${proof}x`, "lesson-1", "title")).toBe(0);
    expect(verifyAttemptProof(proof, "lesson-1", "excerpt")).toBe(0);
  });
});
