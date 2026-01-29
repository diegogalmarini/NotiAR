import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Super admin emails
const SUPER_ADMIN_EMAILS = ['diegogalmarini@gmail.com'];

// Public routes
const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/signup',
    '/auth/callback',
    '/auth/callback-client',
    '/api/ingest',
    '/pending-approval',
    '/unauthorized',
];

const PUBLIC_ROUTE_PATTERNS = [
    /^\/ficha\/.+$/,
];

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname) ||
        PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));

    // Initialize response with headers inheritance
    let supabaseResponse = NextResponse.next({
        request: {
            headers: new Headers(request.headers),
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    if (isPublicRoute) {
        return supabaseResponse;
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.log(`[MIDDLEWARE] Redirecting guest from ${pathname} to /login`);
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirectTo', pathname)

        const redirectResponse = NextResponse.redirect(url)
        // Ensure cookies (including the one that just failed/cleared) are carried to redirect
        supabaseResponse.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
        return redirectResponse
    }

    const userEmail = user.email || '';
    if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        console.log(`[MIDDLEWARE] SuperAdmin ${userEmail} allowed to ${pathname}`);
        return supabaseResponse;
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('approval_status')
        .eq('id', user.id)
        .single();

    if (!profile || profile.approval_status !== 'approved') {
        console.log(`[MIDDLEWARE] User ${userEmail} status: ${profile?.approval_status || 'not_found'}`);
        const url = request.nextUrl.clone()
        url.pathname = (profile?.approval_status === 'rejected') ? '/unauthorized' : '/pending-approval'

        const approvalRedirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(c => approvalRedirectResponse.cookies.set(c.name, c.value, c))
        return approvalRedirectResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
