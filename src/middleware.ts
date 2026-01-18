import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define allowed email domains for whitelist
const ALLOWED_DOMAINS = ['@galmarini.com'];

// Super admin emails (full email addresses)
const SUPER_ADMIN_EMAILS = ['diegogalmarini@gmail.com'];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
    '/login',
    '/auth/callback',
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
                get(name: string) {
                    return req.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    req.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    req.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: req.headers,
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

    const { pathname } = req.nextUrl;

    // Check if route is public
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname) ||
        PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));

    if (isPublicRoute) {
        return response;
    }

    // Check if route is admin-only
    const isAdminRoute = ADMIN_ROUTES.includes(pathname) ||
        ADMIN_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));

    // Check authentication
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Redirect to login if not authenticated
    if (!session) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Check if admin route and verify super admin access
    if (isAdminRoute) {
        const userEmail = session.user.email || '';
        const SUPER_ADMIN_EMAILS = ['diegogalmarini@gmail.com'];

        if (!SUPER_ADMIN_EMAILS.includes(userEmail)) {
            const redirectUrl = req.nextUrl.clone();
            redirectUrl.pathname = '/unauthorized';
            return NextResponse.redirect(redirectUrl);
        }

        // Admin is authenticated and authorized, allow access
        return response;
    }

    // Check user approval status from database
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('approval_status')
        .eq('id', session.user.id)
        .single();

    // If profile doesn't exist or error, redirect to pending page
    if (profileError || !profile) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/pending-approval';
        return NextResponse.redirect(redirectUrl);
    }

    // Check approval status
    if (profile.approval_status !== 'approved') {
        const redirectUrl = req.nextUrl.clone();
        if (profile.approval_status === 'rejected') {
            redirectUrl.pathname = '/unauthorized';
        } else {
            redirectUrl.pathname = '/pending-approval';
        }
        return NextResponse.redirect(redirectUrl);
    }

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
