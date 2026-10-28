# ABN managed-backend migration scaffold

This directory prepares a parallel, fresh-start backend for the Ambedkarite Business Network. It does **not** change the current GitHub Pages app or disable Supabase.

## Target architecture

- **Frontend/source:** this GitHub repository; existing static site remains live during migration.
- **API/hosting:** Cloudflare Workers (not deployed by this scaffold).
- **Authentication:** Clerk; each account maps to an ABN role in the new database.
- **Database:** a new managed Neon PostgreSQL database.

## Safety rules

1. Never commit provider keys, database URLs, passwords, session tokens, or real member records.
2. Keep Supabase and the current site running until the new backend passes the acceptance checklist.
3. The new database starts empty. Re-enrol/invite users; do not bulk-copy records by default.
4. A login identity is not authorization. API endpoints must load the account's role from the database and enforce permissions on the server.
5. Never grant `admin` or `staff` based on a client-supplied role, email address, URL parameter, or browser storage.
6. Create the first admin through a one-time, audited operator procedure after the services are configured. Do not ship a default admin.
7. Use provider dashboards to add secrets directly. Never paste secrets into chat or source files.

## Setup sequence

1. Create a new Neon project and save its pooled connection string in a password manager.
2. Create a Clerk application. Configure allowed origins/redirects for the eventual production domain and enable secure account recovery.
3. Apply `schema.sql` to the **new** Neon database using its SQL editor.
4. Create a Cloudflare Worker and configure secrets `DATABASE_URL`, `CLERK_SECRET_KEY`, and `CLERK_PUBLISHABLE_KEY` in the Cloudflare dashboard. The publishable key is not a secret, but keeping configuration together helps avoid accidental environment mismatch.
5. Add Worker variables for allowed frontend origins; deploy only after setting and testing all values.
6. Connect frontend authentication and API calls in a separate, reviewed change. Do not point the live app at the new backend before tests pass.
7. Test each role with separate accounts, including attempts to call forbidden endpoints directly.
8. Switch traffic only after sign-off; keep rollback instructions and the old service available through the agreed observation period.

## Roles

- `member`: ordinary ABN member / customer.
- `business`: business owner/member allowed to manage only explicitly linked business records.
- `staff`: limited operational access; permissions should be granted per task.
- `admin`: full ABN administration, reserved for explicitly provisioned operators.

A person may have membership in a business, but that membership does not automatically grant staff or admin access.

## Current state

This is scaffolding only. No provider services have been provisioned, no credentials are configured, no data has been migrated, and no production deployment has been performed.