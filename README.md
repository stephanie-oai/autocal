# Personal Calendar MCP Server

Remote MCP server that creates Google Calendar events by forwarding payloads to your Google Apps Script web app.

## Why this exists

ChatGPT custom apps need a remote MCP URL. This server exposes MCP tools and calls your existing Apps Script endpoint, so ChatGPT does not need local shell or direct internet from your local runtime.

## Tools exposed

1. `google_calendar_create_event`
2. `google_calendar_post_raw_event`

## Required environment variables

1. `GCAL_WEBAPP_URL` (your Apps Script `/exec` URL)
2. `GCAL_WEBAPP_SECRET` (your shared secret)

## Optional environment variables

1. `DEFAULT_TIMEZONE` (default: `Europe/London`)
2. `DEFAULT_CALENDAR_ID` (default: `primary`)
3. `MCP_API_KEY` (if set, requires `Authorization: Bearer <key>`)
4. `PORT` (default: `3000`)
5. `HOST` (default: `0.0.0.0`)

## Local run

```bash
npm install
cp .env.example .env
# edit .env values
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, import the repo as a new project.
3. Set environment variables in Vercel:
   - `GCAL_WEBAPP_URL`
   - `GCAL_WEBAPP_SECRET`
   - optional `MCP_API_KEY`
   - optional `DEFAULT_TIMEZONE`
   - optional `DEFAULT_CALENDAR_ID`
4. Deploy.
5. Your MCP URL for ChatGPT is:
   - `https://<your-project>.vercel.app/api/mcp`

Health check URL:

- `https://<your-project>.vercel.app/api/health`

## Add in ChatGPT App Builder

In your app's **New App** modal:

1. `MCP Server URL`: `https://<your-project>.vercel.app/api/mcp`
2. Authentication:
   - If `MCP_API_KEY` is not set: choose no auth
   - If `MCP_API_KEY` is set: choose bearer/API key mode and provide the key

## Example MCP request behavior

`google_calendar_create_event` maps inputs into this Apps Script event shape:

```json
{
  "summary": "Title",
  "start": { "dateTime": "2026-03-21T19:00:00+00:00", "timeZone": "Europe/London" },
  "end": { "dateTime": "2026-03-21T23:00:00+00:00", "timeZone": "Europe/London" },
  "location": "Optional",
  "description": "Optional",
  "calendarId": "primary"
}
```

## Security notes

1. Keep `GCAL_WEBAPP_SECRET` and `MCP_API_KEY` out of source control.
2. Restrict usage with `MCP_API_KEY` in production.
3. Rotate `GCAL_WEBAPP_SECRET` if exposed.
