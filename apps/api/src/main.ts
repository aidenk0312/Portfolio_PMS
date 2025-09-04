import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // CORS 필요 시 주석 해제
    // app.enableCors({ origin: 'http://localhost:3000', credentials: true });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.enableShutdownHooks();

    const PORT = Number(process.env.PORT) || 3001;
    await app.listen(PORT, '0.0.0.0');
    console.log(`✅ API server listening on http://localhost:${PORT}`);
}
bootstrap();
