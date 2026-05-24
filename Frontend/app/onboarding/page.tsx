'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useOnboarding } from '@/components/Onboarding/OnboardingContext'
import { OnboardingFlow } from '@/components/Onboarding/OnboardingFlow'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { isOnboardingCompleted } = useOnboarding()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || !isLoaded) return

    // If no user, redirect to sign-in
    if (!user) {
      router.push('/sign-in')
      return
    }

    // If onboarding is already completed, redirect to dashboard
    if (isOnboardingCompleted) {
      router.push('/dashboard')
    }
  }, [user, isLoaded, isOnboardingCompleted, router, isMounted])

  if (!isMounted || !isLoaded || !user) {
    // Show a loading state while checking
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (isOnboardingCompleted) {
    return null
  }

  return <OnboardingFlow />
}
