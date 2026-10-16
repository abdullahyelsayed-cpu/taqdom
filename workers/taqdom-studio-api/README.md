# Taqdom API Worker

This directory tracks the API Worker currently used by the Taqdom Pages project. The entry file was recovered from the active Cloudflare Worker bundle so its logic is reviewable and versioned.

## Safe release order

1. Review changes and CI checks in the pull request.
2. Apply `migrations/0001_message_attempts.sql` and `migrations/0002_portfolio_subdomains.sql` to the production D1 database attached to `TAQDOM_DB`.
3. Deploy this Worker to `taqdom-studio-api` while preserving the existing AI, D1, ALLOWED_ORIGINS, and MODEL bindings.
4. Smoke-test login, draft isolation, published portfolio reads, avatar uploads, contact forms, inbox access control, and AI assistance.
5. Follow up by replacing the recovered bundle with human-maintained source modules and automate deployment from this repository.

Do not deploy before the migration is applied and API checks pass. Do not commit credentials or secret values here.
