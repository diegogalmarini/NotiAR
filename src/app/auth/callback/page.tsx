"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get hash params (implicit flow)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');

                // Get query params (code flow)
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const error = urlParams.get('error');
                const redirectTo = urlParams.get('redirectTo') || '/dashboard';

                if (error) {
                    toast.error(decodeURIComponent(error));
                    router.push('/login');
                    return;
                }

                // Handle implicit flow (hash-based)
                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        toast.error(sessionError.message);
                        router.push('/login');
                        return;
                    }

                    toast.success("Sesión iniciada correctamente");
                    router.push(redirectTo);
                    return;
                }

                // Handle code flow (query-based)
                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        toast.error(exchangeError.message);
                        router.push('/login');
                        return;
                    }

                    toast.success("Sesión iniciada correctamente");
                    router.push(redirectTo);
                    return;
                }

                // No valid OAuth response
                router.push('/login');
            } catch (err: any) {
                console.error('Auth callback error:', err);
                toast.error(err.message || "Error en la autenticación");
                router.push('/login');
            }
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Procesando autenticación...</p>
            </div>
        </div>
    );
}
