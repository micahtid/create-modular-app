# Modular Boilerplate TUI CLI

A terminal user interface that generates production ready boilerplate for either
a Web or a Mobile application. It walks you through a short, dependency aware
flow and then writes a clean, unified project that stitches together only the
modules you chose.

## What it can generate

| Layer | Web target | Mobile target |
| --- | --- | --- |
| Framework | Next.js App Router, TailwindCSS | Expo, React Native |
| Typography | Google Sans font stack | Async Google Sans loading with expo-font |
| Backend | Convex | Convex |
| Auth | Google OAuth via Convex Auth | Google OAuth via Convex Auth |
| Payments | Stripe (Convex Stripe component) | RevenueCat |

Google OAuth and payments both depend on Convex, so they are only offered once
Convex has been accepted. If you skip Convex the wizard goes straight to
generation.

## Requirements

- Node.js 18 or newer.

## Usage

From this folder:

```bash
node bin/cli.js
```

Or, after linking it globally:

```bash
npm link
create-modular-app
```

## How the interaction works

Every selection uses a two stage, double enter confirmation so nothing is chosen
by accident:

- On the platform list, use the arrow keys to move. The first `Enter` locks in
  the highlighted choice, and a second `Enter` confirms it.
- On each feature checkbox, `Space` toggles the option on or off. The first
  `Enter` locks in the current state, and a second `Enter` confirms and advances.
- Press `h` on a selection prompt, or `Tab` on an environment prompt, to expand
  contextual help that links to the official documentation for that step.

After the files are written, the wizard asks for the credentials for each
accepted module, in the same order the modules were accepted. You can type a
value or press `Enter` to skip it and fill it in later. Public values are written
to `.env.local`, and server side secrets are written into a
`scripts/set-convex-env` helper that pushes them into your Convex deployment,
where they belong.

## Project layout

```
bin/cli.js              Command line entry point
src/index.js            The wizard orchestrator and flow
src/generator.js        Writes the chosen file tree and env files to disk
src/tui/                The terminal interface primitives
  theme.js              Colors, symbols, and small formatting helpers
  keys.js               Raw keyboard input as named key events
  screen.js             In place redraw of a prompt block
  select.js             Single choice list with double enter
  checkbox.js           Single option checkbox with double enter
  textInput.js          Text input with a help toggle
src/content/            Help text, documentation links, and the env plan
src/templates/          The Web and Mobile file tree builders
```

## Notes on Google Sans

Google Sans is a proprietary font and cannot be bundled. Both targets are set up
to use it as the primary font with a clean system font fallback, so the app runs
immediately. When your project is licensed for Google Sans, drop the font files
into the documented folder and they are picked up automatically.
