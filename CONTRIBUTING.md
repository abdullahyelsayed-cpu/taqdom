# Contributing to Taqdom

Thanks for your interest in improving Taqdom.

## Before opening a change

1. Keep the interface usable in both Arabic (RTL) and English (LTR).
2. Test narrow mobile layouts as well as desktop layouts.
3. Prefer accessible semantic HTML, visible keyboard focus, descriptive labels, and reduced-motion support.
4. Keep credentials and private configuration out of source control.
5. Avoid adding dependencies when the platform or existing stack already covers the need.
6. Explain assumptions and scope; do not describe a feature as complete if it is only a visual prototype.

## Local development

    cd app
    npm ci
    npm run dev

Validate changes before submitting them:

    npm run build
    npm run lint

## Pull requests

Use a clear title and describe the user-visible change, important implementation details, and how it was tested. Include screenshots for major visual changes. Call out migrations, new environment bindings, external assets, privacy implications, or changes to authentication.

Please do not include real personal data, access tokens, production cookies, or customer information in test fixtures or screenshots.
