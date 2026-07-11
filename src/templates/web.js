// This module builds the file tree for a Web target project, it returns a plain
// object that maps each relative file path to its text content, the generator
// then writes those files to disk. Every file is composed conditionally based on
// the feature modules the user accepted, so a project with only Convex looks
// different from one with Convex, Google OAuth, and Stripe all enabled
//
// A universal baseline ships in every project no matter which modules are on,
// this covers error boundaries, skeleton loaders, light and dark theming,
// analytics, security headers, SEO metadata, typed environment access, and the
// core UI libraries, the module specific patterns follow the official Convex,
// Convex Auth, and Convex Stripe component documentation

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

  // The universal baseline that ships in every generated web project
  files["app/error.tsx"] = errorBoundary();
  files["app/global-error.tsx"] = globalErrorBoundary();
  files["app/icon.svg"] = appIcon(options);
  files["components/Skeleton.tsx"] = skeleton();
  files["components/Toaster.tsx"] = toaster();
  files["lib/analytics.ts"] = analytics();
  files["lib/reportError.ts"] = reportError();
  files["lib/env.ts"] = env(options);
  files["lib/store.ts"] = store();

  // The payments case needs an extra client component for the checkout button
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
  // it is generated once and combines whichever routes are needed
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
    // Core UI libraries that ship in every project, icons, toasts, and a small
    // client state store
    "lucide-react": "^0.469.0",
    sonner: "^1.7.1",
    zustand: "^5.0.2",
  };
  if (convex) dependencies["convex"] = "^1.17.4";
  if (googleOAuth) {
    dependencies["@convex-dev/auth"] = "latest";
    // Convex Auth is sensitive to this exact Auth.js core version, so it is
    // pinned rather than floated
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
    // The Convex dev server is run alongside Next during development
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
  return `// Next.js configuration, this is where the standard security headers live so
// every response is hardened by default, tune the policy below as the app grows

// A conservative Content Security Policy that still allows the app to run, widen
// the source lists when you add a CDN, analytics host, or image provider
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// These headers protect against clickjacking, MIME sniffing, and referrer leaks
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
`;
}

