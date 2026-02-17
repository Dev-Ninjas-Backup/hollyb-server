export interface IApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: IPaginationMeta;
  timestamp: string;
  path: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  errors?: IValidationError[];
  timestamp: string;
  path: string;
  stack?: string;
}

export interface IValidationError {
  field: string;
  message: string;
  value?: any;
}
