# Insighta CLI

Global command-line tool for Insighta Labs+ backend access. This CLI is a separate project from backend/web and only consumes backend APIs.

## Features

- GitHub OAuth login with PKCE from terminal
- Local credential storage at `~/.insighta/credentials.json`
- Automatic access-token refresh when expired
- Profile operations against backend API
- Structured table output and loading indicators

## Requirements

- Node.js 18+
- Backend API URL configured in environment or config file

## Install

### Local development

```bash
npm install
npm start -- --help
```

### Global install from this repo

```bash
npm install -g .
insighta --help
```

## Configuration

The CLI **does not hardcode backend base URL**.

Set environment variable:

```bash
export INSIGHTA_API_BASE_URL="https://api.example.com"
```

Or use user config file at `~/.insighta/config.json`:

```json
{
  "apiBaseUrl": "https://api.example.com",
  "oauthAuthorizePath": "/auth/github/authorize",
  "oauthTokenPath": "/auth/github/exchange",
  "refreshPath": "/auth/refresh",
  "whoamiPath": "/auth/whoami",
  "profilesPath": "/profiles",
  "profilesExportPath": "/profiles/export",
  "callbackPort": 53621,
  "callbackPath": "/oauth/callback"
}
```

Environment variables override config-file values.

## Auth flow

`insighta login` performs:

1. Generate `state`
2. Generate `code_verifier`
3. Derive `code_challenge` (S256)
4. Start temporary local callback server
5. Open browser to backend OAuth endpoint
6. Capture callback (`code`, `state`)
7. Validate `state`
8. Exchange `code + code_verifier` with backend
9. Receive access/refresh tokens
10. Save credentials locally
11. Confirm login identity

## Token storage

- Path: `~/.insighta/credentials.json`
- Includes access token, refresh token, expiry timestamp, user data (if available)
- File is written with restricted mode where supported

## Refresh behavior

- Each authenticated request checks access-token expiry
- If expired (or near expiry), CLI attempts refresh
- If API responds `401`, CLI refreshes once and retries
- If refresh fails, credentials are cleared and user is prompted to re-login

## Usage

```bash
insighta login
insighta logout
insighta whoami

insighta profiles list --gender female --country NG --page 1 --limit 20
insighta profiles get 123
insighta profiles search "young urban female professionals"
insighta profiles create --name "Sample Profile"
insighta profiles export --format csv
```

## Commands

- `insighta login`
- `insighta logout`
- `insighta whoami`
- `insighta profiles list [--gender --country --age-group --min-age --max-age --sort-by --order --page --limit]`
- `insighta profiles get <id>`
- `insighta profiles search "<query>"`
- `insighta profiles create --name "<name>"`
- `insighta profiles export --format csv`

All profile endpoints are requested with header `X-API-Version: 1`.

## Troubleshooting

- Missing API base URL: set `INSIGHTA_API_BASE_URL` or `~/.insighta/config.json`.
- Browser did not open: copy/paste printed URL manually from terminal logs if needed.
- Callback timeout/failure: verify local port (default `53621`) is available.
- Repeated auth failures: run `insighta logout` then `insighta login`.
- Permission denied on create: backend role enforcement allows admin users only.

## Test

```bash
npm test
```
