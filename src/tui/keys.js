// This module turns raw keyboard bytes coming from standard input into simple,
// named key events such as "up", "down", "enter", or "space". Building this
// ourselves, instead of using a prompt library, is what lets us implement the
// two stage double enter confirmation described in the product requirements.

import readline from "node:readline";

// This function reads exactly one key press and resolves with a small object
// describing it. It puts the terminal into raw mode so that individual key
// presses arrive immediately, without waiting for the user to press Enter.
export function readKey() {
  return new Promise((resolve) => {
    const stdin = process.stdin;

    // Raw mode delivers each key press one at a time instead of a whole line.
    if (stdin.isTTY) stdin.setRawMode(true);
    readline.emitKeypressEvents(stdin);
    stdin.resume();

    const onKeypress = (str, key) => {
      stdin.removeListener("keypress", onKeypress);
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.pause();
      resolve(normalize(str, key));
    };

    stdin.on("keypress", onKeypress);
  });
}

// This helper maps the low level key description from Node into the friendly
// names the rest of the interface checks against.
function normalize(str, key = {}) {
  // A press of Control and C should always exit the program cleanly.
  if (key.ctrl && key.name === "c") return { name: "abort" };

  switch (key.name) {
    case "up":
    case "k":
      return { name: "up" };
    case "down":
    case "j":
      return { name: "down" };
    case "return":
    case "enter":
      return { name: "enter" };
    case "space":
      return { name: "space" };
    case "escape":
      return { name: "escape" };
    default:
      // For everything else we pass the raw character through so callers such
      // as the help toggle can react to a specific letter like "h".
      return { name: "char", value: str || "" };
  }
}

// A convenience used across the interface. When the user presses Control and C
// we print a friendly message and leave, restoring the cursor first.
export function abort() {
  process.stdout.write("\n" + "Cancelled. No files were written." + "\n");
  showCursor();
  process.exit(130); // 130 is the conventional exit code for a Control C exit.
}

// The cursor is hidden while interactive prompts are drawn so the screen does
// not flicker, and shown again whenever we hand control back to the user.
export function hideCursor() {
  process.stdout.write("\x1b[?25l");
}

export function showCursor() {
  process.stdout.write("\x1b[?25h");
}
