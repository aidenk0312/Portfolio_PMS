const fs = require('fs');
const path = require('path');

try { require('dotenv').config({ path: path.resolve(process.cwd(), '.env') }); } catch {}
try { require('dotenv').config({ path: path.resolve(process.cwd(), '../../.env') }); } catch {}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROLES = new Set(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
const ORG_ID = process.env.SEED_ORG_ID || 'org_demo';

async function setRole(email, role, orgId = ORG_ID) {
    if (!email || !role) throw new Error('Usage: set <email> <ROLE> [ORG_ID]');
    const R = String(role).toUpperCase();
    if (!ROLES.has(R)) throw new Error(`Invalid role: ${role}`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    const m = await prisma.membership.upsert({
        where: { userId_orgId: { userId: user.id, orgId: org.id } },
        update: { role: R },
        create: { userId: user.id, orgId: org.id, role: R }
    });

    console.log(`${user.email},${m.role},org=${org.id}`);
}

function parseCSVRows(raw) {
    const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return [];
    const hasHeader = /email/i.test(lines[0]) && /role/i.test(lines[0]);
    const rows = hasHeader ? lines.slice(1) : lines;
    return rows.map(line => {
        const [email, role, org] = line.split(',').map(s => s?.trim());
        return { email, role, org };
    }).filter(r => r.email && r.role);
}

async function bulk(file) {
    if (!file) throw new Error('Usage: bulk <file.csv>');
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) throw new Error(`File not found: ${file}`);
    const raw = fs.readFileSync(p, 'utf8');
    const rows = parseCSVRows(raw);
    if (!rows.length) throw new Error('No rows');
    let ok = 0, fail = 0;
    for (const { email, role, org } of rows) {
        try {
            await setRole(email, role, org || ORG_ID);
            ok++;
        } catch (e) {
            console.error(`${email},ERROR,${String(e.message || e)}`);
            fail++;
        }
    }
    console.log(`DONE,ok=${ok},fail=${fail}`);
}

async function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    if (cmd === 'set') {
        const [email, role, orgId] = rest;
        await setRole(email, role, orgId);
    } else if (cmd === 'bulk') {
        const [file] = rest;
        await bulk(file);
    } else {
        console.error('Usage:\n  node scripts/role.js set <email> <ROLE> [ORG_ID]\n  node scripts/role.js bulk <file.csv>  # email,ROLE[,ORG_ID]');
        process.exitCode = 1;
    }
}

main().finally(() => prisma.$disconnect());
