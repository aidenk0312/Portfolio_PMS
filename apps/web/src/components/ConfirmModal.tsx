'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

type Props = {
    open: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
    busy?: boolean;
    children?: React.ReactNode;
};

export default function ConfirmModal({
                                         open,
                                         title = 'Are you sure?',
                                         description,
                                         confirmText = 'Confirm',
                                         cancelText = 'Cancel',
                                         onCancel,
                                         onConfirm,
                                         busy,
                                         children,
                                     }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
            <div className="relative z-[1001] w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
                <h3 className="text-base font-semibold mb-1">{title}</h3>
                {description && <p className="text-sm text-black/70 mb-3">{description}</p>}
                {children && <div className="mb-4">{children}</div>}
                <div className="flex justify-end gap-2">
                    <button
                        className="rounded-md border px-3 py-1.5 text-sm"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        {cancelText}
                    </button>
                    <button
                        className="rounded-md border px-3 py-1.5 text-sm bg-black text-white hover:bg-black/90 disabled:opacity-60"
                        onClick={() => onConfirm()}
                        disabled={busy}
                    >
                        {busy ? 'Working…' : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}