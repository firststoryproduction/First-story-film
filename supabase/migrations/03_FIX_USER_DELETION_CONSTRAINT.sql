-- Fix Job Table Staff Constraint to allow User Deletion
-- We change staff_id to nullable and add ON DELETE SET NULL

ALTER TABLE jobs
ALTER COLUMN staff_id DROP NOT NULL;

ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_staff_id_fkey;

ALTER TABLE jobs
ADD CONSTRAINT jobs_staff_id_fkey 
FOREIGN KEY (staff_id) 
REFERENCES users(id) 
ON DELETE SET NULL;
