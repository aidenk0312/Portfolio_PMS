import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const WS = process.env.DEFAULT_WORKSPACE_ID || 'ws_local';
    const ORG_ID = 'org_demo';
    const BOARD_ID = 'brd_demo_main';

    const org = await prisma.organization.upsert({
        where: { id: ORG_ID },
        update: {},
        create: { id: ORG_ID, name: 'Demo Org' },
    });

    const ws = await prisma.workspace.upsert({
        where: { id: WS },
        update: {},
        create: { id: WS, name: 'Demo Workspace', orgId: org.id },
    });

    const board = await prisma.board.upsert({
        where: { id: BOARD_ID },
        update: {},
        create: { id: BOARD_ID, name: 'Sprint Board', workspaceId: ws.id, order: 0 },
    });

    const cols = [
        { id: 'col_demo_backlog', name: 'Backlog', order: 0 },
        { id: 'col_demo_progress', name: 'In Progress', order: 1 },
        { id: 'col_demo_done', name: 'Done', order: 2 },
    ];

    for (const c of cols) {
        await prisma.boardColumn.upsert({
            where: { id: c.id },
            update: { name: c.name, order: c.order, boardId: board.id },
            create: { id: c.id, name: c.name, order: c.order, boardId: board.id },
        });
    }

    const issues = [
        { id: 'iss_demo_1', title: 'Set up project', columnId: 'col_demo_backlog', order: 0 },
        { id: 'iss_demo_2', title: 'Implement DnD', columnId: 'col_demo_progress', order: 0 },
        { id: 'iss_demo_3', title: 'Polish UI v2', columnId: 'col_demo_progress', order: 1 },
        { id: 'iss_demo_4', title: 'Write e2e smoke', columnId: 'col_demo_done', order: 0 },
    ];

    for (const i of issues) {
        await prisma.issue.upsert({
            where: { id: i.id },
            update: { title: i.title, columnId: i.columnId, order: i.order, workspaceId: ws.id },
            create: {
                id: i.id,
                title: i.title,
                description: '',
                status: 'todo',
                columnId: i.columnId,
                workspaceId: ws.id,
                order: i.order,
            },
        });
    }

    const seedEmail = process.env.SEED_EMAIL;
    if (seedEmail) {
        const user = await prisma.user.upsert({
            where: { email: seedEmail },
            update: {},
            create: { email: seedEmail, name: seedEmail.split('@')[0] },
        });

        const mem = await prisma.membership.findFirst({ where: { userId: user.id, orgId: org.id } });
        if (!mem) {
            await prisma.membership.create({
                data: { userId: user.id, orgId: org.id, role: 'OWNER' as Role },
            });
        }
    }

    console.log('Seed done:', { workspaceId: ws.id, boardId: board.id });
}

main().finally(() => prisma.$disconnect());