function postcssConfig() {
  return `// PostCSS runs Tailwind and Autoprefixer over the stylesheet during the build
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

// Dark mode follows the operating system preference through the media strategy,
// so the app switches automatically with no toggle wiring needed, the color
// tokens are driven by CSS variables declared in app/globals.css
//
// The font family stack lists Google Sans first so it is the primary
// application font, then falls back to clean system fonts so the app still
// renders nicely before the Google Sans files are installed, see app/globals.css
// for the optional font face declaration
const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
      },
      // Fluid type, every text utility scales smoothly with the viewport through
      // clamp so a screen stays looking filled on a small phone and a wide
      // monitor alike, the three clamp values are the minimum, the viewport
      // driven middle, and the maximum
      fontSize: {
        xs: ["clamp(0.75rem, 0.72rem + 0.15vw, 0.8rem)", { lineHeight: "1.5" }],
        sm: ["clamp(0.875rem, 0.83rem + 0.2vw, 0.95rem)", { lineHeight: "1.5" }],
        base: ["clamp(1rem, 0.95rem + 0.25vw, 1.125rem)", { lineHeight: "1.6" }],
        lg: ["clamp(1.125rem, 1.05rem + 0.4vw, 1.35rem)", { lineHeight: "1.5" }],
        xl: ["clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem)", { lineHeight: "1.4" }],
        "2xl": ["clamp(1.5rem, 1.3rem + 1vw, 2rem)", { lineHeight: "1.3" }],
        "3xl": ["clamp(1.875rem, 1.55rem + 1.6vw, 2.6rem)", { lineHeight: "1.2" }],
        "4xl": ["clamp(2.25rem, 1.75rem + 2.5vw, 3.3rem)", { lineHeight: "1.1" }],
        "5xl": ["clamp(3rem, 2.2rem + 3.8vw, 4.5rem)", { lineHeight: "1.05" }],
        "6xl": ["clamp(3.75rem, 2.6rem + 5.4vw, 6rem)", { lineHeight: "1" }],
      },
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
  Google Sans is a proprietary font, so it is not bundled with this starter
  If your project is licensed to use it, drop the font files into
  public/fonts and uncomment the block below, until then the app renders with
  the system font fallback defined in tailwind.config.ts

  @font-face {
    font-family: "Google Sans";
    src: url("/fonts/GoogleSans-Regular.woff2") format("woff2");
    font-weight: 400;
    font-display: swap;
  }
*/

/* Light theme tokens, these are the default palette */
:root {
  --background: #ffffff;
  --foreground: #0b0b0f;
  --card: #ffffff;
  --border: #e5e5ea;
  --muted: #6b7280;
}

/* Dark theme tokens, applied automatically when the system asks for dark */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0b0b0f;
    --foreground: #f5f5f7;
    --card: #17171c;
    --border: #2a2a31;
    --muted: #9ca3af;
  }
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

function layout({ convex, googleOAuth, appName }) {
  const title = titleCase(appName);
  // The provider wrapping changes depending on whether authentication is on
  const imports = [
    `import type { Metadata } from "next";`,
    `import "./globals.css";`,
    `import { Toaster } from "@/components/Toaster";`,
  ];
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

// Structured metadata that gives search engines and link previews a solid
// starting point, set metadataBase to your real domain before you ship
export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "${title}",
    template: "%s | ${title}",
  },
  description: "A production ready starter generated by the modular boilerplate CLI",
  applicationName: "${title}",
  openGraph: {
    title: "${title}",
    description: "A production ready starter generated by the modular boilerplate CLI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "${title}",
    description: "A production ready starter generated by the modular boilerplate CLI",
  },
  robots: { index: true, follow: true },
};

// The root layout applies the Google Sans font stack through the font-sans
// utility, mounts the toast host, and wraps the tree in the right providers
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        ${wrappedChildren}
        <Toaster />
      </body>
    </html>
  );
}
`;
}

// Turns a package style name like my-cool-app into a display title like My Cool
// App, used for the human facing metadata
function titleCase(appName) {
  return String(appName)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function convexClientProvider({ googleOAuth }) {
  if (googleOAuth) {
    return `"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

// The Convex client connects to the deployment named by the public env variable
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// This provider adds Convex Auth on top of the Convex client so any component
// can read the signed in state and call the sign in and sign out actions
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

// The Convex client connects to the deployment named by the public env variable
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// This provider makes Convex queries and mutations available to the whole app
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
import { LogIn } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { track } from "@/lib/analytics";

// The landing page shows a prominent Google login button when signed out, as
// soon as the user is authenticated the client is redirected to the dashboard,
// matching the required auth flow
export default function LandingPage() {
  const { signIn } = useAuthActions();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Modular App</h1>
        <p className="max-w-md text-lg text-muted">
          A production ready starter with Convex, Google sign in, and payments
        </p>
      </div>

      <AuthLoading>
        <p className="text-muted">Loading...</p>
      </AuthLoading>

      <Unauthenticated>
        <button
          onClick={() => {
            track("sign_in_started", { provider: "google" });
            signIn("google");
          }}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-base font-medium text-background transition hover:opacity-90"
        >
          <LogIn size={18} />
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
// dashboard the moment their signed in state is confirmed
function RedirectToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return <p className="text-muted">Redirecting to your dashboard...</p>;
}
`;
  }

  // Without authentication the login button simply routes to the dashboard so
  // the starter still demonstrates the landing to dashboard flow
  return `import Link from "next/link";
import { ArrowRight } from "lucide-react";

// The landing page shows a prominent login button, without an auth module the
// button routes straight to the dashboard as a placeholder for a real flow
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Modular App</h1>
        <p className="max-w-md text-lg text-muted">
          A clean Next.js and Tailwind starter
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-base font-medium text-background transition hover:opacity-90"
      >
        Log in
        <ArrowRight size={18} />
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
    // separately by webExtraFiles
    return `"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "@/components/Skeleton";${subscribeImport}

// The dashboard is the signed in view, it reads the current user from Convex,
// shows their details, and offers a sign out button, the middleware guards this
// route so unauthenticated visitors are redirected to the landing page
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
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium transition hover:bg-card"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      <section className="rounded-2xl border border-border p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Signed in as
        </h2>
        {user === undefined ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <>
            <p className="text-lg font-medium">{user?.name ?? user?.email ?? "Unknown"}</p>
            {user?.email && <p className="text-muted">{user.email}</p>}
          </>
        )}
      </section>
${subscribeBlock}
    </main>
  );
}
`;
  }

  // A static dashboard for projects without authentication
  return `import Link from "next/link";

