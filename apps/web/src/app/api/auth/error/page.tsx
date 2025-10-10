'use client';

import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
    const sp = useSearchParams();
    const err = sp.get('error') || 'Unknown';

    return (
        <main className="min-h-dvh grid place-items-center p-6">
            <div className="w-full max-w-md space-y-4">
                <h1 className="text-2xl font-semibold">Authentication Error</h1>
                <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
                    Error: <span className="font-mono">{err}</span>
                </p>
                <a href="/login" className="btn btn-primary w-full">Back to Login</a>
            </div>
        </main>
    );
}
