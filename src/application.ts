import { McpServer } from "@modelcontextprotocol/server";

import type { RuntimeConfiguration } from "./configuration/runtime-configuration.js";
import {
  SubprocessExecutor,
  type SubprocessExecutionEvent,
} from "./simulator/subprocess-executor.js";
import { registerTools } from "./tools/register-tools.js";

export function createServer(configuration: RuntimeConfiguration): McpServer {
  const server = new McpServer(
    { name: "playdate-mcp", version: "0.1.0" },
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
  );
  return server;
}

function logSubprocessExecution(event: SubprocessExecutionEvent): void {
  console.error(JSON.stringify({ scope: "playdate-simctl", ...event }));
}
