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
type ShutdownReason = "SIGINT" | "SIGTERM" | "stdin_end";

async function close(reason: ShutdownReason): Promise<void> {
  if (isClosing) {
    return;
  }
  isClosing = true;
  log("shutdown_started", { reason });
  await handle.close();
  log("shutdown_completed", { reason });
}

process.once("SIGINT", () => {
  requestClose("SIGINT");
});
process.once("SIGTERM", () => {
  requestClose("SIGTERM");
});
process.stdin.once("end", () => {
  requestClose("stdin_end");
});

function requestClose(reason: ShutdownReason): void {
  void close(reason).catch((error: unknown) => {
    process.exitCode = 1;
    log("shutdown_failed", { message: errorMessage(error), reason });
  });
}

function log(event: string, details: Readonly<Record<string, unknown>>): void {
  console.error(JSON.stringify({ scope: "playdate-mcp", event, ...details }));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
