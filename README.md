# Modular Boilerplate TUI CLI

A terminal wizard that generates a production ready Web or Mobile app. It asks a
few dependency aware questions, collects your credentials, and writes a clean
project that stitches together only the modules you chose. Every project also
ships with a universal baseline so it is polished and safe from the first run.

## Install the global command

Install once and the `create-modular-app` command works from any terminal.

Run these from this folder:

```bash
npm install
npm link
```

That links the CLI globally. Confirm it worked:

```bash
create-modular-app --help
```

To remove the global link later, run `npm unlink -g create-modular-app`.

## Run it

Move into the folder where you want the new project to live, then run the
command. The wizard asks for a project name and creates a new subfolder with
that name, so run it in the parent location, not inside a folder you made first.

```bash
cd ~/projects
create-modular-app
```

You end up with `~/projects/<your-app-name>`. If you skip the global link, you
can also run `node bin/cli.js` from this folder.

## What you can generate

| Layer | Web target | Mobile target |
| --- | --- | --- |
| Framework | Next.js App Router, TailwindCSS | Expo, React Native, NativeWind |
| Typography | Google Sans stack, fluid type | Google Sans stack, responsive type |
| Backend | Convex | Convex |
| Auth | Google OAuth via Convex Auth | Google OAuth via Convex Auth |
| Payments | Stripe via the Convex Stripe component | RevenueCat |

Google OAuth and payments both depend on Convex, so they are only offered once
Convex is accepted. Skip Convex and the wizard goes straight to generation.

## What ships in every project

These features are always included, no matter which modules you pick. They are
built to be universal and easy to adapt to whatever you build next.

- **Global error boundaries.** Root and route level crash protection with a
  `reportError` hook that is ready for Sentry or any reporting SDK.
- **Skeleton loaders.** Animated placeholders for smooth Convex data transitions.
- **Light and dark theme.** System preference detection wired into TailwindCSS
  and NativeWind, with no toggle to manage.
- **Responsive typography.** Font sizes scale with the screen so a layout stays
  looking filled on a small phone and a wide monitor alike.
- **Event tracking utility.** A central `track()` wrapper that logs to the
  console today and drops into PostHog or Mixpanel later.
- **Splash and app icon bootstrapping.** Placeholder assets and config so the
  app has visual polish on first launch.
- **Security and SEO.** Standard Next.js security headers, a starter Content
  Security Policy, and structured metadata for discovery.
- **Environment infrastructure.** Auto generated env template files and a typed
  accessor with safe fallbacks from day one.
- **Core UI libraries.** Lucide icons, a toast system, and a Zustand store,
  pre wired and ready to use.
- **Secure backend by default.** Payments, webhooks, and private API calls run
  through Convex actions and server routes, so secrets never reach the client
  bundle.

## How the wizard works

Every selection uses a two stage, double enter confirmation so nothing is chosen
by accident.

- On the platform list, arrow keys move. The first `Enter` locks the highlighted
  choice and a second `Enter` confirms it.
- On each feature checkbox, `Space` toggles the option. The first `Enter` locks
  the current state and a second `Enter` confirms and advances.
- Press `h` on a selection prompt, or `Tab` on an environment prompt, to expand
  contextual help with links to the official documentation.

After the files are written, the wizard asks for the credentials for each
accepted module, in the order the modules were accepted. Type a value or press
`Enter` to skip it and fill it in later. Public values are written to
`.env.local`, and server side secrets are written into a `scripts/set-convex-env`
helper that pushes them into your Convex deployment, where they belong.

## Requirements

- Node.js 18 or newer.

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
  helpPanel.js          The framed contextual help panel
src/content/            Help text, documentation links, and the env plan
src/templates/          The Web and Mobile file tree builders
```

## Notes on Google Sans

Google Sans is a proprietary font and cannot be bundled. Both targets use it as
the primary font with a clean system font fallback, so the app runs immediately.
When your project is licensed for Google Sans, drop the font files into the
documented folder and they are picked up automatically.
