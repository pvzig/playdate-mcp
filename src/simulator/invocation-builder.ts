import { resolve } from "node:path";

import type { InvocationConfiguration } from "../configuration/runtime-configuration.js";
import type {
  AccelerometerInput,
  ButtonInput,
  CrankInput,
  LoadInput,
  PausedInput,
  PressInput,
  RecordInput,
  RunInput,
  ScreenshotInput,
  StatusInput,
  ToolbarInput,
  VolumeInput,
} from "../tools/schemas.js";
import type { ToolInvocation } from "./tool-invocation.js";

export function runInvocation(
  input: RunInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  const command = ["run", input.product_path];
  if (input.project_directory !== undefined) {
    command.push("--project-directory", input.project_directory);
  }
  if (input.build_task !== undefined) {
    command.push("--build-task", input.build_task);
  }
  return invocation(input, configuration, command);
}

export function statusInvocation(
  input: StatusInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, ["status"]);
}

export function loadInvocation(
  input: LoadInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, ["load", input.product_path]);
}

export function pressInvocation(
  input: PressInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  const command = ["press", input.button];
  if (input.duration_ms !== undefined) {
    command.push("--duration-ms", String(input.duration_ms));
  }
  return invocation(input, configuration, command);
}

export function buttonInvocation(
  input: ButtonInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, [
    "button",
    input.button,
    input.state,
  ]);
}

export function crankInvocation(
  input: CrankInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  const value =
    input.degrees === undefined
      ? input.docked
        ? "dock"
        : "undock"
      : String(input.degrees);
  return invocation(input, configuration, ["crank", value]);
}

export function accelerometerInvocation(
  input: AccelerometerInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, [
    "accelerometer",
    String(input.x),
    String(input.y),
    String(input.z),
  ]);
}

export function volumeInvocation(
  input: VolumeInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  if (input.action === "set") {
    return invocation(input, configuration, [
      "volume",
      "set",
      String(input.percent),
    ]);
  }
  const command = ["volume", input.action];
  if (input.percent !== undefined) {
    command.push("--step", String(input.percent));
  }
  return invocation(input, configuration, command);
}

export function pausedInvocation(
  input: PausedInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, [input.paused ? "pause" : "resume"]);
}

export function restartInvocation(
  input: StatusInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, ["restart"]);
}

export function lockInvocation(
  input: StatusInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, ["lock"]);
}

export function screenshotInvocation(
  input: ScreenshotInput,
  configuration: InvocationConfiguration,
  workingDirectory: string,
): ToolInvocation {
  return {
    ...invocation(input, configuration, ["screenshot", input.output_path]),
    artifact: {
      mimeType: "image/png",
      path: resolve(workingDirectory, input.output_path),
    },
  };
}

export function recordInvocation(
  input: RecordInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(
    input,
    configuration,
    input.action === "start"
      ? ["record", "start", input.output_path]
      : ["record", "stop"],
  );
}

export function toolbarInvocation(
  input: ToolbarInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, ["toolbar", input.action]);
}

export function injectInvocation(
  input: StatusInput,
  configuration: InvocationConfiguration,
): ToolInvocation {
  return invocation(input, configuration, ["inject"]);
}

function invocation(
  input: StatusInput,
  configuration: InvocationConfiguration,
  command: readonly string[],
): ToolInvocation {
  return {
    arguments: [
      ...command,
      ...simulatorOptionArguments(input.pid, configuration),
    ],
  };
}

function simulatorOptionArguments(
  processIdentifier: number | undefined,
  configuration: InvocationConfiguration,
): readonly string[] {
  const arguments_: string[] = [];
  if (processIdentifier !== undefined) {
    arguments_.push("--pid", String(processIdentifier));
  }
  if (configuration.agentPath !== undefined) {
    arguments_.push("--agent", configuration.agentPath);
  }
  if (configuration.simulatorAppPath !== undefined) {
    arguments_.push("--simulator-app", configuration.simulatorAppPath);
  }
  return arguments_;
}
