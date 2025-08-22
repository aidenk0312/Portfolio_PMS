import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssuesService {
    constructor(private prisma: PrismaService) {}

    findMany(params: { workspaceId?: string; columnId?: string }) {
        const { workspaceId, columnId } = params;
        return this.prisma.issue.findMany({
            where: {
                workspaceId: workspaceId || undefined,
                columnId: columnId || undefined,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                assignee: true,
                comments: true,
            },
        });
    }

    create(dto: CreateIssueDto) {
        return this.prisma.issue.create({
            data: {
                title: dto.title,
                description: dto.description,
                assigneeId: dto.assigneeId,
                workspaceId: dto.workspaceId,
                columnId: dto.columnId,
                status: dto.status ?? 'todo',
                dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
            },
        });
    }

    update(id: string, dto: UpdateIssueDto) {
        return this.prisma.issue.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                assigneeId: dto.assigneeId,
                workspaceId: dto.workspaceId,
                columnId: dto.columnId,
                status: dto.status,
                dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
            },
        });
    }

    remove(id: string) {
        return this.prisma.issue.delete({ where: { id } });
    }
}