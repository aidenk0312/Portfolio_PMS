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
const API = process.env.NEXT_PUBLIC_API_BASE || '';
const COL_TOKEN = '__COLUMN__:';

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
            const rBoards = await fetch(`${API}/boards?workspaceId=${workspaceId}`, { cache: 'no-store' });
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

            const rCols = await fetch(`${API}/columns?boardId=${b.id}`, { cache: 'no-store' });
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
        const r = await fetch(`${API}/columns`, {
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
        const r = await fetch(`${API}/issues`, {
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
                await fetch(`${API}/columns/${toColumnId}/reorder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ issueIds: toIds }),
                });
            } else {
                await Promise.all([
                    fetch(`${API}/columns/${toColumnId}/reorder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ issueIds: toIds }),
                    }),
                    fetch(`${API}/columns/${fromColumnId}/reorder`, {
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
        const r = await fetch(`${API}/issues/${issueId}`, {
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
        if (!board) return;

        const token = e.dataTransfer.getData('text/column') || e.dataTransfer.getData('text/plain');
        if (!token) return;

        const fromColumnId = token.startsWith(COL_TOKEN) ? token.slice(COL_TOKEN.length) : token;
        const wrap = e.currentTarget as HTMLElement;
        const insertIndex = getColumnDropIndex(wrap, e.clientX);

        const after = columns.map((c) => ({ ...c, issues: [...c.issues] }));
        const srcIdx = after.findIndex((c) => c.id === fromColumnId);
        if (srcIdx < 0) {
            alert('드래그한 컬럼을 찾지 못했습니다.');
            return;
        }
        const [moved] = after.splice(srcIdx, 1);
        let destIdx = Math.max(0, Math.min(insertIndex, after.length));
        if (srcIdx < destIdx) destIdx -= 1;
        after.splice(destIdx, 0, moved);

        setColumns(after);

        const columnIds = after.map((c) => c.id);
        if (!columnIds.length) {
            alert('컬럼 재정렬 payload가 비어있어요.');
            return;
        }

        try {
            const r = await fetch(`${API}/columns/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardId: board.id, columnIds }),
            });
            if (!r.ok) {
                const msg = await r.text().catch(() => '');
                alert(`컬럼 재정렬 실패: ${r.status}\n${msg}`);
                return;
            }
            await load();
        } catch {
            alert('컬럼 재정렬 호출 중 오류가 발생했습니다.');
            await load();
        }
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
                        placeholder="새 컬럼 이름 (예: Todo)"
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
                        draggable
                        onDragStart={(e) => onColDragStart(e, col.id)}
                    >
                        <header
                            className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(e) => onColDragStart(e, col.id)}
                        >
                            <h2 className="font-semibold">{col.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-black/50">{col.issues.length} cards</span>
                                <span
                                    draggable
                                    onDragStart={(e) => onColDragStart(e, col.id)}
                                    title="Drag column"
                                    className="cursor-move text-xs text-black/40 border rounded px-2 py-0.5"
                                />
                            </div>
                        </header>

                        <div className="mb-3 flex items-center gap-2">
                            <input
                                value={newIssueTitleByCol[col.id] ?? ''}
                                onChange={(e) => setNewIssueTitleByCol((m) => ({ ...m, [col.id]: e.target.value }))}
                                placeholder="새 이슈 제목"
                                className="border rounded-md px-2 py-1 text-sm flex-1"
                            />
                            <button onClick={() => createIssue(col.id)} className="rounded-md border px-2 py-1 text-sm hover:bg-black/5">
                                Add
                            </button>
                        </div>

                        <ul className="space-y-2">
                            {col.issues.map((iss) => (
                                <li
                                    key={iss.id}
                                    data-id={iss.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, iss.id, col.id)}
                                    className="rounded-md border p-3 bg-white cursor-move"
                                >
                                    <div className="text-sm font-medium">{iss.title}</div>
                                    <div className="text-xs text-black/40 mb-2 capitalize">{iss.status}</div>
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
