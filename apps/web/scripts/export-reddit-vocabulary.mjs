import process from "node:process";

import postgres from "postgres";

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
    order by id
  `;
  console.log(
    JSON.stringify({
      topics: rows.map((row) => ({
        id: row.id,
        words: extractWords(`${row.english_title} ${row.english_passage}`),
      })),
    }),
  );
} finally {
  await sql.end();
}
