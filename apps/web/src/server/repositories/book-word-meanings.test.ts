import { extractEnglishWords } from "@/features/lessons/english-words";
import { PUBLIC_DOMAIN_BOOKS } from "@/features/books/catalog";

import { getBookWordMeaning } from "./book-word-meanings";

describe("public-domain book word meanings", () => {
  it("defines a Korean meaning for every word in every book lesson", () => {
    const missing = new Set<string>();

    for (const book of PUBLIC_DOMAIN_BOOKS) {
      for (const lesson of book.lessons) {
        for (const word of extractEnglishWords(
          `${lesson.englishTitle} ${lesson.englishPassage}`,
        )) {
          if (!getBookWordMeaning(word)) missing.add(word);
        }
      }
    }

    expect([...missing]).toEqual([]);
  });
});
