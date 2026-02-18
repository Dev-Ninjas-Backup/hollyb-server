import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ResponseHelper } from '@/common/utils/response.helper';

@Injectable()
export class DevToolsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getAllUsersForDevelopment() {
    if (process.env.NODE_ENV !== 'development') {
      throw new BusinessException('Not found', HttpStatus.NOT_FOUND);
    }

    const users = await this.prismaService.client.user.findMany({
      orderBy: { created_at: 'desc' },
    });

    const usersWithDevToken = await Promise.all(
      users.map(async (user) => {
        const accessToken = await this.jwtService.signAsync(
          {
            sub: user.id,
            role: user.role,
          },
          {
            secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.getOrThrow<string>(
              'JWT_ACCESS_EXPIRES_IN',
            ) as never,
          },
        );

        return {
          ...user,
          devAccessToken: accessToken,
        };
      }),
    );

    return ResponseHelper.success(
      usersWithDevToken,
      'Development users fetched successfully',
    );
  }
}
