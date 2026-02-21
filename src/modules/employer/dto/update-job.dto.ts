import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';

// Exclude job_date and expire_date from updates
export class UpdateJobDto extends PartialType(
  OmitType(CreateJobDto, ['job_date', 'expire_date'] as const)
) {}
