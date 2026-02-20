import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(serviceAccountEmail: string, privateKeyPem: string, impersonateEmail: string): Promise<string> {
  const scope = 'https://www.googleapis.com/auth/admin.directory.user';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccountEmail,
    sub: impersonateEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp,
  };

  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import the PEM private key
  const pemContent = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyPem = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  const impersonateEmail = Deno.env.get('GOOGLE_ADMIN_IMPERSONATE_EMAIL');

  if (!serviceAccountEmail || !privateKeyPem || !impersonateEmail) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Google Workspace secrets not configured. Skipping Google Workspace step.',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const payload = await req.json();
    const { action } = payload;

    const accessToken = await getAccessToken(serviceAccountEmail, privateKeyPem, impersonateEmail);
    const baseUrl = 'https://admin.googleapis.com/admin/directory/v1/users';

    if (action === 'createUser') {
      const { primaryEmail, givenName, familyName, password } = payload;
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryEmail,
          name: { givenName, familyName },
          password,
          changePasswordAtNextLogin: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Google API error [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify({ success: true, googleUserId: data.id, primaryEmail: data.primaryEmail }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'suspendUser') {
      const { userKey } = payload;
      const res = await fetch(`${baseUrl}/${encodeURIComponent(userKey)}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Google API error [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify({ success: true, suspended: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'deleteUser') {
      const { userKey } = payload;
      const res = await fetch(`${baseUrl}/${encodeURIComponent(userKey)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.text();
        throw new Error(`Google API error [${res.status}]: ${data}`);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Google Workspace error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
