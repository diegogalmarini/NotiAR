import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Super admin emails
const SUPER_ADMIN_EMAILS = ['diegogalmarini@gmail.com'];

const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/signup',
    '/auth/callback',
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
    const allCookies = request.cookies.getAll();
    console.log(`[MW] Request: ${pathname} | Total Cookies: ${allCookies.length}`);
    allCookies.forEach(c => {
        if (c.name.includes('sb-')) {
            console.log(`[MW] Cookie FOUND: ${c.name} | Length: ${c.value.length}`);
        }
    });

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
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

    // ✅ FIX: Redirect already logged in users away from /login
    if (user && pathname === '/login') {
        console.log(`[MW] REDIRECT: User ${user.email} already logged in. Sending to /dashboard`);
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (!user && !isPublicRoute) {
        console.warn(`[MW] NO USER found for ${pathname}. Redirecting to /login`);
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirectTo', pathname)

        const redirectResponse = NextResponse.redirect(url)

        // Propagate cookies to the redirect response
        const respCookies = supabaseResponse.cookies.getAll();
        console.log(`[MW] Propagating ${respCookies.length} cookies to redirect...`);
        respCookies.forEach(c => {
            console.log(`[MW] -> ${c.name}`);
            redirectResponse.cookies.set(c.name, c.value, c);
        });

        return redirectResponse
    }

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
