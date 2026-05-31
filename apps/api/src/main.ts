import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.SHELL_ORIGIN ?? '*' });

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
        console.error('[Unhandled]', exception);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: 500,
          message: 'Internal server error',
        });
      }
    },
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
