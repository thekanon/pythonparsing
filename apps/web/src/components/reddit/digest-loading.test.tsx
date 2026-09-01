import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RedditDigestLoading } from "./digest-loading";

describe("RedditDigestLoading", () => {
  it("announces the loading state without exposing decorative skeletons", () => {
    const { container } = render(<RedditDigestLoading />);

    expect(
      screen.getByRole("status", { name: "Reddit 학습을 불러오는 중" }),
    ).toHaveAttribute("aria-live", "polite");
    expect(
      container.querySelectorAll('section[aria-hidden="true"]'),
    ).toHaveLength(2);
  });
});
