import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#1D9E75",
          },
        }}
        fallbackRedirectUrl="/onboarding"
      />
    </main>
  );
}
