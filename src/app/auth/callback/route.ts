import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);

    // Get query params
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const error_description = requestUrl.searchParams.get('error_description');
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

    const origin = requestUrl.origin;

    // Handle OAuth errors
    if (error) {
        console.error('[CALLBACK] OAuth error:', error, error_description);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`);
    }

    // Handle PKCE flow (code-based)
    if (code) {
        console.log('[CALLBACK] PKCE flow - exchanging code for session...');

        const response = NextResponse.redirect(`${origin}${redirectTo}`);

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                        });
                    },
                    remove(name: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                            maxAge: 0,
                        });
                    },
                },
            }
        );

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('[CALLBACK] Error exchanging code:', exchangeError);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
        }

        console.log('[CALLBACK] PKCE session established for user:', data.user?.email);
        return response;
    }

    // No code = Implicit flow (hash-based tokens)
    // Redirect to client-side page that will handle hash params
    console.log('[CALLBACK] No code found - redirecting to client handler for implicit flow');
    return NextResponse.redirect(`${origin}/auth/callback-client?redirectTo=${encodeURIComponent(redirectTo)}`);
}
