import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const server = new McpServer({
  name: "personal-calendar-mcp",
  version: "0.1.0",
});

const transport = new StreamableHTTPServerTransport({
  // Stateless mode is better for serverless environments.
  sessionIdGenerator: undefined,
});
const connectPromise = server.connect(transport);

function getConfig() {
  return {
    webAppUrl: process.env.GCAL_WEBAPP_URL || "",
    webAppSecret: process.env.GCAL_WEBAPP_SECRET || "",
    mcpApiKey: process.env.MCP_API_KEY || "",
    defaultTimezone: process.env.DEFAULT_TIMEZONE || "Europe/London",
    defaultCalendarId: process.env.DEFAULT_CALENDAR_ID || "primary",
  };
}

function requireConfig(config) {
  if (!config.webAppUrl) {
    throw new Error("Missing GCAL_WEBAPP_URL");
  }
  if (!config.webAppSecret) {
    throw new Error("Missing GCAL_WEBAPP_SECRET");
  }
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `Invalid JSON response from Apps Script: ${text}` };
  }
}

async function postToWebApp(eventPayload) {
  const config = getConfig();
  requireConfig(config);
  const payload = {
    secret: config.webAppSecret,
    event: {
      ...eventPayload,
      calendarId: eventPayload.calendarId || config.defaultCalendarId,
    },
  };
  const resp = await fetch(config.webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  const parsed = parseJsonResponse(text);
  if (!resp.ok) {
    return {
      ok: false,
      error: `HTTP ${resp.status}`,
      body: parsed,
    };
  }
  return parsed;
}

server.tool(
  "google_calendar_create_event",
  "Create one Google Calendar event through the configured Apps Script web app.",
  {
    summary: z.string().min(1),
    startDateTime: z.string().describe("ISO 8601 datetime, for example 2026-03-21T19:00:00+00:00"),
    endDateTime: z.string().describe("ISO 8601 datetime, for example 2026-03-21T23:00:00+00:00"),
    timeZone: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    emojiPrefix: z.string().optional(),
    disableEmojiPrefix: z.boolean().optional(),
    calendarId: z.string().optional(),
    attendees: z.array(z.object({ email: z.string().email() })).optional(),
    sendInvites: z.boolean().optional(),
  },
  async (args) => {
    const config = getConfig();
    const event = {
      summary: args.summary,
      location: args.location || "",
      description: args.description || "",
      start: {
        dateTime: args.startDateTime,
        timeZone: args.timeZone || config.defaultTimezone,
      },
      end: {
        dateTime: args.endDateTime,
        timeZone: args.timeZone || config.defaultTimezone,
      },
      reminders: {
        useDefault: false,
        overrides: [],
      },
      calendarId: args.calendarId || config.defaultCalendarId,
    };
    if (args.emojiPrefix) {
      event.emojiPrefix = args.emojiPrefix;
    }
    if (typeof args.disableEmojiPrefix === "boolean") {
      event.disableEmojiPrefix = args.disableEmojiPrefix;
    }
    if (args.attendees?.length) {
      event.attendees = args.attendees;
    }
    if (typeof args.sendInvites === "boolean") {
      event.sendInvites = args.sendInvites;
    }

    const result = await postToWebApp(event);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: result.ok !== true,
    };
  }
);

server.tool(
  "google_calendar_post_raw_event",
  "Post a raw event payload directly to the configured Apps Script web app.",
  {
    event: z.object({}).passthrough(),
  },
  async (args) => {
    const result = await postToWebApp(args.event);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: result.ok !== true,
    };
  }
);

export async function handleMcpHttpRequest(req, res) {
  try {
    await connectPromise;

    if (req.method === "GET" && (req.url === "/health" || req.url === "/api/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "personal-calendar-mcp" }));
      return;
    }

    const config = getConfig();
    if (config.mcpApiKey) {
      const auth = req.headers.authorization || "";
      const expected = `Bearer ${config.mcpApiKey}`;
      if (auth !== expected) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    await transport.handleRequest(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: String(err) },
          id: null,
        })
      );
    }
  }
}
