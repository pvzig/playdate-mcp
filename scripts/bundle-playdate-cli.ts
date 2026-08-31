import { execFile as execFileCallback } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  access,
  constants,
  mkdir,
  mkdtemp,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export const playdateCLIRelease = {
  archiveDirectory: "playdate-simctl-0.1.0-macos-universal",
  asset: "playdate-simctl-0.1.0-macos-universal.tar.gz",
  repository: "pvzig/playdate-cli",
  sha256: "ba10497581bce9beedf7507961deafd5340bc65bfcbf146d3db128dd3f51f68d",
  version: "0.1.0",
} as const;

export function sha256(contents: Uint8Array): string {
  return createHash("sha256").update(contents).digest("hex");
}

export function verifyArchive(contents: Uint8Array): void {
  const actualDigest = sha256(contents);
  if (actualDigest !== playdateCLIRelease.sha256) {
    throw new Error(
      `playdate-simctl archive checksum mismatch: expected ${playdateCLIRelease.sha256}, received ${actualDigest}`,
    );
  }
}

export async function bundlePlaydateCLI(
  packageRoot: string = fileURLToPath(new URL("../..", import.meta.url)),
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("playdate-simctl release artifacts require macOS");
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "playdate-mcp-cli-"));
  const stagedDirectory = join(
    packageRoot,
    "vendor",
    `.playdate-cli-${randomUUID()}`,
  );
  try {
    const response = await fetchImplementation(releaseURL());
    if (!response.ok) {
      throw new Error(
        `could not download playdate-simctl ${playdateCLIRelease.version}: ${response.status} ${response.statusText}`,
      );
    }

    const archiveContents = new Uint8Array(await response.arrayBuffer());
    verifyArchive(archiveContents);

    const archivePath = join(temporaryDirectory, playdateCLIRelease.asset);
    await writeFile(archivePath, archiveContents);
    await execFile("/usr/bin/tar", [
      "-xzf",
      archivePath,
      "-C",
      temporaryDirectory,
    ]);

    const extractedDirectory = join(
      temporaryDirectory,
      playdateCLIRelease.archiveDirectory,
    );
    await validateArtifact(join(extractedDirectory, "playdate-simctl"));
    await validateArtifact(
      join(extractedDirectory, "libPlaydateSimulatorAgent.dylib"),
    );

    const vendorDirectory = join(packageRoot, "vendor");
    const destination = join(vendorDirectory, "playdate-cli");
    await mkdir(vendorDirectory, { recursive: true });
    await rename(extractedDirectory, stagedDirectory);
    await rm(destination, { force: true, recursive: true });
    await rename(stagedDirectory, destination);
  } finally {
    await rm(stagedDirectory, { force: true, recursive: true });
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function releaseURL(): string {
  const { asset, repository, version } = playdateCLIRelease;
  return `https://github.com/${repository}/releases/download/${version}/${asset}`;
}

async function validateArtifact(path: string): Promise<void> {
  const metadata = await stat(path);
  if (!metadata.isFile()) {
    throw new Error(`release artifact is not a file: ${path}`);
  }
  await access(path, constants.X_OK);
}

const entryPoint = process.argv[1];
if (
  entryPoint !== undefined &&
  import.meta.url === pathToFileURL(entryPoint).href
) {
  bundlePlaydateCLI()
    .then(() => {
      console.error(`Bundled playdate-simctl ${playdateCLIRelease.version}`);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
