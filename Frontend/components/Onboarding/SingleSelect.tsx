'use client'

import React from 'react'

interface SingleSelectProps {
  label: string
  description?: string
  options: Array<{
    value: string
    label: string
    icon?: string
    description?: string
  }>
  value: string
  onChange: (value: string) => void
}

export const SingleSelect: React.FC<SingleSelectProps> = ({
  label,
  description,
  options,
  value,
  onChange,
}) => {
  const hasIcons = options.some((opt) => opt.icon)

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-medium text-gray-800">{label}</label>}
      {description && <p className="text-xs text-gray-600">{description}</p>}
      <div className={`grid gap-3 ${hasIcons ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative px-4 py-3 rounded-xl transition-all duration-200 backdrop-blur-md border text-left group ${
              value === option.value
                ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 border-purple-400 ring-2 ring-purple-300/50'
                : 'bg-white/20 border-white/30 hover:bg-white/30 hover:border-white/50'
            }`}
          >
            <div className="flex items-start gap-2">
              {option.icon && <span className="text-xl">{option.icon}</span>}
              <div className="flex-1">
                <p className="font-medium text-gray-900">{option.label}</p>
                {option.description && (
                  <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
