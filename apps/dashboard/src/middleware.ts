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
          // Check if remember me cookie exists and extend session for auth tokens
          const rememberMeCookie = request.cookies.get('brainbox_remember_me');
          const isRememberMe = rememberMeCookie?.value === 'true';
          
          // If remember me is enabled and this is an auth token, extend expiry to 30 days
          if (isRememberMe && name.includes('auth-token') && !options.maxAge) {
            options.maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
          }
          
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
    // Handle CORS for Extension
    const origin = request.headers.get('origin');
    // Allow extensions or localhost
    const allowedOrigins = ['chrome-extension://', 'http://localhost', 'http://127.0.0.1'];
    const isAllowed = origin && allowedOrigins.some(o => origin.startsWith(o));

    if (request.method === 'OPTIONS') {
       const headers = new Headers();
       headers.set('Access-Control-Allow-Origin', origin || '*');
       headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
       headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
       headers.set('Access-Control-Allow-Credentials', 'true');
       return new NextResponse(null, { status: 200, headers });
    }

    if (request.nextUrl.pathname.startsWith('/api/')) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

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
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
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
