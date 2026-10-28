import { verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';

interface Env {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  ALLOWED_ORIGINS: string;
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((x) => x.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return { 'Vary': 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true, service: 'abn-managed-api' }, 200, cors);
    if (url.pathname !== '/api/me' || request.method !== 'GET') return json({ error: 'Not found' }, 404, cors);

    const authorization = request.headers.get('Authorization') ?? '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return json({ error: 'Authentication required' }, 401, cors);

    try {
      const claims = await verifyToken(match[1], { secretKey: env.CLERK_SECRET_KEY });
      const clerkUserId = typeof claims.sub === 'string' ? claims.sub : '';
      if (!clerkUserId) return json({ error: 'Invalid session' }, 401, cors);

      const sql = neon(env.DATABASE_URL);
      const rows = await sql`
        SELECT id, email, display_name, role, status, force_password_reset
        FROM public.abn_users
        WHERE clerk_user_id = ${clerkUserId}
        LIMIT 1
      `;
      if (rows.length === 0) return json({ error: 'Account is not provisioned. Contact ABN support.' }, 403, cors);
      const account = rows[0] as { id: string; email: string; display_name: string; role: string; status: string; force_password_reset: boolean };
      if (account.status !== 'active') return json({ error: 'Account is not active' }, 403, cors);
      return json({ user: account }, 200, cors);
    } catch {
      // Do not leak token, SQL, or provider error details to callers.
      return json({ error: 'Authentication or service configuration failed' }, 401, cors);
    }
  },
};
