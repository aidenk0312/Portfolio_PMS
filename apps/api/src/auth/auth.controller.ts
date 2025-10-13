import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Post('upsert')
    upsert(@Body() body: { email: string; name?: string; image?: string }) {
        return this.auth.upsertUserAndMembership(body);
    }
}
