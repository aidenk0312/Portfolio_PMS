'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';

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
    order?: number | null;
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
const COL_TOKEN = '__COLUMN__:';

export default function KanbanPage() {
    const [board, setBoard] = useState<Board | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [newColumn, setNewColumn] = useState('');
    const [newIssueTitleByCol, setNewIssueTitleByCol] = useState<Record<string, string>>({});
    const [editingColumn, setEditingColumn] = useState<{ id: string; name: string } | null>(null);
    const [editingIssue, setEditingIssue] = useState<{ id: string; title: string; colId: string } | null>(null);

    const workspaceId = useMemo(() => WS ?? '', []);

    const load = async () => {
        if (!workspaceId) {
            setErr('NEXT_PUBLIC_WORKSPACE_ID is empty.');
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
                setErr('No board. Create one first.');
                setLoading(false);
                return;
            }
            const b = boards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
            setBoard(b);

            const rCols = await fetch(`/api/columns?boardId=${b.id}`, { cache: 'no-store' });
            if (!rCols.ok) throw new Error(`GET /columns ${rCols.status}`);
            const cols: Column[] = await rCols.json();
            cols.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            cols.forEach((c) => c.issues.sort((x, y) => (x.order ?? 0) - (y.order ?? 0)));
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
            alert(`Create column failed: ${r.status}`);
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
            alert(`Create issue failed: ${r.status}`);
            return;
        }
        setNewIssueTitleByCol((m) => ({ ...m, [columnId]: '' }));
        await load();
    };

    const onDragStart = (e: React.DragEvent, issueId: string, fromColumnId: string) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify({ issueId, fromColumnId }));
        e.dataTransfer.effectAllowed = 'move';
    };

    function getDropIndex(section: HTMLElement, y: number) {
        const items = Array.from(section.querySelectorAll('li[data-id]')) as HTMLElement[];
        for (let i = 0; i < items.length; i++) {
            const r = items[i].getBoundingClientRect();
            if (y < r.top + r.height / 2) return i;
        }
        return items.length;
    }

    const onDropToColumn = async (e: React.DragEvent<HTMLElement>, toColumnId: string) => {
        const token = e.dataTransfer.getData('text/column') || e.dataTransfer.getData('text/plain');
        if (token && (token.startsWith(COL_TOKEN) || columns.some((c) => c.id === token))) return;

        e.preventDefault();
        e.stopPropagation();

        const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (!raw) return;

        let payload: { issueId: string; fromColumnId: string } | null = null;
        try {
            payload = JSON.parse(raw);
        } catch {
            return;
        }
        if (!payload) return;

        const { issueId, fromColumnId } = payload;
        const insertIndex = getDropIndex(e.currentTarget as HTMLElement, e.clientY);

        const next = columns.map((c) => ({ ...c, issues: [...c.issues] }));
        const from = next.find((c) => c.id === fromColumnId);
        const to = next.find((c) => c.id === toColumnId);
        if (!from || !to) return;

        const srcIdx = from.issues.findIndex((i) => i.id === issueId);
        if (srcIdx < 0) return;

        const [moved] = from.issues.splice(srcIdx, 1);
        moved.columnId = toColumnId;

        let destIdx = Math.max(0, Math.min(insertIndex, to.issues.length));
        if (fromColumnId === toColumnId && srcIdx < destIdx) destIdx -= 1;

        to.issues.splice(destIdx, 0, moved);
        setColumns(next);

        const toIds = to.issues.map((i) => i.id);
        const fromIds = from.issues.map((i) => i.id);

        try {
            if (fromColumnId === toColumnId) {
                await fetch(`/api/columns/${toColumnId}/reorder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ issueIds: toIds }),
                });
            } else {
                await Promise.all([
                    fetch(`/api/columns/${toColumnId}/reorder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ issueIds: toIds }),
                    }),
                    fetch(`/api/columns/${fromColumnId}/reorder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ issueIds: fromIds }),
                    }),
                ]);
            }
            await load();
        } catch {
            await load();
        }
    };

    const moveIssue = async (issueId: string, targetColumnId: string) => {
        const r = await fetch(`/api/issues/${issueId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId: targetColumnId }),
        });
        if (!r.ok) {
            alert(`Move issue failed: ${r.status}`);
            return;
        }
        await load();
    };

    function getColumnDropIndex(container: HTMLElement, x: number) {
        const sections = Array.from(container.querySelectorAll('section[data-col-id]')) as HTMLElement[];
        for (let i = 0; i < sections.length; i++) {
            const r = sections[i].getBoundingClientRect();
            if (x < r.left + r.width / 2) return i;
        }
        return sections.length;
    }

    const onColDragStart = (e: React.DragEvent, columnId: string) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/column', columnId);
        e.dataTransfer.setData('text/plain', `${COL_TOKEN}${columnId}`);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onColDrop = async (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!board) return;

        const token = e.dataTransfer.getData('text/column') || e.dataTransfer.getData('text/plain');
        if (!token) return;
        const fromColumnId = token.startsWith(COL_TOKEN) ? token.slice(COL_TOKEN.length) : token;

        const wrap = e.currentTarget as HTMLElement;
        const insertIndex = getColumnDropIndex(wrap, e.clientX);
        const next = columns.map((c) => ({ ...c, issues: [...c.issues] }));
        const srcIdx = next.findIndex((c) => c.id === fromColumnId);
        if (srcIdx < 0) return;

        const [moved] = next.splice(srcIdx, 1);
        let destIdx = Math.max(0, Math.min(insertIndex, next.length));
        if (srcIdx < destIdx) destIdx -= 1;
        next.splice(destIdx, 0, moved);
        setColumns(next);

        try {
            const columnIds = next.map((c) => c.id);
            await fetch('/api/columns/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardId: board.id, columnIds }),
            });
            await load();
        } catch (err) {
            console.error('[columns/reorder] failed', err);
            alert('컬럼 재정렬 실패');
            await load();
        }
    };

    const patchColumn = async (id: string, name: string) => {
        const r = await fetch(`/api/columns/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!r.ok) {
            alert(`Update column failed: ${r.status}`);
            return;
        }
        setEditingColumn(null);
        await load();
    };

    const deleteColumn = async (id: string) => {
        if (!confirm('Delete this column?')) return;
        const r = await fetch(`/api/columns/${id}`, { method: 'DELETE' });
        if (!r.ok) {
            alert(`Delete column failed: ${r.status}`);
            return;
        }
        await load();
    };

    const patchIssue = async (id: string, title: string) => {
        const r = await fetch(`/api/issues/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
        });
        if (!r.ok) {
            alert(`Update issue failed: ${r.status}`);
            return;
        }
        setEditingIssue(null);
        await load();
    };

    const deleteIssue = async (id: string) => {
        if (!confirm('Delete this issue?')) return;
        const r = await fetch(`/api/issues/${id}`, { method: 'DELETE' });
        if (!r.ok) {
            alert(`Delete issue failed: ${r.status}`);
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
                    <button onClick={load} className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5">
                        Refresh
                    </button>
                </div>
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}
            {loading && <div className="text-sm opacity-70">Loading…</div>}

            {board && (
                <div className="flex items-center gap-2">
                    <input
                        value={newColumn}
                        onChange={(e) => setNewColumn(e.target.value)}
                        placeholder="New column"
                        className="border rounded-md px-3 py-1.5 text-sm"
                    />
                    <button onClick={createColumn} className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5">
                        Add Column
                    </button>
                </div>
            )}

            <div
                className="grid gap-4 md:grid-cols-3"
                data-columns-wrap
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={onColDrop}
            >
                {columns.map((col) => (
                    <section
                        key={col.id}
                        data-col-id={col.id}
                        className="rounded-xl border p-4 bg-white"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDropToColumn(e, col.id)}
                    >
                        <header className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {editingColumn?.id === col.id ? (
                                    <>
                                        <input
                                            value={editingColumn.name}
                                            onChange={(e) => setEditingColumn({ id: col.id, name: e.target.value })}
                                            className="border rounded px-2 py-1 text-sm"
                                        />
                                        <button
                                            className="border rounded px-2 py-1 text-xs"
                                            onClick={() => patchColumn(col.id, editingColumn.name.trim())}
                                        >
                                            Save
                                        </button>
                                        <button className="border rounded px-2 py-1 text-xs" onClick={() => setEditingColumn(null)}>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h2
                                            className="font-semibold cursor-grab active:cursor-grabbing"
                                            draggable
                                            onDragStart={(e) => onColDragStart(e, col.id)}
                                        >
                                            {col.name}
                                        </h2>
                                        <button
                                            className="border rounded px-2 py-1 text-xs"
                                            onClick={() => setEditingColumn({ id: col.id, name: col.name })}
                                        >
                                            Rename
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-black/50">{col.issues.length} cards</span>
                                <button className="border rounded px-2 py-1 text-xs" onClick={() => deleteColumn(col.id)}>
                                    Delete
                                </button>
                            </div>
                        </header>

                        <div className="mb-3 flex items-center gap-2">
                            <input
                                value={newIssueTitleByCol[col.id] ?? ''}
                                onChange={(e) => setNewIssueTitleByCol((m) => ({ ...m, [col.id]: e.target.value }))}
                                placeholder="New issue"
                                className="border rounded-md px-2 py-1 text-sm flex-1"
                            />
                            <button onClick={() => createIssue(col.id)} className="rounded-md border px-2 py-1 text-sm hover:bg-black/5">
                                Add
                            </button>
                        </div>

                        <ul className="space-y-2">
                            {col.issues.map((iss) => {
                                const label = columns.find((c) => c.id === (iss.columnId ?? col.id))?.name ?? col.name;
                                return (
                                    <li
                                        key={iss.id}
                                        data-id={iss.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, iss.id, col.id)}
                                        className="rounded-md border p-3 bg-white"
                                    >
                                        {editingIssue?.id === iss.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={editingIssue.title}
                                                    onChange={(e) => setEditingIssue({ id: iss.id, title: e.target.value, colId: col.id })}
                                                    className="border rounded px-2 py-1 text-sm flex-1"
                                                />
                                                <button
                                                    className="border rounded px-2 py-1 text-xs"
                                                    onClick={() => patchIssue(iss.id, editingIssue.title.trim())}
                                                >
                                                    Save
                                                </button>
                                                <button className="border rounded px-2 py-1 text-xs" onClick={() => setEditingIssue(null)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium truncate">{iss.title}</div>
                                                    <div className="text-xs text-black/40 mb-2">{label}</div>
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
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        className="border rounded px-2 py-1 text-xs"
                                                        onClick={() => setEditingIssue({ id: iss.id, title: iss.title, colId: col.id })}
                                                    >
                                                        Rename
                                                    </button>
                                                    <button className="border rounded px-2 py-1 text-xs" onClick={() => deleteIssue(iss.id)}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>
        </main>
    );
}
