// server-side browser mocks (aggressive force with defineProperty)
if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (!g.window) Object.defineProperty(g, 'window', { value: g, writable: true, configurable: true });
    if (!g.location) {
        Object.defineProperty(g, 'location', {
            value: { protocol: 'https:', host: 'localhost', href: 'https://localhost/' },
            writable: true,
            configurable: true
        });
    }
    if (g.window && !g.window.location) g.window.location = g.location;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin-level Supabase client (bypasses RLS)
// ONLY use this in server-side code (Server Actions, API Routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
