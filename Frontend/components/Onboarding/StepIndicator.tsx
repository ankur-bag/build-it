'use client'

import React from 'react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <React.Fragment key={index}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
              index < currentStep
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : index === currentStep
                ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white ring-2 ring-purple-300'
                : 'bg-white/30 text-gray-600 backdrop-blur-md border border-white/20'
            }`}
          >
            {index < currentStep ? '✓' : index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={`h-1 w-8 rounded-full transition-all duration-300 ${
                index < currentStep
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'bg-white/20 backdrop-blur-md'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
