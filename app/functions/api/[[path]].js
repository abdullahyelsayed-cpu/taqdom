export async function onRequest(context) {
  const request = context.request;
  const incoming = new URL(request.url);

  // Pages uses a service binding instead of a public workers.dev hop.
  // This keeps the API call inside Cloudflare and forwards the browser's
  // first-party cookie and Origin without exposing any provider credentials.
  const api = context.env.TAQDOM_API;
  if (!api) {
    return Response.json({ error: 'api_binding_not_configured' }, {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  if (!incoming.pathname.startsWith('/api/')) {
    return context.next();
  }

  const target = new URL(incoming.pathname + incoming.search, 'https://taqdom-api.internal');
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    return await api.fetch(new Request(target.toString(), init));
  } catch (err) {
    return Response.json({ error: 'api_unavailable', detail: String(err && err.message || err) }, {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
