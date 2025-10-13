import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) {}

    async upsertUserAndMembership(input: { email: string; name?: string; image?: string }) {
        const email = input?.email?.trim().toLowerCase();
        if (!email) throw new BadRequestException('email required');

        const user = await this.prisma.user.upsert({
            where: { email },
            update: { name: input.name ?? undefined, image: input.image ?? undefined },
            create: { email, name: input.name ?? null, image: input.image ?? null },
            select: { id: true },
        });

        const wsId = process.env.DEFAULT_WORKSPACE_ID || 'ws_local';
        const workspace = await this.prisma.workspace.upsert({
            where: { id: wsId },
            update: {},
            create: {
                id: wsId,
                name: 'Local Workspace',
                org: {
                    connectOrCreate: {
                        where: { id: 'org_demo' },
                        create: { id: 'org_demo', name: 'Demo Org' },
                    },
                },
            },
            select: { id: true, orgId: true },
        });

        await this.prisma.membership.upsert({
            where: { userId_orgId: { userId: user.id, orgId: workspace.orgId } },
            update: {},
            create: { userId: user.id, orgId: workspace.orgId, role: 'OWNER' },
        });

        return { userId: user.id, workspaceId: workspace.id };
    }
}
