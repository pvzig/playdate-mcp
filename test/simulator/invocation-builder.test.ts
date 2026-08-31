import assert from "node:assert/strict";
import test from "node:test";

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
} from "../../src/simulator/invocation-builder.js";

const noOverrides = {};

test("run maps build options after the product path", () => {
  assert.deepEqual(
    runInvocation(
      {
        product_path: "Build/Game.pdx",
        project_directory: "/projects/game",
        build_task: "release",
      },
      noOverrides,
    ),
    {
      arguments: [
        "run",
        "Build/Game.pdx",
        "--project-directory",
        "/projects/game",
        "--build-task",
        "release",
      ],
    },
  );
});

test("simulator options follow the complete leaf command", () => {
  assert.deepEqual(
    statusInvocation(
      { pid: 42 },
      {
        agentPath: "/agents/control.dylib",
        simulatorAppPath: "/Applications/Playdate Simulator.app",
      },
    ),
    {
      arguments: [
        "status",
        "--pid",
        "42",
        "--agent",
        "/agents/control.dylib",
        "--simulator-app",
        "/Applications/Playdate Simulator.app",
      ],
    },
  );

  assert.deepEqual(
    recordInvocation(
      { action: "stop", pid: 42 },
      {
        agentPath: "/agents/control.dylib",
        simulatorAppPath: "/Applications/Playdate Simulator.app",
      },
    ),
    {
      arguments: [
        "record",
        "stop",
        "--pid",
        "42",
        "--agent",
        "/agents/control.dylib",
        "--simulator-app",
        "/Applications/Playdate Simulator.app",
      ],
    },
  );
});

test("tools map to the playdate-simctl command surface", () => {
  const cases = [
    {
      actual: loadInvocation({ product_path: "Game.pdx" }, noOverrides),
      expected: ["load", "Game.pdx"],
    },
    {
      actual: pressInvocation({ button: "a", duration_ms: 250 }, noOverrides),
      expected: ["press", "a", "--duration-ms", "250"],
    },
    {
      actual: pressInvocation({ button: "lock" }, noOverrides),
      expected: ["press", "lock"],
    },
    {
      actual: buttonInvocation({ button: "left", state: "down" }, noOverrides),
      expected: ["button", "left", "down"],
    },
    {
      actual: crankInvocation({ degrees: 123.5 }, noOverrides),
      expected: ["crank", "123.5"],
    },
    {
      actual: crankInvocation({ docked: true }, noOverrides),
      expected: ["crank", "dock"],
    },
    {
      actual: crankInvocation({ docked: false }, noOverrides),
      expected: ["crank", "undock"],
    },
    {
      actual: accelerometerInvocation({ x: -1, y: 0.5, z: 1 }, noOverrides),
      expected: ["accelerometer", "-1", "0.5", "1"],
    },
    {
      actual: volumeInvocation({ action: "set", percent: 75 }, noOverrides),
      expected: ["volume", "set", "75"],
    },
    {
      actual: volumeInvocation({ action: "up" }, noOverrides),
      expected: ["volume", "up"],
    },
    {
      actual: volumeInvocation({ action: "down", percent: 5 }, noOverrides),
      expected: ["volume", "down", "--step", "5"],
    },
    {
      actual: pausedInvocation({ paused: true }, noOverrides),
      expected: ["pause"],
    },
    {
      actual: pausedInvocation({ paused: false }, noOverrides),
      expected: ["resume"],
    },
    {
      actual: restartInvocation({}, noOverrides),
      expected: ["restart"],
    },
    {
      actual: lockInvocation({}, noOverrides),
      expected: ["lock"],
    },
    {
      actual: recordInvocation(
        { action: "start", output_path: "/tmp/demo.gif" },
        noOverrides,
      ),
      expected: ["record", "start", "/tmp/demo.gif"],
    },
    {
      actual: recordInvocation({ action: "stop" }, noOverrides),
      expected: ["record", "stop"],
    },
    {
      actual: toolbarInvocation({ action: "console" }, noOverrides),
      expected: ["toolbar", "console"],
    },
    {
      actual: injectInvocation({}, noOverrides),
      expected: ["inject"],
    },
  ];

  for (const { actual, expected } of cases) {
    assert.deepEqual(actual, { arguments: expected });
  }
});

test("screenshot records the artifact path for MCP image content", () => {
  assert.deepEqual(
    screenshotInvocation({ output_path: "/tmp/frame.png" }, noOverrides),
    {
      arguments: ["screenshot", "/tmp/frame.png"],
      artifact: {
        mimeType: "image/png",
        path: "/tmp/frame.png",
      },
    },
  );
});
