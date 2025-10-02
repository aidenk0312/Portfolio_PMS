import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) {}

    async upsertUserByEmail(email: string, name?: string | null, image?: string | null) {
        return this.prisma.user.upsert({
            where: { email },
            create: { email, name: name ?? undefined, image: image ?? undefined },
            update: { name: name ?? undefined, image: image ?? undefined },
            select: { id: true, email: true },
        });
    }
}
