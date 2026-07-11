// This module builds the file tree for a Mobile target project using Expo and
// React Native, like the web builder it returns a map of relative file paths to
// their text content, composed conditionally from the accepted feature modules
//
// Styling uses NativeWind so the app shares the same Tailwind model as the web
// target, dark mode follows the system preference through NativeWind, and fonts
// are loaded asynchronously with expo-font before the main container renders
//
// A universal baseline ships in every project no matter which modules are on,
// this covers an error boundary, skeleton loaders, responsive typography,
// analytics, toasts, typed environment access, and a small Zustand store

// options: { appName, convex, googleOAuth, payments }
export function buildMobileProject(options) {
  const files = {};

  files["package.json"] = mobilePackageJson(options);
  files["app.json"] = appJson(options);
  files["babel.config.js"] = babelConfig();
  files["metro.config.js"] = metroConfig();
  files["tailwind.config.js"] = tailwindConfig();
  files["global.css"] = globalCss();
  files["nativewind-env.d.ts"] = nativewindEnv();
  files["tsconfig.json"] = tsconfig();
  files["index.js"] = entryPoint();
  files["App.tsx"] = appRoot(options);
  files["src/MainScreen.tsx"] = mainScreen(options);
  files["assets/fonts/README.md"] = fontsReadme();
  files["assets/README.md"] = assetsReadme();
  // Placeholder font files keep the bundler happy before the real proprietary
  // Google Sans files are added, they are replaced during setup
  files["assets/fonts/GoogleSans-Regular.ttf"] = fontPlaceholder("Regular");
  files["assets/fonts/GoogleSans-Medium.ttf"] = fontPlaceholder("Medium");
  files["assets/fonts/GoogleSans-Bold.ttf"] = fontPlaceholder("Bold");
  files[".gitignore"] = gitignore();
  files["README.md"] = mobileReadme(options);

  // The universal baseline that ships in every generated mobile project
  files["src/ErrorBoundary.tsx"] = errorBoundary();
  files["src/components/Skeleton.tsx"] = skeleton();
  files["src/components/Toast.tsx"] = toastHost();
  files["src/lib/analytics.ts"] = analytics();
  files["src/lib/reportError.ts"] = reportError();
  files["src/lib/env.ts"] = env(options);
  files["src/lib/store.ts"] = store();
  files["src/lib/toast.ts"] = toastStore();
  files["src/lib/typography.ts"] = typography();

  if (options.convex) {
    files["src/ConvexProvider.tsx"] = convexProvider(options);
    files["convex/schema.ts"] = convexSchema(options);
    files["convex/tasks.ts"] = convexTasks();
    files["convex/tsconfig.json"] = convexTsconfig();
  }

  if (options.googleOAuth) {
    files["convex/auth.ts"] = convexAuth();
    files["convex/auth.config.ts"] = convexAuthConfig();
    files["convex/http.ts"] = convexHttp();
    files["convex/users.ts"] = convexUsers();
    files["src/useGoogleSignIn.ts"] = useGoogleSignIn();
  }

  if (options.payments) {
    files["src/revenuecat.ts"] = revenuecat();
  }

  return files;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function mobilePackageJson({ appName, convex, googleOAuth, payments }) {
  const dependencies = {
    expo: "~52.0.0",
    "expo-font": "~13.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-status-bar": "~2.0.0",
    react: "18.3.1",
    "react-native": "0.76.5",
    // NativeWind brings the Tailwind styling model to React Native, react-native
    // -svg backs the Lucide icon set
    nativewind: "^4.1.23",
    tailwindcss: "^3.4.17",
    "react-native-svg": "15.8.0",
    "lucide-react-native": "^0.469.0",
    // A small client state store shared with the web target
    zustand: "^5.0.2",
  };
  if (convex) dependencies["convex"] = "^1.17.4";
  if (googleOAuth) {
    dependencies["@convex-dev/auth"] = "latest";
    dependencies["@auth/core"] = "0.41.1";
    dependencies["expo-secure-store"] = "~14.0.0";
    dependencies["expo-web-browser"] = "~14.0.1";
    dependencies["expo-auth-session"] = "~6.0.0";
    dependencies["expo-linking"] = "~7.0.3";
    dependencies["expo-constants"] = "~17.0.3";
  }
  if (payments) dependencies["react-native-purchases"] = "^8.2.0";

  return json({
    name: appName,
    version: "0.1.0",
    private: true,
    main: "index.js",
    scripts: {
      start: "expo start",
      android: "expo start --android",
      ios: "expo start --ios",
      ...(convex ? { convex: "convex dev" } : {}),
    },
    dependencies,
    devDependencies: {
      "@babel/core": "^7.25.0",
      "@types/react": "~18.3.12",
      typescript: "^5.3.3",
    },
  });
}

function appJson({ appName, googleOAuth }) {
  // The scheme is required for the OAuth redirect to return to the app
  const scheme = appName.replace(/[^a-z0-9]/gi, "").toLowerCase() || "modularapp";

  // The splash screen is bootstrapped through the expo-splash-screen plugin, it
  // shows a solid background on first launch that follows the system theme, drop
  // a real splash image and app icon into assets and reference them here later,
  // see assets/README.md for the expected files
  const plugins = [
    "expo-font",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        resizeMode: "contain",
        dark: { backgroundColor: "#0b0b0f" },
      },
    ],
  ];
  // The secure store plugin is only added when Google OAuth is on, because that
  // is the only feature that ships the expo-secure-store package
  if (googleOAuth) plugins.push("expo-secure-store");

  return json({
    expo: {
      name: appName,
      slug: appName,
      version: "1.0.0",
      orientation: "portrait",
      scheme,
      // Automatic lets the app follow the device light or dark setting
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
      ios: { supportsTablet: true },
      android: {
        // A standard launch mode keeps in app purchase flows from being
        // cancelled when the billing sheet backgrounds the app
        edgeToEdgeEnabled: true,
      },
      plugins,
    },
  });
}

