import { Module } from '@nestjs/common';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [IssuesController],
    providers: [IssuesService, PrismaService],
})
export class IssuesModule {}