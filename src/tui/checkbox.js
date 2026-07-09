// This module implements the single option checkbox prompt used for the
// sequential, dependency aware feature selections such as Convex, Google OAuth,
// Stripe, and RevenueCat.
//
// It honors the double enter model from the product requirements:
//   Space toggles the option between checked and unchecked.
//   The first Enter locks in the current state and shows a confirmation hint.
//   The second Enter confirms and advances to the next prompt.
// Toggling with Space after the first Enter cancels the pending confirmation,
// so the user can never advance by accident with a state they did not mean.

import { readKey, abort, hideCursor, showCursor } from "./keys.js";
import { Renderer } from "./screen.js";
import { color, symbol } from "./theme.js";
import { helpPanel } from "./helpPanel.js";

// question is the prompt text. label is the single checkbox item label.
// help is the contextual guidance shown when the help panel is toggled open.
export async function confirmCheckbox({ question, label, help = "", initialChecked = false }) {
  const renderer = new Renderer();
  let checked = initialChecked;
  let confirmed = false; // becomes true after the first Enter locks the state
  let showHelp = false;

  hideCursor();

  const draw = () => {
    const lines = [];
    lines.push(`${color.green(symbol.question)} ${color.bold(question)}`);

    const pointer = color.cyan(symbol.pointer);
    const box = checked
      ? color.green(`[${symbol.checked}]`)
      : color.gray(`[${symbol.unchecked}]`);
    const shownLabel = checked ? color.bold(label) : label;
    lines.push(`  ${pointer} ${box} ${shownLabel}`);

    lines.push("");
    lines.push(footerHint(confirmed, checked));

    if (showHelp && help) {
      lines.push(helpPanel(help, "Help"));
    }

    renderer.render(lines.join("\n") + "\n");
  };

  draw();

  while (true) {
    const key = await readKey();

    if (key.name === "abort") {
      renderer.clear();
      abort();
    }

    if (key.name === "space") {
      // Space freely toggles the checkbox and cancels any pending confirmation.
      checked = !checked;
      confirmed = false;
    } else if (key.name === "enter") {
      if (!confirmed) {
        // First Enter locks in the current checked or unchecked state.
        confirmed = true;
      } else {
        // Second Enter confirms and returns the final boolean.
        finish(renderer, question, checked);
        showCursor();
        return checked;
      }
    } else if (isHelpKey(key)) {
      showHelp = !showHelp;
    }

    draw();
  }
}

// The footer wording adapts to both the current state and the confirmation
// stage so the two Enter presses are always clearly explained.
function footerHint(confirmed, checked) {
  const stage = confirmed
    ? `${color.cyan("Enter")} To Confirm`
    : `${color.cyan("Enter")} To Select`;
  const state = checked ? color.green("Included") : color.gray("Skipped");
  return color.dim(
    `  ${symbol.bullet} ${color.cyan("Space")} To Toggle (${state})  ${symbol.bullet} ${stage}  ${symbol.bullet} ${color.cyan("h")} For Help  ${symbol.bullet} ${color.cyan("Ctrl+C")} To Quit`
  );
}

// The completed line uses a blank marker so only the active prompt carries a
// question mark, and a blank line follows to separate this completed section.
function finish(renderer, question, checked) {
  renderer.clear();
  const answer = checked ? color.green("Included") : color.gray("Skipped");
  process.stdout.write(
    `  ${color.bold(question)} ${answer}\n\n`
  );
  renderer.done();
}

function isHelpKey(key) {
  return key.name === "char" && (key.value === "h" || key.value === "?");
}
