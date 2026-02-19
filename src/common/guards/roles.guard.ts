import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { BusinessException } from '@/common/exceptions/business.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: {
        role?: string;
      };
    }>();

    const userRole = request.user?.role;

    if (!userRole) {
      throw new BusinessException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (!requiredRoles.includes(userRole as UserRole)) {
      throw new BusinessException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
