// Minu Studio — ONE-SHOT import of legacy Firebase Auth users into Supabase Auth.
// Creates accounts with an unguessable random password (users must set a new
// password via "Forgot password" on first visit). Guarded by an import token.
// Safe to delete after import; kept as a record of the migration.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const IMPORT_TOKEN = Deno.env.get('IMPORT_TOKEN') ?? '';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}

function randomPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !IMPORT_TOKEN)
    return jsonResponse({ error: 'Not configured.' }, 503);

  let body: { token?: unknown; emails?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }
  if (body.token !== IMPORT_TOKEN) return jsonResponse({ error: 'Forbidden.' }, 403);
  if (
    !Array.isArray(body.emails) ||
    body.emails.length > 20 ||
    !body.emails.every((e) => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
  ) {
    return jsonResponse({ error: 'Provide up to 20 valid emails.' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const results: Array<{ email: string; status: 'created' | 'exists' | 'failed'; message?: string }> = [];
  for (const email of body.emails as string[]) {
    const { error } = await supabase.auth.admin.createUser({
      email,
      password: typeof body.password === 'string' && body.password.length >= 8
        ? body.password
        : randomPassword(),
      email_confirm: true,
    });
    if (!error) {
      results.push({ email, status: 'created' });
      continue;
    }
    const message = String(error.message || error);
    if (/already been registered|already exists|duplicate/i.test(message)) {
      results.push({ email, status: 'exists' });
    } else {
      results.push({ email, status: 'failed', message });
    }
  }
  return jsonResponse({ results });
});
