/*
  Warnings:

  - You are about to drop the column `latitude` on the `employee_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `employee_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `employer_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `employer_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employee_profiles" DROP COLUMN "latitude",
DROP COLUMN "longitude";

-- AlterTable
ALTER TABLE "employer_profiles" DROP COLUMN "latitude",
DROP COLUMN "longitude";
