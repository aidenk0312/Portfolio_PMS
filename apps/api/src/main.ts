import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // CORS 필요 시 주석 해제
    // app.enableCors({ origin: 'http://localhost:3000', credentials: true });

    const origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ];

    app.enableCors({
        origin: origins,
        methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
        credentials: true,
    });

    app.enableShutdownHooks();

    const port = process.env.PORT ?? 3001;
    await app.listen(port);
}
bootstrap();
