import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest();
        const method = (req.method || 'GET').toUpperCase();

        if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return true;

        const auth = (req.headers['authorization'] as string | undefined) ?? '';
        if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');

        const token = auth.slice(7);
        try {
            const payload: any = await this.jwt.verifyAsync(token, {
                secret: process.env.NEXTAUTH_SECRET,
                algorithms: ['HS256'],
            });
            req.user = { userId: payload.sub, email: payload.email };
            return true;
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
