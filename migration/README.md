# ABN managed-backend migration

This folder contains the parallel backend for the Ambedkarite Business Network. It is designed to leave the current public site untouched until the replacement is tested.

## Target architecture

- **Frontend:** existing static site at `https://nextbluestar-sys.github.io/abn-web-app/`
- **API:** Cloudflare Worker named `abn-web-app` (matching the existing Worker)
- **Authentication:** Clerk
- **Database:** fresh Neon PostgreSQL database

## Current implementation

- `schema.sql` defines ABN accounts, businesses, business memberships, staff permissions, and audit logs.
- `worker/src/index.ts` exposes `GET /health` and authenticated `GET /api/me`.
- Clerk session tokens are verified server-side. Account details are fetched from Clerk's backend API.
- A newly authenticated Clerk account is provisioned as an ordinary `member` only. Existing role and account status are preserved on later logins.
- Business, staff, and admin roles must be assigned by an authorized operator in the database; client input can never grant them.
- The Worker uses Neon through the serverless HTTP driver; database credentials are never sent to the browser.

## Required provider configuration

### 1. Neon

1. Create/choose the **new** Neon database.
2. Open the Neon SQL Editor and run all of `schema.sql` against that database.
3. Copy the connection string from Neon. Rotate the password if it has ever been shared in chat, screenshots, or source control.

### 2. Clerk

1. Use the Clerk application intended for ABN.
2. Rotate any secret key previously shared outside the Clerk dashboard.
3. Ensure the application is in the intended environment (test keys for testing; production keys only for production).
4. Configure the production allowed origin/redirect URLs after the final frontend domain is chosen.

### 3. Cloudflare Worker

The Wrangler config targets the existing Worker name `abn-web-app`. In Cloudflare Dashboard → Workers & Pages → `abn-web-app` → Settings → Variables and Secrets, set the **Production** environment:

- Secret `DATABASE_URL`: the rotated Neon connection string.
- Secret `CLERK_SECRET_KEY`: the rotated Clerk secret key.
- Plain text variable `ALLOWED_ORIGINS`: `https://nextbluestar-sys.github.io` (already declared in `wrangler.toml`; keep the value consistent).

Do not add secrets to source files, frontend JavaScript, chat messages, or GitHub commits. The Clerk publishable key is intended for frontend use; this Worker API does not need it.

### 4. Deploy the Worker

From `migration/worker`, install dependencies and run checks, then deploy:

```sh
npm install
npm run typecheck
npx wrangler deploy
```

Deployment must use an authorized Cloudflare session/API token. If using GitHub Actions, configure a least-privilege `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository Actions secrets before adding an automated deployment workflow. Do not place either value in the repository.

### 5. Smoke test

After a successful deployment, test:

- `GET https://abn-web-app.<your-account-subdomain>.workers.dev/health` returns `{ "ok": true, "service": "abn-managed-api" }`.
- `GET /api/me` without a bearer token returns HTTP 401.
- `GET /api/me` with a valid Clerk session token creates a member record on first sign-in and returns the account.
- Suspended/invited accounts are denied. Client requests cannot elevate role.
- Browser requests from the configured frontend origin pass CORS; other origins do not receive an allow-origin header.

Do not point the live frontend at this API until these checks pass. The current site remains available for rollback.

## Authorization model

- `member`: ordinary ABN member/customer.
- `business`: access to explicitly linked business records only.
- `staff`: operational access granted per permission.
- `admin`: full ABN administration, only through explicit operator provisioning.

Never grant elevated roles based on an email address, client-supplied role, URL parameter, or browser storage.

## Important limitations

This repository change prepares the Worker source and configuration; it does not itself log in to provider dashboards, execute SQL in your Neon project, set Cloudflare secrets, or deploy to your Cloudflare account. Those provider-side operations must be confirmed independently before the backend is considered live. The existing public app and its current backend are not switched or disabled by these files.
