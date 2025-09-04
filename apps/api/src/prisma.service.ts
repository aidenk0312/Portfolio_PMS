import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        const max = 8;
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        for (let i = 1; i <= max; i++) {
            try {
                await this.$connect();
                return;
            } catch (e) {
                if (i === max) throw e;
                await sleep(500 * Math.pow(2, i - 1)); // 0.5s → 1s → 2s → 4s …
            }
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}