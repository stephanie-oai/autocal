import http from "node:http";
import { handleMcpHttpRequest } from "./server.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const httpServer = http.createServer(async (req, res) => {
  await handleMcpHttpRequest(req, res);
});

httpServer.listen(PORT, HOST, () => {
  process.stderr.write(`personal-calendar-mcp listening on http://${HOST}:${PORT}\n`);
});
