import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, statusCode);
  }
}

export class DuplicateResourceException extends BusinessException {
  constructor(resource: string, field: string) {
    super(`${resource} with this ${field} already exists`, HttpStatus.CONFLICT);
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidOperationException extends BusinessException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class ServiceUnavailableException extends BusinessException {
  constructor(service: string) {
    super(
      `${service} is currently unavailable`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
