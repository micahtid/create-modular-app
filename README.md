# create-modular-app

A command line tool that generates a ready to run Next.js web app or Expo mobile
app. Answer a few questions and it writes a clean project with only the parts you
pick.

## Install

Run once from this folder to set up the global command:

```bash
npm install
npm link
```

Now `create-modular-app` works in any terminal.

## Use It

Go to the folder where you want the project to live, then run:

```bash
create-modular-app
```

It asks for a name and creates a new folder with that name, so run it from the
parent folder, not inside a folder you made first.

## What It Generates

| | Web | Mobile |
| --- | --- | --- |
| Framework | Next.js, TailwindCSS | Expo, React Native, NativeWind |
| Backend | Convex | Convex |
| Auth | Google sign in | Google sign in |
| Payments | Stripe | RevenueCat |

Auth and payments need Convex, so they only appear once you add Convex.

## How Choices Work

Move with the arrow keys and toggle with space. Press Enter once to lock a choice
and again to confirm. Press h or Tab on a prompt to open help.

## Requirements

Node.js 18 or newer.
