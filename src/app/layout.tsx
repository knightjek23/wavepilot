import type { Metadata } from "next";
import { Red_Hat_Display, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Design System v2 — Red Hat Display (display) + Inter (body/UI).
// See docs/wavepilot-design-system-v2.md
const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-display-loaded",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body-loaded",
});

export const metadata: Metadata = {
  title: "Wavepilot — Stop guessing. Start growing.",
  description:
    "AI-powered social media growth tool. Get a personalized content game plan based on live trending data — in under 3 minutes.",
  keywords: ["social media", "content strategy", "trending", "AI", "growth"],
};

function Providers({ children }: { children: React.ReactNode }) {
  // Clerk validates the key format strictly — skip wrapping when key is absent
  // (e.g. during CI builds that don't have real secrets)
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey || clerkKey.startsWith("pk_test_placeholder")) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      appearance={{
        variables: {
          colorPrimary: "#C84B24",
          colorText: "#1F1F1F",
          colorTextSecondary: "#7A808C",
          colorBackground: "#FFFFFF",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#1F1F1F",
          borderRadius: "6px",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${redHatDisplay.variable} ${inter.variable}`}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
