# Security Policy

## Supported versions

Security fixes are currently intended for the latest version on the default branch. Alpha releases may change without a compatibility guarantee.

## Report a vulnerability privately

Please do not publish an unpatched vulnerability, exploit details, credentials, pairing tokens, or private IDE transcripts in a public issue.

If this repository is hosted on GitHub and **Private vulnerability reporting** is enabled, use the repository's **Security → Report a vulnerability** feature. If it is not enabled, contact the maintainers through the private contact method listed on the repository hosting page. Include affected version or commit, impact, and clear reproduction steps. Do not include real secrets; use placeholders.

This project has no published response-time or remediation-time guarantee. Maintainers will coordinate disclosure after investigating a report.

## Local data and credentials

Deadline stores app records in browser local storage. AI provider keys are held in browser session memory by the app and should not be pasted into public reports. The optional bridge uses a local pairing secret stored in `~/.deadline/bridge-auth.json`; keep it private and keep the bridge bound to loopback.
