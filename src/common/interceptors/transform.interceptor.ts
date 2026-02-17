import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { IApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  IApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<IApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || HttpStatus.OK;

        // If data is already formatted (has success property), return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            statusCode: data.statusCode ?? statusCode,
            timestamp: data.timestamp ?? new Date().toISOString(),
            path: data.path || request.url,
          };
        }

        // Check if it's a paginated response
        const isPaginated =
          data && typeof data === 'object' && 'data' in data && 'meta' in data;

        return {
          success: true,
          statusCode,
          message: this.getSuccessMessage(request.method),
          ...(isPaginated ? { data: data.data, meta: data.meta } : { data }),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  private getSuccessMessage(method: string): string {
    const messages: Record<string, string> = {
      GET: 'Data retrieved successfully',
      POST: 'Resource created successfully',
      PUT: 'Resource updated successfully',
      PATCH: 'Resource updated successfully',
      DELETE: 'Resource deleted successfully',
    };
    return messages[method] || 'Operation successful';
  }
}
