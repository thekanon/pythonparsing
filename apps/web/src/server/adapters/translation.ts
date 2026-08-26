import "server-only";

import { TranslationServiceClient } from "@google-cloud/translate";

import type {
  RssCandidate,
  TranslationAdapter,
} from "@/features/ingestion/types";

export class GoogleTranslationAdapter implements TranslationAdapter {
  private readonly client: TranslationServiceClient;

  constructor(
    private readonly projectId: string,
    private readonly location = "global",
  ) {
    this.client = new TranslationServiceClient();
  }

  async translate(candidate: RssCandidate) {
    const contents = [candidate.englishTitle, candidate.englishExcerpt];
    const [response] = await this.client.translateText({
      parent: `projects/${this.projectId}/locations/${this.location}`,
      contents,
      mimeType: "text/plain",
      sourceLanguageCode: "en",
      targetLanguageCode: "ko",
    });

    const translated = response.translations ?? [];
    const koreanTitle = translated[0]?.translatedText?.normalize("NFC").trim();
    const koreanExcerpt = translated[1]?.translatedText
      ?.normalize("NFC")
      .trim();
    if (!koreanTitle || !koreanExcerpt)
      throw new Error("TRANSLATION_EMPTY_RESPONSE");

    return {
      koreanTitle,
      koreanExcerpt,
      provider: "google-cloud-translation",
      model: "nmt",
      characterCount: Array.from(contents.join("")).length,
    };
  }
}

export class FixtureTranslationAdapter implements TranslationAdapter {
  constructor(
    private readonly translateFixture: (candidate: RssCandidate) => {
      koreanTitle: string;
      koreanExcerpt: string;
    },
  ) {}

  async translate(candidate: RssCandidate) {
    const result = this.translateFixture(candidate);
    return {
      ...result,
      provider: "fixture-translator",
      model: "fixture-v1",
      characterCount: Array.from(
        candidate.englishTitle + candidate.englishExcerpt,
      ).length,
    };
  }
}
