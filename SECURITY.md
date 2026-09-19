# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes    |

## Reporting a Vulnerability

**Please do NOT open a public issue for security vulnerabilities.**

Instead, email **security@salubrious.dev** (or mohammad.hossein.alikhani@gmail.com) with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We will acknowledge receipt within **48 hours** and provide a fix timeline within **7 days**.

## Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 2**: Acknowledgment sent
- **Day 7**: Fix timeline provided
- **Day 30**: Target for patch release (critical)
- **Day 90**: Target for patch release (non-critical)

We follow a **90-day coordinated disclosure** policy. Please do not publicly disclose until a fix is released.

## Security Updates

Security updates are released as patch versions and announced via:

- GitHub Security Advisories
- npm audit
- Release notes (CHANGELOG.md)

## Scope

This policy covers the `salubrious` npm package and its GitHub Action.

Out of scope:
- Third-party dependencies (report to their maintainers)
- Issues in downstream consumers' configurations