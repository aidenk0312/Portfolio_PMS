'use client';
import { SessionProvider, getSession } from 'next-auth/react';
import { PropsWithChildren, useEffect, useRef } from 'react';

export default function SessionProv({ children }: PropsWithChildren) {
    const patchedRef = useRef(false);

    useEffect(() => {
        if (patchedRef.current) return;
        patchedRef.current = true;

        const originalFetch = window.fetch;
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            try {
                const method = (init?.method ?? 'GET').toUpperCase();
                const urlStr =
                    typeof input === 'string'
                        ? input
                        : input instanceof URL
                            ? input.pathname + input.search
                            : (input as any)?.url ?? '';

                if (urlStr.startsWith('/api/auth') || method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
                    return originalFetch(input as any, init);
                }

                const session = await getSession();
                const token = (session as any)?.apiToken as string | undefined;
                if (token) {
                    const headers = new Headers(init?.headers || {});
                    headers.set('Authorization', `Bearer ${token}`);
                    return originalFetch(input as any, { ...init, headers });
                }
            } catch {
            }
            return originalFetch(input as any, init);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return <SessionProvider>{children}</SessionProvider>;
}
