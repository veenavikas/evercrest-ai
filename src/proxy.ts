import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/supabase';
import { rateLimit } from '@/lib/security/rate-limit';

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  // Automatically catch Supabase ?code= callbacks on any page and forward to auth callback
  const code = searchParams.get('code');
  if (code && !pathname.startsWith('/api/auth/callback')) {
    const callbackUrl = new URL('/api/auth/callback', request.url);
    callbackUrl.searchParams.set('code', code);
    const next = searchParams.get('next');
    if (next) callbackUrl.searchParams.set('next', next);
    return NextResponse.redirect(callbackUrl);
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const { success, limit, remaining, reset } = rateLimit(ip, 100, 60000);
    
    if (!success) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }
  }

  // Paths that do not require authentication
  const isPublicPath = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/admin/login' ||
    pathname.startsWith('/api/admin/auth') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/api/properties') ||
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/_next') || 
    pathname.includes('.'); // static files

  if (isPublicPath) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Admin Route Protection — verify evercrest_admin_session cookie
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminCookie = request.cookies.get('evercrest_admin_session');
    let hasValidAdmin = false;
    if (adminCookie?.value) {
      try {
        const decoded = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
        if (decoded.userId && decoded.role === 'admin') {
          hasValidAdmin = true;
        }
      } catch (e) {
        hasValidAdmin = false;
      }
    }

    if (!hasValidAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Admin authentication required.' } },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Valid Admin Session: proceed immediately
    return NextResponse.next();
  }

  // Tenant / Standard User Path — check tenant session cookie OR Supabase auth session
  const tenantCookie = request.cookies.get('evercrest_tenant_session') || request.cookies.get('evercrest_session');
  let hasValidTenant = false;
  let tenantEmail: string | null = null;
  let user: any = null;

  if (tenantCookie?.value) {
    try {
      const decoded = JSON.parse(Buffer.from(tenantCookie.value, 'base64').toString('utf-8'));
      if (decoded.userId || decoded.email) {
        hasValidTenant = true;
        tenantEmail = decoded.email || null;
      }
    } catch (e) {
      hasValidTenant = false;
    }
  }

  const { supabaseResponse, supabase } = await updateSession(request);

  if (!hasValidTenant) {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
    if (user) {
      hasValidTenant = true;
      tenantEmail = user.email || null;
    }
  }

  if (!hasValidTenant) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to perform this action.' } },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const requestHeaders = new Headers(supabaseResponse.headers);
  // Strip any existing user headers sent by the client to prevent spoofing
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-email');
  requestHeaders.delete('x-user-role');
  requestHeaders.delete('x-user-property-id');
  requestHeaders.delete('oai-authenticated-user-email');
  requestHeaders.delete('oai-authenticated-user-full-name');

  // Set trusted headers from session (Supabase) if tenant user is logged in
  if (user?.email) {
    requestHeaders.set('x-user-email', user.email);
    requestHeaders.set('oai-authenticated-user-email', user.email);
    
    if (user.user_metadata?.full_name) {
      requestHeaders.set('oai-authenticated-user-full-name', user.user_metadata.full_name);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
    headers: supabaseResponse.headers, // Merge the cookies set by Supabase
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
