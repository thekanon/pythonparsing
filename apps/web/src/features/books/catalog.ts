export type BookExpression = {
  phrase: string;
  meaning: string;
};

export type PublicDomainBookLesson = {
  id: string;
  chapterLabel: string;
  chapterKorean: string;
  englishTitle: string;
  koreanTitle: string;
  englishPassage: string;
  koreanTranslation: string;
  expressions: BookExpression[];
};

export type PublicDomainBook = {
  slug: string;
  englishTitle: string;
  koreanTitle: string;
  author: string;
  publicationYear: number;
  gutenbergEbookNumber: number;
  gutenbergUrl: string;
  readingLevel: string;
  description: string;
  lessons: PublicDomainBookLesson[];
};

export const PUBLIC_DOMAIN_BOOKS: readonly PublicDomainBook[] = [
  {
    slug: "daddy-long-legs",
    englishTitle: "Daddy-Long-Legs",
    koreanTitle: "키다리 아저씨",
    author: "Jean Webster",
    publicationYear: 1912,
    gutenbergEbookNumber: 157,
    gutenbergUrl: "https://www.gutenberg.org/ebooks/157",
    readingLevel: "쉬움 · 편지 형식",
    description:
      "고아원에서 자란 주디가 대학 생활을 시작하며 이름 모를 후원자에게 보내는 편지를 따라갑니다. 짧고 솔직한 문장이 많아 일상 영어를 익히기 좋습니다.",
    lessons: [
      {
        id: "daddy-long-legs-opening-01",
        chapterLabel: "Blue Wednesday · Opening 01",
        chapterKorean: "첫 장 · 1번째 구절",
        englishTitle: "A Perfectly Awful Day",
        koreanTitle: "정말 끔찍한 날",
        englishPassage:
          "The first Wednesday in every month was a Perfectly Awful Day—a day to be awaited with dread, endured with courage and forgotten with haste.",
        koreanTranslation:
          "매달 첫 번째 수요일은 두려움 속에 기다리고 용기를 내어 견딘 뒤 서둘러 잊어야 하는 정말 끔찍한 날이었다.",
        expressions: [
          { phrase: "await with dread", meaning: "두려운 마음으로 기다리다" },
          { phrase: "endure with courage", meaning: "용기를 내어 견디다" },
        ],
      },
      {
        id: "daddy-long-legs-opening-02",
        chapterLabel: "Blue Wednesday · Opening 02",
        chapterKorean: "첫 장 · 2번째 구절",
        englishTitle: "Spotless Rooms",
        koreanTitle: "티끌 하나 없는 방",
        englishPassage:
          "Every floor must be spotless, every chair dustless, and every bed without a wrinkle.",
        koreanTranslation:
          "모든 바닥은 얼룩 하나 없이 깨끗해야 했고 모든 의자에는 먼지 하나 없어야 했으며 모든 침대에는 주름 하나 없어야 했다.",
        expressions: [
          {
            phrase: "must be spotless",
            meaning: "티끌 하나 없이 깨끗해야 한다",
          },
          { phrase: "without a wrinkle", meaning: "주름 하나 없이" },
        ],
      },
      {
        id: "daddy-long-legs-opening-03",
        chapterLabel: "Blue Wednesday · Opening 03",
        chapterKorean: "첫 장 · 3번째 구절",
        englishTitle: "Ninety-Seven Orphans",
        koreanTitle: "아흔일곱 명의 고아",
        englishPassage:
          "Ninety-seven squirming little orphans must be scrubbed and combed and buttoned into freshly starched ginghams; and all ninety-seven reminded of their manners, and told to say, 'Yes, sir,' 'No, sir,' whenever a Trustee spoke.",
        koreanTranslation:
          "꿈틀거리는 아흔일곱 명의 어린 고아들을 씻기고 빗질하고 갓 풀 먹인 깅엄 옷의 단추까지 채워야 했으며 이사가 말을 걸 때마다 ‘네, 선생님’, ‘아니요, 선생님’이라고 대답하도록 모두에게 예절을 다시 일러 주어야 했다.",
        expressions: [
          { phrase: "be reminded of", meaning: "~을 다시 일깨움 받다" },
          { phrase: "whenever someone spoke", meaning: "누군가 말할 때마다" },
        ],
      },
      {
        id: "daddy-long-legs-opening-04",
        chapterLabel: "Blue Wednesday · Opening 04",
        chapterKorean: "첫 장 · 4번째 구절",
        englishTitle: "The Oldest Orphan",
        koreanTitle: "가장 나이가 많은 고아",
        englishPassage:
          "It was a distressing time; and poor Jerusha Abbott, being the oldest orphan, had to bear the brunt of it.",
        koreanTranslation:
          "괴로운 시간이었고 가장 나이가 많은 고아인 불쌍한 제루샤 애벗이 그 고생을 고스란히 떠맡아야 했다.",
        expressions: [
          { phrase: "a distressing time", meaning: "괴로운 시간" },
          {
            phrase: "bear the brunt of",
            meaning: "~의 가장 큰 피해나 부담을 떠맡다",
          },
        ],
      },
      {
        id: "daddy-long-legs-opening-05",
        chapterLabel: "Blue Wednesday · Opening 05",
        chapterKorean: "첫 장 · 5번째 구절",
        englishTitle: "The Day Draws to a Close",
        koreanTitle: "하루가 저물다",
        englishPassage:
          "But this particular first Wednesday, like its predecessors, finally dragged itself to a close.",
        koreanTranslation:
          "하지만 여느 때와 마찬가지로 이번 달 첫 수요일도 마침내 느릿느릿 끝나 갔다.",
        expressions: [
          {
            phrase: "like its predecessors",
            meaning: "이전의 것들과 마찬가지로",
          },
          { phrase: "drag to a close", meaning: "느릿느릿 끝나 가다" },
        ],
      },
      {
        id: "daddy-long-legs-opening-06",
        chapterLabel: "Blue Wednesday · Opening 06",
        chapterKorean: "첫 장 · 6번째 구절",
        englishTitle: "Back to Work",
        koreanTitle: "다시 일하러",
        englishPassage:
          "Jerusha escaped from the pantry where she had been making sandwiches for the asylum's guests, and turned upstairs to accomplish her regular work.",
        koreanTranslation:
          "제루샤는 고아원 손님들에게 줄 샌드위치를 만들던 식료품 저장실에서 빠져나와 평소 맡은 일을 하러 위층으로 향했다.",
        expressions: [
          { phrase: "escape from", meaning: "~에서 빠져나오다" },
          { phrase: "regular work", meaning: "평소 맡은 일" },
        ],
      },
    ],
  },
  {
    slug: "the-wonderful-wizard-of-oz",
    englishTitle: "The Wonderful Wizard of Oz",
    koreanTitle: "오즈의 마법사",
    author: "L. Frank Baum",
    publicationYear: 1900,
    gutenbergEbookNumber: 55,
    gutenbergUrl: "https://www.gutenberg.org/ebooks/55",
    readingLevel: "매우 쉬움 · 모험 동화",
    description:
      "회오리바람에 휩쓸린 도로시가 집으로 돌아가기 위해 새로운 친구들과 에메랄드 시티를 향합니다. 장면이 선명하고 문장 구조가 비교적 단순합니다.",
    lessons: [
      {
        id: "the-wonderful-wizard-of-oz-opening-01",
        chapterLabel: "Chapter I · The Cyclone",
        chapterKorean: "1장 · 1번째 구절",
        englishTitle: "Dorothy in Kansas",
        koreanTitle: "캔자스의 도로시",
        englishPassage:
          "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.",
        koreanTranslation:
          "도로시는 농부인 헨리 아저씨와 그의 아내인 엠 아주머니와 함께 광활한 캔자스 대평원 한가운데 살았다.",
        expressions: [
          { phrase: "in the midst of", meaning: "~의 한가운데에" },
          { phrase: "who was a farmer", meaning: "농부였던 사람" },
        ],
      },
      {
        id: "the-wonderful-wizard-of-oz-opening-02",
        chapterLabel: "Chapter I · The Cyclone",
        chapterKorean: "1장 · 2번째 구절",
        englishTitle: "A Small House",
        koreanTitle: "작은 집",
        englishPassage:
          "Their house was small, for the lumber to build it had to be carried by wagon many miles.",
        koreanTranslation:
          "집을 지을 목재를 수레로 아주 먼 곳에서 실어 와야 했기 때문에 그들의 집은 작았다.",
        expressions: [
          { phrase: "lumber to build it", meaning: "그것을 지을 목재" },
          { phrase: "be carried by wagon", meaning: "수레로 운반되다" },
        ],
      },
      {
        id: "the-wonderful-wizard-of-oz-opening-03",
        chapterLabel: "Chapter I · The Cyclone",
        chapterKorean: "1장 · 3번째 구절",
        englishTitle: "One Room",
        koreanTitle: "방 하나",
        englishPassage:
          "There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds.",
        koreanTranslation:
          "벽 네 개와 바닥과 지붕으로 이루어진 방 하나가 전부였고 그 방에는 낡아 보이는 요리용 난로와 그릇장, 탁자, 의자 서너 개, 침대들이 놓여 있었다.",
        expressions: [
          {
            phrase: "which made one room",
            meaning: "그것으로 방 하나를 이루었다",
          },
          { phrase: "rusty looking", meaning: "낡고 녹슨 듯한" },
        ],
      },
      {
        id: "the-wonderful-wizard-of-oz-opening-04",
        chapterLabel: "Chapter I · The Cyclone",
        chapterKorean: "1장 · 4번째 구절",
        englishTitle: "Beds in the Corners",
        koreanTitle: "구석에 놓인 침대들",
        englishPassage:
          "Uncle Henry and Aunt Em had a big bed in one corner, and Dorothy a little bed in another corner.",
        koreanTranslation:
          "헨리 아저씨와 엠 아주머니의 큰 침대는 한쪽 구석에, 도로시의 작은 침대는 다른 쪽 구석에 놓여 있었다.",
        expressions: [
          { phrase: "in one corner", meaning: "한쪽 구석에" },
          { phrase: "in another corner", meaning: "다른 쪽 구석에" },
        ],
      },
      {
        id: "the-wonderful-wizard-of-oz-opening-05",
        chapterLabel: "Chapter I · The Cyclone",
        chapterKorean: "1장 · 5번째 구절",
        englishTitle: "The Cyclone Cellar",
        koreanTitle: "회오리바람 대피소",
        englishPassage:
          "There was no garret at all, and no cellar—except a small hole dug in the ground, called a cyclone cellar, where the family could go in case one of those great whirlwinds arose, mighty enough to crush any building in its path.",
        koreanTranslation:
          "다락방도 지하실도 전혀 없었지만 땅에 판 작은 구덩이 하나만은 예외였다. 그것은 길목의 건물이라면 무엇이든 부술 만큼 강한 회오리바람이 일어났을 때 가족이 피할 수 있는 회오리바람 대피소였다.",
        expressions: [
          { phrase: "in case", meaning: "~할 경우에 대비하여" },
          { phrase: "in its path", meaning: "그것이 지나가는 길에" },
        ],
      },
      {
        id: "the-wonderful-wizard-of-oz-opening-06",
        chapterLabel: "Chapter I · The Cyclone",
        chapterKorean: "1장 · 6번째 구절",
        englishTitle: "A Trap Door",
        koreanTitle: "바닥의 뚜껑문",
        englishPassage:
          "It was reached by a trap door in the middle of the floor, from which a ladder led down into the small, dark hole.",
        koreanTranslation:
          "방 한가운데의 뚜껑문을 열면 그곳으로 갈 수 있었고 그 문에서부터 작고 어두운 구덩이 아래로 사다리가 이어졌다.",
        expressions: [
          { phrase: "a trap door", meaning: "바닥이나 천장의 뚜껑문" },
          { phrase: "lead down into", meaning: "~의 아래로 이어지다" },
        ],
      },
    ],
  },
  {
    slug: "alice-in-wonderland",
    englishTitle: "Alice’s Adventures in Wonderland",
    koreanTitle: "이상한 나라의 앨리스",
    author: "Lewis Carroll",
    publicationYear: 1865,
    gutenbergEbookNumber: 11,
    gutenbergUrl: "https://www.gutenberg.org/ebooks/11",
    readingLevel: "쉬움 · 판타지 동화",
    description:
      "무료함을 느끼던 앨리스가 시계를 든 하얀 토끼를 따라 토끼 굴로 뛰어들며 시작되는 기묘한 모험입니다. 대화와 상상력이 풍부해 이야기 영어를 익히기 좋습니다.",
    lessons: [
      {
        id: "alice-in-wonderland-opening-01",
        chapterLabel: "Chapter I · Down the Rabbit-Hole",
        chapterKorean: "1장 · 1번째 구절",
        englishTitle: "Brave at Home",
        koreanTitle: "집에서는 용감한 아이",
        englishPassage: "How brave they’ll all think me at home!",
        koreanTranslation:
          "집에 돌아가면 모두 내가 얼마나 용감하다고 생각할까!",
        expressions: [
          { phrase: "how brave", meaning: "얼마나 용감한지" },
          { phrase: "at home", meaning: "집에서, 고향에서" },
        ],
      },
      {
        id: "alice-in-wonderland-opening-02",
        chapterLabel: "Chapter I · Down the Rabbit-Hole",
        chapterKorean: "1장 · 2번째 구절",
        englishTitle: "The Fall",
        koreanTitle: "끝없는 추락",
        englishPassage: "Would the fall never come to an end?",
        koreanTranslation: "이 추락은 도대체 언제 끝나는 걸까?",
        expressions: [
          { phrase: "come to an end", meaning: "끝나다" },
          { phrase: "would ... never", meaning: "도대체 끝내 ~하지 않을까" },
        ],
      },
      {
        id: "alice-in-wonderland-opening-03",
        chapterLabel: "Chapter I · Down the Rabbit-Hole",
        chapterKorean: "1장 · 3번째 구절",
        englishTitle: "How Many Miles",
        koreanTitle: "얼마나 멀리 떨어졌을까",
        englishPassage:
          "“I wonder how many miles I’ve fallen by this time?”",
        koreanTranslation: "“지금까지 몇 마일이나 떨어진 걸까?”",
        expressions: [
          { phrase: "I wonder", meaning: "~인지 궁금하다" },
          { phrase: "by this time", meaning: "지금쯤, 이때까지" },
        ],
      },
      {
        id: "alice-in-wonderland-opening-04",
        chapterLabel: "Chapter I · Down the Rabbit-Hole",
        chapterKorean: "1장 · 4번째 구절",
        englishTitle: "Alice Talks Again",
        koreanTitle: "다시 말하기 시작한 앨리스",
        englishPassage:
          "There was nothing else to do, so Alice soon began talking again.",
        koreanTranslation:
          "달리 할 일이 없어서 앨리스는 곧 다시 말을 하기 시작했다.",
        expressions: [
          { phrase: "nothing else to do", meaning: "달리 할 일이 없음" },
          { phrase: "begin talking", meaning: "말하기 시작하다" },
        ],
      },
      {
        id: "alice-in-wonderland-opening-05",
        chapterLabel: "Chapter I · Down the Rabbit-Hole",
        chapterKorean: "1장 · 5번째 구절",
        englishTitle: "No Use in Crying",
        koreanTitle: "울어 봐야 소용없어",
        englishPassage: "“Come, there’s no use in crying like that!”",
        koreanTranslation: "“자, 그렇게 울어 봐야 소용없어!”",
        expressions: [
          { phrase: "there’s no use in", meaning: "~해 봐야 소용없다" },
          { phrase: "like that", meaning: "그렇게, 그런 식으로" },
        ],
      },
      {
        id: "alice-in-wonderland-opening-06",
        chapterLabel: "Chapter I · Down the Rabbit-Hole",
        chapterKorean: "1장 · 6번째 구절",
        englishTitle: "Back to Work",
        koreanTitle: "케이크를 다 먹다",
        englishPassage:
          "So she set to work, and very soon finished off the cake.",
        koreanTranslation:
          "그래서 앨리스는 곧바로 시작했고, 얼마 지나지 않아 케이크를 다 먹었다.",
        expressions: [
          { phrase: "set to work", meaning: "곧바로 시작하다" },
          { phrase: "finish off", meaning: "남김없이 다 먹다, 끝내다" },
        ],
      },
    ],
  },
  {
    slug: "dr-jekyll-and-mr-hyde",
    englishTitle: "Strange Case of Dr Jekyll and Mr Hyde",
    koreanTitle: "지킬 박사와 하이드",
    author: "Robert Louis Stevenson",
    publicationYear: 1886,
    gutenbergEbookNumber: 43,
    gutenbergUrl: "https://www.gutenberg.org/ebooks/43",
    readingLevel: "중간 · 고딕 미스터리",
    description:
      "런던의 변호사 어터슨이 수상한 인물 하이드와 친구 지킬 박사의 관계를 추적합니다. 긴장감 있는 사건 전개를 따라가며 묘사와 추론에 쓰이는 영어를 익힐 수 있습니다.",
    lessons: [
      {
        id: "dr-jekyll-and-mr-hyde-opening-01",
        chapterLabel: "Chapter 1 · Story of the Door",
        chapterKorean: "1장 · 1번째 구절",
        englishTitle: "A Hellish Sight",
        koreanTitle: "직접 보면 끔찍한 광경",
        englishPassage:
          "It sounds nothing to hear, but it was hellish to see.",
        koreanTranslation:
          "말로 들으면 별것 아닌 듯하지만, 직접 보면 끔찍한 광경이었다.",
        expressions: [
          { phrase: "to hear", meaning: "들어 보면" },
          { phrase: "hellish to see", meaning: "보기에는 끔찍한" },
        ],
      },
      {
        id: "dr-jekyll-and-mr-hyde-opening-02",
        chapterLabel: "Chapter 1 · Story of the Door",
        chapterKorean: "1장 · 2번째 구절",
        englishTitle: "A Curious Circumstance",
        koreanTitle: "기묘한 사정 하나",
        englishPassage: "But there was one curious circumstance.",
        koreanTranslation: "하지만 한 가지 기묘한 사정이 있었다.",
        expressions: [
          { phrase: "there was", meaning: "~이 있었다" },
          { phrase: "curious circumstance", meaning: "기묘한 사정" },
        ],
      },
      {
        id: "dr-jekyll-and-mr-hyde-opening-03",
        chapterLabel: "Chapter 1 · Story of the Door",
        chapterKorean: "1장 · 3번째 구절",
        englishTitle: "Loathing at First Sight",
        koreanTitle: "첫눈에 느낀 혐오감",
        englishPassage:
          "I had taken a loathing to my gentleman at first sight.",
        koreanTranslation: "나는 그자를 보자마자 혐오감을 느꼈다.",
        expressions: [
          { phrase: "take a loathing to", meaning: "~을 몹시 싫어하게 되다" },
          { phrase: "at first sight", meaning: "첫눈에" },
        ],
      },
      {
        id: "dr-jekyll-and-mr-hyde-opening-04",
        chapterLabel: "Chapter 1 · Story of the Door",
        chapterKorean: "1장 · 4번째 구절",
        englishTitle: "The Place with the Door",
        koreanTitle: "그 문이 있는 곳",
        englishPassage:
          "“And you never asked about the—place with the door?”",
        koreanTranslation:
          "“그런데 그 문이 있는 곳에 대해서는 한 번도 묻지 않았나?”",
        expressions: [
          { phrase: "ask about", meaning: "~에 관해 묻다" },
          { phrase: "the place with", meaning: "~이 있는 장소" },
        ],
      },
      {
        id: "dr-jekyll-and-mr-hyde-opening-05",
        chapterLabel: "Chapter 1 · Story of the Door",
        chapterKorean: "1장 · 5번째 구절",
        englishTitle: "The Man’s Name",
        koreanTitle: "그 남자의 이름",
        englishPassage:
          "I want to ask the name of that man who walked over the child.”",
        koreanTranslation:
          "나는 그 아이를 밟고 지나간 남자의 이름을 묻고 싶네.”",
        expressions: [
          { phrase: "want to ask", meaning: "묻고 싶다" },
          { phrase: "walk over", meaning: "밟고 지나가다" },
        ],
      },
      {
        id: "dr-jekyll-and-mr-hyde-opening-06",
        chapterLabel: "Chapter 1 · Story of the Door",
        chapterKorean: "1장 · 6번째 구절",
        englishTitle: "A Man to Dislike",
        koreanTitle: "이유를 알 수 없는 혐오",
        englishPassage:
          "I never saw a man I so disliked, and yet I scarce know why.",
        koreanTranslation:
          "그토록 싫은 사람은 처음 보았지만, 왜 싫은지는 도무지 알 수 없었다.",
        expressions: [
          { phrase: "and yet", meaning: "그런데도, 하지만" },
          { phrase: "scarce know why", meaning: "이유를 거의 알지 못하다" },
        ],
      },
    ],
  },
];

