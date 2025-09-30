'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';

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
};

type FullBoard = Board & { columns: Column[] };

const WS = process.env.NEXT_PUBLIC_WORKSPACE_ID;
const COL_TOKEN = '__COLUMN__:';

export default function KanbanPage() {
    const [board, setBoard] = useState<FullBoard | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [newBoardName, setNewBoardName] = useState('Main Board');
    const [newColumn, setNewColumn] = useState('');
    const [newIssueTitleByCol, setNewIssueTitleByCol] = useState<Record<string, string>>({});
    const [editingColumn, setEditingColumn] = useState<{ id: string; name: string } | null>(null);
    const [editingIssue, setEditingIssue] = useState<{ id: string; title: string; colId: string } | null>(null);

    const [confirm, setConfirm] = useState<{
        open: boolean;
        title: string;
        desc?: string;
        onYes?: () => Promise<void> | void;
        kind?: 'board' | 'column' | 'issue';
    }>({ open: false, title: '' });

    const [busy, setBusy] = useState<string | null>(null);
    const [cascade, setCascade] = useState(false);

    const { push } = useToast();
    const workspaceId = useMemo(() => WS ?? '', []);

    const withBusy = async <T,>(key: string, f: () => Promise<T>) => {
        setBusy(key);
        try {
            return await f();
        } finally {
            setBusy((k) => (k === key ? null : k));
        }
    };

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
                setLoading(false);
                return;
            }

            const b = boards.sort((a: Board, b: Board) => (a.order ?? 0) - (b.order ?? 0))[0];
            const rFull = await fetch(`/api/boards/${b.id}/full`, { cache: 'no-store' });
            if (!rFull.ok) throw new Error(`GET /boards/:id/full ${rFull.status}`);
            const full: FullBoard = await rFull.json();

            const cols: Column[] = (full.columns ?? []).slice().sort((a: Column, b: Column) => (a.order ?? 0) - (b.order ?? 0));
            cols.forEach((c: Column) =>
                c.issues.sort(
                    (x: Issue, y: Issue) =>
                        (x.order ?? 0) - (y.order ?? 0) ||
                        new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime()
                )
            );

            setBoard(full);
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

    const createBoard = async () => {
        if (!workspaceId || !newBoardName.trim()) return;
        await withBusy('create-board', async () => {
            const r = await fetch('/api/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBoardName.trim(), workspaceId }),
            });
            if (!r.ok) throw new Error(`Create board failed: ${r.status}`);
            push('Board created');
            await load();
        }).catch((e) => push(e.message || 'Create board failed'));
    };

    const createColumn = async () => {
        if (!board) return;
        if (!newColumn.trim()) return;
        await withBusy('create-col', async () => {
            const body = { name: newColumn.trim(), boardId: board.id, order: columns.length };
            const r = await fetch('/api/columns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error(`Create column failed: ${r.status}`);
            setNewColumn('');
            push('Column created');
            await load();
        }).catch((e) => push(e.message || 'Create column failed'));
    };

    const createIssue = async (columnId: string) => {
        const title = (newIssueTitleByCol[columnId] ?? '').trim();
        if (!title || !workspaceId) return;
        await withBusy(`create-issue:${columnId}`, async () => {
            const body = { title, workspaceId, columnId };
            const r = await fetch('/api/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error(`Create issue failed: ${r.status}`);
            setNewIssueTitleByCol((m) => ({ ...m, [columnId]: '' }));
            push('Issue created');
            await load();
        }).catch((e) => push(e.message || 'Create issue failed'));
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

        const next: Column[] = columns.map((c) => ({ ...c, issues: [...c.issues] }));
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
            push('Reordered');
            await load();
        } catch {
            await load();
        }
    };

    const moveIssue = async (issueId: string, targetColumnId: string) => {
        await withBusy(`move:${issueId}`, async () => {
            const r = await fetch(`/api/issues/${issueId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columnId: targetColumnId }),
            });
            if (!r.ok) throw new Error(`Move issue failed: ${r.status}`);
            push('Moved');
            await load();
        }).catch((e) => push(e.message || 'Move failed'));
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
        const next: Column[] = columns.map((c) => ({ ...c, issues: [...c.issues] }));
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
            push('Columns reordered');
            await load();
        } catch {
            await load();
        }
    };

    const patchColumn = async (id: string, name: string) => {
        if (!name.trim()) return;
        await withBusy(`rename-col:${id}`, async () => {
            const r = await fetch(`/api/columns/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            });
            if (!r.ok) throw new Error(`Update column failed: ${r.status}`);
            setEditingColumn(null);
            push('Column renamed');
            await load();
        }).catch((e) => push(e.message || 'Update column failed'));
    };

    const askDeleteColumn = (id: string) => {
        setConfirm({
            open: true,
            title: 'Delete this column?',
            desc: 'All issues in the column will be deleted.',
            onYes: async () => {
                setConfirm((c) => ({ ...c, open: true }));
                try {
                    await fetch(`/api/columns/${id}`, { method: 'DELETE' });
                    push('Column deleted');
                    await load();
                } finally {
                    setConfirm({ open: false, title: '' });
                }
            },
            kind: 'column',
        });
    };

    const patchIssue = async (id: string, title: string) => {
        if (!title.trim()) return;
        await withBusy(`rename-issue:${id}`, async () => {
            const r = await fetch(`/api/issues/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim() }),
            });
            if (!r.ok) throw new Error(`Update issue failed: ${r.status}`);
            setEditingIssue(null);
            push('Issue renamed');
            await load();
        }).catch((e) => push(e.message || 'Update issue failed'));
    };

    const askDeleteIssue = (id: string) => {
        setConfirm({
            open: true,
            title: 'Delete this issue?',
            onYes: async () => {
                setConfirm((c) => ({ ...c, open: true }));
                try {
                    await fetch(`/api/issues/${id}`, { method: 'DELETE' });
                    push('Issue deleted');
                    await load();
                } finally {
                    setConfirm({ open: false, title: '' });
                }
            },
            kind: 'issue',
        });
    };

    const askDeleteBoard = () => {
        if (!board) return;
        setCascade(false);
        setConfirm({
            open: true,
            title: 'Delete this board?',
            desc: 'You can optionally delete all columns and issues together.',
            onYes: async () => {
                setConfirm((c) => ({ ...c, open: true }));
                try {
                    const qs = cascade ? '?cascade=true' : '';
                    await fetch(`/api/boards/${board.id}${qs}`, { method: 'DELETE' });
                    push(cascade ? 'Board deleted with all columns and issues' : 'Board deleted');
                    await load();
                } finally {
                    setConfirm({ open: false, title: '' });
                }
            },
            kind: 'board',
        });
    };

    return (
        <main className="min-h-screen p-6 space-y-6">
            <ConfirmModal
                open={confirm.open}
                title={confirm.title}
                description={confirm.desc}
                onCancel={() => setConfirm({ open: false, title: '' })}
                onConfirm={async () => confirm.onYes && (await confirm.onYes())}
            >
                {confirm.kind === 'board' && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4"
                            checked={cascade}
                            onChange={(e) => setCascade(e.target.checked)}
                        />
                        <span>Also delete all columns and issues (cascade)</span>
                    </label>
                )}
            </ConfirmModal>

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Kanban</h1>
                    <p className="text-sm text-black/60">
                        Workspace: <code>{workspaceId || '(unset)'} </code>
                    </p>
                    {board && (
                        <p className="text-sm text-black/60">
                            Board: <strong>{board.name}</strong> (<code>{board.id}</code>)
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {board && (
                        <button
                            onClick={askDeleteBoard}
                            className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5"
                        >
                            Delete Board…
                        </button>
                    )}
                    <button
                        onClick={load}
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60"
                        disabled={loading}
                    >
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {!board && (
                <div className="space-y-3">
                    <div className="text-sm text-red-600">No board. Create one first.</div>
                    <div className="flex items-center gap-2">
                        <input
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            placeholder="Board name"
                            className="border rounded-md px-3 py-1.5 text-sm"
                        />
                        <button
                            onClick={createBoard}
                            className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60"
                            disabled={busy === 'create-board' || !newBoardName.trim()}
                        >
                            {busy === 'create-board' ? 'Creating…' : 'Create Board'}
                        </button>
                    </div>
                </div>
            )}

            {board && (
                <>
                    <div className="flex items-center gap-2">
                        <input
                            value={newColumn}
                            onChange={(e) => setNewColumn(e.target.value)}
                            placeholder="New column"
                            className="border rounded-md px-3 py-1.5 text-sm"
                        />
                        <button
                            onClick={createColumn}
                            className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60"
                            disabled={busy === 'create-col'}
                        >
                            {busy === 'create-col' ? 'Adding…' : 'Add Column'}
                        </button>
                    </div>

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
                                                    className="border rounded px-2 py-1 text-xs disabled:opacity-60"
                                                    onClick={() => patchColumn(col.id, editingColumn.name.trim())}
                                                    disabled={busy === `rename-col:${col.id}`}
                                                >
                                                    {busy === `rename-col:${col.id}` ? 'Saving…' : 'Save'}
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
                                        <button
                                            className="border rounded px-2 py-1 text-xs"
                                            onClick={() =>
                                                setConfirm({
                                                    open: true,
                                                    title: 'Delete this column?',
                                                    desc: 'All issues in the column will be deleted.',
                                                    onYes: async () => {
                                                        setConfirm((c) => ({ ...c, open: true }));
                                                        try {
                                                            await fetch(`/api/columns/${col.id}`, { method: 'DELETE' });
                                                            push('Column deleted');
                                                            await load();
                                                        } finally {
                                                            setConfirm({ open: false, title: '' });
                                                        }
                                                    },
                                                    kind: 'column',
                                                })
                                            }
                                        >
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
                                    <button
                                        onClick={() => createIssue(col.id)}
                                        className="rounded-md border px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-60"
                                        disabled={busy === `create-issue:${col.id}`}
                                    >
                                        {busy === `create-issue:${col.id}` ? 'Adding…' : 'Add'}
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
                                                            className="border rounded px-2 py-1 text-xs disabled:opacity-60"
                                                            onClick={() => patchIssue(iss.id, editingIssue.title.trim())}
                                                            disabled={busy === `rename-issue:${iss.id}`}
                                                        >
                                                            {busy === `rename-issue:${iss.id}` ? 'Saving…' : 'Save'}
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
                                                            <button
                                                                className="border rounded px-2 py-1 text-xs"
                                                                onClick={() =>
                                                                    setConfirm({
                                                                        open: true,
                                                                        title: 'Delete this issue?',
                                                                        onYes: async () => {
                                                                            setConfirm((c) => ({ ...c, open: true }));
                                                                            try {
                                                                                await fetch(`/api/issues/${iss.id}`, { method: 'DELETE' });
                                                                                push('Issue deleted');
                                                                                await load();
                                                                            } finally {
                                                                                setConfirm({ open: false, title: '' });
                                                                            }
                                                                        },
                                                                        kind: 'issue',
                                                                    })
                                                                }
                                                            >
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
                </>
            )}

            {err && <div className="text-sm text-red-600">{err}</div>}
        </main>
    );
}
