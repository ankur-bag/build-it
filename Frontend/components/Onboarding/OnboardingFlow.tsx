'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useOnboarding, OnboardingData } from './OnboardingContext'
import {
  BUSINESS_TYPE_OPTIONS,
  TARGET_AUDIENCE_OPTIONS,
  BRAND_STYLE_OPTIONS,
  RESPONSE_PREFERENCE_OPTIONS,
  TERMS_TEXT,
} from '@/lib/onboarding-options'

const TOTAL_STEPS = 5

export const OnboardingFlow: React.FC = () => {
  const { user } = useUser()
  const { onboarding, updateOnboarding, saveOnboarding, closeModal, showModal, isOnboardingCompleted } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-close modal when onboarding is completed
  useEffect(() => {
    if (isOnboardingCompleted) {
      closeModal()
    }
  }, [isOnboardingCompleted, closeModal])

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await saveOnboarding()
    } catch (err) {
      setError('Failed to save onboarding. Please try again.')
      console.error('Submit error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return {
          title: 'What type of business are you?',
          description: 'Help us understand your context',
          component: (
            <div className="space-y-3">
              {BUSINESS_TYPE_OPTIONS.map((option: typeof BUSINESS_TYPE_OPTIONS[0]) => (
                <button
                  key={option.value}
                  onClick={() => updateOnboarding({ businessType: option.value as OnboardingData['businessType'] })}
                  className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
                    onboarding.businessType === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{option.label}</p>
                </button>
              ))}
            </div>
          ),
          isValid: onboarding.businessType !== '',
        }

      case 2:
        return {
          title: 'Who is your primary audience?',
          description: 'Select what best describes your customer base',
          component: (
            <div className="space-y-3">
              {TARGET_AUDIENCE_OPTIONS.map((option: typeof TARGET_AUDIENCE_OPTIONS[0]) => (
                <button
                  key={option.value}
                  onClick={() => updateOnboarding({ targetAudience: option.value as OnboardingData['targetAudience'] })}
                  className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
                    onboarding.targetAudience === option.value
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{option.label}</p>
                </button>
              ))}
            </div>
          ),
          isValid: onboarding.targetAudience !== '',
        }

      case 3:
        return {
          title: 'How should the brand communicate?',
          description: 'Select all that apply',
          component: (
            <div className="space-y-2">
              {BRAND_STYLE_OPTIONS.map((option: typeof BRAND_STYLE_OPTIONS[0]) => {
                const value = option.value as 'professional' | 'friendly' | 'casual' | 'energetic' | 'premium'
                return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (onboarding.brandStyle.includes(value)) {
                      updateOnboarding({
                        brandStyle: onboarding.brandStyle.filter((s) => s !== value),
                      })
                    } else {
                      updateOnboarding({
                        brandStyle: [...onboarding.brandStyle, value],
                      })
                    }
                  }}
                  className={`w-full px-4 py-3 text-left rounded-lg border transition-colors flex items-center gap-3 ${
                    onboarding.brandStyle.includes(value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      onboarding.brandStyle.includes(value)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {onboarding.brandStyle.includes(value) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-600">{option.description}</p>
                  </div>
                </button>
              )
              })}
            </div>
          ),
          isValid: onboarding.brandStyle.length > 0,
        }

      case 4:
        return {
          title: "What's your preferred response style?",
          description: 'This affects how detailed AI-generated content will be',
          component: (
            <div className="space-y-3">
              {RESPONSE_PREFERENCE_OPTIONS.map((option: typeof RESPONSE_PREFERENCE_OPTIONS[0]) => (
                <button
                  key={option.value}
                  onClick={() => updateOnboarding({ responsePreference: option.value as OnboardingData['responsePreference'] })}
                  className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
                    onboarding.responsePreference === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </button>
              ))}
            </div>
          ),
          isValid: onboarding.responsePreference !== '',
        }

      case 5:
        return {
          title: 'Accept Terms & Conditions',
          description: 'Review and confirm before proceeding',
          component: (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                <p className="text-sm text-gray-700 leading-relaxed">{TERMS_TEXT}</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer" onClick={() => updateOnboarding({ termsAccepted: !onboarding.termsAccepted })}>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    onboarding.termsAccepted
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {onboarding.termsAccepted && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700 leading-relaxed">
                  I confirm that I have read and agree to the terms above
                </span>
              </label>
            </div>
          ),
          isValid: onboarding.termsAccepted,
        }

      default:
        return { title: '', description: '', component: null, isValid: false }
    }
  }

  const step = getStepContent()

  if (!showModal) {
    return null
  }

  return (
    <>
      {/* Backdrop blur */}
      <div className="fixed inset-0 bg-black/5 backdrop-blur-xs z-40" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900">{step.title}</h2>
              {step.description && <p className="text-sm text-gray-600 mt-2">{step.description}</p>}
            </div>
            <button
              onClick={closeModal}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              aria-label="Close onboarding"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 min-h-64">
            {step.component}
            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
          </div>

          {/* Progress dots */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i < currentStep
                    ? 'bg-blue-500 w-2'
                    : i === currentStep - 1
                    ? 'bg-blue-400 w-2'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!step.isValid || isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!step.isValid || isLoading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Setting up...' : 'Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
