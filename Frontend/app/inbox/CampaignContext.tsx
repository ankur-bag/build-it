'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'

export interface Asset {
  url: string
  publicId: string
  type: 'image' | 'video'
}

interface Contact {
  id: string
  name: string
  phone: string
  lastMessage: string
  timestamp: string
  unread: boolean
  profilePic?: string
}

export interface CampaignDetails {
  title: string
  description?: string | { original?: string; aiEnhanced?: string }
  aiDescription?: string
  previewText?: string
  audioUrls?: { voice?: string }
  assets?: Asset[]
}

interface CampaignContextType {
  campaignDetails: CampaignDetails | null
  contacts: Contact[]
  loading: boolean
  fetchCampaignData: (campaignId: string) => Promise<void>
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth()
  const [campaignDetails, setCampaignDetails] = useState<CampaignDetails | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [cachedCampaignId, setCachedCampaignId] = useState<string | null>(null)

  const fetchCampaignData = async (campaignId: string) => {
    // Return if already cached
    if (cachedCampaignId === campaignId && contacts.length > 0) {
      return
    }

    if (!isSignedIn || !campaignId) return

    setLoading(true)
    try {
      // Fetch campaign details
      const detailsRes = await fetch(`/api/campaigns/${campaignId}/details`)
      const detailsData = await detailsRes.json()
      setCampaignDetails(detailsData.campaignDetails)

      // Fetch contacts directly from campaign inbox endpoint
      const contactsRes = await fetch(`/api/inbox/${campaignId}/contacts`)
      const contactsData = await contactsRes.json()
      setContacts(contactsData.contacts || [])
      setCachedCampaignId(campaignId)
    } catch (error) {
      console.error('Error fetching campaign data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <CampaignContext.Provider
      value={{
        campaignDetails,
        contacts,
        loading,
        fetchCampaignData,
      }}
    >
      {children}
    </CampaignContext.Provider>
  )
}

export const useCampaignContext = () => {
  const context = useContext(CampaignContext)
  if (!context) {
    throw new Error('useCampaignContext must be used within CampaignProvider')
  }
  return context
}

export type { Contact }
