import assert from "node:assert/strict";
import test from "node:test";

import {
  playdateCLIRelease,
  sha256,
  verifyArchive,
} from "../../scripts/bundle-playdate-cli.js";

test("release input is pinned to playdate-cli 0.1.0", () => {
  assert.equal(playdateCLIRelease.repository, "pvzig/playdate-cli");
  assert.equal(playdateCLIRelease.version, "0.1.0");
  assert.match(playdateCLIRelease.asset, /0\.1\.0-macos-universal\.tar\.gz$/);
  assert.match(playdateCLIRelease.sha256, /^[a-f\d]{64}$/);
});

test("archive verification rejects contents that do not match the pin", () => {
  const contents = new TextEncoder().encode("not the release archive");
  assert.equal(
    sha256(contents),
    "9852cd977d5906897c526a914095372fd5a550901723e101004aae5c832eec3c",
  );
  assert.throws(() => verifyArchive(contents), /checksum mismatch/);
});