function babelConfig() {
  return `// Babel configuration for Expo, the jsxImportSource and the nativewind preset
// are what let className work on React Native components
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
`;
}

function metroConfig() {
  return `// Metro configuration wrapped with NativeWind so Tailwind classes are compiled,
// the input points at the global stylesheet that pulls in the Tailwind layers
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
`;
}

function tailwindConfig() {
  return `/** @type {import('tailwindcss').Config} */
// Dark mode uses the media strategy so it follows the device setting with no
// toggle wiring, the color tokens and the Google Sans font stack are shared with
// the screens through class names like bg-background and font-sans
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        background: { DEFAULT: "#ffffff", dark: "#0b0b0f" },
        card: { DEFAULT: "#ffffff", dark: "#17171c" },
      },
      // Only the regular family is exposed as a class, the medium and bold
      // weights are separate font files so screens apply them by name through
      // the fonts map in src/lib/typography.ts
      fontFamily: {
        sans: ["GoogleSans-Regular", "System"],
      },
    },
  },
  plugins: [],
};
`;
}

function globalCss() {
  return `/* NativeWind reads these Tailwind layers to build the class names the app uses */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

function nativewindEnv() {
  return `/// <reference types="nativewind/types" />
`;
}

function tsconfig() {
  return json({
    extends: "expo/tsconfig.base",
    compilerOptions: {
      strict: true,
      paths: { "@/*": ["./src/*"] },
    },
    include: ["**/*.ts", "**/*.tsx"],
  });
}

function entryPoint() {
  return `// The entry point registers the root App component with Expo, keeping this in a
// small file lets App.tsx focus purely on the application itself
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
`;
}

// ---------------------------------------------------------------------------
// Application shell
// ---------------------------------------------------------------------------

function appRoot({ convex, googleOAuth, payments }) {
  const imports = [
    `import "./global.css";`,
    `import { useCallback } from "react";`,
    `import { useFonts } from "expo-font";`,
    `import * as SplashScreen from "expo-splash-screen";`,
    `import { View } from "react-native";`,
    `import { StatusBar } from "expo-status-bar";`,
    `import { ErrorBoundary } from "./src/ErrorBoundary";`,
    `import { ToastHost } from "./src/components/Toast";`,
    `import { MainScreen } from "./src/MainScreen";`,
  ];
  if (convex) imports.push(`import { AppConvexProvider } from "./src/ConvexProvider";`);
  if (payments) imports.push(`import { configureRevenueCat } from "./src/revenuecat";`);

  // The main screen is wrapped in the Convex provider when the backend is on
  const wrapped = convex
    ? `<AppConvexProvider>
          <MainScreen />
        </AppConvexProvider>`
    : `<MainScreen />`;

  const revenueCatInit = payments
    ? `
// Configure RevenueCat once, as early as possible in the app lifecycle
configureRevenueCat();
`
    : "";

  return `${imports.join("\n")}

// Keep the native splash screen visible while the fonts load so the app never
// flashes an unstyled first frame
SplashScreen.preventAutoHideAsync();
${revenueCatInit}
export default function App() {
  // Google Sans is loaded asynchronously here, the main container is not
  // rendered until the fonts are ready, or until loading fails, in which case
  // the system font fallback is used
  const [fontsLoaded, fontError] = useFonts({
    "GoogleSans-Regular": require("./assets/fonts/GoogleSans-Regular.ttf"),
    "GoogleSans-Medium": require("./assets/fonts/GoogleSans-Medium.ttf"),
    "GoogleSans-Bold": require("./assets/fonts/GoogleSans-Bold.ttf"),
  });

  // Once fonts are ready we hide the splash screen on the next frame
  const onReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // The whole tree sits inside the error boundary so a crash shows a friendly
  // screen, the status bar style auto follows the system theme, and the toast
  // host renders on top of everything
  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }} onLayout={onReady}>
        <StatusBar style="auto" />
        ${wrapped}
        <ToastHost />
      </View>
    </ErrorBoundary>
  );
}
`;
}

function mainScreen({ convex, googleOAuth, payments }) {
  if (googleOAuth) {
    const purchaseImport = payments
      ? `\nimport { presentPaywall } from "./revenuecat";`
      : "";
    const subscribeButton = payments
      ? `
        <Pressable
          onPress={presentPaywall}
          className="items-center rounded-xl border border-neutral-200 py-4 dark:border-neutral-800"
        >
          <Text
            className="text-neutral-900 dark:text-white"
            style={{ fontFamily: fonts.medium, fontSize: sizes.body }}
          >
            Manage subscription
          </Text>
        </Pressable>`
      : "";
    return `import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ActivityIndicator, Pressable, SafeAreaView, Text, useColorScheme, View } from "react-native";
