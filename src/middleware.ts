import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userStatus = (req.auth?.user as any)?.status;

  // Public routes that don't require authentication
  const isPublicRoute = nextUrl.pathname === "/login" || nextUrl.pathname.startsWith("/share/");
  const isRegistrationPending = nextUrl.pathname === "/registration-pending";

  // If not logged in and trying to access protected route, redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // If logged in but unauthorized, redirect to registration pending page
  if (isLoggedIn && userStatus === 'unauthorized' && !isRegistrationPending && !isPublicRoute) {
    return NextResponse.redirect(new URL("/registration-pending", nextUrl));
  }

  // If logged in and authorized (free or paid) but on registration pending page, redirect to home
  if (isLoggedIn && (userStatus === 'free' || userStatus === 'paid') && isRegistrationPending) {
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
