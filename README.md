# Vertex - Automated Persona Builder

This repository includes a full-stack v1 foundation:

- React + Vite frontend (`/src`)
- Node.js API service (`/server`)
- Persistent datastore (`/server/data/db.json`)
- Auth/session flow, contacts API, notes updates, recording processing pipeline, audit events
- Communication connectors for Slack, Discord, and Telegram

## Run locally

1. Start the API server:

```bash
npm run api
```

2. In a second terminal, start the frontend:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:4000`.

## Build

```bash
npm run build
```

## Core API summary

- `POST /api/auth/signin`
- `GET /api/auth/providers`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `POST /api/auth/signout`
- `GET /api/contacts?q=...`
- `GET /api/contacts/:id`
- `PATCH /api/contacts/:id/notes`
- `GET /api/contacts/:id/actions`
- `GET /api/contacts/:id/messages?limit=200`
- `GET /api/insights/:id/transcript`
- `POST /api/recordings`
- `PUT /api/recordings/:id/audio`
- `POST /api/recordings/:id/process`
- `GET /api/recordings/:id`
- `GET /api/health`

## Integration APIs (Slack/Discord/Telegram)

- `GET /api/integrations`
- `GET /api/integrations/pending-matches`
- `POST /api/integrations/slack/connect`
- `POST /api/integrations/discord/connect`
- `POST /api/integrations/telegram/connect`
- `POST /api/integrations/:provider/sync`
- `POST /api/integrations/:provider/disconnect`
- `POST /api/integrations/pending-matches/:id/resolve`

### Connect payloads

Slack:

```json
{
  "token": "xoxb-...",
  "label": "My Slack Workspace",
  "channelIds": ["C0123456789"],
  "promptOnUncertainMatch": true
}
```

Discord:

```json
{
  "botToken": "YOUR_DISCORD_BOT_TOKEN",
  "guildId": "YOUR_SERVER_GUILD_ID",
  "label": "Main Discord",
  "channelIds": ["123456789012345678"],
  "promptOnUncertainMatch": true
}
```

Telegram:

```json
{
  "botToken": "123456:ABCDEF...",
  "chatIds": ["123456789", "-1001234567890"],
  "label": "Telegram Bot",
  "promptOnUncertainMatch": true
}
```

### Example sync flow

```bash
# 1) sign in and capture token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/signin -H 'Content-Type: application/json' -d '{"email":"demo@vertex.app"}' | jq -r '.token')

# 2) connect a provider
curl -s -X POST http://localhost:4000/api/integrations/slack/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"token":"xoxb-...","promptOnUncertainMatch":true}'

# 3) sync contacts + messages into Vertex
curl -s -X POST http://localhost:4000/api/integrations/slack/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"promptOnUncertainMatch":true}'
```

### Pending-match fail-safe flow

When matching is uncertain, sync creates a pending match instead of auto-creating a contact.

1) List pending prompts:

```bash
curl -s http://localhost:4000/api/integrations/pending-matches \
  -H "Authorization: Bearer $TOKEN"
```

2) Resolve by linking to an existing contact:

```bash
curl -s -X POST http://localhost:4000/api/integrations/pending-matches/PENDING_ID/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"action":"link","contactId":"CONTACT_ID"}'
```

3) Or resolve by creating a new contact:

```bash
curl -s -X POST http://localhost:4000/api/integrations/pending-matches/PENDING_ID/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"action":"create_new"}'
```

## Notes

- Integration tokens are persisted in the local JSON datastore for development use.
- Sync ingests both contacts and message history (when provider scopes allow it).
- Identity resolution order: exact provider ID -> email match -> username match -> high-confidence name similarity -> pending user prompt.
- Pending-match resolution links previously unassigned synced messages to the selected contact.
- The AI recording pipeline is deterministic/stubbed in `server/pipeline.js` with a pluggable structure for real transcription/extraction providers.
- Telegram Bot API cannot globally enumerate all users; this integration requires either incoming updates or explicit chat context.

## Google OAuth setup (optional)

Set these environment variables before running `npm run api`:

```bash
export GOOGLE_CLIENT_ID=\"...\"
export GOOGLE_CLIENT_SECRET=\"...\"
export GOOGLE_REDIRECT_URI=\"http://localhost:4000/api/auth/google/callback\"
export FRONTEND_APP_URL=\"http://localhost:3000\"
```

If Google variables are missing, the app prompts for username/password registration/login.
