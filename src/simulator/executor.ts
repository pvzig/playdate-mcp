import type { CommandResult } from "./command-result.js";

export class ExecutionCancelledError extends Error {
  public constructor(cause: Error) {
    super(cause.message, { cause });
    this.name = "AbortError";
  }

  public static from(error: unknown): ExecutionCancelledError | undefined {
    if (error instanceof ExecutionCancelledError) {
      return error;
    }
    return error instanceof Error && error.name === "AbortError"
      ? new ExecutionCancelledError(error)
      : undefined;
  }
}

export interface Executor {
  /** Throws `ExecutionCancelledError` when the supplied signal cancels execution. */
  execute(
    arguments_: readonly string[],
    signal?: AbortSignal,
  ): Promise<CommandResult>;
}
