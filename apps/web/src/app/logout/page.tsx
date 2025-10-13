'use client';

import { signOut } from 'next-auth/react';

export default function LogoutPage() {
    return (
        <main className="p-6 space-y-4">
            <h1 className="text-xl font-semibold">Sign out</h1>

            <button
                className="btn btn-danger"
                onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
            >
                Sign out
            </button>

            <a
                className="btn btn-ghost"
                href="/api/auth/signout?callbackUrl=%2Flogin"
            >
                Use built-in signout
            </a>
        </main>
    );
}
