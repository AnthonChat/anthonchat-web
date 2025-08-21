import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/features/dashboard/ThemeProvider";
import { AuthProvider } from "@/components/features/auth/AuthProvider";
import { AuthErrorBoundary } from "@/components/features/auth/AuthErrorBoundary";
import { locales, defaultLocale } from "@/i18n/routing";
 
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
 
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
 
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
const SITE_NAME = "TryAnthon";
const DEFAULT_DESCRIPTION =
  "An AI coach that provides personalized, multi-channel support for athletes and teams.";
const AUTHORS = [
  { name: "Antonio Valente", role: "Founder" },
  { name: "Tommaso Coviello", role: "Co-Founder & Lead Developer" },
  { name: "Matteo Scarselletta", role: "Co-Founder & Developer" },
];
const DEFAULT_IMAGE = "/file.svg";
 
// Root-level metadata: sensible defaults, keyword hints and language alternates.
// Per-locale routes produce their own metadata via src/app/[locale]/layout.tsx generateMetadata.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: "%s | " + SITE_NAME },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "Anthon",
    "AI coach",
    "mental coach",
    "athlete support",
    "customer support",
    "real-time AI",
    "SINCRO GROUP SRL"
  ],
  authors: AUTHORS,
  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    siteName: SITE_NAME,
    url: SITE_URL,
    images: [DEFAULT_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
    languages: (locales as readonly string[]).reduce<Record<string, string>>(
      (acc, l) => {
        acc[l] = `${SITE_URL}${l === defaultLocale ? `/${l}` : `/${l}`}`;
        return acc;
      },
      {}
    ),
  },
};
 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <AuthErrorBoundary>{children}</AuthErrorBoundary>
          </AuthProvider>
          <Toaster
            position="top-right"
            expand={true}
            richColors={true}
            closeButton={true}
            duration={5000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
