import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const HTTP_INTERNAL_SERVER_ERROR = 500;

    const isHttpException = exception instanceof HttpException;
    const status: number = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isServerError = status >= HTTP_INTERNAL_SERVER_ERROR;

    const mensaje =
      isHttpException && !isServerError
        ? exception.getResponse()
        : 'Ha ocurrido un error interno';

    if (isServerError) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof mensaje === 'string' ? mensaje : this.extraerMensaje(mensaje),
    });
  }

  private extraerMensaje(respuesta: unknown): string | string[] {
    if (
      respuesta &&
      typeof respuesta === 'object' &&
      'message' in respuesta &&
      (typeof respuesta.message === 'string' ||
        Array.isArray(respuesta.message))
    ) {
      return (respuesta as { message: string | string[] }).message;
    }
    return 'Ha ocurrido un error interno';
  }
}
