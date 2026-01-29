import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

    // GUARANTEED PRODUCTION PROTOCOL & HOST
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

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
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, {
                                ...options,
                                path: '/', // Ensure visibility
                                secure: true,
                                sameSite: 'lax',
                            })
                        )
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return response
        }

        console.error('[CALLBACK] Auth error:', error.message)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}/login`)
}
