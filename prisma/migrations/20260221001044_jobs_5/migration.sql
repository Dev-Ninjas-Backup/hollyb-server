-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "end_date" SET DEFAULT now() + interval '1 month',
ALTER COLUMN "end_date" SET DATA TYPE TIMESTAMP;
