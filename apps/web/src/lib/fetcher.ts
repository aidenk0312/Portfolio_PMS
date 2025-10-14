import { emitAuthEvent } from '@/lib/auth-events';

let cachedToken: string | null = null;
let lastFetch = 0;

async function getApiToken(): Promise<string | null> {
    const now = Date.now();
    if (cachedToken && now - lastFetch < 10000) return cachedToken;
    try {
        const r = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!r.ok) return null;
        const j = await r.json().catch(() => ({}));
        cachedToken = j?.apiToken ?? null;
        lastFetch = now;
        return cachedToken;
    } catch {
        return null;
    }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const method = String(init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || {});
    if (method !== 'GET' && !headers.has('Authorization')) {
        const token = await getApiToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) emitAuthEvent('auth:401');
    if (res.status === 403) emitAuthEvent('auth:403');
    return res;
}
