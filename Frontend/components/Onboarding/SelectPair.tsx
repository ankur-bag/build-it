'use client'

import React from 'react'

interface SelectPairProps {
  label: string
  description?: string
  options1: Array<{ value: string; label: string }>
  options2: Array<{ value: string; label: string }>
  value1: string
  value2: string
  onChange1: (value: string) => void
  onChange2: (value: string) => void
  label1?: string
  label2?: string
}

export const SelectPair: React.FC<SelectPairProps> = ({
  label,
  description,
  options1,
  options2,
  value1,
  value2,
  onChange1,
  onChange2,
  label1 = 'Option 1',
  label2 = 'Option 2',
}) => {
  return (
    <div className="space-y-4">
      {label && <label className="block text-sm font-medium text-gray-800">{label}</label>}
      {description && <p className="text-xs text-gray-600">{description}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Select */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">{label1}</label>
          <select
            value={value1}
            onChange={(e) => onChange1(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-white/30 backdrop-blur-md border border-white/40 text-gray-900 font-medium outline-none transition-all hover:bg-white/40 hover:border-white/50 focus:bg-white/50 focus:border-purple-300 focus:ring-2 focus:ring-purple-300/50"
          >
            <option value="">Select {label1}</option>
            {options1.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Second Select */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">{label2}</label>
          <select
            value={value2}
            onChange={(e) => onChange2(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-white/30 backdrop-blur-md border border-white/40 text-gray-900 font-medium outline-none transition-all hover:bg-white/40 hover:border-white/50 focus:bg-white/50 focus:border-purple-300 focus:ring-2 focus:ring-purple-300/50"
          >
            <option value="">Select {label2}</option>
            {options2.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
