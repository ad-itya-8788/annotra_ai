ALTER TABLE project_invitations
  ALTER COLUMN project_id DROP NOT NULL,
  ALTER COLUMN employee_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  DROP CONSTRAINT IF EXISTS project_invitations_project_id_employee_id_key;

UPDATE project_invitations AS invitations
SET recipient_email = employees.email,
    recipient_name = employees.full_name
FROM employees
WHERE invitations.employee_id = employees.id
  AND invitations.recipient_email IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'project_invitations'::regclass
      AND conname = 'project_invitations_recipient_present'
  ) THEN
    ALTER TABLE project_invitations
      ADD CONSTRAINT project_invitations_recipient_present
      CHECK (employee_id IS NOT NULL OR recipient_email IS NOT NULL);
  END IF;
END $$;
