/*
  Warnings:

  - The values [check_in,check_out] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `job_type` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `payment_type` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the `job_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shifts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[assigned_employee_id]` on the table `jobs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('open', 'assigned', 'completed', 'cancelled');
ALTER TABLE "public"."jobs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "jobs" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'open';
COMMIT;

-- DropForeignKey
ALTER TABLE "earnings" DROP CONSTRAINT "earnings_shift_id_fkey";

-- DropForeignKey
ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_application_id_fkey";

-- DropForeignKey
ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_skills" DROP CONSTRAINT "job_skills_job_id_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_job_id_fkey";

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "job_type",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "payment_type",
ADD COLUMN     "assigned_employee_id" UUID,
ADD COLUMN     "totalAmount" DECIMAL(12,2);

-- DropTable
DROP TABLE "job_assignments";

-- DropTable
DROP TABLE "shifts";

-- DropEnum
DROP TYPE "JobPaymentType";

-- DropEnum
DROP TYPE "JobType";

-- CreateIndex
CREATE UNIQUE INDEX "jobs_assigned_employee_id_key" ON "jobs"("assigned_employee_id");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "employee_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
