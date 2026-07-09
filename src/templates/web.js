// This module builds the file tree for a Web target project. It returns a plain
// object that maps each relative file path to its text content. The generator
// then writes those files to disk. Every file is composed conditionally based on
// the feature modules the user accepted, so a project with only Convex looks
// different from one with Convex, Google OAuth, and Stripe all enabled.
//
// The setup patterns here follow the official Convex, Convex Auth, and Convex
// Stripe component documentation.

// options: { appName, convex, googleOAuth, payments }
export function buildWebProject(options) {
  const { appName } = options;
  const files = {};

  files["package.json"] = webPackageJson(options);
  files["tsconfig.json"] = tsconfig();
  files["next.config.mjs"] = nextConfig();
  files["postcss.config.mjs"] = postcssConfig();
  files["tailwind.config.ts"] = tailwindConfig();
  files[".eslintrc.json"] = eslintConfig();
  files[".gitignore"] = gitignore();
  files["app/globals.css"] = globalsCss();
  files["app/layout.tsx"] = layout(options);
  files["app/page.tsx"] = landingPage(options);
  files["app/dashboard/page.tsx"] = dashboardPage(options);
  files["README.md"] = webReadme(options);

  // The payments case needs an extra client component for the checkout button.
  Object.assign(files, webExtraFiles(options));

  if (options.convex) {
    files["app/ConvexClientProvider.tsx"] = convexClientProvider(options);
    files["convex/schema.ts"] = convexSchema(options);
    files["convex/tasks.ts"] = convexTasks();
    files["convex/tsconfig.json"] = convexTsconfig();
  }

  if (options.googleOAuth) {
    files["convex/auth.ts"] = convexAuth();
    files["convex/auth.config.ts"] = convexAuthConfig();
    files["convex/users.ts"] = convexUsers();
    files["middleware.ts"] = middleware();
  }

  if (options.payments) {
    files["convex/convex.config.ts"] = convexConfig();
    files["convex/stripe.ts"] = convexStripe();
  }

  // The HTTP router file is shared by Convex Auth and the Stripe component, so
  // it is generated once and combines whichever routes are needed.
  if (options.googleOAuth || options.payments) {
    files["convex/http.ts"] = convexHttp(options);
  }

  return files;
}

// ---------------------------------------------------------------------------
// Configuration files
// ---------------------------------------------------------------------------

function webPackageJson({ appName, convex, googleOAuth, payments }) {
  const dependencies = {
    next: "^15.1.6",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
  };
  if (convex) dependencies["convex"] = "^1.17.4";
  if (googleOAuth) {
    dependencies["@convex-dev/auth"] = "latest";
    // Convex Auth is sensitive to this exact Auth.js core version, so it is
    // pinned rather than floated.
    dependencies["@auth/core"] = "0.41.1";
  }
  if (payments) dependencies["@convex-dev/stripe"] = "latest";

  const pkg = {
    name: appName,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies,
    devDependencies: {
      typescript: "^5.7.3",
      "@types/node": "^22.10.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      tailwindcss: "^3.4.17",
      postcss: "^8.4.49",
      autoprefixer: "^10.4.20",
      eslint: "^9.17.0",
      "eslint-config-next": "^15.1.6",
    },
  };
  if (convex) {
    // The Convex dev server is run alongside Next during development.
    pkg.scripts["convex"] = "convex dev";
  }
  return json(pkg);
}

