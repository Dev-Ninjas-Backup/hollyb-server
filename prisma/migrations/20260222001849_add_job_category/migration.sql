-- CreateEnum
CREATE TYPE "JobCategory" AS ENUM ('chef', 'sous_chef', 'line_cook', 'pastry_chef', 'cleaner', 'dishwasher', 'helper', 'server', 'waiter', 'bartender', 'host', 'manager', 'supervisor', 'cook');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "job_category" "JobCategory";
