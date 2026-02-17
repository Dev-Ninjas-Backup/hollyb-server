import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
  ApiPaginatedResponseDto,
  ApiResponseDto,
  ErrorResponseDto,
  PaginationMetaDto,
  ValidationErrorDto,
} from '../dto/api-response.dto';

export const ApiSuccessResponse = <TModel extends Type<any>>(
  model: TModel,
  options?: {
    description?: string;
    statusCode?: number;
    example?: Record<string, any>;
  },
) => {
  const statusCode = options?.statusCode || 200;
  const description = options?.description || 'Successful operation';

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status: statusCode,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              statusCode: {
                type: 'number',
                example: statusCode,
                description: 'HTTP status code',
              },
              success: {
                type: 'boolean',
                example: true,
                description: 'Request success status',
              },
              message: {
                type: 'string',
                example: description,
                description: 'Response message',
              },
              timestamp: {
                type: 'string',
                example: new Date().toISOString(),
                description: 'Response timestamp',
              },
              path: {
                type: 'string',
                example: '/api/v1/{path}',
                description: 'Request path',
              },
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
};

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description?: string,
  example?: Record<string, any>,
) => {
  const resolvedDescription =
    description || 'Paginated data retrieved successfully';

  return applyDecorators(
    ApiExtraModels(ApiPaginatedResponseDto, PaginationMetaDto, model),
    ApiResponse({
      status: 200,
      description: resolvedDescription,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiPaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: { $ref: getSchemaPath(PaginationMetaDto) },
            },
          },
        ],
        ...(example ? { example } : {}),
      },
    }),
  );
};

export const ApiErrorResponses = () => {
  return applyDecorators(
    ApiExtraModels(ErrorResponseDto, ValidationErrorDto),
    ApiResponse({
      status: 400,
      description: 'Bad Request',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
  );
};
