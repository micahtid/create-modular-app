#!/usr/bin/env node

// This is the command line entry point. It simply starts the wizard and makes
// sure the terminal cursor is restored if anything goes wrong along the way.

import { run } from "../src/index.js";
import { showCursor } from "../src/tui/keys.js";

run().catch((error) => {
  showCursor();
  console.error("\n" + "Something went wrong:" + "\n" + (error?.stack ?? error));
  process.exit(1);
});
