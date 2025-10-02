import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Post('upsert')
    async upsert(@Body() body: { email: string; name?: string; image?: string }) {
        if (!body?.email) return { error: 'email-required' };
        const user = await this.auth.upsertUserByEmail(body.email, body.name, body.image);
        return { userId: user.id };
    }
}
