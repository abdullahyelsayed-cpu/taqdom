# Taqdom.me

Taqdom is an Arabic/English personal-website and portfolio builder for professionals, students, freelancers, creators, and small businesses. The product is designed for RTL/LTR and mobile/desktop use.

## Current product slice

The application in `app/` includes:

- A photography-led, responsive editorial landing page and bilingual signup/sign-in UI.
- A visual editor with profile fields, accent-color controls, project titles, section visibility, profession-aware templates, a live preview, and standalone HTML export.
- 14 profession categories × 5 shared layout systems (70 starting combinations). These are combinations of shared layout systems, not 70 wholly custom visual designs.
- Cloudflare D1-backed account records, hashed passwords, hashed opaque session tokens, secure HTTP-only session cookies, and per-owner portfolio CRUD.
- Cloudflare Pages Functions proxying same-origin `/api/*` requests to the Worker API so session cookies can be scoped to `taqdom.me`.
- AI-assisted headline and bio improvement using the existing Worker AI endpoint.

### Account and publishing status

Signup and login are implemented as an initial account system. Email verification and password recovery are **not enabled yet** because an email delivery provider has not been configured. Portfolio records autosave to the account when the user is authenticated. Without an account, the editor remains device-local and can export a standalone HTML file.

Portfolio publishing to public subdomains, user media uploads, custom-domain management, billing and subscriptions are not implemented in this slice. The 20 EGP/month figure remains a proposal, not an active offer. External Unsplash images are visual examples, not an image-upload/storage system.

## Run locally

```sh
cd app
npm ci
npm run dev
```

Create a production build with `npm run build`; run quality checks with `npm run lint`.

## Infrastructure

- GitHub repository: [abdullahyelsayed-cpu/taqdom](https://github.com/abdullahyelsayed-cpu/taqdom) (private).
- Cloudflare Pages: `taqdom-studio-preview`, build root `/app`, build command `npm ci && npm run build`, output `dist`.
- API Worker: `taqdom-studio-api`.
- D1 database: `taqdom-studio-dev`.
- Secrets must only be kept in scoped Cloudflare secrets or a dedicated secrets manager. Never commit API keys or environment files.

Read [AGENTS.md](AGENTS.md) and [TAQDOM_CODEX_HANDOFF_AR.md](TAQDOM_CODEX_HANDOFF_AR.md) before substantial changes. Payments stay out of scope until provider support, costs, legal terms, supported countries, currencies, and cancellation rules are confirmed.
