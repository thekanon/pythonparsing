import { chunkAnonymousProgress, mergeAnonymousProgress } from "./merge";
import {
  anonymousProgressSchema,
  MAX_PROGRESS_STAGES_PER_MERGE,
  type AnonymousProgress,
} from "./types";

type ProgressRequest = (input: string, init?: RequestInit) => Promise<Response>;

function parseProgress(value: unknown): AnonymousProgress {
  return anonymousProgressSchema.parse(value);
}

async function responseProgress(
  response: Response,
): Promise<AnonymousProgress> {
  if (!response.ok) throw new Error(`PROGRESS_SYNC_HTTP_${response.status}`);
  return parseProgress(await response.json());
}

export async function synchronizeProgress(
  local: AnonymousProgress,
  request: ProgressRequest = fetch,
  createId: () => string = () => crypto.randomUUID(),
): Promise<AnonymousProgress> {
  const serverProgress: AnonymousProgress = {
    version: 1,
    stages: Object.fromEntries(
      Object.entries(local.stages).filter(
        ([key]) =>
          !key.startsWith("reddit:") &&
          !key.startsWith("book:") &&
          !key.startsWith("book-practice:"),
      ),
    ),
  };
  const chunks = chunkAnonymousProgress(
    serverProgress,
    MAX_PROGRESS_STAGES_PER_MERGE,
  );

  if (chunks.length === 0) {
    const remote = await responseProgress(
      await request("/api/progress", { cache: "no-store" }),
    );
    return mergeAnonymousProgress(local, remote);
  }

  let remote: AnonymousProgress = { version: 1, stages: {} };
  for (const progress of chunks) {
    remote = await responseProgress(
      await request("/api/progress/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyId: createId(), progress }),
      }),
    );
  }

  return mergeAnonymousProgress(local, remote);
}
