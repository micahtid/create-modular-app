// This module provides a tiny renderer that draws a block of text and then
// redraws it in place on every key press. It remembers how many lines it last
// printed so it can move the cursor up and clear them before drawing again.
// This is what makes the checkboxes and pointers update smoothly without the
// screen scrolling on every key stroke.

export class Renderer {
  constructor() {
    this.lastLineCount = 0;
  }

  // Draw the given text, first erasing whatever was drawn on the previous call.
  render(text) {
    this.clear();
    process.stdout.write(text);
    // We count the lines we just wrote so the next clear knows how far to go.
    this.lastLineCount = text.split("\n").length;
  }

  // Move the cursor back up over the previously drawn block and erase each line.
  clear() {
    for (let i = 0; i < this.lastLineCount; i++) {
      // Move up one line, unless we are already on the first drawn line.
      if (i > 0) process.stdout.write("\x1b[1A");
      // Erase the entire current line.
      process.stdout.write("\x1b[2K");
      // Return the cursor to the start of the line.
      process.stdout.write("\x1b[0G");
    }
    this.lastLineCount = 0;
  }

  // Called once a prompt is finished so following output starts on a fresh line.
  done() {
    this.lastLineCount = 0;
  }
}
