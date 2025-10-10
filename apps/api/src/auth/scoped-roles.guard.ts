import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { SCOPE_ROLE_KEY, type ScopeRoleMeta } from './scope-role.decorator';
import { hasRoleOrAbove } from './roles';

const RBAC_BYPASS = process.env.RBAC_BYPASS === 'true';

@Injectable()
export class ScopedRolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        if (RBAC_BYPASS) return true;

        const meta = this.reflector.getAllAndOverride<ScopeRoleMeta | undefined>(
            SCOPE_ROLE_KEY,
            [ctx.getHandler(), ctx.getClass()],
        );
        if (!meta) return true;

        const req = ctx.switchToHttp().getRequest();
        const method = (req.method || 'GET').toUpperCase();
        if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return true;

        const user = req.user as { userId?: string; email?: string } | undefined;
        if (!user?.userId) throw new UnauthorizedException('UNAUTHENTICATED');

        const orgId = await this.resolveOrgId(meta.scope, req);
        if (!orgId) throw new ForbiddenException('SCOPE_RESOLUTION_FAILED');

        const mem = await this.prisma.membership.findUnique({
            where: { userId_orgId: { userId: user.userId, orgId } },
            select: { role: true },
        });
        if (!mem) throw new ForbiddenException('NOT_A_MEMBER');

        if (!hasRoleOrAbove(mem.role as any, meta.minRole)) {
            throw new ForbiddenException('INSUFFICIENT_ROLE');
        }
        return true;
    }

    private async resolveOrgId(scope: 'org' | 'workspace' | 'board', req: any): Promise<string | null> {
        const hBoardId = (req.headers['x-board-id'] as string | undefined) ?? undefined;
        const q = req.query ?? {};
        const b = req.body ?? {};
        const p = req.params ?? {};
        const path: string = (req.route?.path as string) || (req.path as string) || '';

        const boardToOrg = async (boardId: string) => {
            const row = await this.prisma.board.findUnique({
                where: { id: boardId },
                select: { workspace: { select: { orgId: true } } },
            });
            return row?.workspace?.orgId ?? null;
        };
        const columnToOrg = async (columnId: string) => {
            const row = await this.prisma.boardColumn.findUnique({
                where: { id: columnId },
                select: { board: { select: { workspace: { select: { orgId: true } } } } },
            });
            return row?.board?.workspace?.orgId ?? null;
        };
        const issueToOrg = async (issueId: string) => {
            const row = await this.prisma.issue.findUnique({
                where: { id: issueId },
                select: {
                    workspace: { select: { orgId: true } },
                    column: { select: { board: { select: { workspace: { select: { orgId: true } } } } } },
                },
            });
            return row?.column?.board?.workspace?.orgId ?? row?.workspace?.orgId ?? null;
        };
        const workspaceToOrg = async (workspaceId: string) => {
            const row = await this.prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { orgId: true },
            });
            return row?.orgId ?? null;
        };

        if (scope === 'org') {
            return (b.orgId || q.orgId || p.orgId) ?? null;
        }

        if (scope === 'workspace') {
            const wsId = (b.workspaceId || q.workspaceId || p.workspaceId) as string | undefined;
            if (wsId) return workspaceToOrg(wsId);
            if (b.boardId || q.boardId || p.boardId) return boardToOrg(b.boardId || q.boardId || p.boardId);
            if (b.columnId || q.columnId || p.columnId) return columnToOrg(b.columnId || q.columnId || p.columnId);
            if (b.issueId || q.issueId || p.issueId) return issueToOrg(b.issueId || q.issueId || p.issueId);
            if (path.includes('boards') && p.id) return boardToOrg(p.id);
            if (path.includes('columns') && p.id) return columnToOrg(p.id);
            if (path.includes('issues') && p.id) return issueToOrg(p.id);
            return null;
        }

        const bdId =
            hBoardId ||
            (b.boardId as string | undefined) ||
            (q.boardId as string | undefined) ||
            (p.boardId as string | undefined) ||
            (path.includes('boards') ? (p.id as string | undefined) : undefined) ||
            undefined;
        if (bdId) return boardToOrg(bdId);
        if (path.includes('columns') && p.id) return columnToOrg(p.id);
        if (path.includes('issues') && p.id) return issueToOrg(p.id);
        if (b.workspaceId) return workspaceToOrg(b.workspaceId);
        return null;
    }
}
