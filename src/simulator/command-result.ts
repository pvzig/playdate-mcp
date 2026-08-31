import { z } from "zod";

export interface CommandResult {
  readonly command: readonly string[];
  readonly errorCode?: string;
  readonly exitCode?: number;
  readonly signal?: NodeJS.Signals;
  readonly standardError: string;
  readonly standardOutput: string;
  readonly timedOut?: boolean;
}

export const commandResultSchema = z
  .object({
    command: z.array(z.string()),
    errorCode: z.string().optional(),
    exitCode: z.number().int().optional(),
    signal: z.string().optional(),
    stderr: z.string(),
    stdout: z.string(),
    succeeded: z.boolean(),
    termination: z.string(),
    timedOut: z.boolean().optional(),
  })
  .strict();

export type StructuredCommandResult = z.infer<typeof commandResultSchema>;

export function commandSucceeded(result: CommandResult): boolean {
  return (
    result.exitCode === 0 &&
    result.errorCode === undefined &&
    result.signal === undefined &&
    result.timedOut !== true
  );
}

export function terminationDescription(result: CommandResult): string {
  if (result.errorCode !== undefined) {
    return `failed(${result.errorCode})`;
  }
  if (result.timedOut === true) {
    return `timed_out(${result.signal ?? "unknown"})`;
  }
  if (result.exitCode !== undefined) {
    return `exited(${result.exitCode})`;
  }
  if (result.signal !== undefined) {
    return `signaled(${result.signal})`;
  }
  return "unknown";
}

export function structuredResult(
  result: CommandResult,
  succeeded: boolean,
): StructuredCommandResult {
  return {
    command: [...result.command],
    ...(result.errorCode === undefined ? {} : { errorCode: result.errorCode }),
    ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
    ...(result.signal === undefined ? {} : { signal: result.signal }),
    stderr: result.standardError,
    stdout: result.standardOutput,
    succeeded,
    termination: terminationDescription(result),
    ...(result.timedOut === undefined ? {} : { timedOut: result.timedOut }),
  };
}
