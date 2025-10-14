'use client';

import { useEffect, useRef, useState } from 'react';
import { onAuthEvent } from '@/lib/auth-events';
import { signIn } from 'next-auth/react';

export default function AuthBanners() {
    const [show401, setShow401] = useState(false);
    const [show403, setShow403] = useState(false);
    const t403 = useRef<number | null>(null);

    useEffect(() => {
        const off = onAuthEvent((t) => {
            if (t === 'auth:401') setShow401(true);
            if (t === 'auth:403') {
                setShow403(true);
                if (t403.current) clearTimeout(t403.current);
                t403.current = window.setTimeout(() => setShow403(false), 3000);
            }
        });
        return () => {
            if (t403.current) clearTimeout(t403.current);
            off();
        };
    }, []);

    if (!show401 && !show403) return null;

    return (
        <div className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-2">
            {show401 && (
                <div className="w-full max-w-[1200px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-amber-900 shadow">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Your session has expired.</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => signIn()}
                                className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1 text-sm font-medium hover:bg-amber-100"
                            >
                                Sign in again
                            </button>
                            <button
                                onClick={() => setShow401(false)}
                                className="inline-flex items-center rounded-lg px-2 py-1 text-sm"
                                aria-label="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {show403 && (
                <div className="w-full max-w-[1200px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-800 shadow">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">Insufficient permissions for this action.</span>
                        <button
                            onClick={() => setShow403(false)}
                            className="inline-flex items-center rounded-lg px-2 py-1 text-sm"
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
