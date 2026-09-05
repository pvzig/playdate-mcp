import { readFileSync } from "node:fs";

import { McpServer } from "@modelcontextprotocol/server";

import type { RuntimeConfiguration } from "./configuration/runtime-configuration.js";
import {
  SubprocessExecutor,
  type SubprocessExecutionEvent,
} from "./simulator/subprocess-executor.js";
import { registerTools } from "./tools/register-tools.js";

export function createServer(configuration: RuntimeConfiguration): McpServer {
  const server = new McpServer(
    { name: "playdate-mcp", version: packageVersion() },
    {
      instructions:
        "Use playdate_run as the normal first call and reload workflow. Sequence mutations to the same Simulator. Use playdate_record, not the gif toolbar action, for non-interactive recording.",
    },
  );
  registerTools(
    server,
    new SubprocessExecutor(configuration.executable, {
      ...configuration.execution,
      log: logSubprocessExecution,
    }),
    configuration.invocation,
    configuration.execution.workingDirectory,
  );
  return server;
}

function packageVersion(): string {
  const metadata = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { readonly version?: unknown };
  if (typeof metadata.version !== "string" || metadata.version.length === 0) {
    throw new Error("package.json does not contain a version");
  }
  return metadata.version;
}

function logSubprocessExecution(event: SubprocessExecutionEvent): void {
  console.error(JSON.stringify({ scope: "playdate-simctl", ...event }));
}
