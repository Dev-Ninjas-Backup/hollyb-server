import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IErrorResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse: IErrorResponse = {
      success: false,
      statusCode: status,
      message: this.getErrorMessage(exceptionResponse),
      error: exception.name || 'HttpException',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add validation errors if present
    if (this.isValidationError(exceptionResponse)) {
      errorResponse.errors = this.formatValidationErrors(exceptionResponse);
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = exception.stack;
    }

    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - ${errorResponse.message}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }

  private getErrorMessage(exceptionResponse: any): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (exceptionResponse.message) {
      if (Array.isArray(exceptionResponse.message)) {
        return exceptionResponse.message[0];
      }
      return exceptionResponse.message;
    }
    return 'An error occurred';
  }

  private isValidationError(exceptionResponse: any): boolean {
    return (
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.message)
    );
  }

  private formatValidationErrors(exceptionResponse: any) {
    if (!Array.isArray(exceptionResponse.message)) {
      return [];
    }

    return exceptionResponse.message.map((error: any) => {
      if (typeof error === 'string') {
        return { field: 'unknown', message: error };
      }
      return {
        field: error.property || 'unknown',
        message: Object.values(error.constraints || {}).join(', '),
        value: error.value,
      };
    });
  }
}
