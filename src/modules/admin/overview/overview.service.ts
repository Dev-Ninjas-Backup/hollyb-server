import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { JobStatus, SubscriptionStatus } from '@prisma';

@Injectable()
export class OverviewService {
    constructor(private readonly prisma: PrismaService) {}

    async getOverview() {
        const totalEmployee = await this.prisma.client.employeeProfile.count();
        const totalEmployer = await this.prisma.client.employerProfile.count();
        const activeJobs = await this.prisma.client.job.count({where: { status: JobStatus.open}});
        const backgroundChecks = await this.prisma.client.user.count({ where: { is_verified: true }});
        return {
            totalEmployee,
            totalEmployer,
            activeJobs,
            backgroundChecks
        };
    }

    async getStatistics(period?: 'this_week' | 'this_month' | 'this_year') {
        const now = new Date();

        if (period === 'this_year') {
            return await this.getYearlyStatistics(now);
        } else if (period === 'this_month') {
            return await this.getMonthlyStatistics(now);
        } else if (period === 'this_week') {
            return await this.getWeeklyStatistics(now);
        }

        // If no period specified, return all-time stats
        const [complete_job, open_job, total_user, total_subscription] = await Promise.all([
            this.prisma.client.job.count({ where: { status: JobStatus.completed } }),
            this.prisma.client.job.count({ where: { status: JobStatus.open } }),
            this.prisma.client.user.count(),
            this.prisma.client.subscription.count({ where: { status: SubscriptionStatus.active } })
        ]);

        return {
            complete_job,
            open_job,
            total_user,
            total_subscription,
            period: 'all_time'
        };
    }

    private async getYearlyStatistics(now: Date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = now.getFullYear();
        const statistics = [];

        for (let month = 0; month < 12; month++) {
            const startDate = new Date(currentYear, month, 1);
            const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

            const [complete_job, open_job, total_user, total_subscription] = await Promise.all([
                this.prisma.client.job.count({
                    where: {
                        status: JobStatus.completed,
                        created_at: { gte: startDate, lte: endDate }
                    }
                }),
                this.prisma.client.job.count({
                    where: {
                        status: JobStatus.open,
                        created_at: { gte: startDate, lte: endDate }
                    }
                }),
                this.prisma.client.user.count({
                    where: { created_at: { gte: startDate, lte: endDate } }
                }),
                this.prisma.client.subscription.count({
                    where: {
                        status: SubscriptionStatus.active,
                        created_at: { gte: startDate, lte: endDate }
                    }
                })
            ]);

            statistics.push({
                month: months[month],
                complete_job,
                open_job,
                total_user,
                total_subscription
            });
        }

        return {
            data: statistics,
            period: 'this_year'
        };
    }

    private async getMonthlyStatistics(now: Date) {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const statistics = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const startDate = new Date(currentYear, currentMonth, day, 0, 0, 0, 0);
            const endDate = new Date(currentYear, currentMonth, day, 23, 59, 59, 999);

            const [complete_job, open_job, total_user, total_subscription] = await Promise.all([
                this.prisma.client.job.count({
                    where: {
                        status: JobStatus.completed,
                        created_at: { gte: startDate, lte: endDate }
                    }
                }),
                this.prisma.client.job.count({
                    where: {
                        status: JobStatus.open,
                        created_at: { gte: startDate, lte: endDate }
                    }
                }),
                this.prisma.client.user.count({
                    where: { created_at: { gte: startDate, lte: endDate } }
                }),
                this.prisma.client.subscription.count({
                    where: {
                        status: SubscriptionStatus.active,
                        created_at: { gte: startDate, lte: endDate }
                    }
                })
            ]);

            statistics.push({
                day,
                complete_job,
                open_job,
                total_user,
                total_subscription
            });
        }

        return {
            data: statistics,
            period: 'this_month'
        };
    }

    private async getWeeklyStatistics(now: Date) {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        const statistics = [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let day = 0; day < 7; day++) {
            const startDate = new Date(startOfWeek);
            startDate.setDate(startOfWeek.getDate() + day);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);

            const [complete_job, open_job, total_user, total_subscription] = await Promise.all([
                this.prisma.client.job.count({
                    where: {
                        status: JobStatus.completed,
                        created_at: { gte: startDate, lte: endDate }
                    }
                }),
                this.prisma.client.job.count({
                    where: {
                        status: JobStatus.open,
                        created_at: { gte: startDate, lte: endDate }
                    }
                }),
                this.prisma.client.user.count({
                    where: { created_at: { gte: startDate, lte: endDate } }
                }),
                this.prisma.client.subscription.count({
                    where: {
                        status: SubscriptionStatus.active,
                        created_at: { gte: startDate, lte: endDate }
                    }
                })
            ]);

            statistics.push({
                day: dayNames[day],
                date: startDate.toISOString().split('T')[0],
                complete_job,
                open_job,
                total_user,
                total_subscription
            });
        }

        return {
            data: statistics,
            period: 'this_week'
        };
    }
}
