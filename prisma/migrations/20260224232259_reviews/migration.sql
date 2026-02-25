/*
  Warnings:

  - You are about to drop the column `employer_id` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `reviewer_type` on the `reviews` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_employer_id_fkey";

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "employer_id",
DROP COLUMN "reviewer_type";

-- DropEnum
DROP TYPE "ReviewerType";

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
