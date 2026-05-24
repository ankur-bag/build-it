import React from 'react'
import { OnboardingProvider } from '@/components/Onboarding/OnboardingContext'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  )
}
