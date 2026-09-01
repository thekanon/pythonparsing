import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , daddySourcePath, ozSourcePath, aliceSourcePath, jekyllSourcePath] =
  process.argv;

if (
  !daddySourcePath ||
  !ozSourcePath ||
  !aliceSourcePath ||
  !jekyllSourcePath
) {
  throw new Error(
    "Usage: node scripts/import-public-domain-books.mjs <daddy-long-legs.txt> <wizard-of-oz.txt> <alice-in-wonderland.txt> <jekyll-and-hyde.txt>",
  );
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(
  scriptDirectory,
  "../src/features/books/texts",
);

const ENGLISH_WORD_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;
const MONTH_PATTERN =
  /\b(?:Jan\.?|January|Feb\.?|February|March|April|May|June|July|Aug\.?|August|Sept\.?|September|Oct\.?|October|Nov\.?|November|Dec\.?|December)\b/i;
const DAY_HEADING_PATTERN =
  /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|On the Eve|Next morning|Four days later)(?:\b.*)?$/i;

const OZ_KOREAN_TITLES = [
  "작가의 말",
  "회오리바람",
  "먼치킨들과의 회의",
  "도로시가 허수아비를 구한 방법",
  "숲을 지나가는 길",
  "양철 나무꾼을 구하다",
  "겁쟁이 사자",
  "위대한 오즈를 향한 여정",
  "치명적인 양귀비 밭",
  "들쥐들의 여왕",
  "성문의 수호자",
  "오즈의 에메랄드 시티",
  "사악한 마녀를 찾아서",
  "구출",
  "날개 달린 원숭이",
  "무시무시한 오즈의 정체",
  "위대한 사기꾼의 마법",
  "열기구를 띄우다",
  "남쪽으로",
  "싸우는 나무들의 공격",
  "아름다운 도자기 나라",
  "사자가 짐승의 왕이 되다",
  "쿼들링의 나라",
  "착한 마녀 글린다가 도로시의 소원을 이루어 주다",
  "집으로",
];

const ALICE_KOREAN_TITLES = [
  "토끼 굴 속으로",
  "눈물 웅덩이",
  "코커스 경주와 긴 이야기",
  "토끼가 꼬마 빌을 들여보내다",
  "애벌레의 충고",
  "돼지와 후추",
  "미친 다과회",
  "여왕의 크로케 경기장",
  "가짜 거북의 이야기",
  "바닷가재 카드리유",
  "누가 타르트를 훔쳤나?",
  "앨리스의 증언",
];

const JEKYLL_ENGLISH_TITLES = [
  "STORY OF THE DOOR",
  "SEARCH FOR MR. HYDE",
  "DR. JEKYLL WAS QUITE AT EASE",
  "THE CAREW MURDER CASE",
  "INCIDENT OF THE LETTER",
  "INCIDENT OF DR. LANYON",
  "INCIDENT AT THE WINDOW",
  "THE LAST NIGHT",
  "DR. LANYON’S NARRATIVE",
  "HENRY JEKYLL’S FULL STATEMENT OF THE CASE",
];

const JEKYLL_DISPLAY_TITLES = [
  "Story of the Door",
  "Search for Mr. Hyde",
  "Dr. Jekyll Was Quite at Ease",
  "The Carew Murder Case",
  "Incident of the Letter",
  "Incident of Dr. Lanyon",
  "Incident at the Window",
  "The Last Night",
  "Dr. Lanyon’s Narrative",
  "Henry Jekyll’s Full Statement of the Case",
];

const JEKYLL_KOREAN_TITLES = [
  "문의 이야기",
  "하이드를 찾아서",
  "마음이 편안한 지킬 박사",
  "커루 살인 사건",
  "편지 사건",
  "래니언 박사 사건",
  "창가의 사건",
  "마지막 밤",
  "래니언 박사의 이야기",
  "헨리 지킬의 사건 전말",
];

function normalizeNewlines(value) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function projectGutenbergBody(value) {
  const normalized = normalizeNewlines(value);
  const startMarker = "*** START OF THE PROJECT GUTENBERG EBOOK";
  const endMarker = "*** END OF THE PROJECT GUTENBERG EBOOK";
  const start = normalized.indexOf("\n", normalized.indexOf(startMarker));
  const end = normalized.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error("Project Gutenberg start/end markers were not found.");
  }
  return normalized.slice(start + 1, end).trim();
}

