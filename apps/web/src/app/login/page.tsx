'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
    const sp = useSearchParams();
    const err = sp.get('error');

    return (
        <main className="min-h-dvh grid place-items-center p-6">
            <div className="w-full max-w-sm space-y-4">
                <h1 className="text-2xl font-semibold">Sign in</h1>

                {err && (
                    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
                        Auth error: <span className="font-mono">{err}</span>
                    </div>
                )}

                <button
                    className="btn btn-primary w-full"
                    onClick={() => signIn('github', { callbackUrl: '/kanban' })}
                >
                    Continue with GitHub
                </button>
            </div>
        </main>
    );
}
