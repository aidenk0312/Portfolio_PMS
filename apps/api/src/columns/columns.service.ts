import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ColumnsService {
    constructor(private prisma: PrismaService) {
    }

    findMany(boardId: string) {
        return this.prisma.boardColumn.findMany({
            where: {boardId},
            orderBy: {order: 'asc'},
            include: {
                issues: {
                    orderBy: [{order: 'asc'}, {createdAt: 'asc'}],
                },
            },
        });
    }

    async create(dto: CreateColumnDto) {
        const order =
            typeof dto.order === 'number'
                ? dto.order
                : await this.prisma.boardColumn.count({where: {boardId: dto.boardId}});

        return this.prisma.boardColumn.create({
            data: {name: dto.name, boardId: dto.boardId, order},
        });
    }

    update(id: string, dto: UpdateColumnDto) {
        return this.prisma.boardColumn.update({
            where: {id},
            data: {name: dto.name, order: dto.order},
        });
    }

    async remove(id: string): Promise<void> {
        try {
            await this.prisma.boardColumn.delete({ where: { id } });
        } catch (e: any) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                throw new NotFoundException('COLUMN_NOT_FOUND');
            }
            throw e;
        }
    }

    async reorder(columnId: string, dto: { issueIds: string[] }) {
        const movedIds = Array.isArray(dto.issueIds) ? dto.issueIds : [];
        if (movedIds.length === 0) return {ok: true};

        const exist = await this.prisma.issue.findMany({
            where: {id: {in: movedIds}},
            select: {id: true},
        });
        if (exist.length !== movedIds.length) {
            throw new NotFoundException('Some issues not found');
        }

        const currentInTarget = await this.prisma.issue.findMany({
            where: {columnId},
            orderBy: [{order: 'asc'}, {createdAt: 'asc'}],
            select: {id: true},
        });
        const movedSet = new Set(movedIds);
        const rest = currentInTarget.map(x => x.id).filter(id => !movedSet.has(id));

        const final = [...movedIds, ...rest];

        await this.prisma.$transaction(
            final.map((issueId, idx) =>
                this.prisma.issue.update({
                    where: {id: issueId},
                    data: {columnId, order: idx},
                }),
            ),
        );

        return {ok: true};
    }

    async reorderColumns(boardId: string, columnIds: string[]) {
        if (!boardId) throw new BadRequestException('boardId is required');
        if (!Array.isArray(columnIds) || columnIds.length === 0) {
            throw new BadRequestException('columnIds is required');
        }

        const found = await this.prisma.boardColumn.findMany({
            where: {id: {in: columnIds}, boardId},
            select: {id: true},
        });
        if (found.length !== columnIds.length) {
            throw new NotFoundException('Some columns not found in this board');
        }

        await this.prisma.$transaction(
            columnIds.map((id, idx) =>
                this.prisma.boardColumn.update({
                    where: {id},
                    data: {order: idx},
                }),
            ),
        );

        return {ok: true};
    }

    async deleteColumn(id: string) {
        const col = await this.prisma.boardColumn.findUnique({where: {id}, select: {id: true}});
        if (!col) throw new NotFoundException('COLUMN_NOT_FOUND');
        await this.prisma.$transaction(async (tx) => {
            await tx.issue.deleteMany({where: {columnId: id}});
            await tx.boardColumn.delete({where: {id}});
        });
    }
}