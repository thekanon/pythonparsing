import { createHmac } from "node:crypto";

import { deletionEvents, users } from "@newsorder/db/schema";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { AuthenticationError, requireUser } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { getServerEnv, isFixtureRuntime } from "@/server/env";

const deleteSchema = z.object({ confirm: z.literal(true) });

class LastAdminDeletionError extends Error {}

export async function DELETE(request: Request) {
  try {
    const session = await requireUser(request.headers);
    const body = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!body.success)
      return Response.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
    if (isFixtureRuntime()) return Response.json({ deleted: true });

    const hmacKey = getServerEnv().DELETION_EVENT_HMAC_KEY;
    if (!hmacKey)
      return Response.json(
        { error: "DELETION_NOT_CONFIGURED" },
        { status: 503 },
      );
    const userIdHmac = createHmac("sha256", hmacKey)
      .update(session.user.id)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 35 * 24 * 60 * 60 * 1_000);

    await getDatabase().transaction(async (transaction) => {
      const target = await transaction
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      if (!target[0]) return;

      if (target[0].role.split(",").includes("admin")) {
        const adminCount = await transaction
          .select({ value: count() })
          .from(users)
          .where(eq(users.role, "admin"));
        if ((adminCount[0]?.value ?? 0) <= 1) {
          throw new LastAdminDeletionError();
        }
      }

      await transaction
        .insert(deletionEvents)
        .values({ userIdHmac, expiresAt })
        .onConflictDoUpdate({
          target: deletionEvents.userIdHmac,
          set: { requestedAt: new Date(), expiresAt },
        });
      await transaction.delete(users).where(eq(users.id, session.user.id));
    });

    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof LastAdminDeletionError) {
      return Response.json({ error: "LAST_ADMIN_REQUIRED" }, { status: 409 });
    }
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
