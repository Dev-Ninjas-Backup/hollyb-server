-- CreateTable
CREATE TABLE "job_shifts" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'in_progress',
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "total_worked_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_shifts_job_id_employee_id_key" ON "job_shifts"("job_id", "employee_id");

-- AddForeignKey
ALTER TABLE "job_shifts" ADD CONSTRAINT "job_shifts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_shifts" ADD CONSTRAINT "job_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
