import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard';

    // GUARANTEED PRODUCTION ORIGIN (Fixing localhost leakage)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    if (error) {
        console.error('[CALLBACK] OAuth error:', error);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
    }

    if (code) {
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
                            path: '/',
                            secure: true,
                            sameSite: 'lax',
                        });
                    },
                    remove(name: string, options: CookieOptions) {
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                            path: '/',
                            secure: true,
                            sameSite: 'lax',
                        });
                    },
                },
            }
        );

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
            console.error('[CALLBACK] Exchange failure:', exchangeError.message);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
        }

        return response;
    }

    return NextResponse.redirect(`${origin}/login`);
}
