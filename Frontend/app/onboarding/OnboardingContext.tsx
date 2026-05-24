'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export interface OnboardingData {
  businessType: 'ecommerce' | 'saas' | 'local-service' | 'creator' | 'education' | 'other' | ''
  targetAudience: 'b2c' | 'b2b' | 'both' | ''
  brandStyle: ('professional' | 'friendly' | 'casual' | 'energetic' | 'premium')[]
  responsePreference: 'short' | 'balanced' | 'detailed' | ''
  language: 'english' | 'hindi' | ''
  region: 'india' | 'global' | ''
  complianceNotes: string
  termsAccepted: boolean
}

interface OnboardingContextType {
  onboarding: OnboardingData
  updateOnboarding: (updates: Partial<OnboardingData>) => void
  isOnboardingCompleted: boolean
  setIsOnboardingCompleted: (completed: boolean) => void
  saveOnboarding: () => Promise<void>
  resetOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser()
  const [onboarding, setOnboarding] = useState<OnboardingData>({
    businessType: '',
    targetAudience: '',
    brandStyle: [],
    responsePreference: '',
    language: '',
    region: '',
    complianceNotes: '',
    termsAccepted: false,
  })

  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load onboarding state from localStorage and Clerk metadata
  useEffect(() => {
    if (user) {
      // Check Clerk metadata first for the source of truth
      const onboardingComplete = (user.unsafeMetadata as any)?.onboardingComplete ?? false
      
      if (onboardingComplete) {
        // If completed in Clerk, load the saved data from localStorage
        const savedData = localStorage.getItem(`onboarding_${user.id}`)
        if (savedData) {
          try {
            setOnboarding(JSON.parse(savedData))
          } catch (error) {
            console.error('Failed to parse saved onboarding data:', error)
          }
        }
        setIsOnboardingCompleted(true)
      } else {
        // If not completed, load any draft data from localStorage
        const savedData = localStorage.getItem(`onboarding_${user.id}`)
        if (savedData) {
          try {
            setOnboarding(JSON.parse(savedData))
          } catch (error) {
            console.error('Failed to parse saved onboarding data:', error)
          }
        }
        setIsOnboardingCompleted(false)
      }
    }
    setIsLoading(false)
  }, [user?.id])

  const updateOnboarding = (updates: Partial<OnboardingData>) => {
    setOnboarding((prev) => ({ ...prev, ...updates }))
  }

  const saveOnboarding = async () => {
    if (user) {
      try {
        // Save to API route (which will use Admin SDK to write to Firestore)
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(onboarding),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save onboarding')
        }

        // Save to localStorage as backup
        localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(onboarding))

        // Update Clerk metadata to mark onboarding as completed
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata || {}),
            onboardingComplete: true,
          },
        })
        // Reload user to get updated metadata
        await user.reload()
        setIsOnboardingCompleted(true)
      } catch (error) {
        console.error('Failed to save onboarding:', error)
        throw error
      }
    }
  }

  const resetOnboarding = () => {
    setOnboarding({
      businessType: '',
      targetAudience: '',
      brandStyle: [],
      responsePreference: '',
      language: '',
      region: '',
      complianceNotes: '',
      termsAccepted: false,
    })
    setIsOnboardingCompleted(false)
    if (user) {
      localStorage.removeItem(`onboarding_${user.id}`)
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        onboarding,
        updateOnboarding,
        isOnboardingCompleted,
        setIsOnboardingCompleted,
        saveOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
