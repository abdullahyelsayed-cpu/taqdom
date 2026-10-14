# Taqdom.me

Taqdom helps people build a personal portfolio from profession-aware layouts, then customize the writing, colors, and visible sections without coding.

## Current build

The first working web app lives in `app/`. It includes an Arabic/English marketing site, a visual portfolio editor, 50 data-driven combinations (10 professions × 5 shared layout systems), local autosave, a private on-device preview, and standalone HTML export.

This is the first product slice. Accounts, cloud saving, user portfolio publishing, media uploads, and billing are not implemented yet. The marketing/editor app itself is published on Cloudflare Pages and `taqdom.me` is being connected. Preview inside the editor remains local to the current browser/device.

## Run locally

```powershell
cd app
npm install
npm run dev
```

Create a production build with `npm run build`.

## Project notes

- GitHub repository: [abdullahyelsayed-cpu/taqdom](https://github.com/abdullahyelsayed-cpu/taqdom) (private; `main` is pushed).
- Read [TAQDOM_CODEX_HANDOFF_AR.md](TAQDOM_CODEX_HANDOFF_AR.md) for product requirements, roadmap, Cloudflare cleanup, and open decisions.
- Read [AGENTS.md](AGENTS.md) before changing the project.
- The old Cloudflare Pages project was removed at the owner's request. The replacement Pages project is now built and the owner has explicitly requested publishing on `taqdom.me`.
- GitHub is connected to Cloudflare Pages project `taqdom-studio-preview` (`https://taqdom-studio-preview.pages.dev`) on `main`. The latest verified Git build completed successfully on commit `dbb8123`. Build settings: `/app`, `npm ci && npm run build`, output `dist`; path watch pattern `*` includes the repository. The apex `taqdom.me` is attached to this Pages project; its proxied DNS CNAME points to `taqdom-studio-preview.pages.dev`. Cloudflare domain verification/HTTPS activation is still pending.
- A separate Worker named `taqdom1` was accidentally created through the newer Workers wizard with no build command. It is not the Pages deployment and has no custom-domain binding. See [ADR 0002](docs/decisions/0002-cloudflare-pages-git-connection.md).
- Never put secrets, key bundles, or local environment files in Git. Use the connected Cloudflare account and GitHub CLI authorization, scoped only to the required resources.
- Billing and subscription setup stay out of scope until provider, terms, currencies, and the 20 EGP/month proposal are reviewed.
