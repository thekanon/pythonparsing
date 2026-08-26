import "server-only";

import { z } from "zod";

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.url().optional(),
);

const serverEnvSchema = z
  .object({
    NEWSORDER_RUNTIME_MODE: z
      .enum(["fixture", "production"])
      .default("fixture"),
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: optionalString,
    BETTER_AUTH_SECRET: optionalString,
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    BOOTSTRAP_ADMIN_EMAIL: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.email().optional(),
    ),
    CRON_SECRET: optionalString,
    GOOGLE_CLOUD_PROJECT: optionalString,
    GOOGLE_CLOUD_LOCATION: z.string().trim().default("global"),
    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: z.literal("gemini-3.7-flash").default("gemini-3.7-flash"),
    BLOB_READ_WRITE_TOKEN: optionalString,
    BACKUP_ENCRYPTION_KEY: optionalString,
    DELETION_EVENT_HMAC_KEY: optionalString,
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
    NEWSORDER_DEV_ADMIN: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .strict()
  .superRefine((env, context) => {
    if (env.NEWSORDER_RUNTIME_MODE !== "production") return;

    const required = [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "CRON_SECRET",
      "GOOGLE_CLOUD_PROJECT",
      "GEMINI_API_KEY",
      "BLOB_READ_WRITE_TOKEN",
      "BACKUP_ENCRYPTION_KEY",
      "DELETION_EVENT_HMAC_KEY",
    ] as const;

    for (const key of required) {
      if (!env[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required in production mode.`,
        });
      }
    }

    if (env.NEWSORDER_DEV_ADMIN) {
      context.addIssue({
        code: "custom",
        path: ["NEWSORDER_DEV_ADMIN"],
        message:
          "The development admin preview cannot be enabled in production mode.",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= serverEnvSchema.parse({
    NEWSORDER_RUNTIME_MODE: process.env.NEWSORDER_RUNTIME_MODE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    BOOTSTRAP_ADMIN_EMAIL: process.env.BOOTSTRAP_ADMIN_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY,
    DELETION_EVENT_HMAC_KEY: process.env.DELETION_EVENT_HMAC_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEWSORDER_DEV_ADMIN: process.env.NEWSORDER_DEV_ADMIN,
  });

  return cachedEnv;
}

export function isFixtureRuntime() {
  return getServerEnv().NEWSORDER_RUNTIME_MODE === "fixture";
}
