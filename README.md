# playdate-mcp

`playdate-mcp` exposes the macOS Playdate Simulator as typed MCP tools by
delegating every request to a fresh `playdate-simctl` process.

The normal agent workflow is one `playdate_run` call to build, launch, inject,
and load a PDX, followed by input, state, and capture calls. Screenshot results
include the PNG as MCP image content. Use `playdate_record` rather than the GIF
toolbar action for end-to-end non-interactive recording.

## Requirements

- macOS 15 or later
- Node.js 24 LTS
- [Playdate SDK for macOS](https://play.date/dev/), which includes Playdate
  Simulator

The package includes universal `arm64` and `x86_64` builds of
`playdate-simctl` and its injected agent from the pinned
[playdate-cli 0.1.0 release](https://github.com/pvzig/playdate-cli/releases/tag/0.1.0).

## Configure an MCP client

Run the published package with `npx`:

```json
{
  "mcpServers": {
    "playdate": {
      "command": "npx",
      "args": ["-y", "playdate-mcp@0.1.0"],
      "env": {
        "PLAYDATE_SIMCTL_WORKING_DIRECTORY": "/absolute/path/to/game"
      }
    }
  }
}
```

The working directory setting makes relative PDX and artifact paths resolve
from the game project. These environment variables configure the subprocess
boundary when the server starts:

| Variable                            | Purpose                                              |
| ----------------------------------- | ---------------------------------------------------- |
| `PLAYDATE_SIMCTL_WORKING_DIRECTORY` | Working directory for relative paths                 |
| `PLAYDATE_SIMCTL_TIMEOUT_MS`        | Positive timeout in milliseconds; defaults to 300000 |
| `PLAYDATE_SIMCTL_PATH`              | Override the bundled `playdate-simctl`               |
| `PLAYDATE_SIMCTL_AGENT_PATH`        | Value passed to `--agent`                            |
| `PLAYDATE_SIMULATOR_APP_PATH`       | Value passed to `--simulator-app`                    |

Setting only `PLAYDATE_SIMCTL_PATH` lets that CLI resolve its adjacent agent.
Set both CLI variables to select an explicit pair.

Every tool also accepts an optional positive `pid` when more than one Simulator
is running. Calls that mutate the same Simulator should be issued in order; the
stateless server intentionally does not maintain a per-Simulator queue.

## Development

```sh
mise install
npm ci
mise run check
npm run bundle:cli
```

The executable JavaScript entry point is `dist/src/main.js`.
`bundle:cli` downloads the pinned release archive and verifies its SHA-256.
`npm pack` runs this step automatically.

See [SPEC.md](SPEC.md) for the complete tool contract and safety semantics.
