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

function cn(...a: (string | false | null | undefined)[]): string {
    return a.filter(Boolean).join(' ');
}

function SortableIssue(props: { issue: Issue; children: React.ReactNode }) {
    const { issue, children } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } =
        useSortable({ id: issue.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <li
            ref={setNodeRef}
            style={style}
            className={cn('rounded-xl border p-3 bg-white shadow-sm', isDragging && 'opacity-70')}
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
            className={cn('rounded-2xl border p-4 bg-white shadow-sm', isDragging && 'opacity-70')}
        >
            <div
                className={cn(
                    draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-60',
                    'flex items-center justify-between mb-3',
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
    const [loading, setLoading] = useState<boolean>(true);
    const [err, setErr] = useState<string | null>(null);

    const [newColumn, setNewColumn] = useState<string>('');
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
    const [cascade, setCascade] = useState<boolean>(false);
    const [pickerOpen, setPickerOpen] = useState<boolean>(false);

    const [activeDrag, setActiveDrag] = useState<DragMeta>(null);
    const [overlay, setOverlay] = useState<React.ReactNode | null>(null);

    const { push } = useToast();
    const workspaceId = useMemo<string>(() => WS ?? '', []);

    const singleBoardMode = selectedBoardIds.length === 1;
    const activeBoard: Board | null = singleBoardMode ? allBoards.find((b: Board) => b.id === selectedBoardIds[0]) ?? null : null;

    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 6 } });
    const sensors = useSensors(pointerSensor);

    const columnsByActive = useMemo<ColumnWithBoard[]>(
        () =>
            singleBoardMode && activeBoard
                ? columns.filter((c: ColumnWithBoard) => c._board.id === activeBoard.id)
                : columns,
        [singleBoardMode, activeBoard?.id, columns],
    );

    const getColumnIds = (): string[] => columnsByActive.map((c: ColumnWithBoard) => c.id);

    const getIssueIdsByColumn = (colId: string): string[] =>
        (columnsByActive.find((c: ColumnWithBoard) => c.id === colId)?.issues ?? []).map((i: Issue) => i.id);

    const withBusy = async <T,>(key: string, f: () => Promise<T>): Promise<T> => {
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
        return r.json() as Promise<FullBoard>;
    };

    const load = async (): Promise<void> => {
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
            const boards: Board[] = (await rBoards.json()) as Board[];
            const sorted: Board[] = boards.slice().sort((a: Board, b: Board) => (a.order ?? 0) - (b.order ?? 0));
            setAllBoards(sorted);

            const selected: string[] = selectedBoardIds.length
                ? selectedBoardIds
                : sorted[0]
                    ? [sorted[0].id]
                    : ([] as string[]);
            if (selected.join('|') !== selectedBoardIds.join('|')) setSelectedBoardIds(selected);

            if (selected.length === 0) {
                setColumns([] as ColumnWithBoard[]);
                setLoading(false);
                return;
            }

            const fulls: FullBoard[] = await Promise.all(selected.map((id: string) => fetchFullBoard(id)));
            const merged: ColumnWithBoard[] = [];
            for (const fb of fulls) {
                const cols: Column[] = (fb.columns ?? []).slice().sort((a: Column, b: Column) => (a.order ?? 0) - (b.order ?? 0));
                cols.forEach((c: Column) => {
                    c.issues.sort(
                        (x: Issue, y: Issue) =>
                            (x.order ?? 0) - (y.order ?? 0) ||
                            new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
                    );
                    merged.push({ ...c, _board: { id: fb.id, name: fb.name } });
                });
            }
            setColumns(merged);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'load failed';
            setErr(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBoardIds.join('|')]);

    const createBoardQuick = async (): Promise<void> => {
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
        }).catch((e: unknown) => push(e instanceof Error ? e.message : 'Create board failed'));
    };

    const createColumn = async (): Promise<void> => {
        if (!activeBoard) return;
        if (!newColumn.trim()) return;
        await withBusy('create-col', async () => {
            const body = {
                name: newColumn.trim(),
                boardId: activeBoard.id,
                order: columns.filter((c: ColumnWithBoard) => c._board.id === activeBoard.id).length,
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
        }).catch((e: unknown) => push(e instanceof Error ? e.message : 'Create column failed'));
    };

    const createIssue = async (columnId: string): Promise<void> => {
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
            setNewIssueTitleByCol((m: Record<string, string>) => ({ ...m, [columnId]: '' }));
            push('Issue created');
            await load();
        }).catch((e: unknown) => push(e instanceof Error ? e.message : 'Create issue failed'));
    };

    const patchColumn = async (id: string, name: string): Promise<void> => {
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
        }).catch((e: unknown) => push(e instanceof Error ? e.message : 'Update column failed'));
    };

    const patchIssue = async (id: string, title: string): Promise<void> => {
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
        }).catch((e: unknown) => push(e instanceof Error ? e.message : 'Update issue failed'));
    };

    const askDeleteColumn = (id: string): void => {
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

    const askDeleteIssue = (id: string): void => {
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

    const askDeleteBoard = (): void => {
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
                    const nextSelected = selectedBoardIds.filter((x: string) => x !== activeBoard.id);
                    setSelectedBoardIds(nextSelected.length ? nextSelected : ([] as string[]));
                    await load();
                } finally {
                    setConfirm({ open: false, title: '' });
                }
            },
            kind: 'board',
        });
    };

    const toggleBoard = (id: string): void => {
        setSelectedBoardIds((prev: string[]) =>
            prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
        );
    };
    const onDragStart = (e: DragStartEvent): void => {
        const id = String(e.active.id);
        const col = columnsByActive.find((c: ColumnWithBoard) => c.id === id);
        if (col) {
            setActiveDrag({ kind: 'column', id });
            setOverlay(<div className="rounded-xl border bg-white px-3 py-2 shadow">{col.name}</div>);
            return;
        }
        for (const c of columnsByActive) {
            const iss = c.issues.find((i: Issue) => i.id === id);
            if (iss) {
                setActiveDrag({ kind: 'issue', id, fromColumnId: c.id });
                setOverlay(<div className="rounded-xl border bg-white px-3 py-2 shadow text-sm">{iss.title}</div>);
                return;
            }
        }
        setActiveDrag(null);
        setOverlay(null);
    };

    const onDragOver = (e: DragOverEvent): void => {
        if (!activeDrag) return;
        const overId = e.over?.id ? String(e.over.id) : null;
        if (!overId) return;

        if (activeDrag.kind === 'issue') {
            const fromColId = activeDrag.fromColumnId;

            let toColId = fromColId;
            const overCol = columnsByActive.find((c: ColumnWithBoard) => c.id === overId);
            if (overCol) {
                toColId = overCol.id;
            } else {
                const host = columnsByActive.find((c: ColumnWithBoard) => c.issues.some((i: Issue) => i.id === overId));
                if (host) toColId = host.id;
            }

            if (!toColId || toColId === fromColId) return;

            setColumns((prev: ColumnWithBoard[]) => {
                const clone: ColumnWithBoard[] = prev.map((c: ColumnWithBoard) => ({ ...c, issues: [...c.issues] }));
                const scoped: ColumnWithBoard[] =
                    singleBoardMode && activeBoard ? clone.filter((c: ColumnWithBoard) => c._board.id === activeBoard.id) : clone;

                const fromCol = scoped.find((c: ColumnWithBoard) => c.id === fromColId);
                const toCol = scoped.find((c: ColumnWithBoard) => c.id === toColId);
                if (!fromCol || !toCol) return prev;

                const fromIdx = fromCol.issues.findIndex((i: Issue) => i.id === activeDrag.id);
                if (fromIdx < 0) return prev;

                const [moved] = fromCol.issues.splice(fromIdx, 1);
                moved.columnId = toCol.id;
                toCol.issues.push(moved);

                return clone;
            });

            setActiveDrag({ kind: 'issue', id: activeDrag.id, fromColumnId: toColId });
        }
    };

    const onDragEnd = async (e: DragEndEvent): Promise<void> => {
        const activeId = String(e.active.id);
        const overId = e.over?.id ? String(e.over.id) : null;

        try {
            if (activeDrag?.kind === 'column' && singleBoardMode && activeBoard) {
                if (!overId || activeId === overId) return;
                const ids = getColumnIds();
                const oldIndex = ids.indexOf(activeId);
                const newIndex = ids.indexOf(overId);
                if (oldIndex < 0 || newIndex < 0) return;

                const nextScoped: ColumnWithBoard[] = arrayMove<ColumnWithBoard>(columnsByActive, oldIndex, newIndex);
                const others: ColumnWithBoard[] = columns.filter((c: ColumnWithBoard) => c._board.id !== activeBoard.id);
                setColumns([...others, ...nextScoped]);

                const columnIds = nextScoped.map((c: ColumnWithBoard) => c.id);
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
                    const overCol = columnsByActive.find((c: ColumnWithBoard) => c.id === overId);
                    if (overCol) toColId = overCol.id;
                    else {
                        const host = columnsByActive.find((c: ColumnWithBoard) => c.issues.some((i: Issue) => i.id === overId));
                        if (host) toColId = host.id;
                    }
                }

                let updated: ColumnWithBoard[] = [];

                setColumns((prev: ColumnWithBoard[]) => {
                    const clone: ColumnWithBoard[] = prev.map((c: ColumnWithBoard) => ({ ...c, issues: [...c.issues] }));
                    const scoped: ColumnWithBoard[] =
                        singleBoardMode && activeBoard ? clone.filter((c: ColumnWithBoard) => c._board.id === activeBoard.id) : clone;

                    const fromCol = scoped.find((c: ColumnWithBoard) => c.id === fromColId);
                    const toCol = scoped.find((c: ColumnWithBoard) => c.id === toColId);
                    if (!fromCol || !toCol) {
                        updated = prev;
                        return prev;
                    }

                    const fromIdx = fromCol.issues.findIndex((i: Issue) => i.id === activeId);
                    if (fromIdx < 0) {
                        updated = prev;
                        return prev;
                    }

                    if (toColId === fromColId) {
                        const overIndex = overId ? toCol.issues.findIndex((i: Issue) => i.id === overId) : toCol.issues.length - 1;
                        if (overIndex < 0) {
                            updated = prev;
                            return prev;
                        }
                        toCol.issues = arrayMove<Issue>(toCol.issues, fromIdx, overIndex);
                    } else {
                        const overIndex = overId ? toCol.issues.findIndex((i: Issue) => i.id === overId) : toCol.issues.length;
                        const [moved] = fromCol.issues.splice(fromIdx, 1);
                        moved.columnId = toCol.id;
                        const insertAt = overIndex < 0 ? toCol.issues.length : overIndex;
                        toCol.issues.splice(insertAt, 0, moved);
                    }

                    updated = clone;
                    return clone;
                });

                if (!updated) return;

                const base: ColumnWithBoard[] = (updated ?? []) as ColumnWithBoard[];

                const updatedScoped: ColumnWithBoard[] =
                    singleBoardMode && activeBoard
                        ? base.filter((c: ColumnWithBoard) => c._board.id === activeBoard.id)
                        : base;

                const toIds: string[] = (updatedScoped.find((c: ColumnWithBoard) => c.id === toColId)?.issues ?? []).map(
                    (i: Issue) => i.id,
                );

                const fromIds: string[] = (updatedScoped.find((c: ColumnWithBoard) => c.id === fromColId)?.issues ?? []).map(
                    (i: Issue) => i.id,
                );

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
        <main className="min-h-screen bg-white text-slate-900">
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
                        <span>Also delete all columns & issues (cascade)</span>
                    </label>
                )}
            </ConfirmModal>

            <div className="mx-auto max-w-[1200px] px-6 py-6 space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
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
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                        >
                            Boards: {selectedBoardIds.length || 0} selected
                        </button>
                        <button
                            onClick={createBoardQuick}
                            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                        >
                            New Board…
                        </button>
                        {singleBoardMode && activeBoard && (
                            <button
                                onClick={askDeleteBoard}
                                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                            >
                                Delete Board…
                            </button>
                        )}
                        <button onClick={() => void load()} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50">
                            Refresh
                        </button>
                    </div>
                </header>

                {err && <div className="text-sm text-red-600">{err}</div>}
                {loading && <div className="text-sm">Loading…</div>}

                {singleBoardMode && activeBoard && (
                    <section className="rounded-2xl border bg-white shadow-sm p-5">
                        <div className="flex items-center gap-2">
                            <input
                                value={newColumn}
                                onChange={(e) => setNewColumn(e.target.value)}
                                placeholder="New column"
                                className="border rounded-xl px-3 py-2 text-sm"
                            />
                            <button
                                onClick={() => void createColumn()}
                                className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                                disabled={busy === 'create-col'}
                            >
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
                        onDragEnd={(e) => void onDragEnd(e)}
                    >
                        <div className="grid gap-4 md:grid-cols-3" data-columns-wrap>
                            <SortableContext items={getColumnIds()} strategy={rectSortingStrategy}>
                                {columnsByActive.map((col: ColumnWithBoard) => (
                                    <SortableColumn
                                        key={col.id}
                                        column={col}
                                        draggable={singleBoardMode}
                                        headerLeft={
                                            <>
                                                {!singleBoardMode && (
                                                    <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs">
                            {col._board.name}
                          </span>
                                                )}
                                                {editingColumn?.id === col.id ? (
                                                    <>
                                                        <input
                                                            value={editingColumn.name}
                                                            onChange={(e) => setEditingColumn({ id: col.id, name: e.target.value })}
                                                            className="border rounded-lg px-2 py-1 text-sm"
                                                        />
                                                        <button
                                                            className="border rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                                                            onClick={() => void patchColumn(col.id, editingColumn.name.trim())}
                                                            disabled={busy === `rename-col:${col.id}`}
                                                        >
                                                            {busy === `rename-col:${col.id}` ? 'Saving…' : 'Save'}
                                                        </button>
                                                        <button
                                                            className="border rounded-lg px-2 py-1 text-xs"
                                                            onClick={() => setEditingColumn(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <h2 className="font-semibold">{col.name}</h2>
                                                )}
                                            </>
                                        }
                                        headerRight={
                                            <div className="flex items-center gap-2">
                                                {editingColumn?.id !== col.id && (
                                                    <>
                                                        <button
                                                            className="border rounded-lg px-2 py-1 text-xs"
                                                            onClick={() => setEditingColumn({ id: col.id, name: col.name })}
                                                        >
                                                            Rename
                                                        </button>
                                                        <button
                                                            className="border rounded-lg px-2 py-1 text-xs"
                                                            onClick={() => askDeleteColumn(col.id)}
                                                        >
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
                                                onChange={(e) => setNewIssueTitleByCol((m: Record<string, string>) => ({ ...m, [col.id]: e.target.value }))}
                                                placeholder="New issue"
                                                className="border rounded-lg px-2 py-1 text-sm flex-1"
                                            />
                                            <button
                                                onClick={() => void createIssue(col.id)}
                                                className="rounded-lg border px-2 py-1 text-sm hover:bg-slate-50 disabled:opacity-60"
                                                disabled={busy === `create-issue:${col.id}`}
                                            >
                                                {busy === `create-issue:${col.id}` ? 'Adding…' : 'Add'}
                                            </button>
                                        </div>

                                        <SortableContext items={getIssueIdsByColumn(col.id)} strategy={rectSortingStrategy}>
                                            <ul className="space-y-2">
                                                {col.issues.map((iss: Issue) => {
                                                    const label =
                                                        columnsByActive.find((c: ColumnWithBoard) => c.id === (iss.columnId ?? col.id))?.name ??
                                                        col.name;
                                                    return (
                                                        <SortableIssue key={iss.id} issue={iss}>
                                                            {editingIssue?.id === iss.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        value={editingIssue.title}
                                                                        onChange={(e) =>
                                                                            setEditingIssue({ id: iss.id, title: e.target.value, colId: col.id })
                                                                        }
                                                                        className="border rounded-lg px-2 py-1 text-sm flex-1"
                                                                    />
                                                                    <button
                                                                        className="border rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                                                                        onClick={() => void patchIssue(iss.id, editingIssue.title.trim())}
                                                                        disabled={busy === `rename-issue:${iss.id}`}
                                                                    >
                                                                        {busy === `rename-issue:${iss.id}` ? 'Saving…' : 'Save'}
                                                                    </button>
                                                                    <button
                                                                        className="border rounded-lg px-2 py-1 text-xs"
                                                                        onClick={() => setEditingIssue(null)}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-medium truncate">{iss.title}</div>
                                                                        <div className="text-xs text-slate-500 mb-2">{label}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <button
                                                                            className="border rounded-lg px-2 py-1 text-xs"
                                                                            onClick={() => setEditingIssue({ id: iss.id, title: iss.title, colId: col.id })}
                                                                        >
                                                                            Rename
                                                                        </button>
                                                                        <button
                                                                            className="border rounded-lg px-2 py-1 text-xs"
                                                                            onClick={() => askDeleteIssue(iss.id)}
                                                                        >
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
                    onToggle={(id: string) =>
                        setSelectedBoardIds((prev: string[]) =>
                            prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
                        )
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
                className="absolute left-1/2 top-1/2 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-5 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Select Boards</h3>
                    <button className="border rounded-lg px-2 py-1 text-xs" onClick={onClose}>
                        Close
                    </button>
                </div>
                <div className="max-h-[50vh] overflow-auto space-y-2">
                    {boards.map((b: Board) => (
                        <label key={b.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{b.name}</div>
                                <div className="text-[11px] text-slate-500 truncate">{b.id}</div>
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
