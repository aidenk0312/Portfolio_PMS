'use client';

import { useEffect, useState } from 'react';

type Health = { ok: boolean; time: string };
type DbHealth = { db: string };

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [db, setDb] = useState<DbHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/health/db', { cache: 'no-store' }),
      ]);
      if (!r1.ok) throw new Error(`/health ${r1.status}`);
      if (!r2.ok) throw new Error(`/health/db ${r2.status}`);
      setHealth(await r1.json());
      setDb(await r2.json());
    } catch (e: any) {
      setError(e?.message ?? 'request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">PMS Health</h1>

        <div className="mb-6 flex items-center gap-3">
          <button
              onClick={load}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5"
          >
            Refresh
          </button>
          {loading && <span className="text-sm opacity-70">Loading…</span>}
          {error && <span className="text-sm text-red-500">Error: {error}</span>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">/health</h2>
            <pre className="text-sm bg-black/5 p-3 rounded">
            {JSON.stringify(health, null, 2)}
          </pre>
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="font-semibold mb-2">/health/db</h2>
            <pre className="text-sm bg-black/5 p-3 rounded">
            {JSON.stringify(db, null, 2)}
          </pre>
          </div>
        </div>
      </main>
  );
}
