"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { createClient } from "@/utils/supabase/browser";

interface SignupFormProps {
  message?: string | null;
}

export default function SignupForm({ message }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'auth' | 'stripe' | 'complete'>('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(message || null);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      if (claims) {
        router.push('/dashboard');
      }
    };
    checkAuth();
  }, [router]);

  const getLoadingMessage = () => {
    switch (loadingStep) {
      case 'auth':
        return "Creating your account...";
      case 'stripe':
        return "Setting up billing & payment processing...";
      case 'complete':
        return "Almost done! Finalizing your account...";
      default:
        return "Processing...";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setLoadingStep('auth');

    try {
      // Create FormData to match the server action signature
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      // Simulate the progression through steps
      setTimeout(() => setLoadingStep('stripe'), 1500); // Move to Stripe step after 1.5s

      // Call the server action
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      // If we get here, the signup was successful
      setLoadingStep('complete');
      
      // Small delay to show the completion message
      setTimeout(() => {
        router.push('/signup/complete');
      }, 1000);

    } catch (error) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription className="text-base">
            Sign up for a new AnthonChat account
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
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
                disabled={isLoading}
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
                disabled={isLoading}
                className="h-11"
              />
            </div>

            {/* Loading Progress Indicator */}
            {isLoading && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">{getLoadingMessage()}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle 
                      className={`h-4 w-4 ${loadingStep !== 'auth' ? 'text-green-500' : 'text-muted-foreground'}`} 
                    />
                    <span>Creating your account</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="relative">
                      {loadingStep === 'stripe' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : loadingStep === 'complete' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <span>Configuring billing & payments</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle 
                      className={`h-4 w-4 ${loadingStep === 'complete' ? 'text-green-500' : 'text-muted-foreground'}`} 
                    />
                    <span>Preparing your dashboard</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  We&apos;re setting up your account with secure payment processing. This ensures you can manage subscriptions and billing seamlessly.
                </p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col w-full gap-4 pt-6 px-6">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getLoadingMessage()}
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
            
            <Button variant="outline" className="w-full" asChild disabled={isLoading}>
              <Link href="/login">Already have an account? Sign In</Link>
            </Button>
            
            {error && (
              <p className="mt-2 p-4 bg-destructive/10 text-destructive text-center w-full rounded-md text-sm">
                {error}
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}