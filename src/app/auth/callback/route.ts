import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

        const supabase = await createClient();
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('[CALLBACK] Error exchanging code:', exchangeError);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
        }

        console.log('[CALLBACK] PKCE session established for user:', data.user?.email);

        // Ensure the redirect is to a relative path to avoid absolute URL issues
        const finalRedirect = redirectTo.startsWith('http')
            ? new URL(redirectTo).pathname + new URL(redirectTo).search
            : redirectTo;

        return NextResponse.redirect(`${origin}${finalRedirect}`);
    }

    // No code = Implicit flow (hash-based tokens)
    console.log('[CALLBACK] No code found - redirecting to client handler for implicit flow');
    return NextResponse.redirect(`${origin}/auth/callback-client?redirectTo=${encodeURIComponent(redirectTo)}`);
}