import { LogIn, LogOut } from "lucide-react-native";
import { api } from "../convex/_generated/api";
import { useGoogleSignIn } from "./useGoogleSignIn";
import { Skeleton } from "./components/Skeleton";
import { track } from "./lib/analytics";
import { fonts, sizes } from "./lib/typography";${purchaseImport}

// The main screen switches its whole layout based on the sign in state, when
// signed out it shows a Google login button, when signed in it shows the user
// details and a logout button, every color has a dark variant so the screen
// follows the system theme
export function MainScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <AuthLoading>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </AuthLoading>

      <Unauthenticated>
        <SignedOut />
      </Unauthenticated>

      <Authenticated>
        <SignedIn />
      </Authenticated>
    </SafeAreaView>
  );
}

// The signed out view with a single, prominent Google login button
function SignedOut() {
  const signIn = useGoogleSignIn();
  const scheme = useColorScheme();
  const iconColor = scheme === "dark" ? "#0b0b0f" : "#ffffff";
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6">
      <Text
        className="text-neutral-900 dark:text-white"
        style={{ fontFamily: fonts.bold, fontSize: sizes.title }}
      >
        Modular App
      </Text>
      <Text
        className="mb-2 text-neutral-500 dark:text-neutral-400"
        style={{ fontFamily: fonts.regular, fontSize: sizes.body }}
      >
        Sign in to get started
      </Text>
      <Pressable
        onPress={() => {
          track("sign_in_started", { provider: "google" });
          signIn();
        }}
        className="flex-row items-center gap-2 rounded-xl bg-neutral-900 px-7 py-4 dark:bg-white"
      >
        <LogIn size={18} color={iconColor} />
        <Text
          className="text-white dark:text-neutral-900"
          style={{ fontFamily: fonts.medium, fontSize: sizes.body }}
        >
          Continue with Google
        </Text>
      </Pressable>
    </View>
  );
}