export type PublicDomainBookLessonView = {
  book: PublicDomainBook;
  lesson: PublicDomainBookLesson;
  position: number;
  total: number;
  previousLessonId: string | null;
  nextLessonId: string | null;
};

export function getPublicDomainBook(slug: string) {
  return PUBLIC_DOMAIN_BOOKS.find((book) => book.slug === slug) ?? null;
}

export function getPublicDomainBookLesson(
  bookSlug: string,
  lessonId: string,
): PublicDomainBookLessonView | null {
  const book = getPublicDomainBook(bookSlug);
  if (!book) return null;
  const position = book.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (position < 0) return null;

  return {
    book,
    lesson: book.lessons[position]!,
    position: position + 1,
    total: book.lessons.length,
    previousLessonId:
      position > 0 ? (book.lessons[position - 1]?.id ?? null) : null,
    nextLessonId:
      position < book.lessons.length - 1
        ? (book.lessons[position + 1]?.id ?? null)
        : null,
  };
}

export function findPublicDomainBookLesson(
  lessonId: string,
): PublicDomainBookLessonView | null {
  for (const book of PUBLIC_DOMAIN_BOOKS) {
    const lesson = getPublicDomainBookLesson(book.slug, lessonId);
    if (lesson) return lesson;
  }
  return null;
}

function normalizeBookSentence(value: string) {
  return value
    .normalize("NFKC")
    .replaceAll("’", "'")
    .replace(/--|—/gu, "—")
    .replace(/\s+/gu, " ")
    .trim();
}

export function getCuratedPublicDomainBookTranslation(
  bookSlug: string,
  englishSentence: string,
) {
  const book = getPublicDomainBook(bookSlug);
  if (!book) return null;
  const normalizedSentence = normalizeBookSentence(englishSentence);
  return (
    book.lessons.find(
      (lesson) =>
        normalizeBookSentence(lesson.englishPassage) === normalizedSentence,
    )?.koreanTranslation ?? null
  );
}
