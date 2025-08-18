import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 필요 시 주석 해제
  // app.enableCors({ origin: 'http://localhost:3000', credentials: true });

  app.enableShutdownHooks(); // ✅ SIGINT/SIGTERM 시 OnModuleDestroy 호출

  const PORT = Number(process.env.PORT) || 3001;
  await app.listen(PORT);
  console.log(`✅ API server listening on http://localhost:${PORT}`);
}
bootstrap();
