// This module takes the selections and collected credentials and turns them into
// real files on disk. It builds the project file tree from the template modules,
// writes every file, and then writes the environment files and helper scripts.

import fs from "node:fs";
import path from "node:path";
import { buildWebProject } from "./templates/web.js";
import { buildMobileProject } from "./templates/mobile.js";

// config is the full result of the wizard:
// { platform, appName, targetDir, modules: { convex, googleOAuth, payments },
//   envPlan, envValues }
export function generateProject(config) {
  const { platform, targetDir, modules } = config;

  const options = {
    appName: config.appName,
    convex: modules.convex,
    googleOAuth: modules.googleOAuth,
    payments: modules.payments,
  };

  // Pick the right template builder for the chosen platform.
  const files =
    platform === "web" ? buildWebProject(options) : buildMobileProject(options);

  // Add the environment files and the Convex secret helper scripts.
  Object.assign(files, buildEnvFiles(config));

  // Write every file, creating parent folders as needed.
  const written = [];
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(targetDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
    written.push(relativePath);
  }

  return { written: written.sort() };
}

// Builds the environment related files. Client values go into .env.local so the
// app can read them. Server side secrets go into helper scripts that push them
// into the Convex deployment environment, because those secrets must never live
// in the client bundle.
function buildEnvFiles(config) {
  const files = {};
  const { envPlan, envValues } = config;

  const clientEntries = envPlan.filter((item) => item.target === "client");
  const convexEntries = envPlan.filter((item) => item.target === "convex");

  // The local env file holds only the public, client readable values.
  if (clientEntries.length > 0) {
    const lines = [
      "# Public values read by the app at build time.",
      "# This file is safe to keep locally but should not be committed.",
      "",
    ];
    for (const item of clientEntries) {
      lines.push(`${item.key}=${envValues[item.key] ?? ""}`);
    }
    files[".env.local"] = lines.join("\n") + "\n";
  }

  // An example file documents every variable without real values, so a new
  // teammate knows what to fill in.
  const exampleLines = ["# Copy this file to .env.local and fill in real values.", ""];
  for (const item of envPlan) {
    const where = item.target === "convex" ? " (set in the Convex deployment)" : "";
    exampleLines.push(`# ${item.question}${where}`);
    exampleLines.push(`${item.key}=${item.placeholder ?? ""}`);
    exampleLines.push("");
  }
  files[".env.example"] = exampleLines.join("\n") + "\n";

  // The helper scripts push the server side secrets into Convex with one command.
  if (convexEntries.length > 0) {
    files["scripts/set-convex-env.sh"] = convexEnvShellScript(convexEntries, envValues);
    files["scripts/set-convex-env.ps1"] = convexEnvPowershellScript(convexEntries, envValues);
  }

  return files;
}

function convexEnvShellScript(entries, values) {
  const lines = [
    "#!/usr/bin/env bash",
    "# Pushes the server side secrets into your Convex deployment.",
    "# These values belong in the Convex environment, never in the client bundle.",
    "set -e",
    "",
  ];
  for (const item of entries) {
    const value = values[item.key] ?? "";
    lines.push(`npx convex env set ${item.key} "${value}"`);
  }
  lines.push("");
  lines.push('echo "Convex environment variables set."');
  return lines.join("\n") + "\n";
}

function convexEnvPowershellScript(entries, values) {
  const lines = [
    "# Pushes the server side secrets into your Convex deployment.",
    "# These values belong in the Convex environment, never in the client bundle.",
    "",
  ];
  for (const item of entries) {
    const value = values[item.key] ?? "";
    lines.push(`npx convex env set ${item.key} "${value}"`);
  }
  lines.push("");
  lines.push('Write-Host "Convex environment variables set."');
  return lines.join("\n") + "\n";
}
