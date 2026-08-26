import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "./client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const { client, db } = createDatabase(databaseUrl, 1);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
} finally {
  await client.end();
}
