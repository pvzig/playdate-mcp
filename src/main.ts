#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createServer } from "./application.js";
import { loadConfiguration } from "./configuration/load-configuration.js";

const configuration = loadConfiguration();
const handle = serveStdio(() => createServer(configuration), {
  onerror(error) {
    log("transport_error", { message: error.message });
  },
});

let isClosing = false;
async function close(signal: NodeJS.Signals): Promise<void> {
  if (isClosing) {
    return;
  }
  isClosing = true;
  log("shutdown_started", { signal });
  await handle.close();
  log("shutdown_completed", { signal });
}

process.once("SIGINT", () => {
  requestClose("SIGINT");
});
process.once("SIGTERM", () => {
  requestClose("SIGTERM");
});

function requestClose(signal: NodeJS.Signals): void {
  void close(signal).catch((error: unknown) => {
    process.exitCode = 1;
    log("shutdown_failed", { message: errorMessage(error), signal });
  });
}

function log(event: string, details: Readonly<Record<string, unknown>>): void {
  console.error(JSON.stringify({ scope: "playdate-mcp", event, ...details }));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
