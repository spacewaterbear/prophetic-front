import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;

  // Dev mode: skip all auth checks when NEXT_PUBLIC_SKIP_AUTH is set
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === "true") {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userStatus = (req.auth?.user as any)?.status;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (req.auth?.user as any)?.isAdmin === true;

  // Public routes that don't require authentication
  const isPublicRoute = nextUrl.pathname === "/login" || nextUrl.pathname.startsWith("/share/") || nextUrl.pathname === "/test-verification" || nextUrl.pathname === "/test_visi";
  const isRegistrationPending = nextUrl.pathname === "/registration-pending";

  // If not logged in and trying to access protected route, redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Environment-based access control: only admins can access staging/preprod
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL;
  const isRestrictedEnv = appEnv === "staging" || appEnv === "preprod";

  if (isLoggedIn && isRestrictedEnv && !isAdmin && productionUrl) {
    // Non-admin trying to access staging/preprod - redirect to production
    return NextResponse.redirect(productionUrl);
  }

  // If logged in but unauthorized, redirect to registration pending page
  if (isLoggedIn && userStatus === 'unauthorized' && !isRegistrationPending && !isPublicRoute) {
    return NextResponse.redirect(new URL("/registration-pending", nextUrl));
  }

  // If logged in and authorized (any valid tier) but on registration pending page, redirect to home
  const authorizedStatuses = ['free', 'paid', 'admini', 'discover', 'intelligence', 'oracle'];
  if (isLoggedIn && authorizedStatuses.includes(userStatus) && isRegistrationPending) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // If logged in and on login page, redirect to home or registration pending
  if (isLoggedIn && isPublicRoute) {
    if (userStatus === 'unauthorized') {
      return NextResponse.redirect(new URL("/registration-pending", nextUrl));
    }
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
