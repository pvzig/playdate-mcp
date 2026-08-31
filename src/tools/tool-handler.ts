import { readFile } from "node:fs/promises";

import type { CallToolResult } from "@modelcontextprotocol/server";

import {
  commandSucceeded,
  structuredResult,
  terminationDescription,
  type CommandResult,
} from "../simulator/command-result.js";
import {
  ExecutionCancelledError,
  type Executor,
} from "../simulator/executor.js";
import type { ToolInvocation } from "../simulator/tool-invocation.js";

export async function handleToolInvocation(
  executor: Executor,
  invocation: ToolInvocation,
  signal?: AbortSignal,
): Promise<CallToolResult> {
  try {
    const result = await executor.execute(invocation.arguments, signal);
    const succeeded = commandSucceeded(result);
    const content: CallToolResult["content"] = [
      { type: "text", text: summary(result) },
    ];

    if (succeeded && invocation.artifact !== undefined) {
      try {
        const data = await readFile(
          invocation.artifact.path,
          signal === undefined ? undefined : { signal },
        );
        content.push({
          type: "image",
          data: data.toString("base64"),
          mimeType: invocation.artifact.mimeType,
        });
      } catch (error: unknown) {
        const cancellation = ExecutionCancelledError.from(error);
        if (cancellation !== undefined) {
          throw cancellation;
        }
        content.push({
          type: "text",
          text: `The CLI succeeded, but its output artifact could not be read: ${errorMessage(error)}`,
        });
        return {
          content,
          structuredContent: structuredResult(result, false),
          isError: true,
        };
      }
    }

    return {
      content,
      structuredContent: structuredResult(result, succeeded),
      isError: !succeeded,
    };
  } catch (error: unknown) {
    if (error instanceof ExecutionCancelledError) {
      throw error;
    }
    return {
      content: [
        {
          type: "text",
          text: `Could not execute playdate-simctl: ${errorMessage(error)}`,
        },
      ],
      isError: true,
    };
  }
}

function summary(result: CommandResult): string {
  const standardOutput = result.standardOutput.trim();
  const standardError = result.standardError.trim();
  if (commandSucceeded(result)) {
    if (standardOutput.length > 0 && standardError.length > 0) {
      return `${standardOutput}\n${standardError}`;
    }
    if (standardOutput.length > 0) {
      return standardOutput;
    }
    return standardError.length > 0
      ? standardError
      : "Playdate command completed successfully.";
  }
  if (result.errorCode !== undefined) {
    return `playdate-simctl ${terminationDescription(result)}.`;
  }
  if (standardError.length > 0) {
    return standardError;
  }
  if (standardOutput.length > 0) {
    return standardOutput;
  }
  return `playdate-simctl ${terminationDescription(result)} without output.`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
