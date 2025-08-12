import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/s(.*)",
  "/api/submissions(.*)",
  "/api/jobs/retention(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const isPublic = isPublicRoute(request);
  const { userId, redirectToSignIn } = await auth();
  if (!userId && !isPublic) {
    return redirectToSignIn();
  }
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
