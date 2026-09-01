import process from "node:process";

import postgres from "postgres";

const input = await new Promise((resolve, reject) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    value += chunk;
  });
  process.stdin.on("end", () => resolve(value));
  process.stdin.on("error", reject);
});
const envelope = JSON.parse(input);
const structured = envelope.structured_output
  ? envelope.structured_output
  : typeof envelope.result === "string"
    ? JSON.parse(envelope.result)
    : envelope.result;
const topics = structured?.topics;
if (!Array.isArray(topics) || topics.length === 0) {
  throw new Error("No Reddit vocabulary was returned.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const sql = postgres(databaseUrl, { max: 1 });

function extractWords(value) {
  return [
    ...new Set(
      (value.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? []).map((word) =>
        word.normalize("NFKC").replaceAll("’", "'").toLowerCase(),
      ),
    ),
  ];
}

try {
  const rows = await sql`
    select id, english_title, english_passage
    from reddit_topic
    where english_passage is not null and word_meanings is null
  `;
  const expected = new Map(
    rows.map((row) => [
      row.id,
      extractWords(`${row.english_title} ${row.english_passage}`),
    ]),
  );
  if (topics.length !== expected.size) {
    throw new Error(
      `Expected ${expected.size} vocabulary sets, received ${topics.length}.`,
    );
  }

  const updates = topics.map((topic) => {
    const words = expected.get(topic?.id);
    if (!words || !Array.isArray(topic?.vocabulary)) {
      throw new Error("A vocabulary set has an invalid topic id or shape.");
    }
    const meanings = Object.fromEntries(
      topic.vocabulary
        .filter(
          (entry) =>
            typeof entry?.word === "string" &&
            typeof entry?.meaning === "string",
        )
        .map((entry) => [
          entry.word.normalize("NFKC").replaceAll("’", "'").toLowerCase(),
          entry.meaning.trim(),
        ]),
    );
    const missing = words.filter((word) => !meanings[word]);
    if (missing.length > 0) {
      throw new Error(
        `Topic ${topic.id} is missing ${missing.length} word meanings.`,
      );
    }
    return { id: topic.id, meanings };
  });

  await sql.begin(async (transaction) => {
    for (const update of updates) {
      await transaction`
        update reddit_topic
        set word_meanings = ${transaction.json(update.meanings)}
        where id = ${update.id}
      `;
    }
  });
  console.log(`Imported vocabulary for ${updates.length} Reddit topics.`);
} finally {
  await sql.end();
}
