import "server-only";

import { createDatabase, type NewsOrderDatabase } from "@newsorder/db/client";
import type postgres from "postgres";

import { getServerEnv } from "./env";

type DatabaseConnection = {
  db: NewsOrderDatabase;
  client: ReturnType<typeof postgres>;
};

const globalDatabase = globalThis as typeof globalThis & {
  newsOrderDatabase?: DatabaseConnection;
};

export function hasDatabase() {
  return Boolean(getServerEnv().DATABASE_URL);
}

export function getDatabase(): NewsOrderDatabase {
  const databaseUrl = getServerEnv().DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for this operation.");
  }

  globalDatabase.newsOrderDatabase ??= createDatabase(databaseUrl);
  return globalDatabase.newsOrderDatabase.db;
}

export function getDatabaseClient() {
  const databaseUrl = getServerEnv().DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for this operation.");
  }

  globalDatabase.newsOrderDatabase ??= createDatabase(databaseUrl);
  return globalDatabase.newsOrderDatabase.client;
}
