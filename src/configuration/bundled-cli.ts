import { fileURLToPath } from "node:url";

export interface BundledCLIPaths {
  readonly agentPath: string;
  readonly executable: string;
}

export function bundledCLIPaths(
  moduleURL: string = import.meta.url,
): BundledCLIPaths {
  const bundleURL = new URL("../../../vendor/playdate-cli/", moduleURL);
  return {
    agentPath: fileURLToPath(
      new URL("libPlaydateSimulatorAgent.dylib", bundleURL),
    ),
    executable: fileURLToPath(new URL("playdate-simctl", bundleURL)),
  };
}
