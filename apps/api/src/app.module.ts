import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { BoardsModule } from './boards/boards.module';
import { ColumnsModule } from './columns/columns.module';
import { IssuesModule } from './issues/issues.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt.guard';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
            global: true,
            secret: process.env.NEXTAUTH_SECRET ?? 'dev-secret',
            signOptions: { algorithm: 'HS256' },
        }),
        BoardsModule,
        ColumnsModule,
        IssuesModule,
        AuthModule,
    ],
    controllers: [AppController, HealthController],
    providers: [
        AppService,
        PrismaService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
})
export class AppModule {}
