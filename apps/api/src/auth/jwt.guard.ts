import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const AUTH_BYPASS = process.env.AUTH_BYPASS === 'true';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        if (AUTH_BYPASS) return true;

        const req = ctx.switchToHttp().getRequest();
        const method = (req.method || 'GET').toUpperCase();
        if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return true;

        const auth = (req.headers['authorization'] as string | undefined) ?? '';
        if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');

        const token = auth.slice(7);
        const payload: any = await this.jwt.verifyAsync(token, {
            secret: process.env.NEXTAUTH_SECRET,
            algorithms: ['HS256'],
        });
        req.user = { userId: payload.sub, email: payload.email };
        return true;
    }
}
