import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssuesService {
    constructor(private prisma: PrismaService) {}

    private async getNextOrder(columnId?: string | null) {
        if (!columnId) return 0;
        const count = await this.prisma.issue.count({ where: { columnId } });
        return count;
    }

    findMany(params: { workspaceId?: string; columnId?: string }) {
        const { workspaceId, columnId } = params;
        return this.prisma.issue.findMany({
            where: {
                workspaceId: workspaceId || undefined,
                columnId: columnId || undefined,
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'asc' },
            ],
            include: {
                assignee: true,
                comments: true,
            },
        });
    }

    async create(dto: CreateIssueDto) {
        let nextOrder = 0;

        if (dto.columnId) {
            const count = await this.prisma.issue.count({
                where: { columnId: dto.columnId },
            });
            nextOrder = count;
        }

        return this.prisma.issue.create({
            data: {
                title: dto.title,
                description: dto.description,
                assigneeId: dto.assigneeId,
                workspaceId: dto.workspaceId,
                columnId: dto.columnId,
                status: dto.status ?? 'todo',
                dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
                order: nextOrder,
            },
        });
    }

    async update(id: string, dto: UpdateIssueDto) {
        const data: any = {
            title: dto.title,
            description: dto.description,
            assigneeId: dto.assigneeId,
            workspaceId: dto.workspaceId,
            status: dto.status,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        };

        if (dto.columnId !== undefined) {
            const current = await this.prisma.issue.findUnique({
                where: { id },
                select: { columnId: true },
            });

            if (current?.columnId !== dto.columnId) {
                data.columnId = dto.columnId;
                data.order = await this.getNextOrder(dto.columnId!);
            } else {
                data.columnId = dto.columnId;
            }
        }

        return this.prisma.issue.update({
            where: { id },
            data,
        });
    }

    remove(id: string) {
        return this.prisma.issue.delete({ where: { id } });
    }
}
