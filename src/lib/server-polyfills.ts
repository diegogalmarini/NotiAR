/**
 * server-polyfills.ts
 * 
 * Aggressive mocking of browser globals to prevent environment mismatches
 * on the server, especially for libraries that assume a browser if 'window' exists.
 */

if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;

    // Polyfill window/self
    if (!g.window) g.window = g;
    if (!g.self) g.self = g;

    // DO NOT mock location with 'localhost' in production
    // This was causing Supabase to generate incorrect redirect URLs.
    if (!g.location) {
        // We only provide a minimal location for libraries that crash without it,
        // but we don't hardcode 'localhost' as the host.
        Object.defineProperty(g, 'location', {
            get() {
                return {
                    protocol: 'https:',
                    host: '',
                    hostname: '',
                    href: 'https://noti-ar.vercel.app/',
                    pathname: '/',
                    search: '',
                    hash: '',
                    assign: () => { },
                    replace: () => { },
                    reload: () => { }
                };
            },
            configurable: true
        });
    }

    // Polyfill character encoding (atob/btoa are required by many PDF/Identity libraries)
    if (!g.atob) g.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
    if (!g.btoa) g.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');

    // Ensure navigator exists
    if (!g.navigator) g.navigator = { userAgent: 'Node.js/NotiAR-Audit' };

    console.log("[POLYFILLS] Server-side browser globals injected.");
}
