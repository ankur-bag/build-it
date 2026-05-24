import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/campaign(.*)",
  "/inbox(.*)",
  "/settings(.*)",
  "/api/campaigns(.*)",
  "/api/onboarding(.*)",
  "/api/upload(.*)",
]);

const isPublicRoute = createRouteMatcher(["/", "/sign-up(.*)", "/sign-in(.*)"]);
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = await auth();

  // If not authenticated and trying to access public routes, allow
  if (!userId && isPublicRoute(req)) {
    return;
  }

  // If not authenticated and not on public route, let Clerk redirect to sign-in
  if (!userId) {
    return;
  }

  // User is authenticated - no redirect needed, modal will show on home page
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};