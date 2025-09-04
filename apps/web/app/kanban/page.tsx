'use client';

import { useEffect, useMemo, useState } from 'react';

type Issue = {
    id: string;
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    status: string;
    dueAt?: string | null;
    workspaceId: string;
    columnId?: string | null;
    createdAt: string;
};

type Column = {
    id: string;
    name: string;
    order: number;
    boardId: string;
    issues: Issue[];
};

type Board = {
    id: string;
    name: string;
    workspaceId: string;
    order: number;
    columns?: { id: string; name: string; order: number; boardId: string }[];
};

const WS = process.env.NEXT_PUBLIC_WORKSPACE_ID;

export default function KanbanPage() {
    const [board, setBoard] = useState<Board | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [newColumn, setNewColumn] = useState('');
    const [newIssueTitleByCol, setNewIssueTitleByCol] = useState<Record<string, string>>({});

    const workspaceId = useMemo(() => WS ?? '', []);

    const load = async () => {
        if (!workspaceId) {
            setErr('환경변수 NEXT_PUBLIC_WORKSPACE_ID가 비어있어요.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const rBoards = await fetch(`/api/boards?workspaceId=${workspaceId}`, { cache: 'no-store' });
            if (!rBoards.ok) throw new Error(`GET /boards ${rBoards.status}`);
            const boards: Board[] = await rBoards.json();
            if (!Array.isArray(boards) || boards.length === 0) {
                setBoard(null);
                setColumns([]);
                setErr('이 워크스페이스에 보드가 없습니다. 먼저 보드를 생성하세요.');
                setLoading(false);
                return;
            }
            const b = boards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
            setBoard(b);

            const rCols = await fetch(`/api/columns?boardId=${b.id}`, { cache: 'no-store' });
            if (!rCols.ok) throw new Error(`GET /columns ${rCols.status}`);
            const cols: Column[] = await rCols.json();
            cols.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setColumns(cols);
        } catch (e: any) {
            setErr(e?.message ?? 'load failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const createColumn = async () => {
        if (!board) return;
        if (!newColumn.trim()) return;
        const body = { name: newColumn.trim(), boardId: board.id, order: columns.length };
        const r = await fetch('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!r.ok) {
            alert(`컬럼 생성 실패: ${r.status}`);
            return;
        }
        setNewColumn('');
        await load();
    };

    const createIssue = async (columnId: string) => {
        const title = (newIssueTitleByCol[columnId] ?? '').trim();
        if (!title || !workspaceId) return;
        const body = { title, workspaceId, columnId };
        const r = await fetch('/api/issues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!r.ok) {
            alert(`이슈 생성 실패: ${r.status}`);
            return;
        }
        setNewIssueTitleByCol((m) => ({ ...m, [columnId]: '' }));
        await load();
    };

    const moveIssue = async (issueId: string, targetColumnId: string) => {
        const r = await fetch(`/api/issues/${issueId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId: targetColumnId }),
        });
        if (!r.ok) {
            alert(`이슈 이동 실패: ${r.status}`);
            return;
        }
        await load();
    };

    return (
        <main className="min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Kanban</h1>
                    <p className="text-sm text-black/60">
                        Workspace: <code>{workspaceId || '(unset)'}</code>
                    </p>
                    {board && (
                        <p className="text-sm text-black/60">
                            Board: <strong>{board.name}</strong> (<code>{board.id}</code>)
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}
            {loading && <div className="text-sm opacity-70">Loading…</div>}

            {/* 컬럼 추가 */}
            {board && (
                <div className="flex items-center gap-2">
                    <input
                        value={newColumn}
                        onChange={(e) => setNewColumn(e.target.value)}
                        placeholder="새 컬럼 이름 (예: Todo)"
                        className="border rounded-md px-3 py-1.5 text-sm"
                    />
                    <button
                        onClick={createColumn}
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5"
                    >
                        Add Column
                    </button>
                </div>
            )}

            {/* 칸반 그리드 */}
            <div className="grid gap-4 md:grid-cols-3">
                {columns.map((col) => (
                    <section key={col.id} className="rounded-xl border p-4 bg-white">
                        <header className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold">{col.name}</h2>
                            <span className="text-xs text-black/50">{col.issues.length} cards</span>
                        </header>

                        {/* 이슈 추가 */}
                        <div className="mb-3 flex items-center gap-2">
                            <input
                                value={newIssueTitleByCol[col.id] ?? ''}
                                onChange={(e) =>
                                    setNewIssueTitleByCol((m) => ({ ...m, [col.id]: e.target.value }))
                                }
                                placeholder="새 이슈 제목"
                                className="border rounded-md px-2 py-1 text-sm flex-1"
                            />
                            <button
                                onClick={() => createIssue(col.id)}
                                className="rounded-md border px-2 py-1 text-sm hover:bg-black/5"
                            >
                                Add
                            </button>
                        </div>

                        <ul className="space-y-2">
                            {col.issues.map((iss) => (
                                <li key={iss.id} className="rounded-md border p-3">
                                    <div className="text-sm font-medium">{iss.title}</div>
                                    <div className="text-xs text-black/50 mb-2">
                                        #{iss.id.slice(0, 6)} • {iss.status}
                                    </div>

                                    {/* 간단 이동 (드롭다운) */}
                                    <label className="text-xs text-black/60 mr-2">Move to:</label>
                                    <select
                                        defaultValue={col.id}
                                        onChange={(e) => moveIssue(iss.id, e.target.value)}
                                        className="border rounded px-2 py-1 text-xs"
                                    >
                                        {columns.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </main>
    );
}