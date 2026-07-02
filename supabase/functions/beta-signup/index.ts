import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

type BetaSignupBody = {
  email?: string;
  turnstileToken?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const getSecretKey = () => {
  const legacyServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (!secretKeys) {
    return null;
  }

  try {
    return JSON.parse(secretKeys).default as string | null;
  } catch {
    return null;
  }
};

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');

  return (
    request.headers.get('cf-connecting-ip') ??
    forwardedFor?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
};

const verifyTurnstile = async (token: string, ip: string) => {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');

  if (!secret) {
    return false;
  }

  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);

  if (ip !== 'unknown') {
    formData.append('remoteip', ip);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    return false;
  }

  const result = (await response.json()) as { success?: boolean };

  return result.success === true;
};

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  let body: BetaSignupBody;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_payload' }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const turnstileToken = body.turnstileToken;

  if (!email || !emailRegex.test(email)) {
    return jsonResponse({ error: 'invalid_email' }, 400);
  }

  if (!turnstileToken) {
    return jsonResponse({ error: 'missing_turnstile_token' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = getSecretKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'server_not_configured' }, 500);
  }

  const ip = getClientIp(request);
  const isHuman = await verifyTurnstile(turnstileToken, ip);

  if (!isHuman) {
    return jsonResponse({ error: 'turnstile_failed' }, 403);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: isIpAllowed, error: ipRateLimitError } = await supabaseAdmin.rpc('consume_beta_rate_limit', {
    identifier_text: `ip:${ip}`,
    max_attempts: 8,
    window_seconds: 3600,
  });

  if (ipRateLimitError) {
    return jsonResponse({ error: 'rate_limit_unavailable' }, 500);
  }

  if (!isIpAllowed) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const { data: isEmailAllowed, error: emailRateLimitError } = await supabaseAdmin.rpc('consume_beta_rate_limit', {
    identifier_text: `email:${email}`,
    max_attempts: 3,
    window_seconds: 86400,
  });

  if (emailRateLimitError) {
    return jsonResponse({ error: 'rate_limit_unavailable' }, 500);
  }

  if (!isEmailAllowed) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const { error: insertError } = await supabaseAdmin.from('Beta').insert({ email });

  if (insertError) {
    if (insertError.code === '23505') {
      return jsonResponse({ ok: true, duplicate: true });
    }

    return jsonResponse({ error: 'insert_failed' }, 500);
  }

  return jsonResponse({ ok: true });
});
