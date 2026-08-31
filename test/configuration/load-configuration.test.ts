import assert from "node:assert/strict";
import test from "node:test";

import { loadConfiguration } from "../../src/configuration/load-configuration.js";

const bundledCLI = {
  agentPath: "/package/vendor/playdate-cli/libPlaydateSimulatorAgent.dylib",
  executable: "/package/vendor/playdate-cli/playdate-simctl",
} as const;

test("configuration defaults to the bundled CLI and agent", () => {
  assert.deepEqual(loadConfiguration({}, "/server", bundledCLI), {
    executable: bundledCLI.executable,
    execution: {
      timeoutMilliseconds: 300_000,
      workingDirectory: "/server",
    },
    invocation: { agentPath: bundledCLI.agentPath },
  });
});

test("a CLI override lets that CLI resolve its adjacent agent", () => {
  assert.deepEqual(
    loadConfiguration(
      { PLAYDATE_SIMCTL_PATH: "/tools/playdate-simctl" },
      "/server",
      bundledCLI,
    ),
    {
      executable: "/tools/playdate-simctl",
      execution: {
        timeoutMilliseconds: 300_000,
        workingDirectory: "/server",
      },
      invocation: {},
    },
  );
});

test("configuration captures nonempty process-boundary overrides", () => {
  assert.deepEqual(
    loadConfiguration(
      {
        PLAYDATE_SIMCTL_AGENT_PATH: "/agents/playdate-agent.dylib",
        PLAYDATE_SIMCTL_PATH: "/tools/playdate-simctl",
        PLAYDATE_SIMCTL_TIMEOUT_MS: "120000",
        PLAYDATE_SIMCTL_WORKING_DIRECTORY: "/projects/game",
        PLAYDATE_SIMULATOR_APP_PATH: "/Applications/Playdate Simulator.app",
      },
      "/server",
      bundledCLI,
    ),
    {
      executable: "/tools/playdate-simctl",
      execution: {
        timeoutMilliseconds: 120_000,
        workingDirectory: "/projects/game",
      },
      invocation: {
        agentPath: "/agents/playdate-agent.dylib",
        simulatorAppPath: "/Applications/Playdate Simulator.app",
      },
    },
  );
});

test("configuration ignores empty overrides", () => {
  assert.deepEqual(
    loadConfiguration(
      {
        PLAYDATE_SIMCTL_AGENT_PATH: "",
        PLAYDATE_SIMCTL_PATH: "   ",
        PLAYDATE_SIMCTL_TIMEOUT_MS: "",
        PLAYDATE_SIMCTL_WORKING_DIRECTORY: "\t",
        PLAYDATE_SIMULATOR_APP_PATH: "",
      },
      "/server",
      bundledCLI,
    ),
    {
      executable: bundledCLI.executable,
      execution: {
        timeoutMilliseconds: 300_000,
        workingDirectory: "/server",
      },
      invocation: { agentPath: bundledCLI.agentPath },
    },
  );
});

test("configuration rejects invalid subprocess timeouts", () => {
  for (const timeout of ["0", "1.5", "invalid", "2147483648"]) {
    assert.throws(
      () =>
        loadConfiguration(
          { PLAYDATE_SIMCTL_TIMEOUT_MS: timeout },
          "/server",
          bundledCLI,
        ),
      /PLAYDATE_SIMCTL_TIMEOUT_MS must be an integer/,
    );
  }
});
