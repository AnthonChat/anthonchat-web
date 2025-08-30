import SignupPageWrapper from "@/components/features/auth/SignupPageWrapper";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string; link: string; channel: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  // L'auth checking è ora gestito dal SignupPageWrapper tramite useAuthState
  // che utilizza il nostro AuthProvider unificato
  return (
    <SignupPageWrapper
      message={resolvedSearchParams?.message}
      link={resolvedSearchParams?.link}
      channel={resolvedSearchParams?.channel}
    />
  );
}
