"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuthState } from "@/components/features/auth/AuthProvider";
import SignupForm from "./SignupForm";

interface SignupPageWrapperProps {
  message?: string | null;
  link?: string | null;
  channel?: string | null;
}

/**
 * Wrapper component che gestisce l'auth checking per la signup page
 * Separato dal SignupForm per evitare problemi di ordine degli hooks
 */
export default function SignupPageWrapper({ message, link, channel }: SignupPageWrapperProps) {
  const { isAuthenticated, isLoading, isInitialized } = useAuthState();
  const router = useRouter();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isInitialized, router]);

  // Loading state durante l'inizializzazione dell'auth
  if (!isInitialized || isLoading) {
    return (
      <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
        <Card className="shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Verifica autenticazione...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se l'utente non è autenticato, mostra il form di signup
  if (!isAuthenticated) {
    return <SignupForm message={message} link={link} channel={channel} />;
  }

  // Se l'utente è autenticato, mostra loading (verrà reindirizzato)
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Reindirizzamento alla dashboard...</p>
        </CardContent>
      </Card>
    </div>
  );
}