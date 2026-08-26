import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index";

export type NewsOrderDatabase = PostgresJsDatabase<typeof schema>;

export function createDatabase(databaseUrl: string, maxConnections = 5) {
  const client = postgres(databaseUrl, {
    max: maxConnections,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}
