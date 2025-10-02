import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.NEXTAUTH_SECRET,
            signOptions: { algorithm: 'HS256' },
        }),
    ],
    controllers: [AuthController],
    providers: [PrismaService, AuthService],
    exports: [JwtModule],
})
export class AuthModule {}
