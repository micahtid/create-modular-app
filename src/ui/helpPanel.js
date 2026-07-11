// Renders the contextual help as a fully closed box that sits clearly apart from
// the prompt above it, a blank line is added at the top for extra margin, the
// information symbol is followed by a clear space, and every side of the box is
// drawn so it reads as a complete, enclosed panel

import { color, symbol } from "./theme.js";

export function helpPanel(help, title = "Help") {
  const indent = "  ";
  // The header keeps two spaces after the information symbol so the emoji never
  // looks like it is touching the title
  const header = `${symbol.info}  ${title}`;
  const rows = help.split("\n");

  // The inner width is the widest line, so every row and border lines up and the
  // box always closes cleanly no matter how long the help text is
  const inner = Math.max(header.length + 2, ...rows.map((row) => row.length));
  const dash = (count) => "─".repeat(Math.max(0, count));

  const top = indent + color.gray(`┌─ ${header} ${dash(inner - header.length - 1)}┐`);
  const body = rows
    .map(
      (row) =>
        indent +
        color.gray("│ ") +
        row +
        " ".repeat(inner - row.length) +
        color.gray(" │")
    )
    .join("\n");
  const bottom = indent + color.gray(`└${dash(inner + 2)}┘`);

  // The leading blank line is the extra top margin above the box
  return `\n${top}\n${body}\n${bottom}`;
}
