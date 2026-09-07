import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

let pathname = "/today";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/auth/site-account-link", () => ({
  SiteAccountLink: () => <a href="/account">계정</a>,
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    pathname = "/today";
  });

  it("marks the active primary navigation destination", () => {
    render(<SiteHeader />);

    const todayLinks = screen.getAllByRole("link", { name: "오늘 학습" });
    expect(todayLinks).toHaveLength(2);
    expect(todayLinks.every((link) => link.getAttribute("aria-current") === "page")).toBe(
      true,
    );

    for (const redditLink of screen.getAllByRole("link", { name: "Reddit 영어" })) {
      expect(redditLink).not.toHaveAttribute("aria-current");
    }
  });

  it("keeps the matching mobile destination in the menu", () => {
    pathname = "/books/chapter-1";
    render(<SiteHeader />);

    const bookLinks = screen.getAllByRole("link", { name: "고전 소설" });
    expect(bookLinks).toHaveLength(2);
    expect(bookLinks.every((link) => link.getAttribute("aria-current") === "page")).toBe(
      true,
    );
  });
});
