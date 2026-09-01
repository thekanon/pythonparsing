import { synchronizeProgress } from "./sync";
import type { AnonymousProgress, ProgressStage } from "./types";

const stage: ProgressStage = {
  attempts: 2,
  bestScore: 70,
  completedAt: null,
  helped: false,
  lastAttemptAt: "2026-08-26T00:00:00.000Z",
};

describe("progress synchronization", () => {
  it("hydrates an empty browser snapshot from the authenticated API", async () => {
    const remote: AnonymousProgress = {
      version: 1,
      stages: { "lesson-a:title": stage },
    };
    const request = vi.fn(async () => Response.json(remote));

    await expect(
      synchronizeProgress({ version: 1, stages: {} }, request),
    ).resolves.toEqual(remote);
    expect(request).toHaveBeenCalledWith("/api/progress", {
      cache: "no-store",
    });
  });

  it("sends more than forty stages in bounded idempotent chunks", async () => {
    const local: AnonymousProgress = {
      version: 1,
      stages: Object.fromEntries(
        Array.from({ length: 81 }, (_, index) => [
          `00000000-0000-4000-8000-${String(index).padStart(12, "0")}:title`,
          stage,
        ]),
      ),
    };
    let remote: AnonymousProgress = { version: 1, stages: {} };
    const request = vi.fn(async (_input: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        progress: AnonymousProgress;
      };
      remote = {
        version: 1,
        stages: { ...remote.stages, ...body.progress.stages },
      };
      return Response.json(remote);
    });
    let id = 0;

    const result = await synchronizeProgress(
      local,
      request,
      () => `00000000-0000-4000-8000-${String(id++).padStart(12, "0")}`,
    );

    expect(request).toHaveBeenCalledTimes(3);
    expect(Object.keys(result.stages)).toHaveLength(81);
  });

  it("keeps Reddit and book progress in the browser and excludes it from server sync", async () => {
    const local: AnonymousProgress = {
      version: 1,
      stages: {
        "lesson-a:title": stage,
        "reddit:topic-a:title": { ...stage, bestScore: 100 },
        "book:daddy-long-legs-opening-01:title": { ...stage, bestScore: 90 },
        "book-practice:daddy-long-legs-intro-s001:excerpt": {
          ...stage,
          bestScore: 80,
        },
      },
    };
    const request = vi.fn(async (_input: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        progress: AnonymousProgress;
      };
      return Response.json(body.progress);
    });

    const result = await synchronizeProgress(local, request, () => "sync-id");

    expect(request).toHaveBeenCalledOnce();
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body)) as {
      progress: AnonymousProgress;
    };
    expect(body.progress.stages).toEqual({ "lesson-a:title": stage });
    expect(result.stages["reddit:topic-a:title"]?.bestScore).toBe(100);
    expect(
      result.stages["book:daddy-long-legs-opening-01:title"]?.bestScore,
    ).toBe(90);
    expect(
      result.stages["book-practice:daddy-long-legs-intro-s001:excerpt"]
        ?.bestScore,
    ).toBe(80);
  });
});
