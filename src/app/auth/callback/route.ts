import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

    // GUARANTEED PRODUCTION PROTOCOL & HOST FROM REQUEST URL
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
                        cookiesToSet.forEach(({ name, value }) => {
                            request.cookies.set(name, value)
                            response.cookies.set(name, value, {
                                path: '/',
                                secure: true,
                                sameSite: 'lax',
                            })
                        })
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data?.session) {
            console.log(`[CALLBACK] Success. Session created for ${data.session.user.email}`);
            return response
        }

        console.error('[CALLBACK] Exchange failed:', error?.message || 'No session found');
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'Exchange failed')}`)
    }

    return NextResponse.redirect(`${origin}/login`)
}
