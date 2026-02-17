import { HttpStatus } from '@nestjs/common';
import {
  IApiResponse,
  IPaginationMeta,
} from '../interfaces/api-response.interface';

export class ResponseHelper {
  static success<T>(
    data: T,
    message: string = 'Operation successful',
    statusCode: number = HttpStatus.OK,
  ): IApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
      path: '',
    };
  }

  static successWithPagination<T>(
    data: T[],
    meta: IPaginationMeta,
    message: string = 'Data retrieved successfully',
  ): IApiResponse<T[]> {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
      path: '',
    };
  }

  static created<T>(
    data: T,
    message: string = 'Resource created successfully',
  ): IApiResponse<T> {
    return this.success(data, message, HttpStatus.CREATED);
  }

  static noContent(message: string = 'Resource deleted successfully') {
    return {
      success: true,
      statusCode: HttpStatus.NO_CONTENT,
      message,
      timestamp: new Date().toISOString(),
      path: '',
    };
  }
}

export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
): IPaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
