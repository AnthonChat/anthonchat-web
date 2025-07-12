import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AnthonChat
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect your messaging channels and unlock the power of AI-driven conversations. 
            Seamlessly integrate WhatsApp, Telegram, and more with intelligent automation.
          </p>
          
          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg border border-blue-600 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Multi-Channel Support
              </h3>
              <p className="text-gray-600">
                Connect WhatsApp, Telegram, and other messaging platforms in one unified dashboard.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                AI-Powered Automation
              </h3>
              <p className="text-gray-600">
                Leverage advanced AI to automate responses and enhance customer interactions.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Easy Setup
              </h3>
              <p className="text-gray-600">
                Get started in minutes with our streamlined onboarding process and intuitive interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
