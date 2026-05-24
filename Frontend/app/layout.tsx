import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OnboardingProvider } from "@/components/Onboarding/OnboardingContext";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import '@fontsource/google-sans-flex';
import Clarity from "./Clarity";
export const metadata: Metadata = {
  title: "RevAgent",
  description: "Start your digital campaigns with RevAgent.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <OnboardingProvider>
        <html lang="en" suppressHydrationWarning>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
          </head>
          <body suppressHydrationWarning>
            {children}
            <Clarity />
          </body>
        </html>
      </OnboardingProvider>
    </ClerkProvider>
  )
}
