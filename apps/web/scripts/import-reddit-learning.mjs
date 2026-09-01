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
  throw new Error("No Reddit learning topics were returned.");
}

const ids = new Set();
for (const topic of topics) {
  if (
    typeof topic?.id !== "string" ||
    typeof topic?.englishTitle !== "string" ||
    typeof topic?.englishPassage !== "string" ||
    typeof topic?.koreanTranslation !== "string" ||
    !Array.isArray(topic?.expressions) ||
    topic.expressions.length < 2
  ) {
    throw new Error("A Reddit learning topic has an invalid shape.");
  }
  if (ids.has(topic.id)) throw new Error(`Duplicate topic id: ${topic.id}`);
  ids.add(topic.id);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const sql = postgres(databaseUrl, { max: 1 });

try {
  const missing = await sql`
    select id
    from reddit_topic
    where english_passage is null
  `;
  const missingIds = new Set(missing.map((row) => row.id));
  const unexpected = topics.filter((topic) => !missingIds.has(topic.id));
  if (unexpected.length > 0 || topics.length !== missing.length) {
    throw new Error(
      `Expected ${missing.length} missing topics, received ${topics.length}.`,
    );
  }

  await sql.begin(async (transaction) => {
    for (const topic of topics) {
      await transaction`
        update reddit_topic
        set
          english_title = ${topic.englishTitle},
          english_passage = ${topic.englishPassage},
          korean_translation = ${topic.koreanTranslation},
          expressions = ${transaction.json(topic.expressions)}
        where id = ${topic.id}
      `;
    }
  });
  console.log(`Imported ${topics.length} Reddit English learning topics.`);
} finally {
  await sql.end();
}
