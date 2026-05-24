'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export interface OnboardingData {
  businessType: 'ecommerce' | 'saas' | 'local-service' | 'creator' | 'education' | 'other' | ''
  targetAudience: 'b2c' | 'b2b' | 'both' | ''
  brandStyle: ('professional' | 'friendly' | 'casual' | 'energetic' | 'premium')[]
  responsePreference: 'short' | 'balanced' | 'detailed' | ''
  language?: 'english' | 'hindi' | ''
  region?: 'india' | 'global' | ''
  complianceNotes?: string
  termsAccepted: boolean
}

interface OnboardingContextType {
  onboarding: OnboardingData
  updateOnboarding: (updates: Partial<OnboardingData>) => void
  isOnboardingCompleted: boolean
  setIsOnboardingCompleted: (completed: boolean) => void
  saveOnboarding: () => Promise<void>
  resetOnboarding: () => void
  showModal: boolean
  closeModal: () => void
  isLoading: boolean
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded } = useUser()
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
  const [showModal, setShowModal] = useState(false)

  // Initialize only once when user loads
  useEffect(() => {
    if (isLoaded && user) {
      // Check if user completed onboarding from Clerk metadata
      const onboardingComplete = (user.unsafeMetadata as any)?.onboardingComplete ?? false
      
      if (onboardingComplete) {
        // User has completed onboarding before
        setIsOnboardingCompleted(true)
        setShowModal(false)
      } else {
        // User hasn't completed onboarding yet, show the modal
        setIsOnboardingCompleted(false)
        setShowModal(true)
      }
      
      setIsLoading(false)
    } else if (isLoaded && !user) {
      // User not signed in
      setIsLoading(false)
    }
  }, [isLoaded, user?.id]) // Only depend on isLoaded and user.id, not entire user object

  const updateOnboarding = (updates: Partial<OnboardingData>) => {
    setOnboarding((prev) => ({ ...prev, ...updates }))
  }

  const saveOnboarding = async () => {
    if (user) {
      try {
        // Save to API route (which will use Admin SDK)
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
        setShowModal(false)
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
    setShowModal(true)
    
    if (user) {
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: false,
        },
      }).catch((error) => {
        console.error('Failed to reset onboarding in Clerk:', error)
      })
    }
  }

  const closeModal = () => {
    setShowModal(false)
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
        showModal,
        closeModal,
        isLoading,
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