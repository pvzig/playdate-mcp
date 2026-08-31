import { z } from "zod";

const pid = z
  .number()
  .int()
  .min(1)
  .max(2_147_483_647)
  .optional()
  .describe(
    "Positive Playdate Simulator process identifier when more than one is running.",
  );

const pdxPath = z
  .string()
  .min(1)
  .regex(/\.[pP][dD][xX]$/)
  .describe("Path using the .pdx extension.");

const pngPath = z
  .string()
  .min(1)
  .regex(/\.[pP][nN][gG]$/)
  .describe("New output path using the .png extension.");

const gifPath = z
  .string()
  .min(1)
  .regex(/\.[gG][iI][fF]$/)
  .describe("New output path using the .gif extension.");

const button = z.enum(["left", "right", "up", "down", "b", "a", "menu"]);

export const runInputSchema = z
  .object({
    pid,
    product_path: pdxPath.describe(
      "PDX path, resolved relative to project_directory.",
    ),
    project_directory: z
      .string()
      .min(1)
      .optional()
      .describe("Project directory. Defaults to the CLI working directory."),
    build_task: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Terminating mise task that produces the PDX. Defaults to build.",
      ),
  })
  .strict();

export const statusInputSchema = z.object({ pid }).strict();

export const loadInputSchema = z
  .object({
    pid,
    product_path: pdxPath.describe(
      "Path to an existing .pdx directory bundle.",
    ),
  })
  .strict();

const buttonPressInputSchema = z
  .object({
    pid,
    button,
    duration_ms: z
      .number()
      .int()
      .min(1)
      .max(10_000)
      .optional()
      .describe("Press duration. Defaults to 100 milliseconds."),
  })
  .strict();

const lockPressInputSchema = z
  .object({
    pid,
    button: z.literal("lock"),
    duration_ms: z.never().optional(),
  })
  .strict();

export const pressInputSchema = z.union([
  buttonPressInputSchema,
  lockPressInputSchema,
]);

export const buttonInputSchema = z
  .object({
    pid,
    button,
    state: z.enum(["down", "up"]),
  })
  .strict();

const crankDegreesInputSchema = z
  .object({
    pid,
    degrees: z.number().finite().min(0).max(360),
    docked: z.never().optional(),
  })
  .strict();

const crankDockedInputSchema = z
  .object({
    pid,
    degrees: z.never().optional(),
    docked: z.boolean(),
  })
  .strict();

export const crankInputSchema = z.union([
  crankDegreesInputSchema,
  crankDockedInputSchema,
]);

export const accelerometerInputSchema = z
  .object({
    pid,
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
  })
  .strict();

const volumeSetInputSchema = z
  .object({
    pid,
    action: z.literal("set"),
    percent: z.number().int().min(0).max(100),
  })
  .strict();

const volumeAdjustInputSchema = z
  .object({
    pid,
    action: z.enum(["up", "down"]),
    percent: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const volumeInputSchema = z.union([
  volumeSetInputSchema,
  volumeAdjustInputSchema,
]);

export const pausedInputSchema = z
  .object({
    pid,
    paused: z.boolean().describe("True to pause; false to resume."),
  })
  .strict();

export const restartInputSchema = statusInputSchema;
export const lockInputSchema = statusInputSchema;

export const screenshotInputSchema = z
  .object({
    pid,
    output_path: pngPath,
  })
  .strict();

const recordStartInputSchema = z
  .object({
    pid,
    action: z.literal("start"),
    output_path: gifPath,
  })
  .strict();

const recordStopInputSchema = z
  .object({
    pid,
    action: z.literal("stop"),
    output_path: z.never().optional(),
  })
  .strict();

export const recordInputSchema = z.union([
  recordStartInputSchema,
  recordStopInputSchema,
]);

export const toolbarInputSchema = z
  .object({
    pid,
    action: z.enum([
      "pause",
      "restart",
      "console",
      "sampler",
      "lua-memory",
      "gif",
      "device",
      "controls",
    ]),
  })
  .strict();

export const injectInputSchema = statusInputSchema;

export type RunInput = z.infer<typeof runInputSchema>;
export type StatusInput = z.infer<typeof statusInputSchema>;
export type LoadInput = z.infer<typeof loadInputSchema>;
export type PressInput = z.infer<typeof pressInputSchema>;
export type ButtonInput = z.infer<typeof buttonInputSchema>;
export type CrankInput = z.infer<typeof crankInputSchema>;
export type AccelerometerInput = z.infer<typeof accelerometerInputSchema>;
export type VolumeInput = z.infer<typeof volumeInputSchema>;
export type PausedInput = z.infer<typeof pausedInputSchema>;
export type ScreenshotInput = z.infer<typeof screenshotInputSchema>;
export type RecordInput = z.infer<typeof recordInputSchema>;
export type ToolbarInput = z.infer<typeof toolbarInputSchema>;
