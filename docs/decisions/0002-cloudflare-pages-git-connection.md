# ADR 0002: Keep Git-based Cloudflare Pages deployment as the target

- **Status:** GitHub source connected; first Pages build succeeded
- **Date:** 2026-10-14

## Context

The private GitHub repository `abdullahyelsayed-cpu/taqdom` exists and contains the `main` branch. The old Cloudflare Pages project and its custom-domain bindings were intentionally deleted at the owner's request; the `taqdom.me` DNS zone remains active with no site records. After the owner authorized the Cloudflare GitHub app through the dashboard, the Pages project `taqdom-studio-preview` was connected successfully to the repository. The first pushes were skipped because of path filters; the watch pattern is now set to `*`, and the Pages build completed successfully on commit `2722ec4`.

Cloudflare's Pages setup guidance states that a Direct Upload project cannot later be connected to Git integration. Creating one now would obstruct the intended commit-to-deploy path.

## Decision

Keep `taqdom-studio-preview` as a Git-integrated Pages project and build the app from `/app`. Keep the production custom domains detached until the new `pages.dev` deployment builds and is reviewed.

## Pages build settings

- Repository: `abdullahyelsayed-cpu/taqdom`
- Production branch: `main`
- Root directory: `/app`
- Build command: `npm ci && npm run build`
- Build output directory: `dist`
- Pages preview URL: `https://taqdom-studio-preview.pages.dev`

## Consequences

- GitHub contains the source and can be continued locally now.
- The preview is available at `https://taqdom-studio-preview.pages.dev`.
- A separate `taqdom1` Worker was accidentally created by the newer Workers wizard with no app build command; it is not the canonical app deployment.
- `taqdom.me` and `www.taqdom.me` remain detached as requested.
- Once Cloudflare Git integration is repaired, each push to `main` can build and deploy the site automatically.
