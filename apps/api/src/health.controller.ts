import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    ok() {
        return { ok: true, time: new Date().toISOString() };
    }

    @Get('db')
    async db() {
        await this.prisma.$queryRaw`SELECT 1`;
        return { db: 'ok' };
    }
}
