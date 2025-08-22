import { Module } from '@nestjs/common';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [ColumnsController],
    providers: [ColumnsService, PrismaService],
})
export class ColumnsModule {}