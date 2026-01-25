/**
 * server-polyfills.ts
 * 
 * Aggressive mocking of browser globals to prevent environment mismatches
 * on the server, especially for libraries that assume a browser if 'window' exists.
 */

if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;

    const locationMock = {
        protocol: 'http:',
        host: 'localhost',
        hostname: 'localhost',
        href: 'http://localhost/',
        pathname: '/',
        search: '',
        hash: '',
        assign: () => { },
        replace: () => { },
        reload: () => { }
    };

    // Polyfill window/self
    if (!g.window) g.window = g;
    if (!g.self) g.self = g;

    // Polyfill location on both global and window
    if (!g.location) g.location = locationMock;
    if (g.window && !g.window.location) g.window.location = locationMock;

    // Polyfill character encoding (atob/btoa are required by many PDF/Identity libraries)
    if (!g.atob) g.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
    if (!g.btoa) g.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');

    // Ensure navigator exists
    if (!g.navigator) g.navigator = { userAgent: 'Node.js/NotiAR-Audit' };

    console.log("[POLYFILLS] Server-side browser globals injected.");
}
