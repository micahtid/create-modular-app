// This module builds the file tree for a Mobile target project using Expo and
// React Native. Like the web builder it returns a map of relative file paths to
// their text content, composed conditionally from the accepted feature modules.
//
// The styling uses the standard React Native StyleSheet for a clean, modern iOS
// style look with no extra styling dependency. Fonts are loaded asynchronously
// with expo-font before the main container renders, as required.

// options: { appName, convex, googleOAuth, payments }
export function buildMobileProject(options) {
  const files = {};

  files["package.json"] = mobilePackageJson(options);
  files["app.json"] = appJson(options);
  files["babel.config.js"] = babelConfig();
  files["tsconfig.json"] = tsconfig();
  files["index.js"] = entryPoint();
  files["App.tsx"] = appRoot(options);
  files["src/theme.ts"] = theme();
  files["src/MainScreen.tsx"] = mainScreen(options);
  files["assets/fonts/README.md"] = fontsReadme();
  // Placeholder font files keep the bundler happy before the real proprietary
  // Google Sans files are added. They are replaced during setup.
  files["assets/fonts/GoogleSans-Regular.ttf"] = fontPlaceholder("Regular");
  files["assets/fonts/GoogleSans-Medium.ttf"] = fontPlaceholder("Medium");
  files["assets/fonts/GoogleSans-Bold.ttf"] = fontPlaceholder("Bold");
  files[".gitignore"] = gitignore();
  files["README.md"] = mobileReadme(options);

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

function appJson({ appName }) {
  // The scheme is required for the OAuth redirect to return to the app.
  const scheme = appName.replace(/[^a-z0-9]/gi, "").toLowerCase() || "modularapp";
  return json({
    expo: {
      name: appName,
      slug: appName,
      version: "1.0.0",
      orientation: "portrait",
      scheme,
      userInterfaceStyle: "light",
      newArchEnabled: true,
      ios: { supportsTablet: true },
      android: {
        // A standard launch mode keeps in app purchase flows from being
        // cancelled when the billing sheet backgrounds the app.
        edgeToEdgeEnabled: true,
      },
      plugins: ["expo-font", "expo-secure-store"],
    },
  });
}

function babelConfig() {
  return `// Babel configuration for Expo. The preset covers React Native and Expo APIs.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
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
  return `// The entry point registers the root App component with Expo. Keeping this in a
// small file lets App.tsx focus purely on the application itself.
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
    `import { useCallback } from "react";`,
    `import { useFonts } from "expo-font";`,
    `import * as SplashScreen from "expo-splash-screen";`,
    `import { View } from "react-native";`,
    `import { StatusBar } from "expo-status-bar";`,
    `import { MainScreen } from "./src/MainScreen";`,
  ];
  if (convex) imports.push(`import { AppConvexProvider } from "./src/ConvexProvider";`);
  if (payments) imports.push(`import { configureRevenueCat } from "./src/revenuecat";`);

  // The main screen is wrapped in the Convex provider when the backend is on.
  const wrapped = convex
    ? `<AppConvexProvider>
        <MainScreen />
      </AppConvexProvider>`
    : `<MainScreen />`;

  const revenueCatInit = payments
    ? `
// Configure RevenueCat once, as early as possible in the app lifecycle.
configureRevenueCat();
`
    : "";

  return `${imports.join("\n")}

// Keep the native splash screen visible while the fonts load so the app never
// flashes an unstyled first frame.
SplashScreen.preventAutoHideAsync();
${revenueCatInit}
export default function App() {
  // Google Sans is loaded asynchronously here. The main container is not
  // rendered until the fonts are ready, or until loading fails, in which case
  // the system font fallback is used.
  const [fontsLoaded, fontError] = useFonts({
    "GoogleSans-Regular": require("./assets/fonts/GoogleSans-Regular.ttf"),
    "GoogleSans-Medium": require("./assets/fonts/GoogleSans-Medium.ttf"),
    "GoogleSans-Bold": require("./assets/fonts/GoogleSans-Bold.ttf"),
  });

  // Once fonts are ready we hide the splash screen on the next frame.
  const onReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onReady}>
      <StatusBar style="dark" />
      ${wrapped}
    </View>
  );
}
`;
}

function theme() {
  return `import { Platform } from "react-native";

// A small design token file for the clean iOS style look. Font names fall back
// to the system font automatically if the Google Sans files are not present.
export const font = {
  regular: "GoogleSans-Regular",
  medium: "GoogleSans-Medium",
  bold: "GoogleSans-Bold",
};

export const colors = {
  background: "#f2f2f7", // the familiar iOS grouped background
  card: "#ffffff",
  text: "#1c1c1e",
  subtle: "#8e8e93",
  accent: "#0a84ff", // the iOS system blue
  border: "#e5e5ea",
};

export const radius = {
  card: 16,
  button: 12,
};

// A subtle card shadow that reads well on iOS and Android.
export const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
  default: {},
});
`;
}

