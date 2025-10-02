'use client';
import { getSession } from 'next-auth/react';

export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
    const session = await getSession();
    const token = (session as any)?.apiToken as string | undefined;
    const headers = new Headers(init?.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
}
