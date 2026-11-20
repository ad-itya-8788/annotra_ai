# ProjectFlow

Annotra AI is a React/Vite application with a Node/Express API and PostgreSQL storage for project and annotator workforce operations.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer
- A Message Central Verify Now account for production OTP
- Bunny Storage credentials for file uploads
- SMTP credentials to send email invitations

## Local setup

From the project root:

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
```

Create a PostgreSQL database dedicated to ProjectFlow:

```sql
CREATE DATABASE projectflow;
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` (or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`), `SESSION_SECRET`, and `FRONTEND_URL`. Add provider credentials as needed. The existing root `.env` is not modified or loaded by the backend.

Apply the schema and repeatable demo data:

```powershell
npm run db:seed
```

The command is idempotent and can be re-run to add the sample data. To apply only the schema:

```powershell
npm run db:schema --prefix backend
```

For an existing compatible ProjectFlow database, apply the non-destructive employee signup and access-control migration. The Node migration runner applies timestamp-named SQL files in lexical order from `backend/migrations/` and records applied files in `app_migrations`:

```powershell
npm run db:migrate --prefix backend
```

Initialize the system owner's Super Admin account through the trusted backend command (not a public signup route). The mobile number is fixed to `8788200189`; supply the owner's display name and email:

```powershell
node backend/src/initializeSuperAdmin.js --name "System Owner" --email owner@example.com
```

The owner signs in through OTP. The initialization command clears any password that may have been set by an unapproved registration for that number. This command is safe to rerun to repair the owner's role, but use only in a trusted local/administrative shell.

If SMS delivery is unavailable, an authorized operator can recover the existing owner's password through a hidden-input, local-only CLI prompt. This does not create an account or expose an admin registration route:

```powershell
npm run db:recover-super-admin --prefix backend
```

Choose a strong password at the prompt, then use the password login tab. For SMS login, configure valid Message Central credentials; a provider 401/403 means the current customer ID or auth token was rejected.

Run both services:

```powershell
npm run dev
```

The Vite client runs at `http://localhost:5173` and proxies `/api` to the backend at `http://localhost:3001`. Port 3001 avoids collisions with other local services. To build the client or start only the API:

```powershell
npm run build
npm run start --prefix backend
```

Workspace pages use clean history URLs (for example `http://localhost:5173/employees`), and browser Back/Forward, direct links, and refreshes are supported. In production, build the frontend before starting the API to have Express serve `frontend/dist` with an SPA fallback. If hosting the frontend separately, configure that host to rewrite valid frontend paths to `index.html` while leaving `/api/*` routed to the API. The **Settings** page is available to all signed-in roles for personal compact-view and welcome-banner preferences. Users with `settings.manage` can also update the shared workspace name and support email. Apply the database changes with:

```powershell
npm run db:migrate --prefix backend
```

### Custom forms

Users with `forms.manage` can create forms from the **Forms** workspace page. The Super Admin receives this permission from the migration; it can also be granted to other roles from **Roles & Permissions**. Forms support short/long text, email, phone, number, date, single-choice, checkbox, and dropdown questions. Publish a form to share its public `/forms/{slug}` URL. Public responses are rate-limited, validated by the API, stored in PostgreSQL, and visible only to users with `forms.manage`; response owners can export them as CSV. Deleting a form also deletes its responses.

Run `npm run db:migrate --prefix backend` to create the form and response tables in an existing database. The public API routes are `GET /api/public/forms/:slug` and `POST /api/public/forms/:slug/responses`; administration routes are under `/api/forms`.

### Search engine metadata

The public landing page includes page titles/descriptions, social sharing tags, Organization structured data, a favicon, `robots.txt`, and a sitemap. The dashboard and public response forms are marked `noindex`; form URLs are intentionally excluded from the sitemap. Set `FRONTEND_URL` to the canonical production website origin (for example `https://annotra.ai`) so the API-served `robots.txt` and `sitemap.xml` use the correct host. When the frontend is hosted separately, serve the files in `frontend/public/` from that domain and keep its sitemap/robots host in sync.

### Supabase CLI setup

`supabase/migrations/20261120162000_full_projectflow_schema.sql` is the full baseline migration for a **new, empty Supabase database**. It creates the application tables, indexes, roles, permissions, workspace defaults, chat/meeting tables, and custom form tables. It enables RLS on every application table without adding public policies; the Node API connects with the server-side PostgreSQL connection and remains responsible for authorization.

From the project root, initialize/link the Supabase CLI if needed, then apply the migration:

