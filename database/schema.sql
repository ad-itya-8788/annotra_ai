CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  mobile TEXT NOT NULL UNIQUE,
  date_of_birth DATE,
  gender TEXT,
  address TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  experience_years NUMERIC(4,1) NOT NULL DEFAULT 0,
  employee_type TEXT NOT NULL DEFAULT 'Annotator',
  role_id UUID NOT NULL REFERENCES roles(id),
  password_hash TEXT,
  highest_qualification TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  profile_photo_url TEXT,
  resume_url TEXT,
  id_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  company_details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  vendor_id UUID REFERENCES vendors(id),
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  required_annotators INTEGER NOT NULL DEFAULT 1 CHECK (required_annotators > 0),
  start_date DATE,
  end_date DATE,
  application_deadline DATE,
  project_type TEXT NOT NULL DEFAULT 'Annotation',
  estimated_budget NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'In Progress', 'Completed', 'On Hold', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Withdrawn')),
  remarks TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS project_assignments (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
  publish_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  target_all BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  fields JSONB NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_recipients (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, employee_id)
);

CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Sent', 'Delivered', 'Failed', 'Accepted', 'Declined')),
  provider_message_id TEXT,
  body_html TEXT,
  attachment_names TEXT[],
  template_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_templates_shared_idx ON email_templates(is_shared, created_at DESC);
CREATE INDEX IF NOT EXISTS email_templates_created_by_idx ON email_templates(created_by, updated_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  verification_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
  ON employee_registration_otps(mobile, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  sid TEXT PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expire_idx ON auth_sessions(expire);
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS employees_role_idx ON employees(role_id);
CREATE INDEX IF NOT EXISTS projects_status_deadline_idx ON projects(status, application_deadline);
CREATE INDEX IF NOT EXISTS applications_employee_idx ON project_applications(employee_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS applications_project_idx ON project_applications(project_id, status);
CREATE INDEX IF NOT EXISTS announcements_active_idx ON announcements(is_published, publish_at, expires_at);
CREATE INDEX IF NOT EXISTS notifications_employee_idx ON notifications(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS custom_form_responses_form_created_idx ON custom_form_responses(form_id, created_at DESC);

INSERT INTO permissions (code, description) VALUES
  ('dashboard.view', 'View dashboards'),
  ('employees.view', 'View employees'), ('employees.create', 'Create employees'), ('employees.edit', 'Edit employees'), ('employees.delete', 'Deactivate employees'),
  ('employees.approve', 'Approve or reject employee registrations'), ('employees.assign_role', 'Assign employee roles'), ('audit.view', 'View account activity audit logs'),
  ('projects.view', 'View projects'), ('projects.create', 'Create projects'), ('projects.edit', 'Edit projects'), ('projects.publish', 'Publish projects'),
  ('vendors.view', 'View vendors'), ('vendors.create', 'Create vendors'), ('vendors.edit', 'Edit vendors'),
  ('applications.view', 'View applications'), ('applications.approve', 'Approve applications'), ('applications.reject', 'Reject applications'),
  ('announcements.view', 'View announcements'), ('announcements.create', 'Create announcements'), ('announcements.publish', 'Publish announcements'),
  ('invitations.send', 'Send project invitations'), ('roles.manage', 'Manage roles and permissions'), ('reports.view', 'View reports'), ('settings.manage', 'Manage settings'),
  ('quality.review', 'Review annotation quality'), ('forms.manage', 'Create forms and manage responses')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (name, description, is_system) VALUES
  ('Super Admin', 'Full access to all modules', TRUE),
  ('Project Manager', 'Manages projects and applications', TRUE),
  ('HR Manager', 'Manages employee records and onboarding', TRUE),
  ('Annotator', 'Applies to projects and manages own profile', TRUE),
  ('Team Lead', 'Supports project delivery teams', TRUE),
  ('Reviewer', 'Reviews annotation quality and team submissions', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (r.name = 'Project Manager' AND p.code IN ('dashboard.view','projects.view','projects.create','projects.edit','projects.publish','vendors.view','applications.view','applications.approve','applications.reject','announcements.view','reports.view','invitations.send'))
   OR (r.name = 'HR Manager' AND p.code IN ('dashboard.view','employees.view','employees.create','employees.edit','projects.view','vendors.view','applications.view','announcements.view','announcements.create','announcements.publish'))
   OR (r.name = 'Annotator' AND p.code IN ('dashboard.view','projects.view','announcements.view'))
   OR (r.name = 'Team Lead' AND p.code IN ('dashboard.view','projects.view','applications.view','announcements.view'))
   OR (r.name = 'Reviewer' AND p.code IN ('dashboard.view','projects.view','announcements.view','quality.review'))
ON CONFLICT DO NOTHING;
