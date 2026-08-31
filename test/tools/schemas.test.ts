import assert from "node:assert/strict";
import test from "node:test";

import {
  accelerometerInputSchema,
  buttonInputSchema,
  crankInputSchema,
  loadInputSchema,
  pressInputSchema,
  recordInputSchema,
  runInputSchema,
  screenshotInputSchema,
  statusInputSchema,
  toolbarInputSchema,
  volumeInputSchema,
} from "../../src/tools/schemas.js";

interface Schema {
  safeParse(input: unknown): { readonly success: boolean };
}

test("schemas accept representative valid inputs", () => {
  const cases: readonly [Schema, unknown][] = [
    [runInputSchema, { product_path: "Build/Game.PDX" }],
    [statusInputSchema, { pid: 1 }],
    [loadInputSchema, { product_path: "/tmp/Game.pdx" }],
    [pressInputSchema, { button: "a", duration_ms: 10_000 }],
    [buttonInputSchema, { button: "menu", state: "up" }],
    [crankInputSchema, { degrees: 360 }],
    [crankInputSchema, { docked: false }],
    [accelerometerInputSchema, { x: -1, y: 0, z: 1 }],
    [volumeInputSchema, { action: "set", percent: 0 }],
    [volumeInputSchema, { action: "up" }],
    [screenshotInputSchema, { output_path: "frame.PNG" }],
    [recordInputSchema, { action: "start", output_path: "capture.GIF" }],
    [recordInputSchema, { action: "stop" }],
    [toolbarInputSchema, { action: "lua-memory" }],
  ];

  for (const [schema, input] of cases) {
    assert.equal(schema.safeParse(input).success, true);
  }
});

test("schemas reject invalid and ambiguous inputs", () => {
  const cases: readonly [Schema, unknown][] = [
    [statusInputSchema, { pid: 0 }],
    [statusInputSchema, { pid: 1, extra: true }],
    [runInputSchema, { product_path: "Build/Game.zip" }],
    [pressInputSchema, { button: "lock", duration_ms: 100 }],
    [pressInputSchema, { button: "a", duration_ms: 10_001 }],
    [buttonInputSchema, { button: "lock", state: "down" }],
    [crankInputSchema, { degrees: -1 }],
    [crankInputSchema, { degrees: 90, docked: true }],
    [crankInputSchema, {}],
    [accelerometerInputSchema, { x: Number.POSITIVE_INFINITY, y: 0, z: 0 }],
    [volumeInputSchema, { action: "set" }],
    [volumeInputSchema, { action: "set", percent: 101 }],
    [volumeInputSchema, { action: "up", percent: 0 }],
    [screenshotInputSchema, { output_path: "frame.gif" }],
    [recordInputSchema, { action: "start", output_path: "capture.png" }],
    [recordInputSchema, { action: "stop", output_path: "capture.gif" }],
    [toolbarInputSchema, { action: "unknown" }],
  ];

  for (const [schema, input] of cases) {
    assert.equal(schema.safeParse(input).success, false);
  }
});