function paragraphsFrom(value) {
  return value
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(
      (paragraph) =>
        paragraph.length > 0 && !/^\[Illustration[^\]]*\]$/i.test(paragraph),
    );
}

function wordCount(paragraphs) {
  return paragraphs.join(" ").match(ENGLISH_WORD_PATTERN)?.length ?? 0;
}

function summarize(paragraphs) {
  const firstParagraph = paragraphs.find(
    (paragraph) =>
      paragraph.length >= 40 &&
      !/^(?:Dear|Dearest|My Dear|Mr\.|To Mr\.)\b/i.test(paragraph),
  );
  return (firstParagraph ?? paragraphs[0] ?? "").slice(0, 190);
}

function makeSection({
  bookSlug,
  slug,
  label,
  englishTitle,
  koreanTitle,
  source,
}) {
  const paragraphs = paragraphsFrom(source);
  return {
    id: `${bookSlug}:${slug}`,
    slug,
    label,
    englishTitle,
    koreanTitle,
    summary: summarize(paragraphs),
    wordCount: wordCount(paragraphs),
    paragraphs,
  };
}

function parseOz(source) {
  const bookSlug = "the-wonderful-wizard-of-oz";
  const body = projectGutenbergBody(source);
  const introductionMatch = /(?:^|\n)Introduction\n{2,}/g.exec(body);
  if (!introductionMatch) throw new Error("Oz introduction was not found.");

  const story = body.slice(
    introductionMatch.index + (introductionMatch[0].startsWith("\n") ? 1 : 0),
  );
  const chapterMatches = [
    ...story.matchAll(/^Chapter ([IVXLCDM]+)\n([^\n]+)$/gm),
  ];
  if (chapterMatches.length !== 24) {
    throw new Error(`Expected 24 Oz chapters, found ${chapterMatches.length}.`);
  }

  const firstChapterIndex = chapterMatches[0].index;
  const introductionSource = story
    .slice("Introduction".length, firstChapterIndex)
    .trim();
  const sections = [
    makeSection({
      bookSlug,
      slug: "introduction",
      label: "Introduction",
      englishTitle: "Introduction",
      koreanTitle: OZ_KOREAN_TITLES[0],
      source: introductionSource,
    }),
  ];

  chapterMatches.forEach((match, index) => {
    const nextMatch = chapterMatches[index + 1];
    const sourceStart = (match.index ?? 0) + match[0].length;
    const sourceEnd = nextMatch?.index ?? story.length;
    sections.push(
      makeSection({
        bookSlug,
        slug: `chapter-${String(index + 1).padStart(2, "0")}`,
        label: `Chapter ${match[1]}`,
        englishTitle: match[2].trim(),
        koreanTitle: OZ_KOREAN_TITLES[index + 1],
        source: story.slice(sourceStart, sourceEnd),
      }),
    );
  });

  return {
    bookSlug,
    sourceEbookNumber: 55,
    totalWords: sections.reduce(
      (total, section) => total + section.wordCount,
      0,
    ),
    sections,
  };
}

function parseAlice(source) {
  const bookSlug = "alice-in-wonderland";
  const body = projectGutenbergBody(source);
  const chapterMatches = [
    ...body.matchAll(/^CHAPTER ([IVXLCDM]+)\.\n([^\n]+)$/gm),
  ];
  if (chapterMatches.length !== 12) {
    throw new Error(
      `Expected 12 Alice chapters, found ${chapterMatches.length}.`,
    );
  }
  const storyEnd = body.lastIndexOf("\nTHE END");
  const sections = chapterMatches.map((match, index) => {
    const nextMatch = chapterMatches[index + 1];
    const sourceStart = (match.index ?? 0) + match[0].length;
    const sourceEnd =
      nextMatch?.index ?? (storyEnd > 0 ? storyEnd : body.length);
    return makeSection({
      bookSlug,
      slug: `chapter-${String(index + 1).padStart(2, "0")}`,
      label: `Chapter ${match[1]}`,
      englishTitle: match[2].trim(),
      koreanTitle: ALICE_KOREAN_TITLES[index],
      source: body.slice(sourceStart, sourceEnd),
    });
  });
  return {
    bookSlug,
    sourceEbookNumber: 11,
    totalWords: sections.reduce(
      (total, section) => total + section.wordCount,
      0,
    ),
    sections,
  };
}

