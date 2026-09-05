import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  commandSucceeded,
  terminationDescription,
} from "../../src/simulator/command-result.js";
import { ExecutionCancelledError } from "../../src/simulator/executor.js";
import { SubprocessExecutor } from "../../src/simulator/subprocess-executor.js";

const defaultOptions = {
  timeoutMilliseconds: 30_000,
  workingDirectory: process.cwd(),
};

test("executor captures successful process output", async () => {
  const events: string[] = [];
  const executor = new SubprocessExecutor("/usr/bin/printf", {
    ...defaultOptions,
    log: (event) => events.push(event.event),
  });

  assert.deepEqual(await executor.execute(["hello"]), {
    command: ["/usr/bin/printf", "hello"],
    exitCode: 0,
    standardError: "",
    standardOutput: "hello",
  });
  assert.deepEqual(events, ["started", "finished"]);
});

test("executor returns a nonzero CLI exit as a command result", async () => {
  const executor = new SubprocessExecutor("/usr/bin/false", defaultOptions);
  const result = await executor.execute([]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.signal, undefined);
  assert.equal(result.standardError, "");
  assert.equal(result.standardOutput, "");
});

test("executor rejects when the executable cannot be spawned", async () => {
  const executor = new SubprocessExecutor(
    "/definitely-not-present/playdate-simctl",
    defaultOptions,
  );

  await assert.rejects(executor.execute([]), { code: "ENOENT" });
});

test("executor propagates cancellation", async () => {
  const executor = new SubprocessExecutor("/bin/sleep", defaultOptions);
  const controller = new AbortController();
  const execution = executor.execute(["30"], controller.signal);

  controller.abort();

  await assert.rejects(execution, ExecutionCancelledError);
});

test("executor runs commands in the configured working directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "playdate-mcp-cwd-"));

  try {
    const workingDirectory = await realpath(directory);
    const executor = new SubprocessExecutor(process.execPath, {
      ...defaultOptions,
      workingDirectory,
    });
    const result = await executor.execute([
      "-e",
      "process.stdout.write(process.cwd())",
    ]);

    assert.equal(result.standardOutput, workingDirectory);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("executor returns output-limit failures as command results", async () => {
  const executor = new SubprocessExecutor(process.execPath, defaultOptions);
  const result = await executor.execute([
    "-e",
    'process.stdout.write("x".repeat(1_048_577))',
  ]);

  assert.equal(result.errorCode, "ERR_CHILD_PROCESS_STDIO_MAXBUFFER");
  assert.equal(result.exitCode, undefined);
  assert.equal(commandSucceeded(result), false);
  assert.equal(
    terminationDescription(result),
    "failed(ERR_CHILD_PROCESS_STDIO_MAXBUFFER)",
  );
  assert.ok(result.standardOutput.length > 0);
});

test("executor terminates commands that exceed the configured timeout", async () => {
  const executor = new SubprocessExecutor("/bin/sleep", {
    ...defaultOptions,
    timeoutMilliseconds: 10,
  });
  const result = await executor.execute(["30"]);

  assert.equal(result.timedOut, true);
  assert.equal(result.signal, "SIGTERM");
  assert.equal(commandSucceeded(result), false);
  assert.equal(terminationDescription(result), "timed_out(SIGTERM)");
});

for (const exitCode of [0, 7]) {
  test(`executor preserves timeout when SIGTERM is handled with exit ${exitCode}`, async () => {
    const executor = new SubprocessExecutor(process.execPath, {
      ...defaultOptions,
      timeoutMilliseconds: 1_000,
    });
    const result = await executor.execute([
      "-e",
      `process.on("SIGTERM", () => {
        process.exit(${exitCode});
      });
      process.stdout.write("ready");
      setInterval(() => {}, 1_000);`,
    ]);

    assert.equal(result.standardOutput, "ready");
    assert.equal(result.exitCode, exitCode);
    assert.equal(result.signal, undefined);
    assert.equal(result.timedOut, true);
    assert.equal(commandSucceeded(result), false);
    assert.equal(terminationDescription(result), "timed_out(unknown)");
  });
}
