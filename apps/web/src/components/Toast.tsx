'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: string; msg: string };
type Ctx = {
    push: (msg: string) => void;
    remove: (id: string) => void;
    items: Toast[];
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<Toast[]>([]);

    const push = useCallback((msg: string) => {
        const id = Math.random().toString(36).slice(2);
        setItems((xs) => [...xs, { id, msg }]);
        setTimeout(() => {
            setItems((xs) => xs.filter((x) => x.id !== id));
        }, 2500);
    }, []);

    const remove = useCallback((id: string) => {
        setItems((xs) => xs.filter((x) => x.id !== id));
    }, []);

    const value = useMemo(() => ({ push, remove, items }), [push, remove, items]);

    return (
        <ToastCtx.Provider value={value}>
            {children}
            <div className="fixed bottom-4 right-4 z-[1002] space-y-2">
                {items.map((t) => (
                    <div
                        key={t.id}
                        className="rounded-lg bg-black text-white text-sm px-3 py-2 shadow-lg"
                        role="status"
                    >
                        {t.msg}
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastCtx);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}
