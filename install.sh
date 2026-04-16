#!/bin/bash
# Install tumble-dry commands into Claude Code's discoverable paths.
# Run once after cloning. No other setup needed.

set -e

TD_HOME="$(cd "$(dirname "$0")" && pwd)"
mkdir -p ~/.claude/commands

ln -sf "$TD_HOME/commands/tumble-dry.md" ~/.claude/commands/tumble-dry.md

echo "Installed /tumble-dry command -> $TD_HOME/commands/tumble-dry.md"
echo "Usage: /tumble-dry <artifact>"
