/*
  Warnings:

  - You are about to drop the column `end_date` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `jobs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[job_id]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_job_id_fkey";

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "end_date",
DROP COLUMN "start_date",
ADD COLUMN     "expire_date" DATE,
ADD COLUMN     "job_date" DATE;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_job_id_key" ON "reviews"("job_id");
