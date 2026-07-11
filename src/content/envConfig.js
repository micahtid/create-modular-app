// This module describes the environment configuration prompts for each feature
// module, the wizard walks these in order, matching the exact order the user
// accepted the features, and uses the "target" field to decide where each value
// belongs once collected
//
// A target of "client" means the value is a public value written to the local
// env file that the app bundle reads, a target of "convex" means the value is a
// server side secret that belongs in the Convex deployment environment and is
// never shipped to the client, the generator writes a helper script for those

import { envHelp } from "./help.js";

// Returns the ordered list of environment prompts for the given selections
// platform is "web" or "mobile", the remaining flags mirror the accepted
// feature modules
export function buildEnvPlan({ platform, convex, googleOAuth, payments }) {
  const plan = [];

  if (convex) {
    // The public Convex URL is read by the client, its variable name depends on
    // the framework, because Next.js and Expo expose public variables with
    // different prefixes
    const urlKey =
      platform === "web" ? "NEXT_PUBLIC_CONVEX_URL" : "EXPO_PUBLIC_CONVEX_URL";
    plan.push({
      key: urlKey,
      question: "Convex Deployment URL",
      help: envHelp.convexUrl,
      target: "client",
      placeholder: "https://your-project-123.convex.cloud",
    });
  }

  if (googleOAuth) {
    plan.push({
      key: "AUTH_GOOGLE_ID",
      question: "Google OAuth Client ID",
      help: envHelp.googleId,
      target: "convex",
      placeholder: "1234567890-abcdef.apps.googleusercontent.com",
    });
    plan.push({
      key: "AUTH_GOOGLE_SECRET",
      question: "Google OAuth Client Secret",
      help: envHelp.googleSecret,
      target: "convex",
      placeholder: "GOCSPX-your-secret",
    });
  }

  if (payments && platform === "web") {
    plan.push({
      key: "STRIPE_SECRET_KEY",
      question: "Stripe Secret Key",
      help: envHelp.stripeSecret,
      target: "convex",
      placeholder: "sk_test_...",
    });
    plan.push({
      key: "STRIPE_WEBHOOK_SECRET",
      question: "Stripe Webhook Signing Secret",
      help: envHelp.stripeWebhook,
      target: "convex",
      placeholder: "whsec_...",
    });
  }

  if (payments && platform === "mobile") {
    // RevenueCat SDK keys are public keys that ship inside the app, so they are
    // client targets exposed through Expo public variables
    plan.push({
      key: "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
      question: "RevenueCat Apple SDK Key",
      help: envHelp.revenuecatApple,
      target: "client",
      optional: true,
      placeholder: "appl_...",
    });
    plan.push({
      key: "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
      question: "RevenueCat Google SDK Key",
      help: envHelp.revenuecatGoogle,
      target: "client",
      optional: true,
      placeholder: "goog_...",
    });
  }

  return plan;
}