```powershell
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

In `backend/.env`, set `DATABASE_URL` to the PostgreSQL connection URI from your Supabase project and set `DB_SSL=true`. Keep this URI server-side; never put it in `frontend/.env`, commit it, or send it in chat. After the migration, initialize the first Super Admin with the trusted backend command documented above. The full migration records the existing backend migration names in `app_migrations`, so the Node migration runner will not replay them. This is a fresh-database baseline; do not apply it to a non-empty production database.

Role permissions are managed from **Roles & Permissions**. Assign a role to an employee from **Employees**. Both operations are checked on the backend, and users cannot grant permissions they do not have.

Employees, projects, vendors, and applications support server-side search/filtering, sorting, and pagination against their existing database fields. Filter and page state is stored in the URL query string for direct links and browser history.

## Authentication

Employees can sign in using a verified mobile OTP or a password. New employee accounts are created only after mobile OTP verification and remain pending until an administrator approves them. Profile photos are required; resumes, qualification, skills, experience, city, and LinkedIn details may be omitted. Passwords are stored as salted scrypt hashes. Forgot-password flows are not enabled; OTP login remains available.

Registration resumes and profile photos are stored in the backend's private `backend/private-files/` directory by default and are only served through authenticated, permission-checked API routes. The backend validates file size, declared MIME type, and file signatures before storing either file. Configure `PRIVATE_FILE_DIRECTORY` to use persistent private storage in deployment and back it up securely. The file size limit defaults to 5 MB via `PRIVATE_FILE_MAX_BYTES`; accepted resumes are PDF, DOC and DOCX, and profile photos are JPEG, PNG, or WebP.

## Demo accounts

The seeder creates demo accounts with the following mobile numbers:

| Role | Mobile |
|---|---|
| HR Manager | `+919900000001` |
| Project Manager | `+919900000002` |
| HR Manager | `+919900000003` |
| Annotator | `+919900000011` through `+919900000020` |

For local UI testing only, set `DEV_AUTH_ENABLED=true` in `backend/.env` while `NODE_ENV` is not `production`. The development code is `000000`. This bypass never sends an OTP and the API refuses to start in production if it is enabled. For real login and signup, set `DEV_AUTH_ENABLED=false` and configure Message Central. Never configure a development code bypass in a deployed environment.

## Provider configuration

### Message Central

The API sends OTP requests with `POST` to the Verify Now v3 send route (including `flowType=SMS` and `otpLength=6`) and validates codes with `GET`:

- `https://cpaas.messagecentral.com/verification/v3/send`
- `https://cpaas.messagecentral.com/verification/v3/validateOtp`

Set `MESSAGE_CENTRAL_CUSTOMER_ID`, `MESSAGE_CENTRAL_AUTH_TOKEN`, `MESSAGE_CENTRAL_COUNTRY_CODE`, `MESSAGE_CENTRAL_SEND_OTP_URL`, and `MESSAGE_CENTRAL_VALIDATE_OTP_URL` in `backend/.env`. The credential is sent only from the backend. A provider 401/403 means Message Central rejected the configured credentials; no SMS is sent until valid credentials are configured. Rotate any provider token shared in chat or another untrusted place. The app persists the provider verification ID and expiration/attempt metadata, not the OTP itself. Active registered users only can request codes.

### Bunny Storage

Set `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_API_KEY`, `BUNNY_CDN_URL`, and (if applicable) `BUNNY_STORAGE_REGION`. The API accepts JPEG, PNG, WebP, PDF, DOC and DOCX uploads up to 10 MB, generates unique names, and stores the CDN URL and file metadata in PostgreSQL.

### Email

Set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, and `EMAIL_FROM`. Invitations are sent separately from project applications, and a successful provider handoff is recorded as `Sent` (not `Delivered`).

## Project structure

- `frontend/` — React dashboard and responsive custom CSS
- `backend/src/` — Express API, authentication, permissions, integrations and session handling
- `database/schema.sql` — PostgreSQL tables, indexes, roles and permissions
- `database/seeds/seed.sql` — Repeatable demo data

## Current API surface

- OTP: `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `GET /api/auth/session`, `POST /api/auth/logout`
- Dashboard: `GET /api/dashboard`
- Employees, projects, vendors, applications, announcements and roles under `/api`
- Forms: public `GET /api/public/forms/:slug` and `POST /api/public/forms/:slug/responses`; management under `/api/forms` requires `forms.manage`
- Applications: `POST /api/projects/:id/apply`, `PATCH /api/applications/:id`
- Invitations: `POST /api/invitations`
- Uploads: `POST /api/upload/:kind` using multipart field `file`
- Health: `GET /api/health`

State-changing requests from the web client use the session CSRF token. Sessions are HTTP-only cookies backed by PostgreSQL. Role permissions are checked in API middleware; the client uses the session permission list to hide inaccessible modules.
#   a n n o t r a _ a i  
 