const API_ORIGIN = 'https://taqdom-studio-api.abdullahyehia1566.workers.dev';

export async function onRequest(context) {
  const request = context.request;
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith('/api/')) {
    return new Response('Not found', { status: 404 });
  }
  const target = new URL(incoming.pathname + incoming.search, API_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    return await fetch(new Request(target.toString(), init));
  } catch {
    return Response.json({ error: 'api_unavailable' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
