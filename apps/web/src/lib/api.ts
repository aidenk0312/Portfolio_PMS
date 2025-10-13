'use client';
import { getSession } from 'next-auth/react';

export async function apiFetch(input: string, init: RequestInit = {}) {
    const url = input.startsWith('/') ? input : `/${input}`;
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || {});
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    if (isWrite) {
        const session = await getSession();
        const token = (session as any)?.apiToken;
        if (token && !headers.has('authorization')) {
            headers.set('authorization', `Bearer ${token}`);
        }
    }
    if (!headers.has('x-workspace-id') && process.env.NEXT_PUBLIC_WORKSPACE_ID) {
        headers.set('x-workspace-id', process.env.NEXT_PUBLIC_WORKSPACE_ID);
    }
    headers.set('content-type', headers.get('content-type') || 'application/json');

    const res = await fetch(url, { ...init, headers });
    return res;
}
