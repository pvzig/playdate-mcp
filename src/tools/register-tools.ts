import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";

import type { InvocationConfiguration } from "../configuration/runtime-configuration.js";
import { commandResultSchema } from "../simulator/command-result.js";
import {
  accelerometerInvocation,
  buttonInvocation,
  crankInvocation,
  injectInvocation,
  loadInvocation,
  lockInvocation,
  pausedInvocation,
  pressInvocation,
  recordInvocation,
  restartInvocation,
  runInvocation,
  screenshotInvocation,
  statusInvocation,
  toolbarInvocation,
  volumeInvocation,
} from "../simulator/invocation-builder.js";
import type { Executor } from "../simulator/executor.js";
import type { ToolInvocation } from "../simulator/tool-invocation.js";
import {
  accelerometerInputSchema,
  buttonInputSchema,
  crankInputSchema,
  injectInputSchema,
  loadInputSchema,
  lockInputSchema,
  pausedInputSchema,
  pressInputSchema,
  recordInputSchema,
  restartInputSchema,
  runInputSchema,
  screenshotInputSchema,
  statusInputSchema,
  toolbarInputSchema,
  volumeInputSchema,
} from "./schemas.js";
import { handleToolInvocation } from "./tool-handler.js";

const mutatingAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

export function registerTools(
  server: McpServer,
  executor: Executor,
  configuration: InvocationConfiguration,
): void {
  server.registerTool(
    "playdate_run",
    {
      title: "Build and run a Playdate project",
      description:
        "Run the project's mise build task, launch or find Playdate Simulator, inject the control agent, and load the PDX. This is the normal first call and reload workflow.",
      inputSchema: runInputSchema,
      outputSchema: commandResultSchema,
      annotations: {
        ...mutatingAnnotations,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    toolHandler(executor, configuration, runInvocation),
  );

  server.registerTool(
    "playdate_status",
    {
      title: "Get Playdate Simulator control status",
      description:
        "Find the selected Simulator, ensure its control agent is available, and return agent status. This may inject the agent when it is absent.",
      inputSchema: statusInputSchema,
      outputSchema: commandResultSchema,
      annotations: { ...mutatingAnnotations, idempotentHint: true },
    },
    toolHandler(executor, configuration, statusInvocation),
  );

  server.registerTool(
    "playdate_load",
    {
      title: "Load a PDX",
      description:
        "Load an existing PDX directory bundle without running a build task.",
      inputSchema: loadInputSchema,
      outputSchema: commandResultSchema,
      annotations: {
        ...mutatingAnnotations,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    toolHandler(executor, configuration, loadInvocation),
  );

  server.registerTool(
    "playdate_press",
    {
      title: "Press a Playdate button",
      description:
        "Press and release a button for a bounded duration. Lock toggles immediately and does not accept duration_ms.",
      inputSchema: pressInputSchema,
      outputSchema: commandResultSchema,
      annotations: mutatingAnnotations,
    },
    toolHandler(executor, configuration, pressInvocation),
  );

  server.registerTool(
    "playdate_set_button",
    {
      title: "Set a Playdate button state",
      description:
        "Hold or release one button for deterministic and simultaneous input sequences.",
      inputSchema: buttonInputSchema,
      outputSchema: commandResultSchema,
      annotations: { ...mutatingAnnotations, idempotentHint: true },
    },
    toolHandler(executor, configuration, buttonInvocation),
  );

  server.registerTool(
    "playdate_set_crank",
    {
      title: "Set Playdate crank state",
      description:
        "Set the crank position in degrees or set whether the crank is docked.",
      inputSchema: crankInputSchema,
      outputSchema: commandResultSchema,
      annotations: { ...mutatingAnnotations, idempotentHint: true },
    },
    toolHandler(executor, configuration, crankInvocation),
  );

  server.registerTool(
    "playdate_set_accelerometer",
    {
      title: "Set Playdate accelerometer values",
      description: "Set the Simulator accelerometer x, y, and z values.",
      inputSchema: accelerometerInputSchema,
      outputSchema: commandResultSchema,
      annotations: { ...mutatingAnnotations, idempotentHint: true },
    },
    toolHandler(executor, configuration, accelerometerInvocation),
  );

  server.registerTool(
    "playdate_set_volume",
    {
      title: "Set or adjust Playdate volume",
      description:
        "Set volume to percent, or adjust it up or down by percent. Adjustment defaults to 10 percent when percent is omitted.",
      inputSchema: volumeInputSchema,
      outputSchema: commandResultSchema,
      annotations: mutatingAnnotations,
    },
    toolHandler(executor, configuration, volumeInvocation),
  );

  server.registerTool(
    "playdate_set_paused",
    {
      title: "Set Playdate Simulator pause state",
      description: "Pause or resume the running game.",
      inputSchema: pausedInputSchema,
      outputSchema: commandResultSchema,
      annotations: { ...mutatingAnnotations, idempotentHint: true },
    },
    toolHandler(executor, configuration, pausedInvocation),
  );

  server.registerTool(
    "playdate_restart",
    {
      title: "Restart the Playdate game",
      description:
        "Restart the currently loaded game, resetting its runtime state.",
      inputSchema: restartInputSchema,
      outputSchema: commandResultSchema,
      annotations: { ...mutatingAnnotations, destructiveHint: true },
    },
    toolHandler(executor, configuration, restartInvocation),
  );

  server.registerTool(
    "playdate_toggle_lock",
    {
      title: "Toggle Playdate lock state",
      description: "Toggle the Simulator's Playdate lock state.",
      inputSchema: lockInputSchema,
      outputSchema: commandResultSchema,
      annotations: mutatingAnnotations,
    },
    toolHandler(executor, configuration, lockInvocation),
  );

  server.registerTool(
    "playdate_capture_screenshot",
    {
      title: "Capture a Playdate screenshot",
      description:
        "Capture the 400 by 240 framebuffer to a new PNG path and return it as MCP image content. Existing files are never overwritten.",
      inputSchema: screenshotInputSchema,
      outputSchema: commandResultSchema,
      annotations: mutatingAnnotations,
    },
    toolHandler(executor, configuration, screenshotInvocation),
  );

  server.registerTool(
    "playdate_record",
    {
      title: "Control non-interactive Playdate GIF recording",
      description:
        "Start recording to a new GIF path or stop and finalize the active recording. Recording state belongs to the Simulator agent, not this MCP server.",
      inputSchema: recordInputSchema,
      outputSchema: commandResultSchema,
      annotations: mutatingAnnotations,
    },
    toolHandler(executor, configuration, recordInvocation),
  );

  server.registerTool(
    "playdate_toolbar",
    {
      title: "Invoke a Playdate Simulator toolbar action",
      description:
        "Invoke an exact Simulator toolbar action. The gif action may open a Save Recording dialog; use playdate_record for non-interactive GIF capture.",
      inputSchema: toolbarInputSchema,
      outputSchema: commandResultSchema,
      annotations: mutatingAnnotations,
    },
    toolHandler(executor, configuration, toolbarInvocation),
  );

  server.registerTool(
    "playdate_inject",
    {
      title: "Ensure the Playdate control agent is injected",
      description:
        "Diagnostic primitive that finds the selected Simulator and ensures its control agent is available. Normal control tools inject automatically.",
      inputSchema: injectInputSchema,
      outputSchema: commandResultSchema,
      annotations: { ...mutatingAnnotations, idempotentHint: true },
    },
    toolHandler(executor, configuration, injectInvocation),
  );
}

function toolHandler<Input>(
  executor: Executor,
  configuration: InvocationConfiguration,
  invocation: (
    input: Input,
    configuration: InvocationConfiguration,
  ) => ToolInvocation,
): (input: Input, context: ToolContext) => Promise<CallToolResult> {
  return (input, context) =>
    handleToolInvocation(
      executor,
      invocation(input, configuration),
      context.mcpReq.signal,
    );
}

interface ToolContext {
  readonly mcpReq: {
    readonly signal?: AbortSignal;
  };
}
