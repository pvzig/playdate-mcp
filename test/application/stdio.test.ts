import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("../../src/main.js", import.meta.url));
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=";

for (const absolute of [false, true]) {
  test(`stdio screenshots resolve ${absolute ? "absolute" : "relative"} paths with a separate CLI directory`, async () => {
    await withServer(
      `require("node:fs").writeFileSync(process.argv[3], Buffer.from(${JSON.stringify(png)}, "base64"));`,
      async (fixture) => {
        const screenshotPath = join(fixture.workingDirectory, "frame.png");
        const response = await fixture.request(2, "tools/call", {
          name: "playdate_capture_screenshot",
          arguments: { output_path: absolute ? screenshotPath : "frame.png" },
        });

        assert.equal((await readFile(screenshotPath)).toString("base64"), png);
        assert.equal(response.result?.isError, false);
        assert.equal(response.result?.structuredContent?.succeeded, true);
        assert.deepEqual(response.result?.content?.[1], {
          type: "image",
          data: png,
          mimeType: "image/png",
        });
      },
    );
  });
}

for (const reason of ["stdin_end", "SIGINT", "SIGTERM"] as const) {
  test(`stdio ${reason} cancels an active CLI command`, async () => {
    await withServer("setInterval(() => {}, 1_000);", async (fixture) => {
      fixture.server.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "playdate_status", arguments: {} },
        })}\n`,
      );
      await fixture.started;

      if (reason === "stdin_end") {
        fixture.server.stdin.end();
      } else {
        fixture.server.kill(reason);
      }
      const [code, signal] = await fixture.exited;

      assert.equal(code, 0, fixture.standardError());
      assert.equal(signal, null, fixture.standardError());
      assert.match(fixture.standardError(), /"event":"cancelled"/);
      assert.match(fixture.standardError(), /"event":"shutdown_completed"/);
      assert.match(fixture.standardError(), new RegExp(`"reason":"${reason}"`));
      assert.doesNotMatch(fixture.standardError(), /"event":"finished"/);
    });
  });
}

async function withServer(
  cliSource: string,
  operation: (fixture: ServerFixture) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "playdate-mcp-stdio-"));
  const workingDirectory = join(directory, "game");
  const serverDirectory = join(directory, "server");
  const cliPath = join(directory, "cli.cjs");
  await mkdir(workingDirectory);
  await mkdir(serverDirectory);
  await writeFile(cliPath, `#!${process.execPath}\n${cliSource}\n`);
  await chmod(cliPath, 0o755);

  const server = spawn(process.execPath, [serverPath], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      PLAYDATE_SIMCTL_PATH: cliPath,
      PLAYDATE_SIMCTL_AGENT_PATH: "",
      PLAYDATE_SIMULATOR_APP_PATH: "",
      PLAYDATE_SIMCTL_TIMEOUT_MS: "30000",
      PLAYDATE_SIMCTL_WORKING_DIRECTORY: workingDirectory,
    },
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 5_000,
  });
  const exited = once(server, "close");
  let standardError = "";
  const started = new Promise<void>((resolve) => {
    server.stderr.on("data", (chunk: Buffer) => {
      standardError += chunk.toString();
      if (standardError.includes('"event":"started"')) {
        resolve();
      }
    });
  });
  const lines = createInterface({ input: server.stdout });
  const responses = lines[Symbol.asyncIterator]();
  const request = async (
    id: number,
    method: string,
    params: Record<string, unknown>,
  ): Promise<ProtocolResponse> => {
    server.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
    );
    const line = await responses.next();
    assert.equal(line.done, false, standardError);
    const response = JSON.parse(line.value as string) as ProtocolResponse;
    assert.equal(response.id, id);
    assert.equal(response.error, undefined);
    return response;
  };

  try {
    await request(1, "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "playdate-mcp-tests", version: "1.0" },
    });
    server.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      })}\n`,
    );
    await operation({
      server,
      exited,
      started,
      request,
      workingDirectory,
      standardError: () => standardError,
    });
  } finally {
    server.kill("SIGTERM");
    await exited;
    lines.close();
    await rm(directory, { recursive: true, force: true });
  }
}

interface ServerFixture {
  readonly server: ChildProcessWithoutNullStreams;
  readonly exited: Promise<unknown[]>;
  readonly started: Promise<void>;
  readonly workingDirectory: string;
  readonly standardError: () => string;
  readonly request: (
    id: number,
    method: string,
    params: Record<string, unknown>,
  ) => Promise<ProtocolResponse>;
}

interface ProtocolResponse {
  readonly id?: number;
  readonly error?: unknown;
  readonly result?: {
    readonly isError?: boolean;
    readonly content?: readonly unknown[];
    readonly structuredContent?: { readonly succeeded?: boolean };
  };
}
