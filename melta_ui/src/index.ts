#!/usr/bin/env node
import { startServer } from "./server.js";

startServer().catch((error) => {
  console.error("Failed to start melta-ui MCP server:", error);
  process.exit(1);
});
