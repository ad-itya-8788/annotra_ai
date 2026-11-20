ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS highest_qualification TEXT NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS linkedin_url TEXT NOT NULL DEFAULT '';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS employees_email_lower_unique
  ON employees (LOWER(email));

INSERT INTO roles (name, description, is_system) VALUES
  ('Super Admin', 'Full access to all modules', TRUE),
  ('Project Manager', 'Manages projects and applications', TRUE),
  ('HR Manager', 'Manages employee records and onboarding', TRUE),
  ('Annotator', 'Applies to projects and manages own profile', TRUE),
  ('Team Lead', 'Supports project delivery teams', TRUE),
  ('Reviewer', 'Reviews annotation quality and team submissions', TRUE)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS employee_registration_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  mobile TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  highest_qualification TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  experience_years NUMERIC(4,1) NOT NULL DEFAULT 0,
  city TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  verification_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS employee_registration_otps_mobile_idx
  ON employee_registration_otps (mobile, created_at DESC);

INSERT INTO permissions (code, description) VALUES
  ('employees.approve', 'Approve or reject employee registrations'),
  ('employees.assign_role', 'Assign employee roles'),
  ('audit.view', 'View account activity audit logs'),
  ('quality.review', 'Review annotation quality')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Reviewer'
  AND p.code IN ('dashboard.view', 'projects.view', 'announcements.view', 'quality.review')
ON CONFLICT DO NOTHING;

WITH demoted AS (
  UPDATE employees
  SET role_id=(SELECT id FROM roles WHERE name='HR Manager'),updated_at=NOW()
  WHERE role_id=(SELECT id FROM roles WHERE name='Super Admin')
    AND regexp_replace(mobile,'[^0-9]','','g') NOT IN ('8788200189','918788200189')
  RETURNING id
)
INSERT INTO audit_logs (action,target_employee_id)
SELECT 'security.non_owner_super_admin_demoted',id FROM demoted;