// The signed in view showing the user details and a logout button, a skeleton
// stands in while the current user streams down from Convex
function SignedIn() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  return (
    <View className="flex-1 justify-center gap-4 px-6">
      <Text
        className="text-neutral-900 dark:text-white"
        style={{ fontFamily: fonts.bold, fontSize: sizes.title }}
      >
        Welcome
      </Text>
      <View className="gap-1 rounded-2xl bg-neutral-50 p-5 dark:bg-neutral-900">
        <Text
          className="uppercase tracking-wide text-neutral-400"
          style={{ fontFamily: fonts.medium, fontSize: sizes.label }}
        >
          Signed in as
        </Text>
        {user === undefined ? (
          <Skeleton width={180} height={sizes.heading + 6} />
        ) : (
          <>
            <Text
              className="text-neutral-900 dark:text-white"
              style={{ fontFamily: fonts.medium, fontSize: sizes.heading }}
            >
              {user?.name ?? user?.email ?? "Unknown"}
            </Text>
            {user?.email ? (
              <Text
                className="text-neutral-500 dark:text-neutral-400"
                style={{ fontFamily: fonts.regular, fontSize: sizes.body }}
              >
                {user.email}
              </Text>
            ) : null}
          </>
        )}
      </View>${subscribeButton}
      <Pressable
        onPress={() => signOut()}
        className="flex-row items-center justify-center gap-2 py-3"
      >
        <LogOut size={18} color="#ff3b30" />
        <Text style={{ fontFamily: fonts.medium, fontSize: sizes.body, color: "#ff3b30" }}>
          Log out
        </Text>
      </Pressable>
    </View>
  );
}
`;
  }

  // A version without authentication for projects that skipped it
  return `import { SafeAreaView, Text, View } from "react-native";
import { fonts, sizes } from "./lib/typography";

// A simple main screen for projects generated without authentication
export function MainScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text
          className="text-neutral-900 dark:text-white"
          style={{ fontFamily: fonts.bold, fontSize: sizes.title }}
        >
          Modular App
        </Text>
        <View className="rounded-2xl bg-neutral-50 p-5 dark:bg-neutral-900">
          <Text
            className="text-neutral-900 dark:text-white"
            style={{ fontFamily: fonts.medium, fontSize: sizes.heading }}
          >
            Your app starts here
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Convex backend and providers
// ---------------------------------------------------------------------------

function convexProvider({ googleOAuth }) {
  if (googleOAuth) {
    return `import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import * as SecureStore from "expo-secure-store";

// The Convex client connects to the deployment named by the public env variable
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Convex Auth stores its tokens in the device secure store so the session
// survives app restarts, this adapter maps its calls to expo-secure-store
const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

// This provider adds Convex Auth on top of the Convex client so the UI can read
// the signed in state and call the sign in and sign out actions
export function AppConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      {children}
    </ConvexAuthProvider>
  );
}
`;
  }
  return `import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// The Convex client connects to the deployment named by the public env variable
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// This provider makes Convex queries and mutations available to the whole app
export function AppConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
`;
}

