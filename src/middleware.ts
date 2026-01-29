import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    '/api/auth-diag',
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

    // verbose log for production diagnostics
    console.log(`[MW] Request: ${pathname} | Cookies: ${request.cookies.getAll().length}`);

    let supabaseResponse = NextResponse.next({
        request,
    })

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

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && !isPublicRoute) {
        console.warn(`[MW] NO USER found for ${pathname}. Redirecting to /login`);
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirectTo', pathname)

        const redirectResponse = NextResponse.redirect(url)
        // transfer any cookies (like CSRF or newly cleared ones)
        supabaseResponse.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
        return redirectResponse
    }

    // IF we have a user, just let them through for this diagnostic phase
    // (We bypass profile status check temporarily to see if the session sticks)
    if (user) {
        console.log(`[MW] AUTH OK: ${user.email} at ${pathname}`);
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
