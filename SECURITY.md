# Security Policy

## Supported release

Security fixes are prepared against the latest code on the default branch. This project is under active development; a formal long-term support schedule has not been established.

## Reporting a vulnerability

Please do not publish exploit details, account data, or an unpatched vulnerability in a public issue.

Contact the maintainer privately through GitHub to coordinate a report. Include the affected area, impact, reproducible steps, and any suggested mitigation. Redact tokens, cookies, account identifiers, and customer data from screenshots and logs.

We will acknowledge a report when practical, investigate it, and coordinate a fix or disclosure timeline with the reporter. Do not access data or systems that are not yours while investigating.

## Secret handling

- Never commit API keys, database credentials, session cookies, environment files, private keys, or provider tokens.
- Keep production credentials in Cloudflare-managed secret storage; use scoped, least-privilege credentials.
- If a credential may have been exposed, revoke or rotate it immediately. Removing it from the latest commit does not remove it from Git history.
- Before making this repository public, review every reachable branch and commit for secrets and private operational information.

## Account and data safeguards

Taqdom currently uses a first-party session flow and stores account and portfolio records in D1. Signup verification, password recovery, independent security review, and a comprehensive privacy/compliance review remain release gates before a broad public launch.
