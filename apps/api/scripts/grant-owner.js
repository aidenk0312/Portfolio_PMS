const { PrismaClient } = require('@prisma/client');
async function main() {
  const p = new PrismaClient();
  const emails = process.argv.slice(2); // node scripts/grant-owner.js a@b.com c@d.com
  if (!emails.length) {
    console.error('Usage: node scripts/grant-owner.js <email> [email2 ...]');
    process.exit(1);
  }
  const org = await p.organization.findFirst({ select: { id: true } });
  if (!org) throw new Error('No organization');

  for (const email of emails) {
    const u = await p.user.upsert({ where: { email }, update: {}, create: { email } });
    await p.membership.upsert({
      where: { userId_orgId: { userId: u.id, orgId: org.id } },
      update: { role: 'OWNER' },
      create: { userId: u.id, orgId: org.id, role: 'OWNER' },
    });
    console.log('Granted OWNER to', email, 'in org', org.id);
  }
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
