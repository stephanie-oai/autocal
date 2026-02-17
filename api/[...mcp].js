import { handleMcpHttpRequest } from "../src/server.js";

export default async function handler(req, res) {
  await handleMcpHttpRequest(req, res);
}
