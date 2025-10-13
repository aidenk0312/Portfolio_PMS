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

            const headers = new Headers(init?.headers || {});
            if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
            const ws = process.env.NEXT_PUBLIC_WORKSPACE_ID;
            if (ws && !headers.has('x-workspace-id')) headers.set('x-workspace-id', ws);
            if (!headers.has('accept')) headers.set('accept', 'application/json');
            if (!headers.has('content-type') && typeof (init as any)?.body === 'string') {
                headers.set('content-type', 'application/json');
            }

            return originalFetch(input as any, { ...init, headers });
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return <SessionProvider>{children}</SessionProvider>;
}
