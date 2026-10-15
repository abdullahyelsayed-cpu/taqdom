export async function onRequest(context) {
  const assetResponse = await context.env.ASSETS.fetch(new URL('/', context.request.url));
  const headers = new Headers(assetResponse.headers);
  headers.delete('location');
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(assetResponse.body, {
    status: 200,
    headers,
  });
}
