export async function onRequest(context) {
  const rawIdentifier = String(context.params?.catchall || '').replace(/^\/+|\/+$/g, '')
  if (!rawIdentifier || rawIdentifier.includes('/')) {
    return Response.redirect(new URL('/', context.request.url), 302)
  }
  return Response.redirect(new URL('/p/' + encodeURIComponent(rawIdentifier), context.request.url), 301)
}
