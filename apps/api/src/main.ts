import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Fail fast — never start with a weak or missing JWT secret.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET env var must be set and at least 32 characters long.');
  process.exit(1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, CSP, etc.)
  app.use(helmet());

  // CORS — never fall back to wildcard; require explicit origin in production.
  const allowedOrigin = process.env.SHELL_ORIGIN;
  if (!allowedOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('SHELL_ORIGIN env var is required in production');
  }
  app.enableCors({ origin: allowedOrigin ?? 'http://localhost:3000' });

  // Body size limit — prevent payload-based DoS  .
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app.use(require('express').json({ limit: '10kb' }));

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.useGlobalFilters({
    catch(exception: unknown, host: any) {
      const ctx = host.switchToHttp();
      const res = ctx.getResponse();
      if (exception instanceof HttpException) {
        res.status(exception.getStatus()).json(exception.getResponse());
      } else {
        // Log the error message only — never expose stack traces to the client.
        console.error('[Unhandled]', String(exception));
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: 500,
          message: 'Internal server error',
        });
      }
    },
  });

  // Swagger UI only in non-production environments.
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Checkout Service')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
