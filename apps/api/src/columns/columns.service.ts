import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
    constructor(private prisma: PrismaService) {}

    findMany(boardId: string) {
        return this.prisma.boardColumn.findMany({
            where: { boardId },
            orderBy: { order: 'asc' },
            include: { issues: true },
        });
    }

    create(dto: CreateColumnDto) {
        return this.prisma.boardColumn.create({
            data: {
                name: dto.name,
                boardId: dto.boardId,
                order: dto.order ?? 0,
            },
        });
    }

    update(id: string, dto: UpdateColumnDto) {
        return this.prisma.boardColumn.update({
            where: { id },
            data: {
                name: dto.name,
                order: dto.order,
            },
        });
    }

    remove(id: string) {
        return this.prisma.boardColumn.delete({ where: { id } });
    }
}