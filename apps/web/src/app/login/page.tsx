'use client';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
    return (
        <div className="min-h-dvh grid place-items-center p-6">
            <div className="card w-full max-w-sm space-y-4">
                <h1 className="text-xl font-semibold">Sign in</h1>
                <button
                    className="btn w-full"
                    onClick={() => signIn('github', { callbackUrl: '/kanban' })}
                >
                    Continue with GitHub
                </button>
            </div>
        </div>
    );
}
