# Ambedkarite Business Network (ABN)

Responsive PWA starter for the Ambedkarite Business Network, an initiative of Bahujan Samaj Vikas Sansthan (BSVS).

## Included

- Responsive marketplace dashboard for desktop and mobile
- English, Hindi, and Marathi language selector
- Supabase email/password authentication
- Business profile creation
- Product and service listing drafts
- Public discovery of verified businesses' published listings
- Buyer-to-business enquiries
- PWA manifest and service worker
- Supabase publishable key only (no service-role key)

## Supabase project

Project ref: `nprnrgaxmyxjunqrelxt`  
Project URL: `https://nprnrgaxmyxjunqrelxt.supabase.co`

The initial database schema has already been provisioned in the separate ABN Supabase project. Tables use row-level security. Private verification documents use the non-public `abn-private-verification` storage bucket. Do not make that bucket public.

## Run locally

Modern browsers require localhost or HTTPS for ES modules and PWA support.

1. Extract the ZIP.
2. Open a terminal in this folder.
3. Run one of:
   - Python: `python -m http.server 8080`
   - Node: `npx serve .`
4. Visit `http://localhost:8080`.

The app connects to the configured Supabase project in `config.js`. The key in that file is a **publishable** browser key. It is expected to be public; database security must come from RLS. Never add a Supabase `service_role` or secret key to browser code.

## Authentication

The app uses Supabase email/password auth. Depending on the project's Auth settings, new users may need to confirm their email before signing in. Configure the production Site URL and allowed redirect URLs in Supabase Authentication settings before launch.

## GitHub Pages / hosting

Upload the extracted files to a dedicated ABN repository, then enable static hosting or connect the repository to a hosting provider. This build does not contain a backend server; all access to database rows is controlled by Supabase RLS. For a production deployment, also configure custom domain, HTTPS, auth redirect URLs, backups, monitoring, rate limits, abuse reporting, and email delivery.

## Important production gaps

This is a working frontend foundation, not a complete production commerce system. Before launch:
- Create a secure admin/reviewer interface and server-side workflow for verification requests.
- Implement order checkout, payment provider integration, refunds, delivery and tax workflows through trusted server-side functions.
- Add moderation, reporting, audit logs, privacy notice, data-retention rules, grievance/appeal process and contact details.
- Review whether optional community-membership verification is necessary, lawful and proportionate; do not expose documents or verification status publicly.
- Add phone OTP only if required and configure an SMS provider.
- Conduct a security review and test all RLS policies with separate buyer, seller, and reviewer accounts.

## Database entities

- `public.abn_profiles`
- `public.abn_businesses`
- `public.abn_business_members`
- `public.abn_listings`
- `public.abn_enquiries`
- `public.abn_reviews`
- `private.abn_verification_requests`

No data has been copied from the existing Sanstha Seva project.
