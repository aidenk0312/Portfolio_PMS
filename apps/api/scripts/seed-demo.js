const path = require('path');
try { require('dotenv').config({ path: path.resolve(process.cwd(), '.env') }); } catch {}
try { require('dotenv').config({ path: path.resolve(process.cwd(), '../../.env') }); } catch {}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORG_ID = process.env.SEED_ORG_ID || 'org_demo';
const ORG_NAME = process.env.SEED_ORG_NAME || 'Demo Org';
const WS = process.env.SEED_WS_ID || process.env.NEXT_PUBLIC_WORKSPACE_ID || 'ws_local';

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'owner@example.com';
const VIEWER_EMAIL = process.env.SEED_VIEWER_EMAIL || 'viewer@example.com';

async function ensureOrg(id, name) {
    return prisma.organization.upsert({
        where: { id },
        update: { name },
        create: { id, name }
    });
}

async function ensureWorkspace(id, name, orgId) {
    return prisma.workspace.upsert({
        where: { id },
        update: { name },
        create: { id, name, org: { connect: { id: orgId } } }
    });
}

async function ensureUser(email, name) {
    return prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name: name || email.split('@')[0] }
    });
}

async function ensureMembershipByOrg(userId, orgId, role) {
    return prisma.membership.upsert({
        where: { userId_orgId: { userId, orgId } },
        update: { role },
        create: { userId, orgId, role }
    });
}

async function ensureBoard(workspaceId, name, order) {
    const found = await prisma.board.findFirst({ where: { workspaceId, name } });
    if (found) return found;
    return prisma.board.create({ data: { name, workspaceId, order: order ?? 0 } });
}

async function ensureColumn(boardId, name, order) {
    const found = await prisma.boardColumn.findFirst({ where: { boardId, name } });
    if (found) return found;
    return prisma.boardColumn.create({ data: { name, boardId, order: order ?? 0 } });
}

async function createIssue(workspaceId, columnId, title, order) {
    return prisma.issue.create({
        data: { title, workspaceId, columnId, order: order ?? 0 }
    });
}

async function main() {
    console.log('Seeding demo data...');
    const org = await ensureOrg(ORG_ID, ORG_NAME);
    const ws = await ensureWorkspace(WS, 'Portfolio Workspace', org.id);

    const owner = await ensureUser(OWNER_EMAIL, 'Owner Demo');
    const viewer = await ensureUser(VIEWER_EMAIL, 'Viewer Demo');

    await ensureMembershipByOrg(owner.id, org.id, 'OWNER');
    await ensureMembershipByOrg(viewer.id, org.id, 'VIEWER');

    const sprint = await ensureBoard(ws.id, 'Sprint', 0);
    await ensureBoard(ws.id, 'Backlog', 1);

    const todo = await ensureColumn(sprint.id, 'Todo', 0);
    const doing = await ensureColumn(sprint.id, 'In Progress', 1);
    const done = await ensureColumn(sprint.id, 'Done', 2);

    const existsAnyIssue = await prisma.issue.findFirst({ where: { workspaceId: ws.id } });
    if (!existsAnyIssue) {
        await createIssue(ws.id, todo.id, 'Set up auth (NextAuth)', 0);
        await createIssue(ws.id, todo.id, 'Design role badge styles', 1);
        await createIssue(ws.id, doing.id, 'Implement DnD reorder', 0);
        await createIssue(ws.id, doing.id, 'Wire 401/403 banners', 1);
        await createIssue(ws.id, done.id, 'Create boards API', 0);
    }

    console.log('OK');
    console.log(`Org: ${org.id} (${org.name})`);
    console.log(`Workspace: ${ws.id}`);
    console.log(`Users:\n  OWNER=${OWNER_EMAIL}\n  VIEWER=${VIEWER_EMAIL}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
