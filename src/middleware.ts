import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Define allowed email domains for whitelist
const ALLOWED_DOMAINS = ['@galmarini.com'];

// Super admin emails (full email addresses)
const SUPER_ADMIN_EMAILS = ['diegogalmarini@gmail.com'];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
    '/login',
    '/signup',
    '/auth/callback',
    '/auth/callback-client',
    '/api/ingest',
    '/pending-approval',
    '/unauthorized',
];

// Routes that match patterns (like /ficha/[token])
const PUBLIC_ROUTE_PATTERNS = [
    /^\/ficha\/.+$/,  // Allow /ficha/[any-token]
];

// Admin-only routes (super admin email required)
const ADMIN_ROUTES = [
    '/admin',
];

const ADMIN_ROUTE_PATTERNS = [
    /^\/admin\/.+$/,  // All /admin/* routes
];

export async function middleware(req: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set(name, value);
                    });
                    response = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const pathname = req.nextUrl.pathname;
    const normalizedPath = pathname.endsWith('/') && pathname.length > 1
        ? pathname.slice(0, -1)
        : pathname;

    // Check if route is public
    const isPublicRoute = PUBLIC_ROUTES.includes(normalizedPath) ||
        PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(normalizedPath));

    if (isPublicRoute) {
        return response;
    }

    // Check authentication
    const {
        data: { session },
    } = await supabase.auth.getSession();

    console.log('[MIDDLEWARE] Path:', pathname);
    console.log('[MIDDLEWARE] Has session:', !!session);

    // Redirect to login if not authenticated
    if (!session) {
        console.log('[MIDDLEWARE] No session, redirecting to login');
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectTo', pathname);

        // Final response must carry cookie updates (if any from getSession)
        const redirectResponse = NextResponse.redirect(redirectUrl);
        response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value));
        return redirectResponse;
    }

    const userEmail = session.user.email || '';

    // Check if route is admin-only
    const isAdminRoute = ADMIN_ROUTES.includes(normalizedPath) ||
        ADMIN_ROUTE_PATTERNS.some(pattern => pattern.test(normalizedPath));

    // Super admins bypass ALL approval checks
    if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        console.log('[MIDDLEWARE] Super admin detected, bypassing all checks');
        return response;
    }

    // Check if admin route and verify access
    if (isAdminRoute) {
        console.log('[MIDDLEWARE] Verifying admin role for user:', session.user.id);
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, approval_status')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin' || profile.approval_status !== 'approved') {
            console.log('[MIDDLEWARE] Not an approved admin, blocking admin route:', { profile, error: profileError });
            const redirectUrl = req.nextUrl.clone();
            redirectUrl.pathname = '/unauthorized';
            const unauthorizedResponse = NextResponse.redirect(redirectUrl);
            response.cookies.getAll().forEach(c => unauthorizedResponse.cookies.set(c.name, c.value));
            return unauthorizedResponse;
        }

        console.log('[MIDDLEWARE] Admin role confirmed, allowing access');
        return response;
    }

    // Check user approval status from database
    console.log('[MIDDLEWARE] Checking approval status for user:', session.user.id);
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('approval_status')
        .eq('id', session.user.id)
        .single();

    // If profile doesn't exist or error, redirect to pending page
    if (profileError || !profile) {
        console.log('[MIDDLEWARE] Profile not found or error, redirecting to pending');
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/pending-approval';
        const pendingResponse = NextResponse.redirect(redirectUrl);
        response.cookies.getAll().forEach(c => pendingResponse.cookies.set(c.name, c.value));
        return pendingResponse;
    }

    // Check approval status
    if (profile.approval_status !== 'approved') {
        console.log('[MIDDLEWARE] User not approved, status:', profile.approval_status);
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = profile.approval_status === 'rejected' ? '/unauthorized' : '/pending-approval';
        const notApprovedResponse = NextResponse.redirect(redirectUrl);
        response.cookies.getAll().forEach(c => notApprovedResponse.cookies.set(c.name, c.value));
        return notApprovedResponse;
    }

    console.log('[MIDDLEWARE] User approved, allowing access');
    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
