import "server-only";

import { GoogleGenAI } from "@google/genai";

import type {
  RssCandidate,
  TranslationPair,
  VerificationAdapter,
} from "@/features/ingestion/types";
import {
  verificationGateSchema,
  verificationJsonSchema,
} from "@/features/ingestion/verification";

const SYSTEM_INSTRUCTION = `You verify English-to-Korean educational news translations.
Evaluate the title and excerpt together. Return only the requested JSON.
Set every field conservatively. The excerpt is at most 200 Unicode characters.
Do not rewrite, expand, or quote the article beyond the supplied fields.`;

export class GeminiVerificationAdapter implements VerificationAdapter {
  readonly model: string;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, model = "gemini-3.7-flash") {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async verify(candidate: RssCandidate, translation: TranslationPair) {
    const response = await this.client.interactions.create({
      model: this.model,
      input: JSON.stringify({
        sourceLanguage: "en",
        targetLanguage: "ko",
        englishTitle: candidate.englishTitle,
        englishExcerpt: candidate.englishExcerpt,
        koreanTitle: translation.koreanTitle,
        koreanExcerpt: translation.koreanExcerpt,
      }),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: verificationJsonSchema,
      },
      store: false,
      system_instruction: SYSTEM_INSTRUCTION,
    });

    if (!response.output_text) throw new Error("GEMINI_EMPTY_RESPONSE");
    return verificationGateSchema.parse(JSON.parse(response.output_text));
  }
}

export class FixtureVerificationAdapter implements VerificationAdapter {
  readonly model = "fixture-verifier-v1";

  async verify() {
    return {
      meaningPreserved: true,
      complete: true,
      noHallucination: true,
      naturalKorean: true,
      safeForLearning: true,
    } as const;
  }
}
