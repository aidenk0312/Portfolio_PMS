const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureWorkspace(id, name) {
    return prisma.workspace.upsert({
        where: { id },
        update: { name },
        create: { id, name },
    });
}

async function ensureBoard(workspaceId, name, order = 0) {
    return prisma.board.create({ data: { name, workspaceId, order } });
}

async function ensureColumn(boardId, name, order) {
    return prisma.column.create({ data: { name, boardId, order } });
}

async function createIssue(workspaceId, columnId, title, order = 0) {
    return prisma.issue.create({ data: { title, workspaceId, columnId, order } });
}

async function main() {
    const WS = process.env.SEED_WS_ID || 'ws_prod';
    const boardName = process.env.SEED_BOARD_NAME || 'Getting Started';
    await ensureWorkspace(WS, 'Production Workspace');
    const board = await ensureBoard(WS, boardName, 0);
    const todo = await ensureColumn(board.id, 'Backlog', 0);
    const doing = await ensureColumn(board.id, 'In Progress', 1);
    const done = await ensureColumn(board.id, 'Done', 2);
    await createIssue(WS, todo.id, 'Sign in with GitHub', 0);
    await createIssue(WS, todo.id, 'Create first column', 1);
    await createIssue(WS, doing.id, 'Drag & drop card', 0);
    await createIssue(WS, done.id, 'Read-only viewer check', 0);
    console.log(`Seeded: workspace=${WS}, board=${board.name}`);
}
main().finally(() => prisma.$disconnect());
