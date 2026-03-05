/*
  Warnings:

  - The `job_responsibilities` column on the `jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `requirements` column on the `jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "job_responsibilities",
ADD COLUMN     "job_responsibilities" TEXT[],
DROP COLUMN "requirements",
ADD COLUMN     "requirements" TEXT[];
