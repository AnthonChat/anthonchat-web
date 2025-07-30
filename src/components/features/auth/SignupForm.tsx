"use client";

import React, { useState, useEffect } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";
import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import type { FormState } from "@/lib/auth/types";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationErrorType } from "@/lib/notifications/types";


interface SignupFormProps {
  message?: string | null;
}

const initialState: FormState = {
  message: undefined,
  errors: undefined,
  success: false,
};

export default function SignupForm({ message }: SignupFormProps) {
  const [formState, formAction, isPending] = useActionState(signUp, initialState);
  const [loadingStep, setLoadingStep] = useState<
    "auth" | "stripe" | "complete"
  >("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showError, showSuccess } = useNotifications();

  const getLoadingMessage = () => {
    switch (loadingStep) {
      case "auth":
        return "Creating your account...";
      case "stripe":
        return "Setting up billing & payment processing...";
      case "complete":
        return "Almost done! Finalizing your account...";
      default:
        return "Processing...";
    }
  };

  // Handle form state changes and loading progression
  React.useEffect(() => {
    if (isPending) {
      setLoadingStep("auth");
      // Simulate the progression through steps for UX
      setTimeout(() => setLoadingStep("stripe"), 1500);
      setTimeout(() => setLoadingStep("complete"), 3000);
    }
  }, [isPending]);

  // Handle form state changes for toast notifications
  useEffect(() => {
    // Show error toast if there are errors
    if (formState.errors && formState.errors.length > 0) {
      const detailedErrorMessage = formState.errors
        .map((err) => err.message)
        .join(". ");
      showError(
        "Errore di validazione", // Titolo più specifico
        `Il form contiene errori: ${detailedErrorMessage}`, // Messaggio combinato
        {
          errorType: NotificationErrorType.VALIDATION_ERROR,
          context: "signup_form_validation",
          config: {
            duration: 8000,
          },
        }
      );
    } else if (formState.message && !formState.success) {
      // Show error toast for general messages if no specific form errors
      showError(
        "Errore durante la registrazione",
        formState.message,
        {
          errorType: NotificationErrorType.API_ERROR,
          context: 'signup_form_action',
          config: {
            duration: 8000
          }
        }
      );
    }

    // Show success toast if registration is successful
    if (formState.success) {
      showSuccess(
        'Registrazione completata!',
        'Il tuo account è stato creato con successo. Verrai reindirizzato al dashboard.'
      );
    }
  }, [formState, showError, showSuccess]);

  // Handle external message prop
  useEffect(() => {
    if (message) {
      showError(
        'Errore',
        message,
        {
          errorType: NotificationErrorType.API_ERROR,
          context: 'signup_external_message',
          config: {
            duration: 6000
          }
        }
      );
    }
  }, [message, showError]);

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription className="text-base">
            Sign up for a new AnthonChat account
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="flex flex-col w-full gap-6 text-foreground px-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isPending}
                className="h-11"
              />
              <CardDescription>
                Password must be at least 8 characters long and contain at least one number and one letter.
              </CardDescription>
            </div>

            {/* Loading Progress Indicator */}
            {isPending && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    {getLoadingMessage()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle
                      className={`h-4 w-4 ${
                        loadingStep !== "auth"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span>Creating your account</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="relative">
                      {loadingStep === "stripe" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : loadingStep === "complete" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span>Configuring billing & payments</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle
                      className={`h-4 w-4 ${
                        loadingStep === "complete"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span>Preparing your dashboard</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  We&apos;re setting up your account with secure payment
                  processing. This ensures you can manage subscriptions and
                  billing seamlessly.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getLoadingMessage()}
                </>
              ) : (
                "Sign Up"
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              asChild
              disabled={isPending}
            >
              <Link href="/login">Already have an account? Sign In</Link>
            </Button>

          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
