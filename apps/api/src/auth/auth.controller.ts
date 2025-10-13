import { Body, Controller, Post, Get, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly auth: AuthService,
        private readonly jwt: JwtService,
        private readonly prisma: PrismaService,
    ) {}

    @Post('upsert')
    upsert(@Body() body: { email: string; name?: string; image?: string }) {
        return this.auth.upsertUserAndMembership(body);
    }

    @Get('me')
    async me(@Req() req: any) {
        const auth = (req.headers['authorization'] as string | undefined) ?? '';
        if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('NO_TOKEN');

        const payload: any = await this.jwt.verifyAsync(auth.slice(7), {
            secret: process.env.NEXTAUTH_SECRET,
            algorithms: ['HS256'],
        });

        const email = payload.email as string;
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        const ws = await this.prisma.workspace.findUnique({
            where: { id: process.env.DEFAULT_WORKSPACE_ID as string },
            select: { orgId: true },
        });

        let role: string | null = null;
        if (user && ws) {
            const mem = await this.prisma.membership.findUnique({
                where: { userId_orgId: { userId: user.id, orgId: ws.orgId } },
                select: { role: true },
            });
            role = mem?.role ?? null;
        }

        return { email, userId: user?.id ?? null, role: role ?? 'NONE' };
    }
}