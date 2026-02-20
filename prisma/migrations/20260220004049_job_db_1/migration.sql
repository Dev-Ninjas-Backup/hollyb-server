/*
  Warnings:

  - A unique constraint covering the columns `[fileId]` on the table `jobs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "fileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "jobs_fileId_key" ON "jobs"("fileId");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
