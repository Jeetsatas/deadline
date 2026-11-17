# Contributing to Deadline

Thanks for considering a contribution. Bug fixes, accessibility improvements, documentation, and focused feature work are welcome.

## Set up the project

Clone the public repository:

```bash
git clone https://github.com/Jeetsatas/deadline.git
cd deadline
npm ci
npm run dev
```

The development URL is printed by Vite (normally `http://localhost:5173`). For bridge work, start the optional local service in another terminal with `npm run bridge`.

## Before submitting

Run the project checks:

```bash
npm run lint
npm test
npm run build
```

Please keep changes focused, follow the existing TypeScript and React patterns, and avoid committing generated output, credentials, local database/browser data, or IDE transcripts. Add or update tests when behavior changes. Do not include real API keys or pairing tokens in screenshots or logs.

## Pull requests

- Explain the user problem and the change made.
- Link a related issue when one exists.
- Include steps to verify the change; include screenshots for UI changes.
- Call out behavior changes and any new setup requirements.
- Confirm the checks above pass, or state clearly which ones could not be run and why.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). For security issues, use the private reporting guidance in [SECURITY.md](SECURITY.md), not a public issue.