function mainScreen({ convex, googleOAuth, payments }) {
  if (googleOAuth) {
    const purchaseImport = payments
      ? `\nimport { presentPaywall } from "./revenuecat";`
      : "";
    const subscribeButton = payments
      ? `
        <Pressable style={styles.secondaryButton} onPress={presentPaywall}>
          <Text style={styles.secondaryButtonText}>Manage subscription</Text>
        </Pressable>`
      : "";
    return `import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../convex/_generated/api";
import { useGoogleSignIn } from "./useGoogleSignIn";
import { colors, font, radius, shadow } from "./theme";${purchaseImport}

// The main screen switches its whole layout based on the sign in state. When
// signed out it shows a Google login button. When signed in it shows the user
// details and a logout button.
export function MainScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <AuthLoading>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
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

// The signed out view with a single, prominent Google login button.
function SignedOut() {
  const signIn = useGoogleSignIn();
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Modular App</Text>
      <Text style={styles.subtitle}>Sign in to get started.</Text>
      <Pressable style={styles.primaryButton} onPress={signIn}>
        <Text style={styles.primaryButtonText}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

// The signed in view showing the user details and a logout button.
function SignedIn() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  return (
    <View style={styles.content}>
      <Text style={styles.title}>Welcome</Text>
      <View style={[styles.card, shadow]}>
        <Text style={styles.cardLabel}>Signed in as</Text>
        <Text style={styles.cardValue}>{user?.name ?? user?.email ?? "..."}</Text>
        {user?.email ? <Text style={styles.cardSubtle}>{user.email}</Text> : null}
      </View>${subscribeButton}
      <Pressable style={styles.dangerButton} onPress={() => signOut()}>
        <Text style={styles.dangerButtonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  content: { flex: 1, padding: 24, gap: 16, justifyContent: "center" },
  title: { fontFamily: font.bold, fontSize: 30, color: colors.text },
  subtitle: { fontFamily: font.regular, fontSize: 16, color: colors.subtle, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    gap: 4,
  },
  cardLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.subtle,
  },
  cardValue: { fontFamily: font.medium, fontSize: 18, color: colors.text },
  cardSubtle: { fontFamily: font.regular, fontSize: 14, color: colors.subtle },
  primaryButton: {
    backgroundColor: colors.text,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.button,
  },
  primaryButtonText: { fontFamily: font.medium, fontSize: 16, color: "#fff" },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: "center",
  },
  secondaryButtonText: { fontFamily: font.medium, fontSize: 16, color: colors.text },
  dangerButton: { paddingVertical: 14, borderRadius: radius.button, alignItems: "center" },
  dangerButtonText: { fontFamily: font.medium, fontSize: 16, color: "#ff3b30" },
});
`;
  }

  // A version without authentication for projects that skipped it.
  return `import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, shadow } from "./theme";

// A simple main screen for projects generated without authentication.
export function MainScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Modular App</Text>
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardValue}>Your app starts here.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, gap: 16, justifyContent: "center" },
  title: { fontFamily: font.bold, fontSize: 30, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 20 },
  cardValue: { fontFamily: font.medium, fontSize: 18, color: colors.text },
});
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

// The Convex client connects to the deployment named by the public env variable.
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Convex Auth stores its tokens in the device secure store so the session
// survives app restarts. This adapter maps its calls to expo-secure-store.
const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

// This provider adds Convex Auth on top of the Convex client so the UI can read
// the signed in state and call the sign in and sign out actions.
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

// The Convex client connects to the deployment named by the public env variable.
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// This provider makes Convex queries and mutations available to the whole app.
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

// This hook drives the native Google sign in flow for Convex Auth.
// It asks Convex Auth for the provider URL, opens it in a secure browser
// session, and then hands the returned authorization code back to Convex Auth
// to finish signing in.
export function useGoogleSignIn() {
  const { signIn } = useAuthActions();

  return useCallback(async () => {
    // The redirect URI must match the app scheme declared in app.json.
    const redirectTo = makeRedirectUri();

    const { redirect } = await signIn("google", { redirectTo });

    const result = await openAuthSessionAsync(redirect!.toString(), redirectTo);
    if (result.type !== "success") {
      return;
    }

    // Pull the authorization code out of the redirect URL and exchange it.
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

// The auth tables are provided by Convex Auth and store users and sessions.
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

// Define your database tables here. This sample tasks table gives the starter a
// working query to build on.
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

function convexHttp() {
  return `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth registers the sign in and OAuth callback routes.
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

// The RevenueCat SDK keys are public keys that are safe to ship in the app.
// They are read from the Expo public environment.
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

// Configure RevenueCat a single time when the app starts.
export function configureRevenueCat() {
  if (!apiKey) {
    // Without a key we skip configuration so the app still runs during setup.
    return;
  }
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey });
}

// Fetches the current offering and purchases its first package. In a real app
// you would show a paywall listing every package here.
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
// Static files
// ---------------------------------------------------------------------------

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

  const features = ["- Expo and React Native", "- Async Google Sans font loading", "- iOS style layout"];
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
