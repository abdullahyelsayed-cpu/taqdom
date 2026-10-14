# ADR 0002: Keep Git-based Cloudflare Pages deployment as the target

- **Status:** Pending Cloudflare GitHub App repair
- **Date:** 2026-10-14

## Context

The private GitHub repository `abdullahyelsayed-cpu/taqdom` exists and contains the initial `main` branch. The old Cloudflare Pages project and its custom-domain bindings were intentionally deleted at the owner's request; the `taqdom.me` DNS zone remains active with no site records. Creating a new Pages project through Cloudflare's API with the Git repository source failed with Cloudflare error `8000011`, reporting an internal issue with the Pages Git installation. Wrangler is authenticated on this machine, but the browser origin approval needed to open GitHub installation settings was denied.

Cloudflare's Pages setup guidance states that a Direct Upload project cannot later be connected to Git integration. Creating one now would obstruct the intended commit-to-deploy path.

## Decision

Do not create a Direct Upload Pages project. Repair or reinstall the Cloudflare Workers and Pages GitHub App for the GitHub account, then create a Git-integrated Pages project for this repository. Keep the production custom domains detached until the new `pages.dev` deployment builds and is reviewed.

## Pages build settings

- Repository: `abdullahyelsayed-cpu/taqdom`
- Production branch: `main`
- Root directory: `/app`
- Build command: `npm ci && npm run build`
- Build output directory: `dist`

## Consequences

- GitHub contains the source and can be continued locally now.
- No public preview URL exists yet, and no new Pages project was created.
- `taqdom.me` and `www.taqdom.me` remain detached as requested.
- Once Cloudflare Git integration is repaired, each push to `main` can build and deploy the site automatically.
