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

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) {
            console.log(`[CALLBACK] Success for ${data.session.user.email}. Path: ${redirectTo}`);
            return response
        }

        console.error('[CALLBACK] Exchange failed:', error?.message || 'No session returned');
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'Auth exchange failed')}`)
    }

    return NextResponse.redirect(`${origin}/login`)
}
