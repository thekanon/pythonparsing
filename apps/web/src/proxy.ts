import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { LEGACY_SITE_HOSTNAME, SITE_ORIGIN } from "@/lib/site";

export function proxy(request: NextRequest) {
  const forwardedHostname = request.headers
    .get("x-forwarded-host")
    ?.split(",", 1)[0]
    ?.trim();
  const hostname = (forwardedHostname ?? request.headers.get("host") ?? "")
    .split(":", 1)[0]
    ?.toLowerCase();

  if (
    hostname !== LEGACY_SITE_HOSTNAME ||
    request.nextUrl.pathname === "/legacy-storage-bridge"
  ) {
    return NextResponse.next();
  }

  const destination = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    SITE_ORIGIN,
  );

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: "/:path*",
};
