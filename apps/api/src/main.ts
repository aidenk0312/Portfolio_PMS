import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ];

    app.enableCors({
        origin: origins,
        methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'x-board-id'],
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    app.enableShutdownHooks();

    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    // console.log(`API listening on http://localhost:${port}`);
}
bootstrap();
