import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const error_description = requestUrl.searchParams.get('error_description');
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

    // Robust Origin Detection for Vercel/Production
    let origin = requestUrl.origin;
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';

    if (host) {
        origin = `${proto}://${host}`;
    } else {
        // Fallback hardcoded for safety in case headers missing
        origin = 'https://noti-ar.vercel.app';
    }

    // Handle OAuth errors
    if (error) {
        console.error('[CALLBACK] OAuth error:', error, error_description);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`);
    }

    if (code) {
        // Clean redirect path
        const finalRedirect = redirectTo.startsWith('http')
            ? new URL(redirectTo).pathname + new URL(redirectTo).search
            : redirectTo;

        const response = NextResponse.redirect(`${origin}${finalRedirect}`);

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // Force critical cookie options for production persistence
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                            path: '/',
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                        });
                    },
                    remove(name: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                            path: '/',
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                        });
                    },
                },
            }
        );

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('[CALLBACK] Exchange error:', exchangeError);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
        }

        return response;
    }

    // Implicit flow fallback
    return NextResponse.redirect(`${origin}/auth/callback-client?redirectTo=${encodeURIComponent(redirectTo)}`);
}
