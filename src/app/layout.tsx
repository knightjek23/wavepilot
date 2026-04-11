import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

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
          colorPrimary: "#1D9E75",
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
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
