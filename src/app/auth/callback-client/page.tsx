"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

export default function CallbackClientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';

    useEffect(() => {
        const handleImplicitFlow = async () => {
            try {
                // Parse hash params
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const error = hashParams.get('error');
                const error_description = hashParams.get('error_description');

                if (error) {
                    console.error('[CLIENT CALLBACK] OAuth error:', error, error_description);
                    toast.error(error_description || error);
                    router.push('/login');
                    return;
                }

                if (!accessToken || !refreshToken) {
                    console.error('[CLIENT CALLBACK] No tokens in hash');
                    router.push('/login');
                    return;
                }

                console.log('[CLIENT CALLBACK] Processing implicit flow tokens...');

                const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (sessionError) {
                    console.error('[CLIENT CALLBACK] Session error:', sessionError);
                    toast.error(sessionError.message);
                    router.push('/login');
                    return;
                }

                console.log('[CLIENT CALLBACK] Session established successfully');
                toast.success("Sesión iniciada correctamente");

                // Use hard redirect to ensure cookies are sent
                window.location.href = redirectTo;
            } catch (err: any) {
                console.error('[CLIENT CALLBACK] Error:', err);
                toast.error(err.message || "Error en la autenticación");
                router.push('/login');
            }
        };

        handleImplicitFlow();
    }, [router, redirectTo]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Procesando autenticación...</p>
            </div>
        </div>
    );
}
