'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

interface Contact {
  id: string
  name: string
  phone: string
  lastMessage: string
  timestamp: string
  unread: boolean
  profilePic?: string
}

interface CampaignDetails {
  title: string
  previewText?: string
  audioUrls?: { voice?: string }
  assets?: any[]
}

export default function CampaignPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  
  useEffect(() => {
    if (!isSignedIn) return

    const fetchData = async () => {
      try {
        // Get contacts from inbox API
        const campaignsRes = await fetch('/api/inbox')
        const campaignsData = await campaignsRes.json()
        const campaign = campaignsData.campaigns.find((c: any) => c.id === campaignId)
        
        // Redirect to first contact
        if (campaign?.contacts?.[0]?.id) {
          router.replace(`/inbox/${campaignId}/${campaign.contacts[0].id}`)
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }

    fetchData()
  }, [campaignId, isSignedIn, router])

  // Show loading state while redirecting
  return (
    <div className='h-screen bg-[#111b21] text-white flex items-center justify-center'>
      <div className='text-center space-y-3'>
        <div className='flex justify-center'>
          <img 
            src="/favicon.svg" 
            alt="Loading" 
            className="w-12 h-12 animate-spin"
          />
        </div>
        <p className='text-[#667781]'>Loading campaign...</p>
      </div>
    </div>
  )
}

