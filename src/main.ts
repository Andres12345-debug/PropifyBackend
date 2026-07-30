import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './middleware/filtros/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const puerto = Number(process.env.PUERTO_SERVIDOR);

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(puerto);
  logger.log(`Servidor funcionando en el puerto: ${puerto}`);
}
void bootstrap();
