import {
  execFile as execFileCallback,
  type ExecFileException,
} from "node:child_process";
import { promisify } from "node:util";

import type { CommandResult } from "./command-result.js";
import { ExecutionCancelledError, type Executor } from "./executor.js";

const execFile = promisify(execFileCallback);
const outputLimit = 1_048_576;
const outputLimitErrorCode = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";

export interface SubprocessExecutorOptions {
  readonly log?: (event: SubprocessExecutionEvent) => void;
  readonly timeoutMilliseconds: number;
  readonly workingDirectory: string;
}

export interface SubprocessExecutionEvent {
  readonly command: readonly string[];
  readonly errorCode?: string;
  readonly event: "started" | "finished" | "cancelled" | "spawn_failed";
  readonly exitCode?: number;
  readonly message?: string;
  readonly signal?: NodeJS.Signals;
  readonly timedOut?: boolean;
  readonly timeoutMilliseconds: number;
  readonly workingDirectory: string;
}

export class SubprocessExecutor implements Executor {
  public constructor(
    private readonly executable: string,
    private readonly options: SubprocessExecutorOptions,
  ) {}

  public async execute(
    arguments_: readonly string[],
    signal?: AbortSignal,
  ): Promise<CommandResult> {
    const command = [this.executable, ...arguments_];
    this.log({ command, event: "started" });
    let timedOut = false;
    let timeout: NodeJS.Timeout | undefined;
    try {
      const execution = execFile(this.executable, [...arguments_], {
        cwd: this.options.workingDirectory,
        encoding: "utf8",
        killSignal: "SIGTERM",
        maxBuffer: outputLimit,
        shell: false,
        ...(signal === undefined ? {} : { signal }),
      });
      // Track the deadline even when the child handles SIGTERM and exits normally.
      timeout = setTimeout(() => {
        timedOut = true;
        // Match execFile's timeout behavior, including closing inherited pipes.
        execution.child.stdout?.destroy();
        execution.child.stderr?.destroy();
        execution.child.kill("SIGTERM");
      }, this.options.timeoutMilliseconds);
      const result = await execution;
      const commandResult: CommandResult = {
        command,
        exitCode: 0,
        standardError: result.stderr,
        standardOutput: result.stdout,
        ...(timedOut ? { timedOut: true } : {}),
      };
      this.logResult(commandResult);
      return commandResult;
    } catch (error: unknown) {
      const cancellation = ExecutionCancelledError.from(error);
      if (cancellation !== undefined) {
        this.log({ command, event: "cancelled" });
        throw cancellation;
      }

      const processError = error as ExecFileException;
      const exitCode =
        typeof processError.code === "number" ? processError.code : undefined;
      const errorCode =
        processError.code === outputLimitErrorCode
          ? outputLimitErrorCode
          : undefined;
      const terminationSignal = processError.signal ?? undefined;
      if (
        exitCode === undefined &&
        errorCode === undefined &&
        terminationSignal === undefined
      ) {
        this.log({
          command,
          event: "spawn_failed",
          message: errorMessage(error),
        });
        throw error;
      }

      const commandResult: CommandResult = {
        command,
        ...(errorCode === undefined ? {} : { errorCode }),
        ...(exitCode === undefined ? {} : { exitCode }),
        ...(terminationSignal === undefined
          ? {}
          : { signal: terminationSignal }),
        standardError: processError.stderr ?? "",
        standardOutput: processError.stdout ?? "",
        ...(timedOut ? { timedOut: true } : {}),
      };
      this.logResult(commandResult);
      return commandResult;
    } finally {
      clearTimeout(timeout);
    }
  }

  private logResult(result: CommandResult): void {
    this.log({
      command: result.command,
      event: "finished",
      ...(result.errorCode === undefined
        ? {}
        : { errorCode: result.errorCode }),
      ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
      ...(result.signal === undefined ? {} : { signal: result.signal }),
      ...(result.timedOut === undefined ? {} : { timedOut: result.timedOut }),
    });
  }

  private log(
    event: Omit<
      SubprocessExecutionEvent,
      "timeoutMilliseconds" | "workingDirectory"
    >,
  ): void {
    try {
      this.options.log?.({
        ...event,
        timeoutMilliseconds: this.options.timeoutMilliseconds,
        workingDirectory: this.options.workingDirectory,
      });
    } catch {
      // Logging must not change command execution behavior.
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
