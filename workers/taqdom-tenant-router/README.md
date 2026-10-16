# Taqdom tenant router

The `taqdom-tenant-router` Worker serves one-label portfolio hosts such as `username.taqdom.me` by proxying the request path to the apex Pages app at `https://taqdom.me`. The browser stays on the username hostname while the root Pages Functions and API service binding remain the shared origin.

## Production routing

- Worker script: `taqdom-tenant-router`
- Route: `*.taqdom.me/*`
- Wildcard DNS: proxied CNAME `*.taqdom.me` → `taqdom-studio-preview.pages.dev`
- API Worker: `taqdom-studio-api`
- Portfolio host lookup: the frontend passes the hostname label to the public portfolio API route.

The apex `taqdom.me` does not match the wildcard route and continues using the Pages custom domain directly. Cloudflare Universal SSL must cover both `taqdom.me` and `*.taqdom.me`.

## Security rules

- Accept only a single valid ASCII hostname label before `.taqdom.me`.
- Require a same-host HTTPS Origin when the browser sends Origin.
- Proxy only public portfolio reads, public media reads, health reads, and visitor contact submissions on tenant hosts.
- Reject authentication, inbox, AI, and other account mutation APIs on tenant hosts. Those belong on the apex site.
- Strip cookies and authorization headers before forwarding a tenant-host request to the apex origin. Do not create tenant-scoped login sessions.

## Release and validation

The Worker is versioned here and its host/origin/request-routing behavior is tested by `npm run check`. Production deployment is currently a separate release action: upload `index.js` as a module Worker, then verify the route, DNS record, Universal SSL certificate, and production Pages deployment. Do not add production credentials or secret values to this directory.
