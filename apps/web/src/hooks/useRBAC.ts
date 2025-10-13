'use client';

import { useEffect, useState } from 'react';

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'NONE';
type State = { role: Role; canWrite: boolean; ready: boolean };

export function useRBAC(): State {
    const [state, setState] = useState<State>({ role: 'NONE', canWrite: false, ready: false });

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const sess = await fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
                const token: string | undefined = sess?.apiToken;

                const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
                const me = await fetch('/api/me', { cache: 'no-store', headers }).then(r => r.ok ? r.json() : { role: 'NONE' });

                const role = (me?.role ?? 'NONE') as Role;
                const canWrite = role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';

                if (!alive) return;
                document.documentElement.dataset.ro = canWrite ? '0' : '1';

                setState({ role, canWrite, ready: true });
            } catch {
                if (!alive) return;
                document.documentElement.dataset.ro = '1';
                setState({ role: 'NONE', canWrite: false, ready: true });
            }
        })();

        return () => { alive = false; };
    }, []);

    return state;
}
