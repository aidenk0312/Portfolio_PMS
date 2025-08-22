import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [BoardsController],
    providers: [BoardsService, PrismaService],
    exports: [BoardsService],
})
export class BoardsModule {}