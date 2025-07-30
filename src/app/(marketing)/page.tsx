import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          {/* Main Heading */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-4 tracking-tight">
              AnthonChat
            </h1>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
          </div>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Connect your messaging channels and unlock the power of AI-driven conversations. 
            Seamlessly integrate WhatsApp, Telegram, and more with intelligent automation.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/signup"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-10 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="bg-card hover:bg-accent text-card-foreground font-semibold py-4 px-10 rounded-xl border border-border transition-all duration-200 hover:shadow-md"
            >
              Sign In
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card hover:bg-card/80 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">
                Multi-Channel Support
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Connect WhatsApp, Telegram, and other messaging platforms in one unified dashboard.
              </p>
            </div>
            
            <div className="bg-card hover:bg-card/80 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">
                AI-Powered Automation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Leverage advanced AI to automate responses and enhance customer interactions.
              </p>
            </div>
            
            <div className="bg-card hover:bg-card/80 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">
                Easy Setup
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Get started in minutes with our streamlined onboarding process and intuitive interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
