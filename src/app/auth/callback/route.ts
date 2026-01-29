import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

    // Use native origin from the request URL
    const origin = requestUrl.origin;

    if (code) {
        const response = NextResponse.redirect(`${origin}${redirectTo}`)
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // PROPER COOKIE PERSISTENCE: 
                            // Preserve all options (httpOnly, expires, maxAge, etc.)
                            // provided by Supabase.
                            request.cookies.set(name, value)
                            response.cookies.set(name, value, {
                                ...options,
                                path: options?.path || '/',
                                sameSite: options?.sameSite || 'lax',
                                secure: true, // Always secure in production
                            })
                        })
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.session) {
            console.log(`[CALLBACK] Auth exchange SUCCESS for: ${data.session.user.email}`);
            return response
        }

        console.error('[CALLBACK] Auth exchange FAILED:', error?.message || 'No session returned');
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'Authentication failed')}`)
    }

    console.warn('[CALLBACK] No code found in request URL');
    return NextResponse.redirect(`${origin}/login`)
}