// A simple dashboard placeholder for projects generated without authentication
export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted">
        You are on the dashboard, add your application here
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

// A separate client component for the Stripe checkout button, emitted only when
// the payments module is enabled
function subscribeButton() {
  return `"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

// Replace this with a real Stripe Price id from your Stripe dashboard
const PRICE_ID = "price_replace_me";

// This button asks the Convex Stripe component to create a checkout session and
// then sends the browser to the hosted Stripe checkout page
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

// The auth tables are provided by Convex Auth and store users and sessions,
// add your own tables alongside them
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

// Define your database tables here, this sample tasks table is included so the
// starter has a working query to build on
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

// A sample query that returns every task, Convex functions are addressed by
// their file and export name, so this is available to the client as
// api.tasks.list
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

// Returns the currently signed in user, or null when nobody is signed in,
// the client reads this to show the signed in name and email on the dashboard
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

// This wires up Convex Auth with the Google provider, the provider reads the
// AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET values from the Convex environment
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
});
`;
}

function convexAuthConfig() {
  return `// This tells Convex how to validate the auth tokens it issues, the site URL is
// provided automatically in the Convex environment
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
    lines.push("// Convex Auth registers the sign in and OAuth callback routes");
    lines.push("auth.addHttpRoutes(http);");
    lines.push("");
  }
  if (payments) {
    lines.push("// The Stripe component registers its webhook route");
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
// functions become available under components.stripe
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

// The Stripe client reads STRIPE_SECRET_KEY from the Convex environment
const stripe = new StripeSubscriptions(components.stripe);

// Creates a Stripe checkout session for a subscription and returns the hosted
// checkout URL for the browser to open
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
// is the public entry point
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// The middleware redirects signed out visitors away from protected routes
export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }
});

export const config = {
  // Run the middleware on everything except static files and Next internals
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
// Universal baseline, shipped in every generated web project
// ---------------------------------------------------------------------------

function errorBoundary() {
  return `"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

// This is the route level error boundary, Next.js renders it whenever a page or
// its children throw, the reset function lets the user retry without a full
// reload, swap the reportError call for your monitoring SDK when you add one
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "route" });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-muted">
        An unexpected error occurred, try again and we will get you back on track
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
`;
}

function globalErrorBoundary() {
  return `"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

// This is the last line of defense, it catches crashes in the root layout
// itself so the app shows a friendly page instead of a blank screen, it has to
// render its own html and body because it replaces the whole document
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "global" });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center font-sans">
        <h1 className="text-2xl font-bold">The app crashed</h1>
        <p className="max-w-md text-neutral-500">
          A top level error stopped the app, reload to start fresh
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
`;
}

function appIcon({ appName }) {
  // A placeholder SVG favicon so the browser tab has an icon on first launch,
  // Next.js picks this up automatically from app/icon.svg, replace it with your
  // real brand mark whenever you have one
  const letter = (String(appName).trim()[0] || "m").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0b0b0f" />
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${letter}</text>
</svg>
`;
}

