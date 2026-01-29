import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'
    const origin = requestUrl.origin

    if (code) {
        // We create the response object first so we can attach cookies directly to it
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
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            console.log(`[CALLBACK] Auth SUCCESS. Redirecting to ${redirectTo}`);
            return response
        }

        console.error('[CALLBACK] Exchange error:', error.message);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}/login`)
}
