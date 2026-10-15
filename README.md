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
- **Template starting points** — 14 professional categories combined with five shared layout systems. These are 70 starting combinations, not 70 completely unique designs.
- **Account workspace** — signup, sign-in, session handling, and account-owned portfolio records stored via the backend.
- **AI writing helper** — optional, user-triggered help for improving a selected headline or biography. Users review changes before using them.
- **Portable output** — export a standalone HTML copy of the portfolio.

## Product status

Taqdom is an active build, not a claim that every part of a full website-builder platform is finished.

| Area | Current state |
| --- | --- |
| Marketing site, animated art direction and brand mark | Implemented |
| Arabic / English and responsive layouts | Implemented |
| Editor, live preview and HTML export | Implemented |
| Signup, sign-in and cloud-saved drafts | Initial implementation |
| Email verification and password recovery | Not enabled |
| Publish a portfolio to a personal subdomain | Not enabled |
| User image upload and managed media library | Not enabled |
| Billing and subscriptions | Not enabled |

The gallery uses illustrative external photography. It is not a customer-media library. External media is subject to its own source terms; the MIT license below applies to this repository's code and accompanying original documentation, not third-party assets.

## Architecture

- **Frontend:** React, TypeScript, Vite, CSS, accessible UI states, and reduced-motion support.
- **Edge / API:** Cloudflare Pages Functions proxy requests to a Cloudflare Worker.
- **Data:** Cloudflare D1 stores account, session, and portfolio records.
- **AI copy assistance:** the existing server-side Worker endpoint; provider credentials stay on the server.
- **Build checks:** GitHub Actions runs the TypeScript production build and lint.

Production configuration and secrets belong in Cloudflare-managed settings. Do not copy live credentials, environment values, customer data, or operational exports into source control.

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

The next product milestones are deeper, genuinely distinct layout systems; richer typography and spacing controls; image uploads and asset management; better publishing and custom-subdomain controls; verified email and account recovery; accessibility and security reviews; and only then pricing and payments.

Priorities will be driven by actual user feedback and the needs of future collaborators and supporters. No sponsor or partner is represented as confirmed unless announced with permission.

## Contributing

Thoughtful contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Keep both writing directions usable, test mobile layouts, respect reduced-motion settings, and never include credentials or real customer data in commits.

## License

The original project code is released under the [MIT License](LICENSE). Third-party libraries, fonts, and external media remain subject to their respective licenses and terms.