function skeleton() {
  return `// A tiny skeleton loader you can drop in while Convex data is streaming in,
// it uses the Tailwind pulse animation for a smooth shimmer, compose it into
// the exact shape of whatever you are loading
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={\`animate-pulse rounded-md bg-border \${className}\`}
      aria-hidden="true"
    />
  );
}

// A ready made stack of skeleton lines for the common list loading case
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}
`;
}

function toaster() {
  return `"use client";

import { Toaster as SonnerToaster } from "sonner";

// The toast host, it lives once in the root layout and renders any toast fired
// from anywhere in the app, call toast() from sonner to show feedback, the
// theme follows the system preference so it looks right in light and dark
export function Toaster() {
  return <SonnerToaster position="top-center" richColors closeButton theme="system" />;
}
`;
}

function analytics() {
  return `// A single place to send product analytics, right now it logs to the console so
// you can see events during development, wire it to PostHog, Mixpanel, or any
// other service by filling in the marked spot, nothing else in the app has to
// change because every event flows through this one function

type EventProps = Record<string, unknown>;

export function track(event: string, props: EventProps = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", event, props);
  }

  // Connect your analytics provider here, for example
  //   posthog.capture(event, props);
  //   mixpanel.track(event, props);
}

// Call this once after a user signs in so later events are attributed to them
export function identify(userId: string, traits: EventProps = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics] identify", userId, traits);
  }

  // posthog.identify(userId, traits);
  // mixpanel.identify(userId);
}
`;
}

function reportError() {
  return `// A single place to report crashes and handled errors, right now it logs to the
// console, connect Sentry or another reporting SDK in the marked spot and every
// error boundary in the app starts sending there with no other changes

type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context: ErrorContext = {}) {
  console.error("[reportError]", error, context);

  // Send to your monitoring service here, for example
  //   Sentry.captureException(error, { extra: context });
}
`;
}

function env({ convex, payments, googleOAuth }) {
  // Only the public, client readable variables belong in this typed accessor,
  // the framework prefix keeps them safe to expose in the browser bundle
  const lines = [];
  if (convex) {
    lines.push(`  // The public Convex URL the client connects to`);
    lines.push(`  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",`);
  }
  const body = lines.length
    ? lines.join("\n")
    : `  // Add your public NEXT_PUBLIC_ variables here as the app grows`;

  const guardLines = [];
  if (convex) {
    guardLines.push(
      `  if (!env.convexUrl) missing.push("NEXT_PUBLIC_CONVEX_URL");`
    );
  }
  const guardBody = guardLines.length ? guardLines.join("\n") : "";

  return `// Typed, centralized access to the public environment variables, every value
// has a safe fallback so a missing variable never crashes the app at import
// time, call assertEnv() early in development to surface anything you forgot
export const env = {
${body}
};

// A soft guard you can call during startup, it warns about missing values
// instead of throwing so the app still runs while you finish wiring things up
export function assertEnv() {
  const missing: string[] = [];
${guardBody}
  if (missing.length > 0) {
    console.warn("[env] missing public variables:", missing.join(", "));
  }
}
`;
}

function store() {
  return `import { create } from "zustand";

// A lightweight client state store powered by Zustand, this sample tracks a
// simple UI counter so you can see the pattern, add your own slices for things
// like a sidebar open state, a theme override, or an onboarding step
type AppState = {
  count: number;
  increment: () => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));
`;
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

  const features = [
    "- Next.js App Router with TailwindCSS",
    "- A production ready baseline",
  ];
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
// newline, used for every JSON config file
function json(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

// The dashboard builder returns a small map of files because the payments case
// needs an extra client component, this helper exposes that extra file to the
// main builder
export function webExtraFiles(options) {
  const extra = {};
  if (options.googleOAuth && options.payments) {
    extra["app/dashboard/SubscribeButton.tsx"] = subscribeButton();
  }
  return extra;
}
