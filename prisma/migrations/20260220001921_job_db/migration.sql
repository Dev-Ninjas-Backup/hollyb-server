/*
  Warnings:

  - The values [hourly,daily,weekly] on the enum `JobType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `category` on the `jobs` table. All the data in the column will be lost.
  - Added the required column `company_name` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobPaymentType" ADD VALUE 'daily';
ALTER TYPE "JobPaymentType" ADD VALUE 'weekly';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'check_in';
ALTER TYPE "JobStatus" ADD VALUE 'check_out';

-- AlterEnum
BEGIN;
CREATE TYPE "JobType_new" AS ENUM ('full_time', 'part_time', 'contract');
ALTER TABLE "jobs" ALTER COLUMN "job_type" TYPE "JobType_new" USING ("job_type"::text::"JobType_new");
ALTER TYPE "JobType" RENAME TO "JobType_old";
ALTER TYPE "JobType_new" RENAME TO "JobType";
DROP TYPE "public"."JobType_old";
COMMIT;

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "category",
ADD COLUMN     "company_name" TEXT NOT NULL,
ADD COLUMN     "job_responsibilities" TEXT,
ADD COLUMN     "requirements" TEXT,
ALTER COLUMN "status" SET DEFAULT 'open';
