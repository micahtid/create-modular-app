// This module centralizes every color, symbol, and small formatting helper the
// terminal user interface uses. Keeping the ANSI escape codes in one place means
// the rest of the code can read as plain English instead of raw escape sequences.

// Color output is disabled automatically when the output is not an interactive
// terminal, for example when the tool is piped into a file.
const colorEnabled = process.stdout.isTTY && !process.env.NO_COLOR;

// This helper wraps a string in an ANSI color code and then resets the color.
// When colors are disabled it simply returns the original string untouched.
function paint(open, close) {
  return (text) => (colorEnabled ? `${open}${text}${close}` : text);
}

export const color = {
  reset: "\x1b[0m",
  bold: paint("\x1b[1m", "\x1b[22m"),
  dim: paint("\x1b[2m", "\x1b[22m"),
  green: paint("\x1b[32m", "\x1b[39m"),
  cyan: paint("\x1b[36m", "\x1b[39m"),
  yellow: paint("\x1b[33m", "\x1b[39m"),
  red: paint("\x1b[31m", "\x1b[39m"),
  gray: paint("\x1b[90m", "\x1b[39m"),
  magenta: paint("\x1b[35m", "\x1b[39m"),
};

// These are the visual symbols shown next to prompts and options. They mirror
// the look described in the product requirements, for example the checkbox
// brackets and the pointer arrow.
export const symbol = {
  pointer: "❯", // a right facing arrow used to mark the highlighted row
  checked: "X",
  unchecked: " ",
  question: "?",
  success: "✔", // a check mark shown after a step is confirmed
  info: "ℹ", // an information mark shown next to help text
  bullet: "•",
};

// Small helpers used to draw the framed help panels and the header banner.
export function line(char = "─", width = 60) {
  return char.repeat(width);
}
