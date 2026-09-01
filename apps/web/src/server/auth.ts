import "server-only";

import * as authSchema from "@newsorder/db/schema";
import { users } from "@newsorder/db/schema";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { SITE_NAME } from "@/lib/site";

import { getDatabase, hasDatabase } from "./db";
import { getServerEnv, isFixtureRuntime } from "./env";

function createNewsOrderAuth() {
  const env = getServerEnv();
  if (!env.DATABASE_URL || !env.BETTER_AUTH_SECRET) {
    throw new Error("AUTH_NOT_CONFIGURED");
  }

  const googleConfigured = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  );

  return betterAuth({
    appName: SITE_NAME,
    baseURL: env.NEXT_PUBLIC_APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: authSchema,
    }),
    user: { modelName: "users" },
    session: { modelName: "sessions" },
    account: { modelName: "accounts" },
    verification: { modelName: "verifications" },
    emailAndPassword: { enabled: false },
    socialProviders: googleConfigured
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {},
    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: "database",
      modelName: "rateLimits",
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const bootstrapEmail = env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
            if (
              !bootstrapEmail ||
              user.email.toLowerCase() !== bootstrapEmail
            ) {
              return { data: user };
            }

            const existingAdmin = await getDatabase()
              .select({ id: users.id })
              .from(users)
              .where(eq(users.role, "admin"))
              .limit(1);

            return {
              data:
                existingAdmin.length === 0 ? { ...user, role: "admin" } : user,
            };
          },
        },
      },
    },
    advanced: {
      useSecureCookies: env.NEWSORDER_RUNTIME_MODE === "production",
    },
  });
}

export type NewsOrderAuth = ReturnType<typeof createNewsOrderAuth>;

let authInstance: NewsOrderAuth | undefined;

export function getAuth(): NewsOrderAuth {
  authInstance ??= createNewsOrderAuth();
  return authInstance;
}

export type AppSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: string;
  };
};

export async function getAppSession(
  requestHeaders: Headers,
): Promise<AppSession | null> {
  const env = getServerEnv();

  if (
    isFixtureRuntime() &&
    env.NEWSORDER_DEV_ADMIN &&
    process.env.NODE_ENV !== "production"
  ) {
    return {
      user: {
        id: "fixture-admin",
        name: "로컬 관리자",
        email: "admin@fixture.invalid",
        role: "admin",
      },
    };
  }

  if (!hasDatabase() || !env.BETTER_AUTH_SECRET) return null;

  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      role: session.user.role ?? "user",
    },
  };
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function requireUser(
  requestHeaders: Headers,
): Promise<AppSession> {
  const session = await getAppSession(requestHeaders);
  if (!session) throw new AuthenticationError("로그인이 필요합니다.", 401);
  return session;
}

export async function requireAdmin(
  requestHeaders: Headers,
): Promise<AppSession> {
  const session = await requireUser(requestHeaders);
  const roles = session.user.role.split(",").map((role) => role.trim());
  if (!roles.includes("admin"))
    throw new AuthenticationError("관리자 권한이 필요합니다.", 403);
  return session;
}
