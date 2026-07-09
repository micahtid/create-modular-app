// This module implements the sequential text input prompt used in the
// environment configuration step. Each prompt asks for one credential, keeps a
// contextual help toggle, and supports an optional default value.
//
// The help panel is toggled with the Tab key. Tab is used because it never
// appears inside a real environment value, so it can never be confused with the
// characters the user is typing.

import readline from "node:readline";
import { abort, hideCursor, showCursor } from "./keys.js";
import { Renderer } from "./screen.js";
import { color, symbol, line } from "./theme.js";

// question is the label shown before the input.
// help is the deep configuration guidance for this credential.
// defaultValue is used when the user submits an empty line.
// optional allows an empty answer to be accepted as an intentional skip.
export async function askText({ question, help = "", defaultValue = "", optional = false }) {
  return new Promise((resolve) => {
    const renderer = new Renderer();
    const stdin = process.stdin;
    let buffer = "";
    let showHelp = false;

    hideCursor();
    if (stdin.isTTY) stdin.setRawMode(true);
    readline.emitKeypressEvents(stdin);
    stdin.resume();

    const draw = () => {
      const lines = [];
      const hint = defaultValue
        ? color.dim(` (default: ${defaultValue})`)
        : optional
          ? color.dim(" (optional, press Enter to skip)")
          : "";
      lines.push(`${color.green(symbol.question)} ${color.bold(question)}${hint}`);
      // The typed value is shown live with a block cursor at the end.
      lines.push(`  ${color.cyan(symbol.pointer)} ${buffer}${color.gray("▌")}`);
      lines.push("");
      lines.push(
        color.dim(
          `  ${symbol.bullet} Type the value  ${symbol.bullet} ${color.cyan("Enter")} to save  ${symbol.bullet} ${color.cyan("Tab")} for help  ${symbol.bullet} ${color.cyan("Ctrl+C")} to quit`
        )
      );
      if (showHelp && help) lines.push(helpPanel(help));
      renderer.render(lines.join("\n") + "\n");
    };

    const cleanup = () => {
      stdin.removeListener("keypress", onKeypress);
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.pause();
    };

    const onKeypress = (str, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        renderer.clear();
        abort();
        return;
      }

      if (key.name === "tab") {
        showHelp = !showHelp;
      } else if (key.name === "return" || key.name === "enter") {
        const value = buffer.trim() || defaultValue;
        if (!value && !optional) {
          // A required field cannot be left blank, so we keep prompting.
          draw();
          return;
        }
        cleanup();
        finish(renderer, question, value, optional);
        showCursor();
        resolve(value);
        return;
      } else if (key.name === "backspace") {
        buffer = buffer.slice(0, -1);
      } else if (str && !key.ctrl && !key.meta && str >= " ") {
        // Append any ordinary printable character to the buffer.
        buffer += str;
      }

      draw();
    };

    stdin.on("keypress", onKeypress);
    draw();
  });
}

function helpPanel(help) {
  const top = color.gray(`  ┌ ${symbol.info} Setup help ${line("─", 42)}`);
  const body = help
    .split("\n")
    .map((row) => color.gray("  │ ") + row)
    .join("\n");
  const bottom = color.gray(`  └${line("─", 55)}`);
  return `${top}\n${body}\n${bottom}`;
}

function finish(renderer, question, value, optional) {
  renderer.clear();
  const shown = value
    ? color.cyan(maskIfSecret(question, value))
    : color.gray("skipped");
  process.stdout.write(
    `${color.green(symbol.success)} ${color.bold(question)} ${shown}\n`
  );
  renderer.done();
}

// Secrets are partially masked in the finished transcript so the terminal
// scrollback does not hold a full plain text copy of sensitive keys.
function maskIfSecret(question, value) {
  const lower = question.toLowerCase();
  const sensitive = lower.includes("secret") || lower.includes("key");
  if (!sensitive || value.length <= 4) return value;
  return value.slice(0, 4) + "…".repeat(Math.min(6, value.length - 4));
}
