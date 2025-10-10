import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { ScopedRolesGuard } from './auth/scoped-roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    { provide: APP_GUARD, useClass: ScopedRolesGuard },
  ],
})
export class AppModule {}
