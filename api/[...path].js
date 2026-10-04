// api/[...path].js - Zero-setup Vercel Edge proxy for Moth Atlas API
// Runs globally on Vercel's Edge Network with 0ms cold starts.
// Forwards the Authorization header and prevents browser CORS blocks.

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(req.url);
  // Forward to Moth Atlas API (e.g. /api/v1/engines/... -> https://api.mothquantum.com/api/v1/engines/...)
  const targetUrl = `https://api.mothquantum.com${url.pathname}${url.search}`;

  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set('host', 'api.mothquantum.com');
  if (!forwardHeaders.get('user-agent')) {
    forwardHeaders.set(
      'user-agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
