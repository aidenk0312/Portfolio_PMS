'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    DndContext,
    closestCenter,
    DragEndEvent,
    DragOverEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
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

function IssueCard({ issue }: { issue: Issue }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({
            id: issue.id,
            data: { type: 'issue', issue },
        });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <li
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="rounded-md border p-3 bg-white"
        >
            <div className="text-sm font-medium">{issue.title}</div>
            <div className="text-xs text-black/50">#{issue.id.slice(0, 6)} • {issue.status}</div>
        </li>
    );
}

export default function KanbanPage() {
    const [board, setBoard] = useState<Board | null>(null);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [newColumn, setNewColumn] = useState('');
    const [newIssueTitleByCol, setNewIssueTitleByCol] = useState<Record<string, string>>({});

    const workspaceId = useMemo(() => WS ?? '', []);
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    );

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

    const findColumnByIssueId = (issueId: string) =>
        columns.find((c) => c.issues.some((i) => i.id === issueId));

    const reorderOnServer = async (columnId: string, issueIds: string[]) => {
        await fetch(`/api/columns/${columnId}/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issueIds }),
        });
    };

    const getTargetColumn = (overId: string | null) => {
        if (!overId) return null;
        return (
            columns.find((c) => c.id === overId) ||
            columns.find((c) => c.issues.some((i) => i.id === overId)) ||
            null
        );
    };

    const onDragEnd = async (event: DragEndEvent) => {
        const activeId = String(event.active.id);
        const overId = event.over ? String(event.over.id) : null;

        const fromCol = findColumnByIssueId(activeId);
        const toCol = getTargetColumn(overId);
        if (!fromCol || !toCol) return;

        const isOverIssue = !!toCol.issues.find((i) => i.id === overId);
        const toIndex = isOverIssue
            ? toCol.issues.findIndex((i) => i.id === overId)
            : toCol.issues.length;

        setColumns((prev) => {
            const copy = prev.map((c) => ({ ...c, issues: [...c.issues] }));
            const from = copy.find((c) => c.id === fromCol.id)!;
            const to = copy.find((c) => c.id === toCol.id)!;

            const movingIndex = from.issues.findIndex((i) => i.id === activeId);
            const [moving] = from.issues.splice(movingIndex, 1);

            if (from.id !== to.id) moving.columnId = to.id;

            const overIndex = toIndex;
            to.issues.splice(overIndex, 0, moving);
            return copy;
        });

        try {
            if (fromCol.id !== toCol.id) {
                await fetch(`/api/issues/${activeId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ columnId: toCol.id }),
                });
                {
                    const src = columns.find((c) => c.id === fromCol.id)!;
                    await reorderOnServer(src.id, src.issues.filter(i => i.id !== activeId).map((i) => i.id));
                }
                {
                    const dst = columns.find((c) => c.id === toCol.id)!;
                    const ids = [
                        ...dst.issues.slice(0, toIndex).map((i) => i.id),
                        activeId,
                        ...dst.issues.slice(toIndex).map((i) => i.id),
                    ];
                    await reorderOnServer(dst.id, ids);
                }
            } else {
                const col = columns.find((c) => c.id === toCol.id)!;
                const fromIndex = col.issues.findIndex((i) => i.id === activeId);
                const ids = arrayMove(col.issues.map((i) => i.id), fromIndex, toIndex);
                await reorderOnServer(col.id, ids);
            }
        } catch (e) {
            await load();
        }
    };

    return (
        <main className="min-h-screen p-6 space-y-6 bg-gray-50 text-gray-900">
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

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <div className="grid gap-4 md:grid-cols-3">
                    {columns.map((col) => (
                        <section key={col.id} className="rounded-xl border p-4 bg-white shadow-sm">
                            <header className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold">{col.name}</h2>
                                <span className="text-xs text-black/50">{col.issues.length} cards</span>
                            </header>

                            {/* 입력 */}
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

                            {/* 정렬 컨텍스트: 이 컬럼의 이슈들 */}
                            <SortableContext items={col.issues.map((i) => i.id)} strategy={rectSortingStrategy}>
                                <ul className="space-y-2 min-h-[40px]" id={col.id}>
                                    {col.issues.map((iss) => (
                                        <IssueCard key={iss.id} issue={iss} />
                                    ))}
                                </ul>
                            </SortableContext>
                        </section>
                    ))}
                </div>
            </DndContext>
        </main>
    );
}
