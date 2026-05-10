import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check cookie presence (NOTE: cannot verify JWT signature in Edge Runtime — 
  // the axios 401 interceptor handles actual token expiry at API call time)
  const tokenCookie = request.cookies.get('token');
  const isAuthenticated = Boolean(tokenCookie?.value);

  // Root: redirect to feed or login
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isAuthenticated ? '/feed' : '/login', request.url)
    );
  }

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Already logged in → redirect away from auth pages
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  // Not logged in → redirect to login, preserving destination
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude Next.js internals, static assets, API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|images).*)'],
};
