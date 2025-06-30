import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ✅ Routes protégées (nécessitent une connexion)
  const protectedRoutes = ['/dashboard', '/create-room', '/room', '/profile', '/chat'];
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // ✅ Routes publiques (accessibles sans connexion)
  const publicRoutes = [
    '/',
    '/auth',
    '/auth/login',
    '/auth/register',
    '/leaderboard',
  ];
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  );

  // Autoriser les fichiers statiques et API
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return response;
  }

  // Autoriser les routes publiques
  if (isPublicRoute) {
    return response;
  }

  // ✅ Rediriger vers login si route protégée sans session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Rediriger vers dashboard si utilisateur connecté accède aux pages d'auth
  if ((request.nextUrl.pathname === '/auth' || 
       request.nextUrl.pathname === '/auth/login' || 
       request.nextUrl.pathname === '/auth/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Rediriger vers home page pour toute autre route
  if (!isPublicRoute && !isProtectedRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};