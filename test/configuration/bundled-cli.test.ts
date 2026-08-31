import assert from "node:assert/strict";
import test from "node:test";

import { bundledCLIPaths } from "../../src/configuration/bundled-cli.js";

test("bundled CLI paths resolve from the installed package root", () => {
  assert.deepEqual(
    bundledCLIPaths("file:///package/dist/src/configuration/bundled-cli.js"),
    {
      agentPath: "/package/vendor/playdate-cli/libPlaydateSimulatorAgent.dylib",
      executable: "/package/vendor/playdate-cli/playdate-simctl",
    },
  );
});
