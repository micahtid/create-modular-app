// This is the orchestrator for the whole wizard, it runs the sequential,
// dependency aware flow described in the product requirements, collects the
// environment values in the same order the features were accepted, generates the
// project, and prints clear next steps

import fs from "node:fs";
import path from "node:path";
import { selectOne } from "./ui/select.js";
import { confirmCheckbox } from "./ui/checkbox.js";
import { askText } from "./ui/textInput.js";
import { showCursor } from "./ui/keys.js";
import { color, symbol, line } from "./ui/theme.js";
import { platformHelp, featureHelp } from "./content/help.js";
import { buildEnvPlan } from "./content/envConfig.js";
import { generateProject } from "./generator.js";

export async function run() {
  banner();

  // The project name doubles as the output folder name
  const appName = await askProjectName();
  const targetDir = path.resolve(process.cwd(), appName);
  await ensureEmptyTarget(targetDir, appName);

  // Step 1: choose the target platform
  const platform = await selectOne({
    question: "Select Target Platform",
    help: platformHelp,
    options: [
      { label: "Web Application (Next.js, Tailwind)", value: "web" },
      { label: "Mobile Application (Expo, React Native)", value: "mobile" },
    ],
    initialIndex: 0,
  });

  // Step 2: sequential, dependency aware feature selection
  const modules = { convex: false, googleOAuth: false, payments: false };

  modules.convex = await confirmCheckbox({
    question: "Include Convex for Database and Backend?",
    label: "Convex",
    help: featureHelp.convex,
  });

  // Google OAuth and payments both depend on Convex, so they are only offered
  // when Convex was accepted
  if (modules.convex) {
    modules.googleOAuth = await confirmCheckbox({
      question: "Include Google OAuth via Convex Auth?",
      label: "Google OAuth",
      help: featureHelp.googleOAuth,
    });

    if (platform === "web") {
      modules.payments = await confirmCheckbox({
        question: "Include Stripe Integration for Payments?",
        label: "Stripe",
        help: featureHelp.stripe,
      });
    } else {
      modules.payments = await confirmCheckbox({
        question: "Include RevenueCat Integration for Subscriptions?",
        label: "RevenueCat",
        help: featureHelp.revenuecat,
      });
    }
  } else {
    // When Convex is skipped we tell the user why the remaining steps are gone
    console.log(
      color.dim(
        `  ${symbol.info}  Convex was skipped, so authentication and payments are not available.`
      )
    );
  }

  // Step 4: collect environment values in acceptance order, this happens before
  // generation so the values can be written straight into the project
  const envPlan = buildEnvPlan({ platform, ...modules });
  const envValues = await collectEnv(envPlan);

  // Step 3: generate the project files
  generationBanner();
  const { written } = generateProject({
    platform,
    appName,
    targetDir,
    modules,
    envPlan,
    envValues,
  });

  summary({ appName, platform, modules, written, envPlan, envValues });
}

// Prints the header banner shown when the tool starts
function banner() {
  console.log("");
  console.log(color.cyan(`  ${line("─", 52)}`));
  console.log(`  ${color.bold("Modular Boilerplate")}`);
  console.log(color.cyan(`  ${line("─", 52)}`));
  console.log("");
}

// Prints the banner shown just before files are written
function generationBanner() {
  console.log("");
  console.log(color.magenta(`  ${symbol.bullet} Generating Your Project...`));
  console.log("");
}

// Asks for the project name, the name is validated live inside the prompt, so an
// invalid entry is rejected in place and never leaves a rejected line behind
async function askProjectName() {
  return askText({
    question: "Project Name",
    help: "This becomes the output folder name and the package name.\nUse lower case letters, numbers, and dashes.",
    defaultValue: "my-app",
    validate: (value) =>
      /^[a-z0-9][a-z0-9-]*$/.test(value)
        ? undefined
        : "Use lower case letters, numbers, and dashes.",
  });
}

// Refuses to write into a folder that already has files, so nothing is
// overwritten by accident
async function ensureEmptyTarget(targetDir, appName) {
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.log(
      color.red(
        `  ${symbol.info}  The folder ${color.bold(appName)} already exists and is not empty.`
      )
    );
    console.log(color.dim("  Please rerun the tool with a different project name."));
    showCursor();
    process.exit(1);
  }
}

// Walks the environment plan in order, showing a help toggle for each prompt
// Every value is optional so the user can skip any credential and fill it in
// later, skipped values are recorded as blank
async function collectEnv(envPlan) {
  const values = {};
  if (envPlan.length === 0) return values;

  console.log("");
  console.log(color.bold("  Environment Configuration"));
  console.log(
    color.dim(
      `  Press ${color.cyan("Tab")} on any prompt for setup help. Press ${color.cyan("Enter")} to skip and fill it in later.`
    )
  );
  console.log("");

  for (const item of envPlan) {
    const value = await askText({
      question: item.question,
      help: item.help,
      optional: true,
    });
    values[item.key] = value;
  }
  return values;
}

// Prints the closing summary with the file count and the exact next steps
function summary({ appName, platform, modules, written, envPlan, envValues }) {
  console.log("");
  console.log(color.green(`  ${symbol.success} Created ${written.length} Files In ${color.bold(appName)}/`));
  console.log("");

  const selected = ["Convex", modules.googleOAuth && "Google OAuth", modules.payments && (platform === "web" ? "Stripe" : "RevenueCat")].filter(Boolean);
  const featureLine = modules.convex ? selected.join(", ") : "No Backend Modules";
  console.log(`  ${color.bold("Platform")}  ${platform === "web" ? "Web (Next.js, Tailwind)" : "Mobile (Expo, React Native)"}`);
  console.log(`  ${color.bold("Modules ")}  ${featureLine}`);
  console.log("");

  // If any secrets were left blank, remind the user where to fill them
  const blanks = envPlan.filter((item) => !envValues[item.key]);
  if (blanks.length > 0) {
    console.log(color.yellow(`  ${symbol.info}  You skipped ${blanks.length} value(s). Fill them into .env.local or scripts/set-convex-env before running.`));
    console.log("");
  }

  console.log(color.bold("  Next Steps"));
  console.log(color.dim(`     cd ${appName}`));
  console.log(color.dim("     npm install"));
  if (modules.convex) console.log(color.dim("     npx convex dev"));
  if (modules.googleOAuth || modules.payments) {
    console.log(color.dim("     bash scripts/set-convex-env.sh   # or the .ps1 on Windows"));
  }
  console.log(color.dim(platform === "web" ? "     npm run dev" : "     npm run ios"));
  console.log("");
}
