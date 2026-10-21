import { NextResponse, type NextRequest } from "next/server";
import { resolveLegacyRoute } from "@/src/navigation/legacyRoutes";

export function middleware(request: NextRequest) {
  let segments: string[];
  try {
    segments = request.nextUrl.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return NextResponse.next();
  }
  const query: Record<string, string[]> = Object.create(null);
  request.nextUrl.searchParams.forEach((value, key) => {
    (query[key] ??= []).push(value);
  });
  const target = resolveLegacyRoute(segments, query);
  if (!target) return NextResponse.next();
  const destination = new URL(target, request.url);
  if (destination.href === request.nextUrl.href) return NextResponse.next();
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|images/|protos/).*)"],
};
