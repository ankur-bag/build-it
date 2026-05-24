'use client'

import React from 'react'

interface MultiSelectProps {
  label: string
  description?: string
  options: Array<{
    value: string
    label: string
    description?: string
  }>
  value: string[]
  onChange: (value: string[]) => void
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  description,
  options,
  value,
  onChange,
}) => {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-medium text-gray-800">{label}</label>}
      {description && <p className="text-xs text-gray-600">{description}</p>}
      <div className="grid gap-2.5">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => toggleOption(option.value)}
            className={`relative px-4 py-3 rounded-lg transition-all duration-200 backdrop-blur-md border text-left flex items-start gap-3 group ${
              value.includes(option.value)
                ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 border-purple-400 ring-2 ring-purple-300/50'
                : 'bg-white/20 border-white/30 hover:bg-white/30 hover:border-white/50'
            }`}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                value.includes(option.value)
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-500'
                  : 'border-gray-400 group-hover:border-gray-500'
              }`}
            >
              {value.includes(option.value) && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{option.label}</p>
              {option.description && (
                <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
