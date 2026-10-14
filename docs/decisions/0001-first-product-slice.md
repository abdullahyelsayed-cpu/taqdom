# ADR 0001: First product slice and web stack

- **Status:** Accepted for the initial MVP slice
- **Date:** 2026-10-14

## Decision

Use Vite, React, and TypeScript for the first browser-based editor. Treat the portfolio schema and layouts as data-driven; keep the first 50 selectable styles as combinations of 10 profession categories and five shared layout systems. Store this first slice locally in the browser and allow export to a standalone HTML file.

## Why

The user's first stated product requirement is a polished, approachable editor that supports different professions and visual customization. A data-driven catalog allows the team to refine layout families and themes without duplicating page code. Local saving and HTML export provide a useful working product before account, storage, publishing, and payment providers are chosen.

## Consequences

- The current preview is private to one browser/device; copied URLs do not publish a portfolio.
- No user account, cloud save, public URL, custom-domain setup, upload service, or subscription is included in this slice.
- Before public SaaS launch, choose and implement authentication, database, object storage, rate limiting, deletion/export, observability, and billing.
- Cloudflare Pages is the planned hosting target. Production domain routing must only be restored after a verified deployment and the owner accepts that public launch state.
