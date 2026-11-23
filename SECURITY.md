# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | Yes |

## Reporting a vulnerability

Please do not open a public issue for security-sensitive reports.

Use GitHub's **Private vulnerability reporting** for this repository (Security → Advisories → Report a vulnerability). If that is unavailable, contact the maintainer listed in `package.json` through a private channel and include:

- a description of the issue and its impact;
- steps to reproduce;
- affected files or dependencies;
- any suggested remediation.

You can expect an acknowledgement within 72 hours and a remediation plan within 7 days for confirmed issues.

## Scope

Evergrow is a static, client-only application. There is no server, authentication, database, or network request at runtime. The most relevant risks are:

- XSS through user-supplied task titles or item text;
- prototype pollution or crashes from malicious `localStorage` data;
- dependency vulnerabilities in the build or runtime bundle.

The app renders user text as text nodes (React escapes it) and validates persisted data in `sanitizePersisted`. Reports that bypass either of those controls are in scope.

## Secrets

This repository contains no API keys, tokens, or credentials. Do not add any. Do not commit `.env` files, `gh` tokens, or signing material.

## Dependency updates

Dependabot is configured for npm and GitHub Actions. Run `npm audit` before a release and address high/critical findings.
