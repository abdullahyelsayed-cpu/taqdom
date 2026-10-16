# Taqdom API Worker

This module implements the first-party API used by the Taqdom Pages application. Source, security checks, schema setup, and API tests are versioned in this directory.

## D1 setup

- `schema/bootstrap.sql` is the idempotent baseline for a **new, empty D1 database only**. It creates users, sessions, portfolios, media, messages, quota tables, and the corresponding query indexes.
- For an existing database, **do not reset or replace data**. Apply only pending numbered migrations after checking the database, backing up where supported, and reviewing the migration SQL.
- Migration `0001_message_attempts.sql` adds contact form rate limiting.
- Migration `0002_portfolio_subdomains.sql` enforces case-insensitive unique subdomains.
- Migration `0003_media_and_inbox_indexes.sql` improves per-account media quota and owner inbox queries.

For a new database, apply the baseline and then the numbered migrations from the repository root:

```sh
npx wrangler d1 execute <database-name> --remote --file=workers/taqdom-studio-api/schema/bootstrap.sql
npx wrangler d1 migrations apply <database-name> --remote --directory=workers/taqdom-studio-api/migrations
```

For an existing database, use the migrations command only after checking which migrations have already been applied. The baseline file is not a replacement for verifying or repairing an existing schema.

## Safe release order

1. Review and pass CI for the pull request.
2. Verify the target Cloudflare D1 database and migration history; do not assume the development database is the production database.
3. Apply only pending migrations.
4. Deploy this Worker while preserving the existing AI, D1, `ALLOWED_ORIGINS`, and `MODEL` bindings.
5. Smoke-test login, draft isolation, published portfolio reads, image uploads and reads, contact submissions, inbox owner checks, and AI assistance.
6. Verify the Pages service binding and tenant-router route after deployment.

## Safeguards

- State-changing account routes require an allowed first-party Origin.
- Passwords are salted and hashed server-side; sessions use an HttpOnly, Secure, SameSite cookie and only the token hash is stored.
- Public portfolio reads expose published sites only; inbox reads require portfolio ownership.
- User media accepts JPEG, PNG, and WebP only. The API caps each account at 75 media records and 25 MB of encoded image data; older unreferenced uploads are pruned during a later upload.
- Public contact submissions and authentication attempts have rate limits.
- Documents are normalized through an allowlist; external links, image URLs, section order, and template IDs are validated before storage.
- Errors returned to browsers should not contain SQL, credentials, raw cookies, or internal request details.

## Checks

```sh
cd workers/taqdom-studio-api
npm run check
``

The check command validates JavaScript syntax, security invariants, the reproducible D1 schema and migrations, and API behavior with a test D1 adapter. This is not a substitute for a production smoke test against Cloudflare.
