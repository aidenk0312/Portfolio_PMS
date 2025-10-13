import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { Scope } from './roles';

@Injectable()
export class RbacService {
    constructor(private readonly prisma: PrismaService) {}

    async resolveOrgIdByScope(scope: Scope, req: any): Promise<string | null> {
        if (scope === 'org') {
            const orgH = (req.headers?.['x-org-id'] as string | undefined)?.toString();
            if (orgH) return orgH;
        }

        const body = req.body || {};
        const params = req.params || {};
        const query = req.query || {};

        const workspaceId = (body.workspaceId ?? req.headers?.['x-workspace-id'] ?? query.workspaceId)?.toString();
        if (scope === 'workspace' && workspaceId) {
            const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { orgId: true } });
            return ws?.orgId ?? null;
        }

        const boardId = (body.boardId ?? params.id ?? query.boardId)?.toString();
        if ((scope === 'board' || scope === 'workspace') && boardId) {
            const bd = await this.prisma.board.findUnique({
                where: { id: boardId },
                select: { workspace: { select: { orgId: true } } },
            });
            return bd?.workspace?.orgId ?? null;
        }

        const columnId = (body.columnId ?? query.columnId)?.toString();
        if ((scope === 'board' || scope === 'workspace') && columnId) {
            const col = await this.prisma.boardColumn.findUnique({
                where: { id: columnId },
                select: { board: { select: { workspace: { select: { orgId: true } } } } },
            });
            return col?.board?.workspace?.orgId ?? null;
        }

        const issueId = (body.issueId ?? params.id ?? query.issueId)?.toString();
        if ((scope === 'board' || scope === 'workspace') && issueId) {
            const is = await this.prisma.issue.findUnique({
                where: { id: issueId },
                select: {
                    workspace: { select: { orgId: true } },
                    column: { select: { board: { select: { workspace: { select: { orgId: true } } } } } },
                },
            });
            return is?.workspace?.orgId ?? is?.column?.board?.workspace?.orgId ?? null;
        }

        return null;
    }

    async getUserRoleInOrg(userId: string, orgId: string): Promise<'OWNER'|'ADMIN'|'MEMBER'|'VIEWER'|null> {
        const m = await this.prisma.membership.findUnique({
            where: { userId_orgId: { userId, orgId } },
            select: { role: true },
        });
        return (m?.role as any) ?? null;
    }
}
