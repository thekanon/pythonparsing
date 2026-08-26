import type { VerificationGate } from "./verification";

export type RssCandidate = {
  externalId: string;
  canonicalUrl: string;
  publishedAt: Date;
  englishTitle: string;
  englishExcerpt: string;
  sourceHash: string;
};

export type TranslationPair = {
  koreanTitle: string;
  koreanExcerpt: string;
  provider: string;
  model: string;
  characterCount: number;
};

export type ApprovedCandidate = RssCandidate &
  TranslationPair & {
    verification: VerificationGate;
    verificationModel: string;
  };

export type QuarantinedCandidate = {
  externalIdHash: string;
  errorCode: string;
  retries: number;
  candidate?: RssCandidate;
  translation?: TranslationPair;
  verification?: VerificationGate;
};

export type PreparedBatch = {
  discoveredCount: number;
  translatedCount: number;
  approved: ApprovedCandidate[];
  quarantined: QuarantinedCandidate[];
  characterCount: number;
  warningCode: "INSUFFICIENT_APPROVED_CONTENT" | null;
};

export interface TranslationAdapter {
  translate(candidate: RssCandidate): Promise<TranslationPair>;
}

export interface VerificationAdapter {
  readonly model: string;
  verify(
    candidate: RssCandidate,
    translation: TranslationPair,
  ): Promise<VerificationGate>;
}
