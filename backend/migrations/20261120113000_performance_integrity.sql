CREATE INDEX IF NOT EXISTS employee_documents_employee_idx ON employee_documents (employee_id);
CREATE INDEX IF NOT EXISTS employee_documents_file_url_idx ON employee_documents (file_url);
CREATE INDEX IF NOT EXISTS project_attachments_project_idx ON project_attachments (project_id);
CREATE INDEX IF NOT EXISTS project_assignments_employee_idx ON project_assignments (employee_id);
CREATE INDEX IF NOT EXISTS announcement_recipients_employee_idx ON announcement_recipients (employee_id);
CREATE INDEX IF NOT EXISTS otp_sessions_expires_idx ON otp_sessions (expires_at);
CREATE INDEX IF NOT EXISTS otp_sessions_employee_created_idx ON otp_sessions (employee_id, created_at);
CREATE INDEX IF NOT EXISTS employees_status_idx ON employees (status);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_employee_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_employee_id);

UPDATE project_invitations
SET template_id = NULL
WHERE template_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM email_templates WHERE email_templates.id = project_invitations.template_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_name = tc.table_name
    WHERE tc.table_schema = current_schema()
      AND tc.table_name = 'project_invitations'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'template_id'
  ) THEN
    ALTER TABLE project_invitations
      ADD CONSTRAINT project_invitations_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES email_templates (id) ON DELETE SET NULL;
  END IF;
END $$;
