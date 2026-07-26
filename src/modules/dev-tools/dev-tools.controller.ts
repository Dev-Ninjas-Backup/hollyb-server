import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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

  @Delete('users/:id/hard-delete')
  @ApiOperation({
    summary: 'Hard delete user by ID for development only',
    description:
      'Permanently delete a user account by ID, revoke all active tokens, and clear all data and associated files from the system. Works even if the user is already soft deleted.',
  })
  @ApiResponse({
    status: 200,
    description: 'User permanently deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  hardDeleteUser(@Param('id') id: string) {
    return this.devToolsService.hardDeleteUser(id);
  }
}
