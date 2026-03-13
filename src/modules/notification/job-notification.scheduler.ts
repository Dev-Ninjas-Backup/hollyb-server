import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from './notification.service';
import { JobStatus } from '@prisma';

@Injectable()
export class JobNotificationScheduler {
  private readonly logger = new Logger(JobNotificationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Check every 5 minutes for jobs starting soon (within 30 minutes)
   * Send notification to assigned employees
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async notifyUpcomingJobs() {
    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      // Get today's date at start of day
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
      );
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      );

      // Find jobs that are assigned and scheduled for today
      const upcomingJobs = await this.prisma.client.job.findMany({
        where: {
          status: JobStatus.assigned,
          assigned_employee_id: { not: null },
          job_date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          id: true,
          title: true,
          job_date: true,
          start_time: true,
          assigned_employee_id: true,
          assigned_employee: {
            select: {
              user_id: true,
            },
          },
        },
      });

      if (upcomingJobs.length === 0) {
        this.logger.debug('No upcoming jobs found for notification');
        return;
      }

      this.logger.log(`Found ${upcomingJobs.length} jobs scheduled for today`);

      for (const job of upcomingJobs) {
        if (!job.assigned_employee || !job.start_time || !job.job_date) {
          continue;
        }

        try {
          // Combine date and time to get the actual start datetime
          const jobStartDateTime = this.combineDateTime(
            job.job_date,
            job.start_time,
          );

          // Check if job is starting within the next 30 minutes
          const timeDiff = jobStartDateTime.getTime() - now.getTime();
          const minutesUntilStart = Math.floor(timeDiff / (60 * 1000));

          // Only notify if job is starting between 25-35 minutes from now
          // This prevents duplicate notifications since cron runs every 5 minutes
          if (minutesUntilStart >= 25 && minutesUntilStart <= 35) {
            // Send notification to the assigned employee
            await this.notificationService.notifyJobStartingSoon(
              job.assigned_employee.user_id,
              job.id,
              job.title,
              jobStartDateTime,
            );

            this.logger.log(
              `Notification sent for job "${job.title}" (${job.id}) starting in ${minutesUntilStart} minutes`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to send notification for job ${job.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Job notification scheduler failed: ${error.message}`);
    }
  }

  /**
   * Combine job date and start time into a single datetime
   */
  private combineDateTime(jobDate: Date | null, startTime: Date | null): Date {
    if (!jobDate || !startTime) {
      return new Date();
    }

    const date = new Date(jobDate);
    const time = new Date(startTime);

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      0,
      0,
    );
  }
}
