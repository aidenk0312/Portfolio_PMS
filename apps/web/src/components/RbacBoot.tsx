'use client';

import { useEffect } from 'react';
import { useRbac } from '@/lib/rbac';

const WS = process.env.NEXT_PUBLIC_WORKSPACE_ID as string | undefined;

export default function RbacBoot() {
    const { canWrite } = useRbac(WS);

    useEffect(() => {
        const el = document.documentElement;
        if (!canWrite) {
            el.setAttribute('data-ro', '1');
        } else {
            el.removeAttribute('data-ro');
        }
    }, [canWrite]);

    return null;
}
