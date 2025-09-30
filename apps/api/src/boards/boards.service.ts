import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BoardsService {
    constructor(private prisma: PrismaService) {
    }

    async findMany(workspaceId: string) {
        return this.prisma.board.findMany({
            where: {workspaceId},
            orderBy: {order: 'asc'},
            include: {columns: {orderBy: {order: 'asc'}}},
        });
    }

    async findOne(id: string) {
        const board = await this.prisma.board.findUnique({
            where: {id},
            include: {columns: {orderBy: {order: 'asc'}}},
        });
        if (!board) throw new NotFoundException('Board not found');
        return board;
    }

    async create(dto: CreateBoardDto) {
        return this.prisma.board.create({
            data: {
                name: dto.name,
                workspaceId: dto.workspaceId,
            },
        });
    }

    async update(id: string, dto: UpdateBoardDto) {
        return this.prisma.board.update({
            where: {id},
            data: {
                name: dto.name,
                workspaceId: dto.workspaceId,
                order: dto.order,
            },
        });
    }

    async remove(id: string): Promise<void> {
        try {
            await this.prisma.board.delete({ where: { id } });
        } catch (e: any) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                throw new NotFoundException('BOARD_NOT_FOUND');
            }
            throw e;
        }
    }

    async deleteBoard(id: string, cascade = false): Promise<void> {
        const board = await this.prisma.board.findUnique({
            where: { id },
            include: { columns: { select: { id: true } } },
        });
        if (!board) throw new NotFoundException('BOARD_NOT_FOUND');

        const columnIds = board.columns.map((c: { id: string }) => c.id);
        if (!cascade && columnIds.length > 0) {
            throw new BadRequestException('BOARD_DELETE_RESTRICT');
        }

        await this.prisma.$transaction(async (tx) => {
            if (columnIds.length) {
                await tx.issue.deleteMany({ where: { columnId: { in: columnIds } } });
                await tx.boardColumn.deleteMany({ where: { boardId: id } });
            }
            await tx.board.delete({ where: { id } });
        });
    }

    async getBoardFull(id: string) {
        const board = await this.prisma.board.findUnique({
            where: { id },
            include: {
                columns: {
                    orderBy: { order: 'asc' },
                    include: {
                        issues: {
                            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                            include: {
                                assignee: true,
                                comments: true,
                            },
                        },
                    },
                },
            },
        });
        if (!board) throw new NotFoundException('BOARD_NOT_FOUND');
        return board;
    }
}