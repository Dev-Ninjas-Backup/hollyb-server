import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevToolsService } from './dev-tools.service';

@ApiTags('Dev Tools')
@Controller('dev')
export class DevToolsController {
  constructor(private readonly devToolsService: DevToolsService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users for development only' })
  getAllUsersForDevelopment() {
    return this.devToolsService.getAllUsersForDevelopment();
  }
}
