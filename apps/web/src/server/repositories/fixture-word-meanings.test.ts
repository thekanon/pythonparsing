import { extractEnglishWords } from "@/features/lessons/english-words";

import { buildFixtureLessons } from "./fixture-content";
import { getFixtureWordMeaning } from "./fixture-word-meanings";

describe("fixture word meanings", () => {
  it("defines a Korean meaning for every English word in fixture lessons", () => {
    const missing = new Set<string>();
    for (const lesson of buildFixtureLessons("2026-08-26")) {
      for (const stage of [lesson.title, lesson.excerpt]) {
        for (const word of extractEnglishWords(stage.english)) {
          if (!getFixtureWordMeaning(word)) missing.add(word);
        }
      }
    }

    expect([...missing]).toEqual([]);
  });
});
