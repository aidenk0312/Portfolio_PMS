'use client';

import { useEffect, useState } from 'react';

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export function useRbac(workspaceId: string | undefined) {
    const [role, setRole] = useState<Role>('VIEWER');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let aborted = false;
        (async () => {
            try {
                if (!workspaceId) return;
                const r = await fetch(`/api/auth/me?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' });
                if (r.ok) {
                    const data = await r.json().catch(() => ({} as any));
                    if (!aborted) setRole((data?.role as Role) ?? 'VIEWER');
                } else {
                    if (!aborted) setRole('VIEWER');
                }
            } finally {
                if (!aborted) setLoading(false);
            }
        })();
        return () => {
            aborted = true;
        };
    }, [workspaceId]);

    const canWrite = role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
    return { role, canWrite, loading };
}
