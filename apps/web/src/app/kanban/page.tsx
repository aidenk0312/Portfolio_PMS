'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useToast } from '@/app/components/Toast';
import ConfirmModal from '@/app/components/ConfirmModal';

import {
    DndContext,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    closestCenter,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
type ColumnWithBoard = Column & { _board: { id: string; name: string } };

type DragMeta =
    | { kind: 'column'; id: string }
    | { kind: 'issue'; id: string; fromColumnId: string }
    | null;

const WS = process.env.NEXT_PUBLIC_WORKSPACE_ID;

function cn(...a: (string | false | null | undefined)[]) {
    return a.filter(Boolean).join(' ');
}

const baseBtn =
    'inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:cursor-not-allowed';
const btn = `${baseBtn} border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-indigo-500/60`;
const btnPrimary = `${baseBtn} border-transparent bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500/70`;
const btnDanger = `${baseBtn} border-transparent bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500/60`;
const btnWarn = `${baseBtn} border-transparent bg-amber-400 text-black hover:bg-amber-300 focus-visible:ring-amber-400/60`;

const input =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60';

const card = 'rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.05),0_6px_16px_-8px_rgb(0_0_0/0.15)]';

function SortableIssue({ issue, children }: { issue: Issue; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } =
        useSortable({ id: issue.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <li
            ref={setNodeRef}
            style={style}
            className={cn(card, 'p-3', isDragging && 'opacity-70')}
            data-id={issue.id}
        >
            <div ref={setActivatorNodeRef} {...attributes} {...listeners}>
                {children}
            </div>
        </li>
    );
}

function SortableColumn(props: {
    column: ColumnWithBoard;
    draggable: boolean;
    headerLeft: React.ReactNode;
    headerRight: React.ReactNode;
    children: React.ReactNode;
}) {
    const { column, draggable, headerLeft, headerRight, children } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } =
        useSortable({ id: column.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <section
            ref={setNodeRef}
            style={style}
            data-col-id={column.id}
            className={cn(card, 'p-4', isDragging && 'opacity-70')}
        >
            <div
                className={cn(
                    draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-60',
                    'mb-3 flex items-center justify-between',
                )}
            >
                <div ref={setActivatorNodeRef} {...(draggable ? { ...attributes, ...listeners } : {})}>
                    {headerLeft}
                </div>
                {headerRight}
            </div>
            {children}
        </section>
    );
}

export default function KanbanPage() {
    const [allBoards, setAllBoards] = useState<Board[]>([]);
    const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
    const [columns, setColumns] = useState<ColumnWithBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

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
    const [pickerOpen, setPickerOpen] = useState(false);

    const [activeDrag, setActiveDrag] = useState<DragMeta>(null);
    const [overlay, setOverlay] = useState<React.ReactNode | null>(null);

    const { push } = useToast();
    const workspaceId = useMemo(() => WS ?? '', []);

    const singleBoardMode = selectedBoardIds.length === 1;
    const activeBoard = singleBoardMode ? allBoards.find((b) => b.id === selectedBoardIds[0]) ?? null : null;

    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 6 } });
    const sensors = useSensors(pointerSensor);

    const columnsByActive = useMemo<ColumnWithBoard[]>(
        () => (singleBoardMode && activeBoard ? columns.filter((c) => c._board.id === activeBoard.id) : columns),
        [singleBoardMode, activeBoard?.id, columns],
    );

    const getColumnIds = (): string[] => columnsByActive.map((c) => c.id);
    const getIssueIdsByColumn = (colId: string): string[] =>
        (columnsByActive.find((c) => c.id === colId)?.issues ?? []).map((i) => i.id);

    const withBusy = async <T,>(key: string, f: () => Promise<T>) => {
        setBusy(key);
        try {
            return await f();
        } finally {
            setBusy((k) => (k === key ? null : k));
        }
    };

    const fetchFullBoard = async (id: string): Promise<FullBoard> => {
        const r = await fetch(`/api/boards/${id}/full`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`GET /boards/:id/full ${r.status}`);
        return r.json();
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
            const sorted = boards.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setAllBoards(sorted);

            const selected = selectedBoardIds.length ? selectedBoardIds : sorted[0] ? [sorted[0].id] : [];
            if (selected.join('|') !== selectedBoardIds.join('|')) setSelectedBoardIds(selected);

            if (selected.length === 0) {
                setColumns([]);
                setLoading(false);
                return;
            }

            const fulls = await Promise.all(selected.map((id) => fetchFullBoard(id)));
            const merged: ColumnWithBoard[] = [];
            for (const fb of fulls) {
                const cols = (fb.columns ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                cols.forEach((c) => {
                    c.issues.sort(
                        (x, y) =>
                            (x.order ?? 0) - (y.order ?? 0) ||
                            new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
                    );
                    merged.push({ ...c, _board: { id: fb.id, name: fb.name } });
                });
            }
            setColumns(merged);
        } catch (e: any) {
            setErr(e?.message ?? 'load failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBoardIds.join('|')]);

    const createBoardQuick = async () => {
        if (!workspaceId) return;
        const name = window.prompt('New board name');
        if (!name?.trim()) return;
        await withBusy('create-board', async () => {
            const r = await fetch('/api/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), workspaceId }),
            });
            if (!r.ok) throw new Error(`Create board failed: ${r.status}`);
            push('Board created');
            await load();
        }).catch((e) => push(e instanceof Error ? e.message : 'Create board failed'));
    };

    const createColumn = async () => {
        if (!activeBoard) return;
        if (!newColumn.trim()) return;
        await withBusy('create-col', async () => {
            const body = {
                name: newColumn.trim(),
                boardId: activeBoard.id,
                order: columns.filter((c) => c._board.id === activeBoard.id).length,
            };
            const r = await fetch('/api/columns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error(`Create column failed: ${r.status}`);
            setNewColumn('');
            push('Column created');
            await load();
        }).catch((e) => push(e instanceof Error ? e.message : 'Create column failed'));
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
        }).catch((e) => push(e instanceof Error ? e.message : 'Create issue failed'));
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
        }).catch((e) => push(e instanceof Error ? e.message : 'Update column failed'));
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
        }).catch((e) => push(e instanceof Error ? e.message : 'Update issue failed'));
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

    const askClearColumns = () => {
        if (!activeBoard) return;
        setConfirm({
            open: true,
            title: 'Delete ALL columns on this board?',
            desc: 'This will delete every column and its issues. This cannot be undone.',
            onYes: async () => {
                setConfirm((c) => ({ ...c, open: true }));
                try {
                    const r = await fetch(`/api/columns?boardId=${activeBoard.id}`, { cache: 'no-store' });
                    if (!r.ok) throw new Error(`GET /columns ${r.status}`);
                    const cols: Column[] = await r.json();
                    for (const c of cols) {
                        await fetch(`/api/columns/${c.id}`, { method: 'DELETE' });
                    }
                    push('All columns deleted');
                    await load();
                } finally {
                    setConfirm({ open: false, title: '' });
                }
            },
            kind: 'column',
        });
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
        if (!activeBoard) return;
        setCascade(false);
        setConfirm({
            open: true,
            title: 'Delete this board?',
            desc: 'You can optionally delete all columns & issues together.',
            onYes: async () => {
                setConfirm((c) => ({ ...c, open: true }));
                try {
                    const qs = cascade ? '?cascade=true' : '';
                    await fetch(`/api/boards/${activeBoard.id}${qs}`, { method: 'DELETE' });
                    push(cascade ? 'Board deleted with all columns & issues' : 'Board deleted');
                    const nextSelected = selectedBoardIds.filter((x) => x !== activeBoard.id);
                    setSelectedBoardIds(nextSelected.length ? nextSelected : []);
                    await load();
                } finally {
                    setConfirm({ open: false, title: '' });
                }
            },
            kind: 'board',
        });
    };

    const onDragStart = (e: DragStartEvent) => {
        const id = String(e.active.id);
        const col = columnsByActive.find((c) => c.id === id);
        if (col) {
            setActiveDrag({ kind: 'column', id });
            setOverlay(<div className={cn(card, 'px-3 py-2')}>{col.name}</div>);
            return;
        }
        for (const c of columnsByActive) {
            const iss = c.issues.find((i) => i.id === id);
            if (iss) {
                setActiveDrag({ kind: 'issue', id, fromColumnId: c.id });
                setOverlay(<div className={cn(card, 'px-3 py-2 text-sm')}>{iss.title}</div>);
                return;
            }
        }
        setActiveDrag(null);
        setOverlay(null);
    };

    const onDragOver = (e: DragOverEvent) => {
        if (!activeDrag) return;
        const overId = e.over?.id ? String(e.over.id) : null;
        if (!overId) return;

        if (activeDrag.kind === 'issue') {
            const fromColId = activeDrag.fromColumnId;

            let toColId = fromColId;
            const overCol = columnsByActive.find((c) => c.id === overId);
            if (overCol) toColId = overCol.id;
            else {
                const host = columnsByActive.find((c) => c.issues.some((i) => i.id === overId));
                if (host) toColId = host.id;
            }

            if (!toColId || toColId === fromColId) return;

            setColumns((prev) => {
                const clone = prev.map((c) => ({ ...c, issues: [...c.issues] }));
                const scoped = singleBoardMode && activeBoard ? clone.filter((c) => c._board.id === activeBoard.id) : clone;

                const fromCol = scoped.find((c) => c.id === fromColId);
                const toCol = scoped.find((c) => c.id === toColId);
                if (!fromCol || !toCol) return prev;

                const fromIdx = fromCol.issues.findIndex((i) => i.id === activeDrag.id);
                if (fromIdx < 0) return prev;

                const [moved] = fromCol.issues.splice(fromIdx, 1);
                moved.columnId = toCol.id;
                toCol.issues.push(moved);

                return clone;
            });

            setActiveDrag({ kind: 'issue', id: activeDrag.id, fromColumnId: toColId });
        }
    };

    const onDragEnd = async (e: DragEndEvent) => {
        const activeId = String(e.active.id);
        const overId = e.over?.id ? String(e.over.id) : null;

        try {
            if (activeDrag?.kind === 'column' && singleBoardMode && activeBoard) {
                if (!overId || activeId === overId) return;
                const ids = getColumnIds();
                const oldIndex = ids.indexOf(activeId);
                const newIndex = ids.indexOf(overId);
                if (oldIndex < 0 || newIndex < 0) return;

                const nextScoped = arrayMove(columnsByActive, oldIndex, newIndex);
                const others = columns.filter((c) => c._board.id !== activeBoard.id);
                setColumns([...others, ...nextScoped]);

                const columnIds = nextScoped.map((c) => c.id);
                await fetch('/api/columns/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ boardId: activeBoard.id, columnIds }),
                });
                push('Columns reordered');
                await load();
                return;
            }

            if (activeDrag?.kind === 'issue') {
                const fromColId = activeDrag.fromColumnId;

                let toColId = fromColId;
                if (overId) {
                    const overCol = columnsByActive.find((c) => c.id === overId);
                    if (overCol) toColId = overCol.id;
                    else {
                        const host = columnsByActive.find((c) => c.issues.some((i) => i.id === overId));
                        if (host) toColId = host.id;
                    }
                }

                let updated: ColumnWithBoard[] = [];

                setColumns((prev) => {
                    const clone = prev.map((c) => ({ ...c, issues: [...c.issues] }));
                    const scoped = singleBoardMode && activeBoard ? clone.filter((c) => c._board.id === activeBoard.id) : clone;

                    const fromCol = scoped.find((c) => c.id === fromColId);
                    const toCol = scoped.find((c) => c.id === toColId);
                    if (!fromCol || !toCol) {
                        updated = prev;
                        return prev;
                    }

                    const fromIdx = fromCol.issues.findIndex((i) => i.id === activeId);
                    if (fromIdx < 0) {
                        updated = prev;
                        return prev;
                    }

                    if (toColId === fromColId) {
                        const overIndex = overId ? toCol.issues.findIndex((i) => i.id === overId) : toCol.issues.length - 1;
                        if (overIndex < 0) {
                            updated = prev;
                            return prev;
                        }
                        toCol.issues = arrayMove(toCol.issues, fromIdx, overIndex);
                    } else {
                        const overIndex = overId ? toCol.issues.findIndex((i) => i.id === overId) : toCol.issues.length;
                        const [moved] = fromCol.issues.splice(fromIdx, 1);
                        moved.columnId = toCol.id;
                        const insertAt = overIndex < 0 ? toCol.issues.length : overIndex;
                        toCol.issues.splice(insertAt, 0, moved);
                    }

                    updated = clone;
                    return clone;
                });

                if (!updated) return;

                const base = (updated ?? []) as ColumnWithBoard[];
                const updatedScoped = singleBoardMode && activeBoard ? base.filter((c) => c._board.id === activeBoard.id) : base;

                const toIds = (updatedScoped.find((c) => c.id === toColId)?.issues ?? []).map((i) => i.id);
                const fromIds = (updatedScoped.find((c) => c.id === fromColId)?.issues ?? []).map((i) => i.id);

                if (fromColId === toColId) {
                    await fetch(`/api/columns/${toColId}/reorder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ issueIds: toIds }),
                    });
                } else {
                    await Promise.all([
                        fetch(`/api/columns/${toColId}/reorder`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ issueIds: toIds }),
                        }),
                        fetch(`/api/columns/${fromColId}/reorder`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ issueIds: fromIds }),
                        }),
                    ]);
                }

                push('Reordered');
                await load();
            }
        } finally {
            setActiveDrag(null);
            setOverlay(null);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
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
                        <span>Also delete all columns &amp; issues (cascade)</span>
                    </label>
                )}
            </ConfirmModal>

            <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Project Management System</h1>
                        <p className="text-sm text-slate-600">
                            Workspace: <code>{workspaceId || '(unset)'}</code>
                        </p>
                        {singleBoardMode && activeBoard && (
                            <p className="text-sm text-slate-600">
                                Board: <strong>{activeBoard.name}</strong> (<code>{activeBoard.id}</code>)
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setPickerOpen(true)} className={btn}>
                            Boards: {selectedBoardIds.length || 0} selected
                        </button>

                        {singleBoardMode && activeBoard && (
                            <button onClick={askClearColumns} className={btnWarn} title="Delete all columns on this board">
                                Clear Columns…
                            </button>
                        )}

                        <button onClick={createBoardQuick} className={btnPrimary}>
                            Add Board
                        </button>

                        {singleBoardMode && activeBoard && (
                            <button onClick={askDeleteBoard} className={btnDanger}>
                                Delete Board…
                            </button>
                        )}

                        <button onClick={load} className={btn}>
                            Refresh
                        </button>
                    </div>
                </header>

                {err && <div className="text-sm text-red-600">{err}</div>}
                {loading && <div className="text-sm">Loading…</div>}

                {singleBoardMode && activeBoard && (
                    <section className={cn(card, 'p-5')}>
                        <div className="flex items-center gap-2">
                            <input
                                value={newColumn}
                                onChange={(e) => setNewColumn(e.target.value)}
                                placeholder="New column"
                                className={input}
                            />
                            <button onClick={createColumn} className={btn} disabled={busy === 'create-col'}>
                                {busy === 'create-col' ? 'Adding…' : 'Add Column'}
                            </button>
                        </div>
                    </section>
                )}

                {!!columnsByActive.length && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={onDragStart}
                        onDragOver={onDragOver}
                        onDragEnd={onDragEnd}
                    >
                        <div className="grid gap-4 md:grid-cols-3" data-columns-wrap>
                            <SortableContext items={getColumnIds()} strategy={rectSortingStrategy}>
                                {columnsByActive.map((col) => (
                                    <SortableColumn
                                        key={col.id}
                                        column={col}
                                        draggable={singleBoardMode}
                                        headerLeft={
                                            <>
                                                {!singleBoardMode && (
                                                    <span className="mr-2 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                            {col._board.name}
                          </span>
                                                )}
                                                {editingColumn?.id === col.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            value={editingColumn.name}
                                                            onChange={(e) => setEditingColumn({ id: col.id, name: e.target.value })}
                                                            className={cn(input, 'h-8 w-44')}
                                                        />
                                                        <button
                                                            className={cn(btn, 'px-2 py-1 text-xs')}
                                                            onClick={() => patchColumn(col.id, editingColumn.name.trim())}
                                                            disabled={busy === `rename-col:${col.id}`}
                                                        >
                                                            {busy === `rename-col:${col.id}` ? 'Saving…' : 'Save'}
                                                        </button>
                                                        <button className={cn(btn, 'px-2 py-1 text-xs')} onClick={() => setEditingColumn(null)}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <h2 className="font-semibold">{col.name}</h2>
                                                )}
                                            </>
                                        }
                                        headerRight={
                                            <div className="flex items-center gap-2">
                                                {editingColumn?.id !== col.id && (
                                                    <>
                                                        <button className={cn(btn, 'px-2 py-1 text-xs')} onClick={() => setEditingColumn({ id: col.id, name: col.name })}>
                                                            Rename
                                                        </button>
                                                        <button className={cn(btn, 'px-2 py-1 text-xs')} onClick={() => askDeleteColumn(col.id)}>
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                                <span className="text-xs text-slate-500">{col.issues.length} cards</span>
                                            </div>
                                        }
                                    >
                                        <div className="mb-3 flex items-center gap-2">
                                            <input
                                                value={newIssueTitleByCol[col.id] ?? ''}
                                                onChange={(e) =>
                                                    setNewIssueTitleByCol((m) => ({
                                                        ...m,
                                                        [col.id]: e.target.value,
                                                    }))
                                                }
                                                placeholder="New issue"
                                                className={input}
                                            />
                                            <button
                                                onClick={() => createIssue(col.id)}
                                                className={btn}
                                                disabled={busy === `create-issue:${col.id}`}
                                            >
                                                {busy === `create-issue:${col.id}` ? 'Adding…' : 'Add'}
                                            </button>
                                        </div>

                                        <SortableContext items={getIssueIdsByColumn(col.id)} strategy={rectSortingStrategy}>
                                            <ul className="space-y-2">
                                                {col.issues.map((iss) => {
                                                    const label =
                                                        columnsByActive.find((c) => c.id === (iss.columnId ?? col.id))?.name ?? col.name;
                                                    return (
                                                        <SortableIssue key={iss.id} issue={iss}>
                                                            {editingIssue?.id === iss.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        value={editingIssue.title}
                                                                        onChange={(e) => setEditingIssue({ id: iss.id, title: e.target.value, colId: col.id })}
                                                                        className={input}
                                                                    />
                                                                    <button
                                                                        className={cn(btn, 'px-2 py-1 text-xs')}
                                                                        onClick={() => patchIssue(iss.id, editingIssue.title.trim())}
                                                                        disabled={busy === `rename-issue:${iss.id}`}
                                                                    >
                                                                        {busy === `rename-issue:${iss.id}` ? 'Saving…' : 'Save'}
                                                                    </button>
                                                                    <button className={cn(btn, 'px-2 py-1 text-xs')} onClick={() => setEditingIssue(null)}>
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-sm font-medium">{iss.title}</div>
                                                                        <div className="mb-2 text-xs text-slate-500">{label}</div>
                                                                    </div>
                                                                    <div className="shrink-0 flex items-center gap-2">
                                                                        <button
                                                                            className={cn(btn, 'px-2 py-1 text-xs')}
                                                                            onClick={() => setEditingIssue({ id: iss.id, title: iss.title, colId: col.id })}
                                                                        >
                                                                            Rename
                                                                        </button>
                                                                        <button className={cn(btn, 'px-2 py-1 text-xs')} onClick={() => askDeleteIssue(iss.id)}>
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </SortableIssue>
                                                    );
                                                })}
                                            </ul>
                                        </SortableContext>
                                    </SortableColumn>
                                ))}
                            </SortableContext>
                        </div>

                        <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
                    </DndContext>
                )}

                <BoardPicker
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    boards={allBoards}
                    selected={selectedBoardIds}
                    onToggle={(id) =>
                        setSelectedBoardIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                    }
                />
            </div>
        </main>
    );
}

function BoardPicker(props: {
    open: boolean;
    onClose: () => void;
    boards: Board[];
    selected: string[];
    onToggle: (id: string) => void;
}) {
    const { open, onClose, boards, selected, onToggle } = props;
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div
                className={cn(card, 'absolute left-1/2 top-1/2 w-[520px] -translate-x-1/2 -translate-y-1/2 p-5')}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Select Boards</h3>
                    <button className={cn(btn, 'px-2 py-1 text-xs')} onClick={onClose}>
                        Close
                    </button>
                </div>
                <div className="max-h-[50vh] space-y-2 overflow-auto">
                    {boards.map((b) => (
                        <label key={b.id} className={cn(card, 'flex items-center justify-between px-3 py-2')}>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{b.name}</div>
                                <div className="truncate text-[11px] text-slate-500">{b.id}</div>
                            </div>
                            <input
                                type="checkbox"
                                className="size-4"
                                checked={selected.includes(b.id)}
                                onChange={() => onToggle(b.id)}
                            />
                        </label>
                    ))}
                    {!boards.length && <div className="text-sm text-slate-500">No boards</div>}
                </div>
            </div>
        </div>
    );
}
