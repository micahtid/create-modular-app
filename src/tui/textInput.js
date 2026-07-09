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
import { color, symbol } from "./theme.js";
import { helpPanel } from "./helpPanel.js";

// question is the label shown before the input.
// help is the deep configuration guidance for this credential.
// defaultValue is used when the user submits an empty line.
// optional allows an empty answer to be accepted as an intentional skip.
// validate is an optional function that receives the value and returns an error
// message when the value is not acceptable, or nothing when it is fine. The
// error is shown live under the field and the value is never committed until it
// passes, so rejected attempts never clutter the finished transcript.
export async function askText({ question, help = "", defaultValue = "", optional = false, validate = null }) {
  return new Promise((resolve) => {
    const renderer = new Renderer();
    const stdin = process.stdin;
    let buffer = "";
    let showHelp = false;
    let error = "";

    hideCursor();
    if (stdin.isTTY) stdin.setRawMode(true);
    readline.emitKeypressEvents(stdin);
    stdin.resume();

    const draw = () => {
      const lines = [];
      const hint = defaultValue
        ? color.dim(` (Default: ${defaultValue})`)
        : optional
          ? color.dim(" (Optional, Press Enter To Skip)")
          : "";
      lines.push(`${color.green(symbol.question)} ${color.bold(question)}${hint}`);
      // The typed value is shown live with a block cursor at the end.
      lines.push(`  ${color.cyan(symbol.pointer)} ${buffer}${color.gray("▌")}`);
      // Any validation error sits directly under the field and clears itself as
      // soon as the user edits the value.
      if (error) lines.push(color.yellow(`  ! ${error}`));
      lines.push("");
      lines.push(
        color.dim(
          `  ${symbol.bullet} Type The Value  ${symbol.bullet} ${color.cyan("Enter")} To Save  ${symbol.bullet} ${color.cyan("Tab")} For Help  ${symbol.bullet} ${color.cyan("Ctrl+C")} To Quit`
        )
      );
      if (showHelp && help) lines.push(helpPanel(help, "Setup Help"));
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
          // A required field cannot be left blank, so we show that inline and
          // keep the prompt open.
          error = "This value is required.";
          draw();
          return;
        }
        if (validate) {
          const message = validate(value);
          if (message) {
            // The value did not pass, so show why and keep the prompt open
            // instead of committing a rejected line.
            error = message;
            draw();
            return;
          }
        }
        cleanup();
        finish(renderer, question, value, optional);
        showCursor();
        resolve(value);
        return;
      } else if (key.name === "backspace") {
        buffer = buffer.slice(0, -1);
        error = ""; // editing clears the previous error
      } else if (str && !key.ctrl && !key.meta && str >= " ") {
        // Append any ordinary printable character to the buffer.
        buffer += str;
        error = ""; // editing clears the previous error
      }

      draw();
    };

    stdin.on("keypress", onKeypress);
    draw();
  });
}

// The completed line uses a blank marker so only the active prompt carries a
// question mark, and a blank line follows to separate this completed section.
function finish(renderer, question, value, optional) {
  renderer.clear();
  const shown = value
    ? color.cyan(maskIfSecret(question, value))
    : color.gray("Skipped");
  process.stdout.write(
    `  ${color.bold(question)} ${shown}\n\n`
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
