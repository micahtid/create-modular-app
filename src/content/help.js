// This module holds the contextual help text shown when the user toggles the
// help panel during selection and during environment configuration. Every entry
// points at the exact documentation source listed in the product requirements
// so the guidance stays aligned with the official setup steps.

// Help shown while choosing the target platform.
export const platformHelp = [
  "Web builds a Next.js App Router project styled with TailwindCSS.",
  "Mobile builds an Expo and React Native project.",
  "This choice decides which payment provider is offered later:",
  "Stripe for Web, or RevenueCat for Mobile.",
].join("\n");

// Help shown while deciding whether to include each feature module.
export const featureHelp = {
  convex: [
    "Convex is the database and backend for the generated app.",
    "It is required for authentication and payments, so if you skip it",
    "the wizard skips those steps too.",
    "",
    "Web quickstart:    https://docs.convex.dev/quickstart/nextjs",
    "Mobile quickstart: https://docs.convex.dev/quickstart/react-native",
  ].join("\n"),
  googleOAuth: [
    "Adds Google sign in through Convex Auth.",
    "You will configure a Google OAuth client and paste its id and secret",
    "into the Convex environment during the next step.",
    "",
    "Guide: https://labs.convex.dev/auth/config/oauth/google",
  ].join("\n"),
  stripe: [
    "Adds the official Convex Stripe component for payments and",
    "subscriptions on the web app.",
    "",
    "Component: https://www.convex.dev/components/stripe",
    "Source:    https://github.com/get-convex/stripe",
  ].join("\n"),
  revenuecat: [
    "Adds RevenueCat for in app subscriptions on the mobile app.",
    "RevenueCat wraps the App Store and Play Store billing systems.",
    "",
    "Install: https://www.revenuecat.com/docs/getting-started/installation/reactnative",
    "Configure: https://www.revenuecat.com/docs/getting-started/configuring-sdk",
  ].join("\n"),
};

// Help shown next to each environment configuration prompt. These explain,
// in plain steps, where each credential comes from.
export const envHelp = {
  convexDeployment: [
    "Run the Convex development server to create a deployment:",
    "",
    "  npx convex dev",
    "",
    "That command signs you in, provisions a deployment, and writes both",
    "CONVEX_DEPLOYMENT and the public Convex URL for you. You can accept the",
    "values it generates, or paste an existing deployment name here.",
  ].join("\n"),
  convexUrl: [
    "This is the public Convex URL that the client connects to.",
    "It looks like https://your-project-123.convex.cloud and is printed by",
    "npx convex dev. It is safe to expose in the client bundle.",
  ].join("\n"),
  googleId: [
    "Open the Google Cloud Console and create an OAuth 2.0 Client ID:",
    "",
    "  1. APIs and Services, then Credentials, then Create Credentials.",
    "  2. Choose OAuth client ID, application type Web application.",
    "  3. Under Authorized redirect URIs add your Convex callback URL:",
    "       https://YOUR-DEPLOYMENT.convex.site/api/auth/callback/google",
    "  4. Copy the Client ID shown after you save.",
    "",
    "Set this value in the Convex dashboard as AUTH_GOOGLE_ID.",
  ].join("\n"),
  googleSecret: [
    "From the same Google OAuth client, copy the Client secret.",
    "Keep it private. It is stored only in the Convex environment and is",
    "never shipped to the browser.",
    "",
    "Set this value in the Convex dashboard as AUTH_GOOGLE_SECRET.",
  ].join("\n"),
  stripeSecret: [
    "In the Stripe dashboard open Developers, then API keys.",
    "Copy the Secret key. Use a test mode key while developing.",
    "It is stored in the Convex environment as STRIPE_SECRET_KEY.",
  ].join("\n"),
  stripeWebhook: [
    "In the Stripe dashboard open Developers, then Webhooks, then add an",
    "endpoint that points at your Convex HTTP action URL:",
    "",
    "  https://YOUR-DEPLOYMENT.convex.site/stripe/webhook",
    "",
    "After creating it, copy the Signing secret shown for that endpoint.",
    "It is stored in the Convex environment as STRIPE_WEBHOOK_SECRET.",
  ].join("\n"),
  revenuecatApple: [
    "In the RevenueCat dashboard create a project and add an App Store app.",
    "Copy the Apple public SDK key, which begins with appl_.",
    "It is safe to ship in the app because it is a public key.",
  ].join("\n"),
  revenuecatGoogle: [
    "In the RevenueCat dashboard add a Play Store app to the same project.",
    "Copy the Google public SDK key, which begins with goog_.",
    "It is safe to ship in the app because it is a public key.",
  ].join("\n"),
};
