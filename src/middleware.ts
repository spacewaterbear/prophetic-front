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
  const isRestrictedAccess = nextUrl.pathname === "/restricted-access";

  // Environment-based access control variables
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  const isRestrictedEnv = appEnv === "staging" || appEnv === "preprod";

  // If not logged in and trying to access protected route, redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // If not logged in, allow access to public routes
  if (!isLoggedIn) {
    return NextResponse.next();
  }

  // --- From here, user IS logged in ---

  // If logged in and on login page, redirect based on admin status for restricted envs
  if (isPublicRoute && nextUrl.pathname === "/login") {
    // On restricted env, non-admin should be redirected to restricted access page
    if (isRestrictedEnv && !isAdmin) {
      return NextResponse.redirect(new URL("/restricted-access", nextUrl));
    }
    // Admin or production env: redirect to home or registration pending
    if (userStatus === 'unauthorized') {
      return NextResponse.redirect(new URL("/registration-pending", nextUrl));
    }
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Allow other public routes (share, test pages)
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // --- From here, user is logged in and on a protected route ---

  // Allow access to restricted-access page for non-admins in restricted environments
  if (isRestrictedAccess) {
    return NextResponse.next();
  }

  // Environment-based access control: only admins can access staging/preprod
  if (isRestrictedEnv && !isAdmin) {
    return NextResponse.redirect(new URL("/restricted-access", nextUrl));
  }

  // If logged in but unauthorized, redirect to registration pending page
  if (userStatus === 'unauthorized' && !isRegistrationPending) {
    return NextResponse.redirect(new URL("/registration-pending", nextUrl));
  }

  // If logged in and authorized (any valid tier) but on registration pending page, redirect to home
  const authorizedStatuses = ['free', 'paid', 'admini', 'discover', 'intelligence', 'oracle'];
  if (authorizedStatuses.includes(userStatus) && isRegistrationPending) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
