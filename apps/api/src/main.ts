import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { createLogger } from './config/logger';

async function bootstrap() {
  const logger = createLogger();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    bufferLogs: true,
  });

  // ─── Security ──────────────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  }));
  app.use(compression());

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      (process.env.WEB_ORIGIN || 'http://localhost:5173').trim(),
      (process.env.OPERATOR_ORIGIN || 'http://localhost:5174').trim(),
      (process.env.ADMIN_ORIGIN || 'http://localhost:5175').trim(),
      /thedigitalcaptain\.com$/,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  // ─── Global prefix & versioning ───────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ─── Global pipes & interceptors ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ─── Swagger ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ParkSpot API')
      .setDescription('ParkSpot parking marketplace API — Look, Book, Park')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ─── Start ─────────────────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port);

  logger.info(`🅿️  ParkSpot API running on http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`📄 Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
