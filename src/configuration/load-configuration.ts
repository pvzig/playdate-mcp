import type { RuntimeConfiguration } from "./runtime-configuration.js";
import { bundledCLIPaths, type BundledCLIPaths } from "./bundled-cli.js";

const defaultTimeoutMilliseconds = 300_000;
const maximumTimeoutMilliseconds = 2_147_483_647;

export function loadConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
  currentDirectory: string = process.cwd(),
  bundledCLI: BundledCLIPaths = bundledCLIPaths(),
): RuntimeConfiguration {
  const executablePath = nonempty(environment.PLAYDATE_SIMCTL_PATH);
  const agentPath = nonempty(environment.PLAYDATE_SIMCTL_AGENT_PATH);
  const simulatorAppPath = nonempty(environment.PLAYDATE_SIMULATOR_APP_PATH);
  const selectedAgentPath =
    agentPath ??
    (executablePath === undefined ? bundledCLI.agentPath : undefined);

  return {
    executable: executablePath ?? bundledCLI.executable,
    execution: {
      timeoutMilliseconds: timeoutMilliseconds(
        environment.PLAYDATE_SIMCTL_TIMEOUT_MS,
      ),
      workingDirectory:
        nonempty(environment.PLAYDATE_SIMCTL_WORKING_DIRECTORY) ??
        currentDirectory,
    },
    invocation: {
      ...(selectedAgentPath === undefined
        ? {}
        : { agentPath: selectedAgentPath }),
      ...(simulatorAppPath === undefined ? {} : { simulatorAppPath }),
    },
  };
}

function nonempty(value: string | undefined): string | undefined {
  return value === undefined || value.trim().length === 0 ? undefined : value;
}

function timeoutMilliseconds(value: string | undefined): number {
  const configuredValue = nonempty(value);
  if (configuredValue === undefined) {
    return defaultTimeoutMilliseconds;
  }

  const milliseconds = Number(configuredValue);
  if (
    Number.isInteger(milliseconds) &&
    milliseconds >= 1 &&
    milliseconds <= maximumTimeoutMilliseconds
  ) {
    return milliseconds;
  }

  throw new Error(
    `PLAYDATE_SIMCTL_TIMEOUT_MS must be an integer from 1 through ${maximumTimeoutMilliseconds}`,
  );
}
