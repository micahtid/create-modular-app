// This module implements the single choice list prompt used for picking the
// target platform. It follows the double enter model from the product
// requirements. The first Enter locks in the highlighted choice and shows a
// confirmation hint. The second Enter confirms it and advances the flow.

import { readKey, abort, hideCursor, showCursor } from "./keys.js";
import { Renderer } from "./screen.js";
import { color, symbol, line } from "./theme.js";

// options is an array of objects shaped like { label, value }.
// help is an optional string shown when the user toggles the help panel.
export async function selectOne({ question, options, help = "", initialIndex = 0 }) {
  const renderer = new Renderer();
  let cursor = initialIndex; // which row is highlighted and therefore selected
  let confirmed = false; // becomes true after the first Enter locks the choice
  let showHelp = false; // whether the contextual help panel is expanded

  hideCursor();

  const draw = () => {
    const lines = [];
    lines.push(`${color.green(symbol.question)} ${color.bold(question)}`);

    // Render each option row. The highlighted row shows a pointer and a filled
    // checkbox because for a single choice the selection follows the cursor.
    options.forEach((option, index) => {
      const active = index === cursor;
      const pointer = active ? color.cyan(symbol.pointer) : " ";
      const box = active
        ? color.green(`[${symbol.checked}]`)
        : color.gray(`[${symbol.unchecked}]`);
      const label = active ? color.bold(option.label) : option.label;
      lines.push(`  ${pointer} ${box} ${label}`);
    });

    lines.push("");
    lines.push(footerHint(confirmed));

    if (showHelp && help) {
      lines.push(helpPanel(help));
    }

    renderer.render(lines.join("\n") + "\n");
  };

  draw();

  // The main input loop. It keeps reading keys until the choice is confirmed.
  while (true) {
    const key = await readKey();

    if (key.name === "abort") {
      renderer.clear();
      abort();
    }

    if (key.name === "up") {
      cursor = (cursor - 1 + options.length) % options.length;
      confirmed = false; // moving the selection cancels a pending confirmation
    } else if (key.name === "down") {
      cursor = (cursor + 1) % options.length;
      confirmed = false;
    } else if (key.name === "enter") {
      if (!confirmed) {
        // First Enter locks in the currently highlighted choice.
        confirmed = true;
      } else {
        // Second Enter confirms the choice and ends the prompt.
        finish(renderer, question, options[cursor].label);
        showCursor();
        return options[cursor].value;
      }
    } else if (isHelpKey(key)) {
      showHelp = !showHelp;
    }

    draw();
  }
}

// The footer changes wording depending on whether the choice is locked yet, so
// the user always knows which of the two Enter presses they are on.
function footerHint(confirmed) {
  const keys = confirmed
    ? `${color.cyan("Enter")} to confirm`
    : `${color.cyan("Enter")} to select`;
  return color.dim(
    `  ${symbol.bullet} Use ${color.cyan("↑ ↓")} to move  ${symbol.bullet} ${keys}  ${symbol.bullet} ${color.cyan("h")} for help  ${symbol.bullet} ${color.cyan("Ctrl+C")} to quit`
  );
}

// A framed panel that presents the deeper setup guidance for the current step.
function helpPanel(help) {
  const top = color.gray(`  ┌ ${symbol.info} Help ${line("─", 48)}`);
  const body = help
    .split("\n")
    .map((row) => color.gray("  │ ") + row)
    .join("\n");
  const bottom = color.gray(`  └${line("─", 55)}`);
  return `${top}\n${body}\n${bottom}`;
}

// Once confirmed we redraw a compact single line summary of the answer so the
// finished transcript reads like a clean checklist.
function finish(renderer, question, label) {
  renderer.clear();
  process.stdout.write(
    `${color.green(symbol.success)} ${color.bold(question)} ${color.cyan(label)}\n`
  );
  renderer.done();
}

function isHelpKey(key) {
  return key.name === "char" && (key.value === "h" || key.value === "?");
}
