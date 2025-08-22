import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
    constructor(private prisma: PrismaService) {}

    async findMany(workspaceId: string) {
        return this.prisma.board.findMany({
            where: { workspaceId },
            orderBy: { order: 'asc' },
            include: { columns: { orderBy: { order: 'asc' } } },
        });
    }

    async findOne(id: string) {
        const board = await this.prisma.board.findUnique({
            where: { id },
            include: { columns: { orderBy: { order: 'asc' } } },
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
            where: { id },
            data: {
                name: dto.name,
                workspaceId: dto.workspaceId,
                order: dto.order,
            },
        });
    }

    async remove(id: string) {
        await this.prisma.board.delete({ where: { id } });
        return { ok: true };
    }
}