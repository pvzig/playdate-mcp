import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const serverPath = fileURLToPath(new URL("../../src/main.js", import.meta.url));

let cachedTools: readonly ToolDefinition[] | undefined;

test("registered tool catalog exposes the complete playdate-simctl surface", () => {
  assert.deepEqual(
    listTools().map((tool) => tool.name),
    [
      "playdate_run",
      "playdate_status",
      "playdate_load",
      "playdate_press",
      "playdate_set_button",
      "playdate_set_crank",
      "playdate_set_accelerometer",
      "playdate_set_volume",
      "playdate_set_paused",
      "playdate_restart",
      "playdate_toggle_lock",
      "playdate_capture_screenshot",
      "playdate_record",
      "playdate_toolbar",
      "playdate_inject",
    ],
  );
});

test("advertised schemas preserve runtime path and press constraints", () => {
  const pathPatterns = [
    ["playdate_run", "product_path", String.raw`\.[pP][dD][xX]$`],
    ["playdate_capture_screenshot", "output_path", String.raw`\.[pP][nN][gG]$`],
  ] as const;

  for (const [toolName, propertyName, pattern] of pathPatterns) {
    const property =
      requireTool(toolName).inputSchema.properties?.[propertyName];
    assert.equal(property?.pattern, pattern);
  }

  const recordBranches = requireTool("playdate_record").inputSchema.anyOf;
  const startRecording = recordBranches?.find(
    (branch) => branch.properties?.action?.const === "start",
  );
  assert.equal(
    startRecording?.properties?.output_path?.pattern,
    String.raw`\.[gG][iI][fF]$`,
  );

  const pressBranches = requireTool("playdate_press").inputSchema.anyOf;
  const lockPress = pressBranches?.find(
    (branch) => branch.properties?.button?.const === "lock",
  );
  assert.deepEqual(lockPress?.properties?.duration_ms?.not, {});
});

function requireTool(name: string): ToolDefinition {
  const tool = listTools().find((candidate) => candidate.name === name);
  assert.ok(tool, `Missing registered tool ${name}`);
  return tool;
}

function listTools(): readonly ToolDefinition[] {
  if (cachedTools !== undefined) {
    return cachedTools;
  }

  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "playdate-mcp-tests", version: "1.0" },
      },
    },
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  ];
  const execution = spawnSync(process.execPath, [serverPath], {
    encoding: "utf8",
    input: `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`,
  });

  assert.equal(execution.signal, null, execution.stderr);
  assert.equal(execution.status, 0, execution.stderr);

  const responses = execution.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as ProtocolResponse);
  const response = responses.find((candidate) => candidate.id === 2);
  assert.ok(response?.result?.tools, "Missing tools/list response");
  cachedTools = response.result.tools;
  return cachedTools;
}

interface ProtocolResponse {
  readonly id?: number;
  readonly result?: {
    readonly tools?: readonly ToolDefinition[];
  };
}

interface ToolDefinition {
  readonly name: string;
  readonly inputSchema: JsonSchema;
}

interface JsonSchema {
  readonly anyOf?: readonly JsonSchema[];
  readonly const?: unknown;
  readonly not?: JsonSchema;
  readonly pattern?: string;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
}
