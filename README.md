<div align="center">

<img src="app/public/taqdom-mark.svg" alt="Taqdom mark" width="76" height="76" />

# Taqdom

### Your work, in its own universe.

A bilingual, visual website studio for people with something worth sharing.

[**Open Taqdom.me →**](https://taqdom.me) · [Report a bug](https://github.com/abdullahyelsayed-cpu/taqdom/issues) · [Security policy](SECURITY.md)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Workers-F38020?logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-8b5cff)

</div>

---

## The idea

Your work deserves more than a generic profile page. Taqdom is being built as a visual-first studio where designers, developers, freelancers, students, professionals, and independent businesses can shape a personal website without starting from code.

The experience is designed for **Arabic and English**, including right-to-left and left-to-right layouts, with mobile and desktop in mind.

## What is here today

- **Immersive visual identity** — a custom vector mark, spectral violet/cyan palette, animated aurora layers, and a layered website-studio showcase.
- **Bilingual experience** — Arabic RTL and English LTR across the landing page, account screens, workspace, editor, and portfolio preview.
- **Visual portfolio editor** — edit profile content, accent colors, project names, and visible sections with a live preview.
- **Template starting points** — nine distinct art-directed visual systems across 14 professional categories, giving 126 profession-and-style combinations. Each system has its own palette, composition, and component styling.
- **Account workspace** — signup, sign-in, session handling, and account-owned portfolio records stored via the backend.
- **AI writing helper** — optional, user-triggered help for improving a selected headline or biography. It uses Cloudflare's native Workers AI binding (`AI`) with a server-selected model; this deployment does not need an external vendor API key. Users review changes before using suggestions.
- **Portable output** — export a standalone HTML copy of the portfolio.

## Product status

Taqdom is free for everyone. There are no paid plans or subscriptions. The product is still actively developing, and not every capability of a full website-builder platform is complete.

| Area | Current state |
| --- | --- |
| Marketing site, animated art direction and brand mark | Implemented |
| Arabic / English and responsive layouts | Implemented |
| Editor, live preview and HTML export | Implemented |
| Signup, sign-in and cloud-saved drafts | Implemented; email verification and account recovery remain unavailable |
| Publish a portfolio to a personal `username.taqdom.me` subdomain | Implemented |
| Profile and project image uploads | Implemented with account-level upload limits; an asset browser and immediate permanent deletion are not available |
| Contact form and owner-only inbox | Implemented with rate limiting |
| Access and pricing | Free for everyone; no paid plans or subscriptions |

The gallery uses illustrative external photography. It is not a customer-media library. External media is subject to its own source terms; the MIT license below applies to this repository's code and accompanying original documentation, not third-party assets.

## Architecture

- **Frontend:** React, TypeScript, Vite, CSS, accessible UI states, and reduced-motion support.
- **Edge / API:** Cloudflare Pages Functions proxy first-party API requests to a Cloudflare Worker; a separate tenant router handles `*.taqdom.me`.
- **Data:** Cloudflare D1 stores accounts, sessions, portfolios, uploaded raster images, inbox messages, and abuse-prevention counters.
- **AI copy assistance:** the Worker calls Cloudflare Workers AI through the `AI` resource binding, with the model selected by the non-secret `MODEL` variable. The current deployment requires no external vendor API key.
- **Uploads:** the API accepts JPEG, PNG, and WebP, with a cap of 75 media items and 25 MB of encoded image data per account. Unreferenced uploads older than one day are eligible for cleanup on a subsequent upload. A dedicated asset browser, immediate deletion, and object-storage migration remain future work.
- **Build checks:** GitHub Actions runs the TypeScript production build, lint, localized SEO checks, template consistency checks, API security tests, tenant-router tests, schema checks, and a full Git-history secret scan.

### D1 schema and migrations

`workers/taqdom-studio-api/schema/bootstrap.sql` is the complete, idempotent starting schema for a **new, empty database**. Do not use it to reset or replace an existing database. Existing installations should receive only pending numbered migrations, after reviewing the SQL and confirming a backup/rollback plan.

Production configuration and secrets belong in Cloudflare-managed settings. Do not copy live credentials, environment values, customer data, or operational exports into source control.

## International pages and SEO

The Arabic homepage is served at `/` using Modern Standard Arabic and right-to-left layout. English is available at `/en/`. Core content pages follow the same pattern: Arabic at `/features/`, English at `/en/features/`.

Each route has its own HTML title and description, canonical URL, reciprocal `hreflang` references, Open Graph metadata, and JSON-LD structured data. `app/public/sitemap.xml` lists the canonical English and Arabic pages, while `app/public/robots.txt` advertises the sitemap and keeps API routes out of crawl discovery. A branded 404 page is included.

## Performance and quality

The site uses smaller responsive external image variants, asynchronous font loading, resource hints for important image/font origins, lazy decoding for below-the-fold images, reduced-motion support, and immutable caching for versioned build assets. Real-world speed still depends on the visitor's device and third-party networks, so it should be measured rather than promised as a guaranteed score.

After building, `npm run check:seo` verifies that localized routes, canonical and alternate-language URLs, structured data, sitemap entries, and support files are present. CI runs this check alongside the production build, lint, and a full Git-history secret scan.

## Run it locally

Requirements: a supported Node.js release and npm.

```sh
cd app
npm ci
npm run dev
```

Before submitting changes:

```sh
npm run build
npm run lint
```

The frontend expects same-origin `/api/*` routes in the deployed environment. Some account and writing-assistant actions require the Cloudflare API service and D1 bindings.

## Roadmap

The next product milestones are deeper, genuinely distinct layout systems; richer typography and spacing controls; image uploads and asset management; better publishing and custom-subdomain controls; verified email and account recovery; and accessibility and security reviews. Taqdom is intended to remain free for everyone; paid plans and subscriptions are out of scope.

Priorities will be driven by actual user feedback and the needs of future collaborators and supporters. No sponsor or partner is represented as confirmed unless announced with permission.

## Contributing

Thoughtful contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Keep both writing directions usable, test mobile layouts, respect reduced-motion settings, and never include credentials or real customer data in commits.

## License

The original project code is released under the [MIT License](LICENSE). Third-party libraries, fonts, and external media remain subject to their respective licenses and terms.
