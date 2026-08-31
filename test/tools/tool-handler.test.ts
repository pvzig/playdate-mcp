import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { CommandResult } from "../../src/simulator/command-result.js";
import {
  ExecutionCancelledError,
  type Executor,
} from "../../src/simulator/executor.js";
import { handleToolInvocation } from "../../src/tools/tool-handler.js";

test("successful execution returns text and structured content", async () => {
  const executor = new StubExecutor({
    command: ["playdate-simctl", "status"],
    exitCode: 0,
    standardError: "",
    standardOutput: "ready\n",
  });

  const result = await handleToolInvocation(executor, {
    arguments: ["status"],
  });

  assert.deepEqual(executor.arguments, ["status"]);
  assert.deepEqual(result.content, [{ type: "text", text: "ready" }]);
  assert.deepEqual(result.structuredContent, {
    command: ["playdate-simctl", "status"],
    exitCode: 0,
    stderr: "",
    stdout: "ready\n",
    succeeded: true,
    termination: "exited(0)",
  });
  assert.equal(result.isError, false);
});

test("nonzero execution is a structured MCP tool error", async () => {
  const executor = new StubExecutor({
    command: ["playdate-simctl", "load", "Missing.pdx"],
    exitCode: 2,
    standardError: "PDX not found\n",
    standardOutput: "",
  });

  const result = await handleToolInvocation(executor, {
    arguments: ["load", "Missing.pdx"],
  });

  assert.deepEqual(result.content, [{ type: "text", text: "PDX not found" }]);
  assert.deepEqual(result.structuredContent, {
    command: ["playdate-simctl", "load", "Missing.pdx"],
    exitCode: 2,
    stderr: "PDX not found\n",
    stdout: "",
    succeeded: false,
    termination: "exited(2)",
  });
  assert.equal(result.isError, true);
});

test("successful execution preserves standard output and warnings", async () => {
  const executor = new StubExecutor({
    command: ["playdate-simctl", "status"],
    exitCode: 0,
    standardError: "compatibility warning\n",
    standardOutput: "ready\n",
  });

  const result = await handleToolInvocation(executor, {
    arguments: ["status"],
  });

  assert.deepEqual(result.content, [
    { type: "text", text: "ready\ncompatibility warning" },
  ]);
  assert.equal(result.isError, false);
});

test("output-limit failures do not duplicate truncated output in text", async () => {
  const executor = new StubExecutor({
    command: ["playdate-simctl", "status"],
    errorCode: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
    standardError: "",
    standardOutput: "truncated output",
  });

  const result = await handleToolInvocation(executor, {
    arguments: ["status"],
  });

  assert.deepEqual(result.content, [
    {
      type: "text",
      text: "playdate-simctl failed(ERR_CHILD_PROCESS_STDIO_MAXBUFFER).",
    },
  ]);
  assert.equal(result.isError, true);
});

test("spawn failures become MCP tool errors", async () => {
  const executor = new StubExecutor(new Error("executable missing"));

  const result = await handleToolInvocation(executor, {
    arguments: ["status"],
  });

  assert.deepEqual(result.content, [
    {
      type: "text",
      text: "Could not execute playdate-simctl: executable missing",
    },
  ]);
  assert.equal(result.structuredContent, undefined);
  assert.equal(result.isError, true);
});

test("successful screenshot execution attaches PNG image content", async () => {
  const directory = await mkdtemp(join(tmpdir(), "playdate-mcp-"));
  const screenshotPath = join(directory, "frame.png");
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  await writeFile(screenshotPath, png);

  try {
    const executor = new StubExecutor({
      command: ["playdate-simctl", "screenshot", screenshotPath],
      exitCode: 0,
      standardError: "",
      standardOutput: screenshotPath,
    });

    const result = await handleToolInvocation(executor, {
      arguments: ["screenshot", screenshotPath],
      artifact: { mimeType: "image/png", path: screenshotPath },
    });

    assert.deepEqual(result.content, [
      { type: "text", text: screenshotPath },
      { type: "image", data: png.toString("base64"), mimeType: "image/png" },
    ]);
    assert.equal(result.isError, false);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("missing screenshot output reports the artifact failure", async () => {
  const executor = new StubExecutor({
    command: ["playdate-simctl", "screenshot", "/missing/frame.png"],
    exitCode: 0,
    standardError: "",
    standardOutput: "",
  });

  const result = await handleToolInvocation(executor, {
    arguments: ["screenshot", "/missing/frame.png"],
    artifact: { mimeType: "image/png", path: "/missing/frame.png" },
  });

  assert.deepEqual(result.content[0], {
    type: "text",
    text: "Playdate command completed successfully.",
  });
  assert.match(
    result.content[1]?.type === "text" ? result.content[1].text : "",
    /output artifact could not be read/,
  );
  assert.deepEqual(result.structuredContent, {
    command: ["playdate-simctl", "screenshot", "/missing/frame.png"],
    exitCode: 0,
    stderr: "",
    stdout: "",
    succeeded: false,
    termination: "exited(0)",
  });
  assert.equal(result.isError, true);
});

test("cancellation is propagated to MCP", async () => {
  const cancellation = new ExecutionCancelledError(new Error("cancelled"));
  const executor = new StubExecutor(cancellation);
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    handleToolInvocation(
      executor,
      { arguments: ["status"] },
      controller.signal,
    ),
    cancellation,
  );
  assert.equal(executor.signal, controller.signal);
});

test("screenshot reads honor cancellation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "playdate-mcp-"));
  const screenshotPath = join(directory, "frame.png");
  await writeFile(screenshotPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const controller = new AbortController();
  controller.abort();

  try {
    const executor = new StubExecutor({
      command: ["playdate-simctl", "screenshot", screenshotPath],
      exitCode: 0,
      standardError: "",
      standardOutput: screenshotPath,
    });

    await assert.rejects(
      handleToolInvocation(
        executor,
        {
          arguments: ["screenshot", screenshotPath],
          artifact: { mimeType: "image/png", path: screenshotPath },
        },
        controller.signal,
      ),
      ExecutionCancelledError,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

class StubExecutor implements Executor {
  public arguments: readonly string[] | undefined;
  public signal: AbortSignal | undefined;

  public constructor(private readonly outcome: CommandResult | Error) {}

  public async execute(
    arguments_: readonly string[],
    signal?: AbortSignal,
  ): Promise<CommandResult> {
    this.arguments = arguments_;
    this.signal = signal;
    if (this.outcome instanceof Error) {
      throw this.outcome;
    }
    return this.outcome;
  }
}