function useGoogleSignIn() {
  return `import { useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { openAuthSessionAsync } from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

// This hook drives the native Google sign in flow for Convex Auth, it asks
// Convex Auth for the provider URL, opens it in a secure browser session, and
// then hands the returned authorization code back to Convex Auth to finish
// signing in
export function useGoogleSignIn() {
  const { signIn } = useAuthActions();

  return useCallback(async () => {
    // The redirect URI must match the app scheme declared in app.json
    const redirectTo = makeRedirectUri();

    const { redirect } = await signIn("google", { redirectTo });

    const result = await openAuthSessionAsync(redirect!.toString(), redirectTo);
    if (result.type !== "success") {
      return;
    }

    // Pull the authorization code out of the redirect URL and exchange it
    const { url } = result;
    const code = new URL(url).searchParams.get("code");
    if (!code) {
      return;
    }

    await signIn("google", { code });
  }, [signIn]);
}
`;
}

function convexSchema({ googleOAuth }) {
  if (googleOAuth) {
    return `import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// The auth tables are provided by Convex Auth and store users and sessions
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

// Define your database tables here, this sample tasks table gives the starter a
// working query to build on
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

// A sample query that returns every task, available to the client as
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

// Returns the currently signed in user, or null when nobody is signed in
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

function convexHttp() {
  return `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth registers the sign in and OAuth callback routes
auth.addHttpRoutes(http);

export default http;
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
// RevenueCat
// ---------------------------------------------------------------------------

function revenuecat() {
  return `import { Alert, Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

// The RevenueCat SDK keys are public keys that are safe to ship in the app,
// they are read from the Expo public environment
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

// Configure RevenueCat a single time when the app starts
export function configureRevenueCat() {
  if (!apiKey) {
    // Without a key we skip configuration so the app still runs during setup
    return;
  }
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey });
}

// Fetches the current offering and purchases its first package, in a real app
// you would show a paywall listing every package here
export async function presentPaywall() {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages[0];
    if (!pkg) {
      Alert.alert("No offerings", "Set up an offering in the RevenueCat dashboard.");
      return;
    }
    await Purchases.purchasePackage(pkg);
    Alert.alert("Thanks", "Your subscription is active.");
  } catch (error: any) {
    if (!error?.userCancelled) {
      Alert.alert("Purchase failed", String(error?.message ?? error));
    }
  }
}
`;
}

// ---------------------------------------------------------------------------
// Universal baseline, shipped in every generated mobile project
// ---------------------------------------------------------------------------

function errorBoundary() {
  return `import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { reportError } from "./lib/reportError";
import { fonts, sizes } from "./lib/typography";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

// A class component is the only way React lets you catch render errors from the
// children below it, this is the root crash guard, it shows a friendly screen
// and reports the error, swap the reportError call for your monitoring SDK later
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    reportError(error, { info });
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text
            className="text-center text-neutral-900 dark:text-white"
            style={{ fontFamily: fonts.bold, fontSize: sizes.title }}
          >
            Something went wrong
          </Text>
          <Text
            className="text-center text-neutral-500 dark:text-neutral-400"
            style={{ fontFamily: fonts.regular, fontSize: sizes.body }}
          >
            An unexpected error stopped the screen, try again to get back on track
          </Text>
          <Pressable
            onPress={this.reset}
            className="rounded-xl bg-neutral-900 px-7 py-4 dark:bg-white"
          >
            <Text
              className="text-white dark:text-neutral-900"
              style={{ fontFamily: fonts.medium, fontSize: sizes.body }}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}
`;
}

function skeleton() {
  return `import { useEffect, useRef } from "react";
import { Animated, useColorScheme } from "react-native";

type Props = { width?: number | string; height?: number; radius?: number };

// A skeleton loader you can drop in while Convex data streams in, it pulses its
// opacity so the placeholder feels alive, the color follows the system theme
export function Skeleton({ width = "100%", height = 16, radius = 8 }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const scheme = useColorScheme();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        opacity,
        backgroundColor: scheme === "dark" ? "#27272a" : "#e5e7eb",
      }}
    />
  );
}
`;
}

function toastStore() {
  return `import { create } from "zustand";

// A Zustand backed toast system, anything in the app can call toast.success(),
// toast.error(), or toast.info() and a message appears through the ToastHost,
// each toast clears itself after a few seconds
export type ToastKind = "info" | "success" | "error";
export type ToastItem = { id: number; message: string; kind: ToastKind };

type ToastState = {
  toasts: ToastItem[];
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
};

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, kind = "info") => {
    const id = ++counter;
    set((state) => ({ toasts: [...state.toasts, { id, message, kind }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// A small convenience wrapper so callers do not have to reach into the store
export const toast = {
  info: (message: string) => useToastStore.getState().show(message, "info"),
  success: (message: string) => useToastStore.getState().show(message, "success"),
  error: (message: string) => useToastStore.getState().show(message, "error"),
};
`;
}

function toastHost() {
  return `import { Pressable, Text, View } from "react-native";
import { useToastStore } from "../lib/toast";
import { fonts, sizes } from "../lib/typography";

// The toast host renders whatever toasts are in the store, it sits once near the
// root so a toast fired from anywhere floats in at the top of the screen
const kindClass: Record<string, string> = {
  info: "bg-neutral-900 dark:bg-neutral-800",
  success: "bg-emerald-600",
  error: "bg-red-600",
};

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View className="absolute inset-x-0 top-16 items-center gap-2 px-4">
      {toasts.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => dismiss(item.id)}
          className={\`w-full max-w-md rounded-xl px-4 py-3 \${kindClass[item.kind]}\`}
        >
          <Text
            className="text-white"
            style={{ fontFamily: fonts.medium, fontSize: sizes.body }}
          >
            {item.message}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
`;
}

function analytics() {
  return `// A single place to send product analytics, right now it logs to the console in
// development so you can watch events fire, wire it to PostHog, Mixpanel, or any
// other service in the marked spot and nothing else in the app has to change

type EventProps = Record<string, unknown>;

export function track(event: string, props: EventProps = {}) {
  if (__DEV__) {
    console.log("[analytics]", event, props);
  }

  // Connect your analytics provider here, for example
  //   posthog.capture(event, props);
  //   mixpanel.track(event, props);
}

// Call this once after a user signs in so later events are attributed to them
export function identify(userId: string, traits: EventProps = {}) {
  if (__DEV__) {
    console.log("[analytics] identify", userId, traits);
  }

  // posthog.identify(userId, traits);
}
`;
}

function reportError() {
  return `// A single place to report crashes and handled errors, right now it logs to the
// console, connect Sentry or another reporting SDK in the marked spot and the
// error boundary starts sending there with no other changes

type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context: ErrorContext = {}) {
  console.error("[reportError]", error, context);

  // Send to your monitoring service here, for example
  //   Sentry.Native.captureException(error, { extra: context });
}
`;
}

function env({ convex, payments }) {
  // Only the public EXPO_PUBLIC_ variables belong here, they are safe to ship in
  // the app bundle, the prefix is what makes Expo expose them at runtime
  const lines = [];
  if (convex) {
    lines.push(`  // The public Convex URL the client connects to`);
    lines.push(`  convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL ?? "",`);
  }
  if (payments) {
    lines.push(`  // The RevenueCat public SDK keys, safe to ship in the app`);
    lines.push(`  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "",`);
    lines.push(
      `  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "",`
    );
  }
  const body = lines.length
    ? lines.join("\n")
    : `  // Add your public EXPO_PUBLIC_ variables here as the app grows`;

  const guardLines = [];
  if (convex) {
    guardLines.push(
      `  if (!env.convexUrl) missing.push("EXPO_PUBLIC_CONVEX_URL");`
    );
  }
  const guardBody = guardLines.join("\n");

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
// simple counter so you can see the pattern, add your own slices for things like
// an onboarding step, a selected tab, or a cached filter
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

function typography() {
  return `import { Dimensions, PixelRatio } from "react-native";

// React Native has no viewport units, so font sizes are scaled here against the
// screen width, this keeps a screen looking filled on a small phone and a large
// tablet alike, the scale is clamped so text never runs away or collapses
const { width } = Dimensions.get("window");
const GUIDELINE_WIDTH = 390; // a common baseline phone width in points

function scale(size: number) {
  const next = (width / GUIDELINE_WIDTH) * size;
  const clamped = Math.max(size * 0.9, Math.min(next, size * 1.3));
  return Math.round(PixelRatio.roundToNearestPixel(clamped));
}

// The responsive size scale, use these through the fontSize style prop
export const sizes = {
  label: scale(12),
  body: scale(16),
  heading: scale(20),
  title: scale(30),
  display: scale(40),
};

// Google Sans ships as one file per weight, so the weight is chosen by family
// name, these fall back to the system font until the real font files are added
export const fonts = {
  regular: "GoogleSans-Regular",
  medium: "GoogleSans-Medium",
  bold: "GoogleSans-Bold",
};
`;
}

// ---------------------------------------------------------------------------
// Static files
// ---------------------------------------------------------------------------

function assetsReadme() {
  return `# Assets

Splash screen and app icon bootstrapping lives here so the app looks polished on
first launch

The splash screen is configured in app.json through the expo-splash-screen
plugin, it shows a solid background that follows the system theme, to use a real
splash image and a custom app icon, drop these files into this folder and point
app.json at them

- icon.png         1024 by 1024, the app icon
- splash.png       the centered splash image
- adaptive-icon.png  1024 by 1024, the Android adaptive foreground

Until you add them Expo uses its built in defaults, so the app still runs
`;
}

function fontsReadme() {
  return `# Fonts

Google Sans is a proprietary font, so it cannot be bundled with this starter.
The three files in this folder are placeholders that keep the bundler happy.

If your project is licensed to use Google Sans, replace these placeholder files
with the real font files, keeping the same names:

- GoogleSans-Regular.ttf
- GoogleSans-Medium.ttf
- GoogleSans-Bold.ttf

Until you replace them the app renders with the system font, which is the clean
default on both iOS and Android.
`;
}

function fontPlaceholder(weight) {
  return `Placeholder for GoogleSans-${weight}.ttf. Replace this file with the real
licensed Google Sans ${weight} font file of the same name. See README in this
folder for details.
`;
}

function gitignore() {
  return `node_modules/
.expo/
dist/
web-build/
*.log
.DS_Store

# local env files
.env
.env*.local
`;
}

function mobileReadme({ appName, convex, googleOAuth, payments }) {
  const steps = ["1. Install dependencies:\n\n   ```bash\n   npm install\n   ```"];
  if (convex) {
    steps.push(
      "2. Start Convex, which provisions a deployment and fills in your public URL:\n\n   ```bash\n   npx convex dev\n   ```"
    );
  }
  if (googleOAuth) {
    steps.push(
      "3. Push the Google OAuth secrets into your Convex deployment:\n\n   ```bash\n   bash scripts/set-convex-env.sh\n   ```\n\n   On Windows PowerShell run `./scripts/set-convex-env.ps1` instead."
    );
  }
  steps.push(
    `${steps.length + 1}. Start the app:\n\n   \`\`\`bash\n   npm run ios\n   \`\`\``
  );

  const features = [
    "- Expo and React Native with NativeWind",
    "- A production ready baseline",
  ];
  if (convex) features.push("- Convex database and backend");
  if (googleOAuth) features.push("- Google sign in through Convex Auth");
  if (payments) features.push("- RevenueCat subscriptions");

  return `# ${appName}

A Mobile application generated by the modular boilerplate CLI.

## Included

${features.join("\n")}

## Getting started

${steps.join("\n\n")}

## Fonts

Add your licensed Google Sans font files to \`assets/fonts\`. See the README in
that folder for the expected file names.
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

function json(value) {
  return JSON.stringify(value, null, 2) + "\n";
}
