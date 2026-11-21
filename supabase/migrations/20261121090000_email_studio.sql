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

ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS attachment_names TEXT[];
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS template_id UUID;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
