'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, CreditCard, Settings } from "lucide-react"
import { useStripeCheckout } from '@/hooks/useStripe'
import { formatTime } from '@/lib/utils/date-formatting'

/**
 * Test page for Stripe integration
 * This page helps verify that all Stripe functionality is working correctly
 * Remove this file before deploying to production
 */
export default function TestStripePage() {
  const { createCheckoutSession, createPortalSession, isLoading, error } = useStripeCheckout()
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    // Use consistent time format to prevent hydration mismatches
    const timestamp = formatTime()
    setLogs(prev => [...prev, `${timestamp}: ${message}`])
  }

  const testCheckoutSession = async (tierSlug: string) => {
    addLog(`Testing checkout session for ${tierSlug}...`)
    try {
      await createCheckoutSession(tierSlug)
      setTestResults(prev => ({ ...prev, [`checkout_${tierSlug}`]: true }))
      addLog(`✅ Checkout session created for ${tierSlug}`)
    } catch (err) {
      setTestResults(prev => ({ ...prev, [`checkout_${tierSlug}`]: false }))
      addLog(`❌ Checkout session failed for ${tierSlug}: ${err}`)
    }
  }

  const testPortalSession = async () => {
    addLog('Testing customer portal session...')
    try {
      await createPortalSession()
      setTestResults(prev => ({ ...prev, portal: true }))
      addLog('✅ Portal session created')
    } catch (err) {
      setTestResults(prev => ({ ...prev, portal: false }))
      addLog(`❌ Portal session failed: ${err}`)
    }
  }

  const testApiEndpoint = async (endpoint: string, method: string = 'GET') => {
    addLog(`Testing API endpoint: ${method} ${endpoint}...`)
    try {
      const response = await fetch(endpoint, { method })
      const data = await response.json()
      
      if (response.ok) {
        setTestResults(prev => ({ ...prev, [endpoint]: true }))
        addLog(`✅ ${endpoint} responded successfully`)
      } else {
        setTestResults(prev => ({ ...prev, [endpoint]: false }))
        addLog(`❌ ${endpoint} failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [endpoint]: false }))
      addLog(`❌ ${endpoint} failed: ${err}`)
    }
  }

  const checkEnvironmentVariables = () => {
    addLog('Checking environment variables...')
    
    // Check client-side environment variables
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    
    const missingVars = []
    
    if (!publishableKey || publishableKey === '' || publishableKey === 'pk_test_your_stripe_publishable_key_here') {
      missingVars.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
    }
    
    if (missingVars.length === 0) {
      setTestResults(prev => ({ ...prev, env_vars: true }))
      addLog('✅ All required environment variables are set')
      addLog(`✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${publishableKey?.substring(0, 20)}...`)
    } else {
      setTestResults(prev => ({ ...prev, env_vars: false }))
      addLog(`❌ Missing environment variables: ${missingVars.join(', ')}`)
      addLog(`Current value: ${publishableKey || 'undefined'}`)
    }
  }

  const runAllTests = async () => {
    setTestResults({})
    setLogs([])
    
    addLog('🚀 Starting Stripe integration tests...')
    
    // Check environment variables
    checkEnvironmentVariables()
    
    // Test API endpoints (these will likely fail without authentication)
    await testApiEndpoint('/api/stripe/create-checkout-session', 'POST')
    await testApiEndpoint('/api/stripe/create-portal-session', 'POST')
    
    addLog('🏁 Tests completed')
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Stripe Integration Test</h1>
        <p className="text-muted-foreground">
          This page helps verify that your Stripe integration is working correctly.
        </p>
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This is a test page. Remove it before deploying to production.
          </AlertDescription>
        </Alert>
      </div>

      {/* Environment Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Environment Configuration
          </CardTitle>
          <CardDescription>
            Check if required environment variables are configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkEnvironmentVariables} disabled={isLoading}>
            Check Environment Variables
          </Button>
          {testResults.env_vars !== undefined && (
            <div className="mt-4">
              <Badge variant={testResults.env_vars ? 'default' : 'destructive'}>
                {testResults.env_vars ? '✅ Environment OK' : '❌ Environment Issues'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Checkout Session Tests
          </CardTitle>
          <CardDescription>
            Test creating Stripe checkout sessions for different plans
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['basic', 'standard', 'pro'].map(tier => (
              <div key={tier} className="space-y-2">
                <Button 
                  onClick={() => testCheckoutSession(tier)}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  Test {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                </Button>
                {testResults[`checkout_${tier}`] !== undefined && (
                  <Badge variant={testResults[`checkout_${tier}`] ? 'default' : 'destructive'}>
                    {testResults[`checkout_${tier}`] ? '✅ Success' : '❌ Failed'}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Portal Test */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Portal Test</CardTitle>
          <CardDescription>
            Test creating a customer portal session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testPortalSession} disabled={isLoading}>
            Test Customer Portal
          </Button>
          {testResults.portal !== undefined && (
            <div className="mt-4">
              <Badge variant={testResults.portal ? 'default' : 'destructive'}>
                {testResults.portal ? '✅ Portal OK' : '❌ Portal Failed'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run All Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Run All Tests</CardTitle>
          <CardDescription>
            Execute all available tests at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runAllTests} disabled={isLoading} className="w-full">
            {isLoading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Test Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Logs</CardTitle>
            <CardDescription>
              Real-time logs from test execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Quick setup guide for Stripe integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">1. Environment Variables</h4>
            <p className="text-sm text-muted-foreground">
              Set the following in your <code>.env.local</code> file:
            </p>
            <pre className="bg-muted p-2 rounded text-xs">
{`STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...`}
            </pre>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">2. Create Products</h4>
            <p className="text-sm text-muted-foreground">
              Run the setup script to create Stripe products:
            </p>
            <pre className="bg-muted p-2 rounded text-xs">
              node scripts/setup-stripe-products.js
            </pre>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">3. Configure Webhooks</h4>
            <p className="text-sm text-muted-foreground">
              Add webhook endpoint in Stripe Dashboard:
            </p>
            <pre className="bg-muted p-2 rounded text-xs">
              https://yourdomain.com/api/stripe/webhooks
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}