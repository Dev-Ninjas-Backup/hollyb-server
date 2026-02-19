import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    role: string;
  };
  authToken: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BusinessException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new BusinessException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    let payload: { sub: string; role: string };

    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: string;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BusinessException('Invalid token', HttpStatus.UNAUTHORIZED);
    }

    const providers = await this.prismaService.client.userAuthProvider.findMany(
      {
        where: {
          user_id: payload.sub,
          access_token: { not: null },
        },
        select: {
          access_token: true,
        },
      },
    );

    let isMatched = false;
    for (const provider of providers) {
      if (!provider.access_token) {
        continue;
      }
      if (await compare(token, provider.access_token)) {
        isMatched = true;
        break;
      }
    }

    if (!isMatched) {
      throw new BusinessException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    request.user = payload;
    request.authToken = token;

    return true;
  }
}
