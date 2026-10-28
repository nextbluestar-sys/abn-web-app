import { createClerkClient, verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';

interface Env {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  ALLOWED_ORIGINS: string;
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origin || !allowed.includes(origin)) return { Vary: 'Origin' };

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'abn-managed-api' }, 200, cors);
    }

    if (url.pathname !== '/api/me' || request.method !== 'GET') {
      return json({ error: 'Not found' }, 404, cors);
    }

    if (!env.DATABASE_URL || !env.CLERK_SECRET_KEY) {
      return json({ error: 'Service configuration incomplete' }, 503, cors);
    }

    const authorization = request.headers.get('Authorization') ?? '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return json({ error: 'Authentication required' }, 401, cors);

    let clerkUserId = '';
    try {
      const claims = await verifyToken(match[1], { secretKey: env.CLERK_SECRET_KEY });
      clerkUserId = typeof claims.sub === 'string' ? claims.sub : '';
    } catch {
      return json({ error: 'Invalid or expired session' }, 401, cors);
    }

    if (!clerkUserId) return json({ error: 'Invalid session' }, 401, cors);

    try {
      // Fetch identity details from Clerk's trusted backend API. Do not trust
      // email, role, or user IDs supplied in request bodies or browser storage.
      const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
      const identity = await clerk.users.getUser(clerkUserId);
      const email = identity.primaryEmailAddress?.emailAddress;
      if (!email) return json({ error: 'A verified primary email is required' }, 403, cors);

      const displayName = [identity.firstName, identity.lastName].filter(Boolean).join(' ').trim();
      const sql = neon(env.DATABASE_URL);

      // New Clerk users receive only the ordinary member role. Existing roles
      // and statuses are deliberately preserved on subsequent sign-ins.
      const rows = await sql`
        INSERT INTO public.abn_users
          (clerk_user_id, email, display_name, role, status)
        VALUES
          (${clerkUserId}, ${email}, ${displayName}, 'member', 'active')
        ON CONFLICT (clerk_user_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          updated_at = now()
        RETURNING id, email, display_name, role, status, force_password_reset
      `;

      const account = rows[0] as {
        id: string;
        email: string;
        display_name: string;
        role: string;
        status: string;
        force_password_reset: boolean;
      };

      if (account.status !== 'active') {
        return json({ error: 'Account is not active' }, 403, cors);
      }

      return json({ user: account }, 200, cors);
    } catch {
      // Do not leak tokens, SQL, or provider errors to callers.
      return json({ error: 'Could not load your ABN account. Please try again later.' }, 503, cors);
    }
  },
};
