import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Validate Supabase environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if Supabase is properly configured
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'your_supabase_url_here' || 
      supabaseAnonKey === 'your_supabase_anon_key_here' ||
      !supabaseUrl.startsWith('http')) {
    // If Supabase is not configured, allow public routes and API calls
    const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/callback', '/landing'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    
    if (request.method === 'OPTIONS' || 
        request.nextUrl.pathname.startsWith('/api/') ||
        request.nextUrl.pathname.startsWith('/extension-auth') ||
        isPublicRoute) {
      return response;
    }
    
    // Redirect to signin with configuration message
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    redirectUrl.searchParams.set('config', 'missing');
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
    data: { user },
  } = await supabase.auth.getUser();

  // Allow extension requests (OPTIONS, API calls with Bearer token) and public resources
  if (
    request.method === 'OPTIONS' ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/extension-auth')
  ) {
    return response;
  }

  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/callback', '/landing'];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (manifest, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)).*)',
  ],
};