function parseJekyllAndHyde(source) {
  const bookSlug = "dr-jekyll-and-mr-hyde";
  const body = projectGutenbergBody(source);
  const headingMatches = JEKYLL_ENGLISH_TITLES.map((title) => {
    const marker = `\n${title}\n`;
    const index = body.indexOf(marker);
    if (index < 0)
      throw new Error(`Jekyll and Hyde chapter not found: ${title}`);
    return { title, index: index + 1 };
  });
  if (
    headingMatches.some(
      (match, index) =>
        index > 0 && match.index <= headingMatches[index - 1].index,
    )
  ) {
    throw new Error("Jekyll and Hyde chapters are out of order.");
  }

  const sections = headingMatches.map((match, index) => {
    const nextMatch = headingMatches[index + 1];
    const sourceStart = match.index + match.title.length;
    return makeSection({
      bookSlug,
      slug: `chapter-${String(index + 1).padStart(2, "0")}`,
      label: `Chapter ${index + 1}`,
      englishTitle: JEKYLL_DISPLAY_TITLES[index],
      koreanTitle: JEKYLL_KOREAN_TITLES[index],
      source: body.slice(sourceStart, nextMatch?.index ?? body.length),
    });
  });

  return {
    bookSlug,
    sourceEbookNumber: 43,
    totalWords: sections.reduce(
      (total, section) => total + section.wordCount,
      0,
    ),
    sections,
  };
}

function daddyDateLabel(source, index) {
  const candidates = source
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 12);
  const dated = candidates.find(
    (line) => MONTH_PATTERN.test(line) || DAY_HEADING_PATTERN.test(line),
  );
  return dated ?? `Letter ${index}`;
}

function parseDaddyLongLegs(source) {
  const bookSlug = "daddy-long-legs";
  const body = projectGutenbergBody(source);
  const openingStart = body.indexOf("Blue Wednesday");
  const lettersStart = body.indexOf("The Letters of", openingStart);
  if (openingStart < 0 || lettersStart < 0) {
    throw new Error("Daddy-Long-Legs opening or letters were not found.");
  }

  const sections = [
    makeSection({
      bookSlug,
      slug: "blue-wednesday",
      label: "Opening",
      englishTitle: "Blue Wednesday",
      koreanTitle: "우울한 수요일",
      source: body.slice(openingStart + "Blue Wednesday".length, lettersStart),
    }),
  ];
  const letterBlocks = body
    .slice(lettersStart)
    .split(/\n{4,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  letterBlocks.forEach((block, index) => {
    const letterNumber = index + 1;
    sections.push(
      makeSection({
        bookSlug,
        slug: `letter-${String(letterNumber).padStart(3, "0")}`,
        label: `Letter ${String(letterNumber).padStart(2, "0")}`,
        englishTitle: daddyDateLabel(block, letterNumber),
        koreanTitle: `편지 ${letterNumber}`,
        source: block,
      }),
    );
  });

  return {
    bookSlug,
    sourceEbookNumber: 157,
    totalWords: sections.reduce(
      (total, section) => total + section.wordCount,
      0,
    ),
    sections,
  };
}

const [daddySource, ozSource, aliceSource, jekyllSource] = await Promise.all([
  readFile(daddySourcePath, "utf8"),
  readFile(ozSourcePath, "utf8"),
  readFile(aliceSourcePath, "utf8"),
  readFile(jekyllSourcePath, "utf8"),
]);
const books = [
  parseDaddyLongLegs(daddySource),
  parseOz(ozSource),
  parseAlice(aliceSource),
  parseJekyllAndHyde(jekyllSource),
];

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  books.map((book) =>
    writeFile(
      path.join(outputDirectory, `${book.bookSlug}.json`),
      `${JSON.stringify(book, null, 2)}\n`,
      "utf8",
    ),
  ),
);

for (const book of books) {
  console.log(
    `${book.bookSlug}: ${book.sections.length} sections, ${book.totalWords} words`,
  );
}
