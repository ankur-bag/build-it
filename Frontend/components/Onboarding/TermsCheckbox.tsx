'use client'

import React from 'react'

interface TermsCheckboxProps {
  termsText: string
  accepted: boolean
  onChange: (accepted: boolean) => void
}

export const TermsCheckbox: React.FC<TermsCheckboxProps> = ({ termsText, accepted, onChange }) => {
  return (
    <div className="space-y-4 mt-8 pt-8 border-t border-white/30">
      <h3 className="text-sm font-semibold text-gray-900">Legal Terms</h3>

      <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-lg p-4">
        <p className="text-xs leading-relaxed text-gray-800">{termsText}</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
            accepted
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-500'
              : 'border-gray-400 group-hover:border-gray-500 bg-white/20'
          }`}
        >
          {accepted && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="text-xs text-gray-800 leading-relaxed">
          I confirm that I have the legal right to contact the recipients and comply with all
          applicable regulations.
        </span>
      </label>
    </div>
  )
}
