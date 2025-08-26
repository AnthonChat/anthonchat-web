"use client";

import React from "react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuthState } from "@/components/features/auth/AuthProvider";
import { buildAuthRedirectUrl } from "@/lib/utils/redirect-helpers";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignupForm from "./SignupForm";

interface SignupPageWrapperProps {
  message?: string | null;
  link?: string | null;
  channel?: string | null;
}

interface UserExistenceState {
  isChecking: boolean;
  userExists: boolean | null;
  checkedEmail: string | null;
  error: string | null;
}

export default function SignupPageWrapper({ message, link, channel }: SignupPageWrapperProps) {
  const { isAuthenticated, isLoading, isInitialized } = useAuthState();
  const router = useLocaleRouter();
  
  const [userExistenceState, setUserExistenceState] = useState<UserExistenceState>({
    isChecking: false,
    userExists: null,
    checkedEmail: null,
    error: null,
  });

  const redirectToLogin = useCallback((additionalParams: Record<string, string> = {}) => {
    const currentParams = { message, link, channel, ...additionalParams };
    const loginUrl = buildAuthRedirectUrl("LOGIN", currentParams);
    
    router.push(loginUrl);
  }, [message, link, channel, router]);

  const showExistingUserMessage = useCallback(() => {
    return (
      <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
        <Card className="shadow-lg">
          <CardContent className="flex flex-col space-y-4 py-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Account Already Exists</h2>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                An account with this email address already exists. Please sign in to continue.
                {(link || channel) && (
                  <span className="block mt-2 text-sm text-muted-foreground">
                    Your channel linking information will be preserved.
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <Button 
                onClick={() => redirectToLogin()}
                className="w-full"
              >
                Sign In Instead
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setUserExistenceState({
                  isChecking: false,
                  userExists: null,
                  checkedEmail: null,
                  error: null,
                })}
                className="w-full"
              >
                Try Different Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [redirectToLogin, link, channel]);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const params = new URLSearchParams();
      if (link) params.set("link", link);
      if (channel) params.set("channel", channel);
      if (message) params.set("message", message);
      
      const dashboardUrl = params.toString() 
        ? `/dashboard?${params.toString()}`
        : "/dashboard";
      
      router.push(dashboardUrl);
    }
  }, [isAuthenticated, isInitialized, router, link, channel, message]);

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

  if (!isAuthenticated) {
    if (userExistenceState.userExists === true) {
      return showExistingUserMessage();
    }

    return (
      <SignupForm 
        message={message} 
        link={link} 
        channel={channel}
        userExistenceState={userExistenceState}
        onRedirectToLogin={redirectToLogin}
      />
    );
  }

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
