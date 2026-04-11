import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <SignUp
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