function tsconfig() {
  return json({
    compilerOptions: {
      target: "ES2020",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./*"] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  });
}

function nextConfig() {
  return `// Next.js configuration. The defaults are enough for this starter, so this
// file mainly exists as a clear place to add project specific settings later.
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`;
}

function postcssConfig() {
  return `// PostCSS runs Tailwind and Autoprefixer over the stylesheet during the build.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function tailwindConfig() {
  return `import type { Config } from "tailwindcss";

// The font family stack lists Google Sans first so it is the primary
// application font, and then falls back to clean system fonts so the app still
// renders nicely before the Google Sans files are installed. See app/globals.css
// for the optional font face declaration.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Google Sans",
          "Google Sans Text",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
`;
}

function eslintConfig() {
  return json({ extends: "next/core-web-vitals" });
}

function globalsCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

/*
  Google Sans is a proprietary font, so it is not bundled with this starter.
  If your project is licensed to use it, drop the font files into
  public/fonts and uncomment the block below. Until then the app renders with
  the system font fallback defined in tailwind.config.ts.

  @font-face {
    font-family: "Google Sans";
    src: url("/fonts/GoogleSans-Regular.woff2") format("woff2");
    font-weight: 400;
    font-display: swap;
  }
*/

:root {
  --background: #ffffff;
  --foreground: #0b0b0f;
}

body {
  color: var(--foreground);
  background: var(--background);
}
`;
}

// ---------------------------------------------------------------------------
// Application shell
// ---------------------------------------------------------------------------

function layout({ convex, googleOAuth }) {
  // The provider wrapping changes depending on whether authentication is on.
  const imports = [`import type { Metadata } from "next";`, `import "./globals.css";`];
  if (convex && googleOAuth) {
    imports.push(
      `import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";`
    );
    imports.push(`import { ConvexClientProvider } from "./ConvexClientProvider";`);
  } else if (convex) {
    imports.push(`import { ConvexClientProvider } from "./ConvexClientProvider";`);
  }

  let wrappedChildren = "{children}";
  if (convex && googleOAuth) {
    wrappedChildren = `<ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>`;
  } else if (convex) {
    wrappedChildren = `<ConvexClientProvider>{children}</ConvexClientProvider>`;
  }

  return `${imports.join("\n")}

export const metadata: Metadata = {
  title: "Modular App",
  description: "Generated by the modular boilerplate CLI.",
};

// The root layout applies the Google Sans font stack through the font-sans
// utility and wraps the whole tree in the appropriate providers.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        ${wrappedChildren}
      </body>
    </html>
  );
}
`;
}

function convexClientProvider({ googleOAuth }) {
  if (googleOAuth) {
    return `"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

// The Convex client connects to the deployment named by the public env variable.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// This provider adds Convex Auth on top of the Convex client so any component
// can read the signed in state and call the sign in and sign out actions.
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
`;
  }
  return `"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// The Convex client connects to the deployment named by the public env variable.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// This provider makes Convex queries and mutations available to the whole app.
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
`;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function landingPage({ convex, googleOAuth }) {
  if (googleOAuth) {
    return `"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

// The landing page shows a prominent Google login button when signed out.
// As soon as the user is authenticated the client is redirected to the
// dashboard, matching the required auth flow.
export default function LandingPage() {
  const { signIn } = useAuthActions();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Modular App</h1>
        <p className="max-w-md text-lg text-neutral-500">
          A production ready starter with Convex, Google sign in, and payments.
        </p>
      </div>

      <AuthLoading>
        <p className="text-neutral-400">Loading...</p>
      </AuthLoading>

      <Unauthenticated>
        <button
          onClick={() => signIn("google")}
          className="rounded-full bg-black px-8 py-3 text-base font-medium text-white transition hover:opacity-90"
        >
          Continue with Google
        </button>
      </Unauthenticated>

      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>
    </main>
  );
}

// A tiny helper component that redirects an authenticated visitor to the
// dashboard the moment their signed in state is confirmed.
function RedirectToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return <p className="text-neutral-400">Redirecting to your dashboard...</p>;
}
`;
  }

  // Without authentication the login button simply routes to the dashboard so
  // the starter still demonstrates the landing to dashboard flow.
  return `import Link from "next/link";

// The landing page shows a prominent login button. Without an auth module the
// button routes straight to the dashboard as a placeholder for a real flow.
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Modular App</h1>
        <p className="max-w-md text-lg text-neutral-500">
          A clean Next.js and Tailwind starter.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-full bg-black px-8 py-3 text-base font-medium text-white transition hover:opacity-90"
      >
        Log in
      </Link>
    </main>
  );
}
`;
}

function dashboardPage({ convex, googleOAuth, payments }) {
  if (googleOAuth) {
    const subscribeBlock = payments ? webSubscribeBlock() : "";
    const subscribeImport = payments
      ? `\nimport { SubscribeButton } from "./SubscribeButton";`
      : "";
    // When payments are on the SubscribeButton client component is emitted
    // separately by webExtraFiles.
    return `"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";${subscribeImport}

// The dashboard is the signed in view. It reads the current user from Convex,
// shows their details, and offers a sign out button. The middleware guards this
// route so unauthenticated visitors are redirected to the landing page.
export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
          className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium transition hover:bg-neutral-100"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-2xl border border-neutral-200 p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Signed in as
        </h2>
        <p className="text-lg font-medium">{user?.name ?? user?.email ?? "..."}</p>
        {user?.email && <p className="text-neutral-500">{user.email}</p>}
      </section>
${subscribeBlock}
    </main>
  );
}
`;
  }

  // A static dashboard for projects without authentication.
  return `import Link from "next/link";

// A simple dashboard placeholder for projects generated without authentication.
export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-neutral-500">
        You are on the dashboard. Add your application here.
      </p>
      <Link href="/" className="text-sm font-medium underline">
        Back to home
      </Link>
    </main>
  );
}
`;
}

function webSubscribeBlock() {
  return `
      <section className="rounded-2xl border border-neutral-200 p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Subscription
        </h2>
        <p className="mb-4 text-neutral-500">
          Start a subscription through the Stripe checkout.
        </p>
        <SubscribeButton />
      </section>`;
}

// A separate client component for the Stripe checkout button. Emitted only when
// the payments module is enabled.
function subscribeButton() {
  return `"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

// Replace this with a real Stripe Price id from your Stripe dashboard.
const PRICE_ID = "price_replace_me";

// This button asks the Convex Stripe component to create a checkout session and
// then sends the browser to the hosted Stripe checkout page.
export function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const createCheckout = useAction(api.stripe.createSubscriptionCheckout);

  const start = async () => {
    setLoading(true);
    try {
      const { url } = await createCheckout({ priceId: PRICE_ID });
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={start}
      disabled={loading}
      className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Starting checkout..." : "Subscribe"}
    </button>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Convex backend
// ---------------------------------------------------------------------------

function convexSchema({ googleOAuth }) {
  if (googleOAuth) {
    return `import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// The auth tables are provided by Convex Auth and store users and sessions.
// Add your own tables alongside them.
export default defineSchema({
  ...authTables,
  tasks: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
`;
  }
  return `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Define your database tables here. This sample tasks table is included so the
// starter has a working query to build on.
export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
`;
}

function convexTasks() {
  return `import { query } from "./_generated/server";

// A sample query that returns every task. Convex functions are addressed by
// their file and export name, so this is available to the client as
// api.tasks.list.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});
`;
}

function convexUsers() {
  return `import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

// Returns the currently signed in user, or null when nobody is signed in.
// The client reads this to show the signed in name and email on the dashboard.
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});
`;
}

function convexAuth() {
  return `import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// This wires up Convex Auth with the Google provider. The provider reads the
// AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET values from the Convex environment.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
});
`;
}

function convexAuthConfig() {
  return `// This tells Convex how to validate the auth tokens it issues. The site URL is
// provided automatically in the Convex environment.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
`;
}

function convexHttp({ googleOAuth, payments }) {
  const lines = [`import { httpRouter } from "convex/server";`];
  if (googleOAuth) lines.push(`import { auth } from "./auth";`);
  if (payments) {
    lines.push(`import { components } from "./_generated/api";`);
    lines.push(`import { registerRoutes } from "@convex-dev/stripe";`);
  }
  lines.push("");
  lines.push("const http = httpRouter();");
  lines.push("");
  if (googleOAuth) {
    lines.push("// Convex Auth registers the sign in and OAuth callback routes.");
    lines.push("auth.addHttpRoutes(http);");
    lines.push("");
  }
  if (payments) {
    lines.push("// The Stripe component registers its webhook route.");
    lines.push("registerRoutes(http, components.stripe, {");
    lines.push(`  webhookPath: "/stripe/webhook",`);
    lines.push("});");
    lines.push("");
  }
  lines.push("export default http;");
  return lines.join("\n") + "\n";
}

function convexConfig() {
  return `import { defineApp } from "convex/server";
import stripe from "@convex-dev/stripe/convex.config.js";

// The Stripe component is installed into the Convex app here so its tables and
// functions become available under components.stripe.
const app = defineApp();
app.use(stripe);

export default app;
`;
}

function convexStripe() {
  return `import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";

// The Stripe client reads STRIPE_SECRET_KEY from the Convex environment.
const stripe = new StripeSubscriptions(components.stripe);

// Creates a Stripe checkout session for a subscription and returns the hosted
// checkout URL for the browser to open.
export const createSubscriptionCheckout = action({
  args: { priceId: v.string() },
  returns: v.object({ sessionId: v.string(), url: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await stripe.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email,
      name: identity.name,
    });

    return await stripe.createCheckoutSession(ctx, {
      priceId: args.priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: "http://localhost:3000/dashboard?success=true",
      cancelUrl: "http://localhost:3000/dashboard?canceled=true",
      subscriptionMetadata: { userId: identity.subject },
    });
  },
});
`;
}

function middleware() {
  return `import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// These matchers describe which routes require a signed in user and which route
