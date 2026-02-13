-- Add staff_due_date column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS staff_due_date TIMESTAMPTZ;

-- Add index for staff_due_date for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_staff_due_date ON jobs(staff_due_date);
