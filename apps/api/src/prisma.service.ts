import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

const { PrismaClient } = require('@prisma/client') as { PrismaClient: new () => any };

@Injectable()
export class PrismaService extends (PrismaClient as any) implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        const max = 8;
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        for (let i = 1; i <= max; i++) {
            try {
                await (this as any).$connect();
                return;
            } catch (e) {
                if (i === max) throw e;
                await sleep(500 * Math.pow(2, i - 1));
            }
        }
    }

    async onModuleDestroy() {
        await (this as any).$disconnect();
    }
}