// is the public entry point.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// The middleware redirects signed out visitors away from protected routes.
export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  // Run the middleware on everything except static files and Next internals.
  matcher: ["/((?!.*\\\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
`;
}

function convexTsconfig() {
  return json({
    compilerOptions: {
      allowJs: true,
      strict: true,
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      skipLibCheck: true,
      target: "ESNext",
      lib: ["ES2021", "dom"],
      module: "ESNext",
      isolatedModules: true,
    },
    include: ["./**/*"],
    exclude: ["./_generated"],
  });
}

// ---------------------------------------------------------------------------
// Shared static files
// ---------------------------------------------------------------------------

function gitignore() {
  return `# dependencies
/node_modules

# next
/.next
/out

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*

# local env files
.env
.env*.local

# typescript
*.tsbuildinfo
next-env.d.ts
`;
}

function webReadme({ appName, convex, googleOAuth, payments }) {
  const steps = [];
  steps.push("1. Install dependencies:\n\n   ```bash\n   npm install\n   ```");
  if (convex) {
    steps.push(
      "2. Start Convex, which provisions a deployment and fills in your public URL:\n\n   ```bash\n   npx convex dev\n   ```"
    );
  }
  if (googleOAuth || payments) {
    steps.push(
      "3. Push the server side secrets into your Convex deployment:\n\n   ```bash\n   bash scripts/set-convex-env.sh\n   ```\n\n   On Windows PowerShell run `./scripts/set-convex-env.ps1` instead."
    );
  }
  steps.push(
    `${steps.length + 1}. Start the app:\n\n   \`\`\`bash\n   npm run dev\n   \`\`\``
  );

  const features = ["- Next.js App Router with TailwindCSS", "- Google Sans font stack"];
  if (convex) features.push("- Convex database and backend");
  if (googleOAuth) features.push("- Google sign in through Convex Auth");
  if (payments) features.push("- Stripe subscriptions through the Convex Stripe component");

  return `# ${appName}

A Web application generated by the modular boilerplate CLI.

## Included

${features.join("\n")}

## Getting started

${steps.join("\n\n")}
${
  googleOAuth
    ? `
## Google OAuth redirect URI

In the Google Cloud Console, set the authorized redirect URI to your Convex
callback URL, replacing the deployment name with your own:

    https://YOUR-DEPLOYMENT.convex.site/api/auth/callback/google
`
    : ""
}`;
}

// A small helper to serialize an object as nicely indented JSON with a trailing
// newline, used for every JSON config file.
function json(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

// The dashboard builder returns a small map of files because the payments case
// needs an extra client component. This helper exposes that extra file to the
// main builder.
export function webExtraFiles(options) {
  const extra = {};
  if (options.googleOAuth && options.payments) {
    extra["app/dashboard/SubscribeButton.tsx"] = subscribeButton();
  }
  return extra;
}
