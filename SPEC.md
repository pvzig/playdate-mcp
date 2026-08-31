# playdate-mcp specification

## Purpose

Expose `playdate-simctl` as typed MCP tools. The server is a stateless stdio
adapter: it validates each request and starts one CLI subprocess. Simulator,
game, input, and recording state remain in Playdate Simulator and its injected
agent.

## Contract

- Use the official MCP TypeScript SDK over stdio.
- Publish the server as a public npm package and use pinned `npx` invocation as
  the primary client setup. Include canonical repository, homepage, and issue
  tracker metadata. Keep mise at the development boundary.
- Publish matching GitHub Releases through npm trusted publishing on a
  GitHub-hosted macOS runner. Require the release tag to match the package
  version and use OIDC provenance without a long-lived npm token.
- Package the universal `playdate-simctl` and agent from the pinned
  `playdate-cli` 0.1.0 GitHub release. Verify the archive SHA-256 before
  packaging.
- Validate tool inputs with strict Zod schemas whose emitted JSON Schema
  preserves the same constraints.
- Start `playdate-simctl` directly with `execFile`; never invoke a shell.
- Keep agent and Simulator application overrides at the server boundary, not in
  model-controlled tool inputs.
- Accept an optional positive `pid` on every tool. CLI selection options follow
  the complete leaf command.
- Do not serialize requests or retain per-Simulator state. Callers sequence
  mutations when order matters.
- Allow `playdate_status` to inject the agent when necessary.
- Treat `playdate_run` as potentially destructive and open-world because it
  executes a caller-selected mise task.
- Use `playdate_record`, not the GIF toolbar action, for non-interactive
  recording.

### Configuration

| Variable                            | Behavior                                             |
| ----------------------------------- | ---------------------------------------------------- |
| `PLAYDATE_SIMCTL_PATH`              | Override the bundled CLI                             |
| `PLAYDATE_SIMCTL_WORKING_DIRECTORY` | Subprocess directory; defaults to the server's `cwd` |
| `PLAYDATE_SIMCTL_TIMEOUT_MS`        | Positive timeout; defaults to 300,000 milliseconds   |
| `PLAYDATE_SIMCTL_AGENT_PATH`        | CLI `--agent` override                               |
| `PLAYDATE_SIMULATOR_APP_PATH`       | CLI `--simulator-app` override                       |

Each subprocess uses the configured working directory, a `SIGTERM` timeout,
MCP cancellation, and a 1 MiB output limit. Lifecycle events are JSON on
standard error; standard output is reserved for MCP messages.

### Results

CLI outcomes return the command, termination, standard output, standard error,
and success state as structured content. Output-limit and timeout failures stay
structured; spawn failures are MCP tool errors.

A successful screenshot also returns `image/png` content. An unreadable
artifact makes the tool result unsuccessful even when the CLI exits normally.

## Tools

| Tool                          | CLI mapping                                                      |
| ----------------------------- | ---------------------------------------------------------------- |
| `playdate_run`                | `run <product.pdx> [--project-directory ...] [--build-task ...]` |
| `playdate_status`             | `status`                                                         |
| `playdate_load`               | `load <product.pdx>`                                             |
| `playdate_press`              | `press <button> [--duration-ms ...]`                             |
| `playdate_set_button`         | `button <button> <down\|up>`                                     |
| `playdate_set_crank`          | `crank <degrees\|dock\|undock>`                                  |
| `playdate_set_accelerometer`  | `accelerometer <x> <y> <z>`                                      |
| `playdate_set_volume`         | `volume <up\|down> [--step ...]` or `volume set ...`             |
| `playdate_set_paused`         | `pause` or `resume`                                              |
| `playdate_restart`            | `restart`                                                        |
| `playdate_toggle_lock`        | `lock`                                                           |
| `playdate_capture_screenshot` | `screenshot <output.png>`                                        |
| `playdate_record`             | `record start <output.gif>` or `record stop`                     |
| `playdate_toolbar`            | `toolbar <action>`                                               |
| `playdate_inject`             | `inject`                                                         |

## Structure

- `src/main.ts` and `src/application.ts` own transport, lifecycle, and
  composition.
- `.github/workflows/publish.yml` validates and publishes GitHub Releases.
- `scripts` acquires and verifies the pinned native release for packaging.
- `src/configuration` reads process-boundary settings.
- `src/tools` defines schemas, metadata, registration, and MCP presentation.
- `src/simulator` builds CLI invocations and executes them behind `Executor`.

Keep invocation building pure and subprocess execution injected so core routing
and result behavior remain unit-testable without Simulator.

## Validation

For implementation changes:

1. Update this specification when the contract changes.
2. Run `mise run format` and `mise run check`.
3. Run `npm publish --dry-run` and inspect the tarball, including native file
   modes.
4. Verify stdio initialization and the 15-tool catalog.
5. Validate generated arguments against the real CLI when grammar changes.
6. Run live Simulator checks for integration changes.
7. Run `git diff --check`.

The current 2026-08-30 baseline passed the strict build and 32 tests, stdio MCP
initialization and catalog checks, real-CLI parsing, structured 1 MiB overflow
handling, and `git diff --check`. The published `playdate-mcp@0.1.0` package
contains only runtime files and executable universal CLI artifacts. A clean
registry install completed MCP initialization and listed all 15 tools. Live
validation passed status, pause, resume, and a 400 by 240 grayscale PNG
screenshot through the full bundled MCP-to-Simulator path.
