'use client';

import { useEffect, useState } from 'react';

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

type MeResponse = {
    email: string;
    userId: string;
    role: Role;
};

function roleClasses(role: Role) {
    switch (role) {
        case 'OWNER':
            return 'border-violet-300 bg-violet-100 text-violet-700';
        case 'ADMIN':
            return 'border-rose-300 bg-rose-100 text-rose-700';
        case 'MEMBER':
            return 'border-emerald-300 bg-emerald-100 text-emerald-700';
        case 'VIEWER':
        default:
            return 'border-slate-300 bg-slate-100 text-slate-700';
    }
}

export default function RoleBadge() {
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const ac = new AbortController();

        async function run() {
            try {
                setLoading(true);
                setErr(null);

                let apiToken: string | undefined;
                try {
                    const sess = await fetch('/api/auth/session', { cache: 'no-store', signal: ac.signal });
                    if (sess.ok) {
                        const j = await sess.json();
                        apiToken = j?.apiToken;
                    }
                } catch {
                    /* no-op */
                }

                const res = await fetch('/api/me', {
                    cache: 'no-store',
                    signal: ac.signal,
                    headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const me = (await res.json()) as MeResponse;
                setRole(me.role);
            } catch (e: any) {
                setErr(e?.message || 'failed');
            } finally {
                setLoading(false);
            }
        }

        run();
        return () => ac.abort();
    }, []);

    if (loading) {
        return (
            <span
                className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500"
                aria-busy="true"
            >
        <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        Loading…
      </span>
        );
    }

    if (err || !role) {
        return (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
        Role
      </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${roleClasses(
                role,
            )}`}
            title={`Current role: ${role}`}
        >
      {role}
    </span>
    );
}
