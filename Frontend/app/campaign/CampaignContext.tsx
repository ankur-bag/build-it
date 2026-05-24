'use client'

import React, { createContext, useContext, useState } from 'react'

export interface ChannelConfig {
  text?: { enabled: boolean; wordLimit?: number }
  voice?: { enabled: boolean; maxDurationSeconds?: number }
  calls?: { enabled: boolean; maxCallDurationSeconds?: number }
  whatsapp?: { enabled: boolean; wordLimit?: number }
}

export interface ChannelContent {
  voice?: { transcript: string }
  calls?: { script: string }
}

export interface CampaignData {
  campaignId?: string
  title: string
  description: string
  channels: ChannelConfig
  toneOfVoice?: 'friendly' | 'professional' | 'energetic' | 'formal' | 'casual'
  assets: File[]
  contacts: { name: string; phone: string }[]
  contactsFile?: File | null
  documents?: { url: string; publicId: string; name: string; extractedText: string; uploadedAt: string }[]
  aiDescription?: string
  previewText?: string
  channelContent?: ChannelContent
}

interface CampaignContextType {
  campaign: CampaignData
  updateCampaign: (updates: Partial<CampaignData>) => void
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [campaign, setCampaign] = useState<CampaignData>({
    campaignId: undefined,
    title: '',
    description: '',
    channels: {},
    toneOfVoice: undefined,
    assets: [],
    contacts: [],
    contactsFile: null,
    documents: [],
    aiDescription: undefined,
    previewText: undefined,
    channelContent: {},
  })

  const updateCampaign = (updates: Partial<CampaignData>) => {
    setCampaign((prev) => ({ ...prev, ...updates }))
  }

  return (
    <CampaignContext.Provider value={{ campaign, updateCampaign }}>
      {children}
    </CampaignContext.Provider>
  )
}
export const useCampaign = () => {
  const context = useContext(CampaignContext)
  if (!context) {
    throw new Error('useCampaign must be used within CampaignProvider')
  }
  return context
}
